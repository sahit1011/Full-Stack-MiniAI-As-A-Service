"""
Model prediction API endpoints
"""
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, List
import logging

from ..models.prediction import PredictRequest, PredictResponse, PredictionResult
from ..core.ml_processor import ml_processor
from ..auth.dependencies import get_current_user, verify_model_access
from ..database.database import get_db
from ..database.models import User, ModelMetadata

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predict", tags=["Model Prediction"])


@router.post("/", response_model=PredictResponse)
async def make_predictions(
    request: PredictRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PredictResponse:
    """
    Make predictions using a trained model.
    
    This endpoint:
    1. Loads the specified trained model from disk
    2. Validates the input data format and features
    3. Preprocesses the input data using the same pipeline as training
    4. Generates predictions with confidence scores
    5. Returns predictions with probabilities (for classification)
    
    **Input Data Format:**
    The input data should be a list of dictionaries, where each dictionary
    represents one row of data with feature names as keys.
    
    Example:
    ```json
    {
        "model_id": "model_abc123_20240115_103000",
        "data": [
            {
                "age": 30,
                "income": 50000,
                "experience": 5,
                "education": "Bachelor"
            },
            {
                "age": 45,
                "income": 75000,
                "experience": 15,
                "education": "Master"
            }
        ]
    }
    ```
    
    **Parameters:**
    - model_id: Unique identifier of the trained model
    - data: List of input samples for prediction
    
    **Returns:**
    - model_id: The model used for predictions
    - predictions: List of prediction results with confidence scores
    - prediction_timestamp: When the predictions were made
    
    **Prediction Results:**
    - prediction: The predicted value (class for classification, number for regression)
    - confidence: Confidence score between 0 and 1
    - probabilities: Class probabilities (classification only)
    """
    try:
        logger.info(f"Making predictions with model {request.model_id} for {len(request.data)} samples")
        
        # Validate input
        if not request.data:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "EMPTY_INPUT_DATA",
                    "message": "Input data cannot be empty",
                    "model_id": request.model_id
                }
            )
        
        if len(request.data) > 1000:  # Reasonable batch size limit
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "BATCH_SIZE_TOO_LARGE",
                    "message": "Maximum batch size is 1000 samples",
                    "provided_size": len(request.data),
                    "max_size": 1000
                }
            )
        
        # Ownership check — only the model's owner may use it (prevents IDOR)
        verify_model_access(request.model_id, current_user, db)

        # Make predictions
        prediction_result = ml_processor.predict(request.model_id, request.data)
        
        logger.info(f"Predictions completed successfully for model {request.model_id}")
        
        # Convert to response format
        prediction_objects = []
        for pred_data in prediction_result["predictions"]:
            prediction_obj = PredictionResult(
                prediction=pred_data["prediction"],
                confidence=pred_data.get("confidence"),
                probabilities=pred_data.get("probabilities"),
                interval_low=pred_data.get("interval_low"),
                interval_high=pred_data.get("interval_high"),
            )
            prediction_objects.append(prediction_obj)
        
        response = PredictResponse(
            model_id=prediction_result["model_id"],
            predictions=prediction_objects,
            prediction_timestamp=prediction_result["prediction_timestamp"]
        )
        
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
        
    except ValueError as e:
        logger.error(f"Validation error during prediction: {str(e)}")
        
        # Check if it's a model not found error
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "MODEL_NOT_FOUND",
                    "message": f"Model {request.model_id} not found",
                    "model_id": request.model_id
                }
            )
        else:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "PREDICTION_VALIDATION_ERROR",
                    "message": str(e),
                    "model_id": request.model_id
                }
            )
        
    except Exception as e:
        logger.error(f"Unexpected error during prediction for model {request.model_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "PREDICTION_ERROR",
                "message": "An error occurred while making predictions",
                "model_id": request.model_id,
                "details": str(e)
            }
        )


@router.post("/batch")
async def make_batch_predictions(
    model_id: str,
    data: List[Dict[str, Any]],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Alternative endpoint for batch predictions with simpler input format.
    
    **Parameters:**
    - model_id: Unique identifier of the trained model
    - data: List of input samples for prediction
    
    **Returns:**
    - Simplified prediction results
    """
    try:
        # Create request object
        request = PredictRequest(model_id=model_id, data=data)

        # Use the main prediction endpoint (pass current_user + db explicitly — when called
        # directly like this, FastAPI's dependency injection does NOT run)
        response = await make_predictions(request, current_user, db)
        
        # Return simplified format
        return {
            "model_id": response.model_id,
            "predictions": [
                {
                    "prediction": pred.prediction,
                    "confidence": pred.confidence,
                    **({"probabilities": pred.probabilities} if pred.probabilities else {})
                }
                for pred in response.predictions
            ],
            "count": len(response.predictions),
            "timestamp": response.prediction_timestamp.isoformat()
        }
        
    except Exception as e:
        # Let the main endpoint handle the error
        raise


@router.get("/models")
async def list_available_models(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    List the current user's trained models (scoped to the authenticated user via the
    DB — no longer a public filesystem scan, which exposed every user's models).

    **Returns:**
    - List of the user's models with basic information
    """
    try:
        models = (
            db.query(ModelMetadata)
            .filter(ModelMetadata.user_id == current_user.id)
            .order_by(ModelMetadata.created_at.desc())
            .all()
        )

        return {
            "models": [
                {
                    "model_id": m.model_id,
                    "model_name": m.model_name,
                    "algorithm": m.algorithm,
                    "problem_type": m.model_type,
                    "target_column": m.target_column,
                    "feature_count": m.num_features,
                    "status": m.status,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in models
            ],
            "count": len(models),
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "MODEL_LIST_ERROR",
                "message": "Failed to list available models",
                "details": str(e),
            },
        )


@router.get("/model/{model_id}/info")
async def get_model_info(
    model_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get detailed information about a specific model.

    **Parameters:**
    - model_id: The model ID to get information for

    **Returns:**
    - Detailed model information including features and metadata
    """
    try:
        # Ownership check — only the owner may inspect this model (prevents IDOR).
        # The returned row also carries the real, persisted evaluation metrics.
        model_meta = verify_model_access(model_id, current_user, db)

        # Load model and metadata
        pipeline, metadata = ml_processor.load_model(model_id)

        # Prefer the metrics persisted at training time (authoritative); fall back
        # to whatever the on-disk metadata recorded. Never fabricate a score.
        metrics = model_meta.evaluation_metrics or metadata.get("evaluation_metrics", {}) or {}

        return {
            "model_id": model_id,
            "algorithm": metadata.get("algorithm", "unknown"),
            "problem_type": metadata.get("problem_type", "unknown"),
            "target_column": metadata.get("target_column", "unknown"),
            "session_id": metadata.get("session_id", "unknown"),
            "metrics": metrics,
            "features": {
                "all_features": metadata.get("feature_names", []),
                "numerical_features": metadata.get("preprocessing_info", {}).get("numerical_cols", []),
                "categorical_features": metadata.get("preprocessing_info", {}).get("categorical_cols", []),
                "feature_count": len(metadata.get("feature_names", []))
            },
            "model_details": {
                "created_timestamp": metadata.get("timestamp", "unknown"),
                "model_file_exists": True,
                "metadata_complete": True
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "MODEL_NOT_FOUND",
                "message": f"Model {model_id} not found",
                "model_id": model_id
            }
        )
    except Exception as e:
        logger.error(f"Error getting model info for {model_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "MODEL_INFO_ERROR",
                "message": "Failed to get model information",
                "model_id": model_id,
                "details": str(e)
            }
        )
