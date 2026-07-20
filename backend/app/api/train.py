"""
Model training API endpoints
"""
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from datetime import datetime
from typing import Dict, Any
import asyncio
import logging
import os
import time
from sqlalchemy.orm import Session

from ..models.prediction import TrainRequest, TrainResponse
from ..core.file_handler import file_handler
from ..core.ml_processor import ml_processor
from ..core.smart_model_selector import smart_model_selector
from pydantic import BaseModel, Field
from typing import Optional
from ..auth.dependencies import get_current_user, verify_model_access
from ..database.models import User, FileMetadata, ModelMetadata
from ..database.database import get_db, SessionLocal

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/train", tags=["Model Training"])


class EnhancedTrainRequest(BaseModel):
    """Request model for enhanced training"""
    target_column: str = Field(..., description="Target column name")
    model_name: str = Field(..., description="Model name/algorithm")
    problem_type: Optional[str] = Field(None, description="Problem type: classification, regression, or auto")


def _run_training_job(model_id: str, train_kwargs: Dict[str, Any], training_parameters: Dict[str, Any]) -> None:
    """
    Execute a training run in the background (BackgroundTasks runs this sync fn in a worker
    thread). Uses its OWN DB session — the request's session is already closed by the time this
    runs — and drives the pre-inserted ModelMetadata row through its lifecycle:
    queued → training → completed/failed.
    """
    db = SessionLocal()
    try:
        row = db.query(ModelMetadata).filter(ModelMetadata.model_id == model_id).first()
        if row is None:
            logger.error(f"Training job {model_id}: metadata row not found, aborting")
            return
        row.status = "training"
        db.commit()

        started = time.time()
        result = ml_processor.train_model(model_id=model_id, **train_kwargs)
        duration = time.time() - started

        ti = result.get("training_info", {})
        row.algorithm = result["algorithm"]
        row.model_type = result["model_type"]
        row.evaluation_metrics = result["evaluation_metrics"]
        row.feature_importance = result.get("feature_importance", {})
        row.model_path = result["model_path"]
        if os.path.exists(result["model_path"]):
            row.model_size = os.path.getsize(result["model_path"])
        row.training_duration = duration
        row.num_features = ti.get("features_count") or len(result.get("feature_importance", {}))
        row.num_training_samples = ti.get("training_samples")
        row.num_test_samples = ti.get("test_samples")
        row.training_parameters = {
            **(training_parameters or {}),
            "optimization_level": ti.get("optimization_level"),
            "tuned": ti.get("tuned"),
            "best_params": ti.get("best_params"),
        }
        row.trained_at = datetime.now()
        row.status = "completed"
        db.commit()
        logger.info(f"Training job {model_id} completed in {duration:.2f}s")
    except Exception as e:
        logger.error(f"Training job {model_id} failed: {str(e)}")
        db.rollback()
        try:
            row = db.query(ModelMetadata).filter(ModelMetadata.model_id == model_id).first()
            if row is not None:
                row.status = "failed"
                row.error_message = str(e)
                db.commit()
        except Exception as inner:
            logger.error(f"Training job {model_id}: could not record failure: {str(inner)}")
            db.rollback()
    finally:
        db.close()


def _queue_training_job(
    *,
    db: Session,
    background_tasks: BackgroundTasks,
    session_id: str,
    file_id: int,
    user_id: int,
    algorithm: str,
    model_type: str,
    target_column: str,
    test_size: float,
    random_state: int,
    model_name: str,
    training_parameters: Dict[str, Any],
    train_kwargs: Dict[str, Any],
) -> str:
    """
    Pre-register a ModelMetadata row (status=queued) and schedule the background training job.
    Returns the model_id immediately so the route can respond 202 without blocking.
    model_path / evaluation_metrics are non-null columns, so they're seeded with placeholders
    and filled in when the job completes.
    """
    model_id = ml_processor.generate_model_id(session_id)
    row = ModelMetadata(
        model_id=model_id,
        model_name=model_name,
        algorithm=algorithm,
        # model_type is non-null; "auto" isn't resolved until training runs, so park it as "pending"
        model_type=model_type if model_type in ("classification", "regression") else "pending",
        target_column=target_column,
        test_size=test_size,
        random_state=random_state,
        training_parameters=training_parameters,
        evaluation_metrics={},   # placeholder until completion (column is non-null)
        model_path="",           # placeholder until completion (column is non-null)
        user_id=user_id,
        file_id=file_id,
        status="queued",
    )
    db.add(row)
    db.commit()
    background_tasks.add_task(_run_training_job, model_id, train_kwargs, training_parameters)
    return model_id


@router.post("/", status_code=202)
async def train_model(
    request: TrainRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> JSONResponse:
    """
    Train a machine learning model on uploaded data.
    
    This endpoint:
    1. Loads the uploaded CSV file using the session ID
    2. Validates the target column
    3. Automatically detects problem type (classification/regression) if not specified
    4. Preprocesses the data (encoding, scaling, missing value handling)
    5. Trains the specified model algorithm
    6. Evaluates the model performance
    7. Saves the model to disk for future predictions
    8. Returns training results and evaluation metrics
    
    **Supported Algorithms:**
    - random_forest: Random Forest (default)
    - logistic_regression: Logistic Regression (classification) / Linear Regression (regression)
    - xgboost: XGBoost
    
    **Model Types:**
    - auto: Automatically detect classification vs regression (default)
    - classification: Force classification
    - regression: Force regression
    
    **Parameters:**
    - session_id: Session ID from file upload
    - target_column: Name of the target column to predict
    - model_type: Type of ML problem (auto, classification, regression)
    - algorithm: ML algorithm to use
    - test_size: Fraction of data to use for testing (0.1-0.5)
    - random_state: Random seed for reproducibility
    
    **Returns:**
    - model_id: Unique identifier for the trained model
    - Training information and dataset statistics
    - Evaluation metrics (accuracy, precision, recall, F1 for classification; RMSE, MAE, R² for regression)
    - Feature importance scores
    - Model file path for persistence
    """
    try:
        logger.info(f"Starting model training for session {request.session_id}")

        # Validate session and check user ownership
        file_metadata = db.query(FileMetadata).filter(
            FileMetadata.session_id == request.session_id,
            FileMetadata.user_id == current_user.id
        ).first()

        if not file_metadata:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "SESSION_NOT_FOUND",
                    "message": f"No file found for session ID: {request.session_id} or access denied",
                    "session_id": request.session_id
                }
            )

        # Get file path
        file_path = file_handler.get_file_path(request.session_id)
        if not file_path:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "FILE_NOT_FOUND",
                    "message": f"Physical file not found for session ID: {request.session_id}",
                    "session_id": request.session_id
                }
            )

        logger.info(f"File found for session {request.session_id}: {file_path}")
        
        # Validate request parameters
        if request.test_size < 0.1 or request.test_size > 0.5:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "INVALID_TEST_SIZE",
                    "message": "Test size must be between 0.1 and 0.5",
                    "provided_value": request.test_size
                }
            )
        
        supported_algorithms = ml_processor.get_supported_algorithms()
        if request.algorithm not in supported_algorithms:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "UNSUPPORTED_ALGORITHM",
                    "message": f"Algorithm '{request.algorithm}' is not supported",
                    "supported_algorithms": sorted(supported_algorithms.keys())
                }
            )
        
        if request.model_type not in ["auto", "classification", "regression"]:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "INVALID_MODEL_TYPE",
                    "message": f"Model type '{request.model_type}' is not valid",
                    "valid_types": ["auto", "classification", "regression"]
                }
            )
        
        logger.info(f"Queuing training for session {request.session_id} (algorithm={request.algorithm})")

        # Register the job and return immediately (202). Actual training runs in the background;
        # the client polls GET /train/status/{model_id} for queued → training → completed/failed.
        model_id = _queue_training_job(
            db=db,
            background_tasks=background_tasks,
            session_id=request.session_id,
            file_id=file_metadata.id,
            user_id=current_user.id,
            algorithm=request.algorithm,
            model_type=request.model_type,
            target_column=request.target_column,
            test_size=request.test_size,
            random_state=request.random_state,
            model_name=f"{request.algorithm}_{request.target_column}",
            training_parameters={
                "algorithm": request.algorithm,
                "model_type": request.model_type,
                "test_size": request.test_size,
                "random_state": request.random_state,
            },
            train_kwargs=dict(
                file_path=file_path,
                target_column=request.target_column,
                session_id=request.session_id,
                model_type=request.model_type,
                algorithm=request.algorithm,
                test_size=request.test_size,
                random_state=request.random_state,
            ),
        )

        return JSONResponse(
            status_code=202,
            content={"model_id": model_id, "status": "queued", "message": "Training started"},
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
        
    except ValueError as e:
        logger.error(f"Validation error during model training: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "TRAINING_VALIDATION_ERROR",
                "message": str(e),
                "session_id": request.session_id
            }
        )
        
    except Exception as e:
        logger.error(f"Unexpected error during model training for session {request.session_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "TRAINING_ERROR",
                "message": "An error occurred while training the model",
                "session_id": request.session_id,
                "details": str(e)
            }
        )


@router.post("/{session_id}/enhanced-train", status_code=202)
async def enhanced_train_model(
    session_id: str,
    request: EnhancedTrainRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> JSONResponse:
    """
    Enhanced training endpoint with intelligent model selection and optimization.

    This endpoint provides advanced training capabilities:
    1. Uses intelligent model recommendations
    2. Applies enhanced preprocessing
    3. Optimizes hyperparameters
    4. Provides detailed performance insights

    **Parameters:**
    - session_id: Session ID from file upload (in URL path)
    - target_column: Name of the target column to predict
    - model_name: Recommended model algorithm
    - problem_type: Type of ML problem (optional, will auto-detect if not provided)

    **Returns:**
    - Enhanced training results with optimized model performance
    """
    try:
        logger.info(f"Starting enhanced model training for session {session_id}")

        # Validate session and get file path
        file_path = file_handler.get_file_path(session_id)
        if not file_path:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "SESSION_NOT_FOUND",
                    "message": f"No file found for session ID: {session_id}",
                    "session_id": session_id
                }
            )

        logger.info(f"File found for session {session_id}: {file_path}")

        # Resolve the requested algorithm honestly — no silent substitution.
        # (The old code mapped svm/naive_bayes/decision_tree onto logistic/RF, so a user who
        # asked for SVM was given a LogisticRegression labelled as such. We now train exactly
        # what was requested, or return 400 if it isn't supported.)
        algorithm = (request.model_name or "random_forest").lower()
        # "linear_regression" is an alias for the regression head of logistic_regression in our registry
        if algorithm == "linear_regression":
            algorithm = "logistic_regression"

        supported_algorithms = ml_processor.get_supported_algorithms()
        if algorithm not in supported_algorithms:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "UNSUPPORTED_ALGORITHM",
                    "message": f"Algorithm '{request.model_name}' is not supported",
                    "supported_algorithms": sorted(supported_algorithms.keys()),
                },
            )

        # Determine problem type
        problem_type = request.problem_type or "auto"

        logger.info(f"Enhanced training with algorithm: {algorithm}, type: {problem_type}")

        # Verify the session belongs to this user (ownership) and get the FK for the job row
        file_metadata = db.query(FileMetadata).filter(
            FileMetadata.session_id == session_id,
            FileMetadata.user_id == current_user.id
        ).first()
        if not file_metadata:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "SESSION_NOT_FOUND",
                    "message": f"No file found for session ID: {session_id} or access denied",
                    "session_id": session_id,
                },
            )

        logger.info(f"Queuing enhanced training for session {session_id} (algorithm={algorithm})")

        # "medium" enables cross-validation + RandomizedSearch tuning, so the enhanced route is
        # genuinely enhanced. Runs in the background; client polls GET /train/status/{model_id}.
        model_id = _queue_training_job(
            db=db,
            background_tasks=background_tasks,
            session_id=session_id,
            file_id=file_metadata.id,
            user_id=current_user.id,
            algorithm=algorithm,
            model_type=problem_type,
            target_column=request.target_column,
            test_size=0.2,
            random_state=42,
            model_name=f"enhanced_{algorithm}_{request.target_column}",
            training_parameters={
                "algorithm": algorithm,
                "model_type": problem_type,
                "test_size": 0.2,
                "random_state": 42,
                "enhanced_training": True,
            },
            train_kwargs=dict(
                file_path=file_path,
                target_column=request.target_column,
                session_id=session_id,
                model_type=problem_type,
                algorithm=algorithm,
                test_size=0.2,
                random_state=42,
                optimization_level="medium",
            ),
        )

        return JSONResponse(
            status_code=202,
            content={"model_id": model_id, "status": "queued", "message": "Enhanced training started"},
        )

    except HTTPException:
        # Re-raise HTTP exceptions
        raise

    except ValueError as e:
        logger.error(f"Validation error during enhanced training: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "ENHANCED_TRAINING_VALIDATION_ERROR",
                "message": str(e),
                "session_id": session_id
            }
        )

    except Exception as e:
        logger.error(f"Unexpected error during enhanced training for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "ENHANCED_TRAINING_ERROR",
                "message": "An error occurred while training the enhanced model",
                "session_id": session_id,
                "details": str(e)
            }
        )


@router.get("/algorithms")
async def get_supported_algorithms() -> Dict[str, Any]:
    """
    Get list of supported ML algorithms and their descriptions.
    
    **Returns:**
    - Dictionary of supported algorithms with descriptions and use cases
    """
    # Descriptions for the algorithms we actually train (drives the train UI honestly)
    descriptions = {
        "random_forest": {
            "name": "Random Forest",
            "description": "Ensemble of decision trees",
            "pros": ["Handles missing values", "Feature importance", "Robust to overfitting"],
            "cons": ["Slower on large datasets", "Less interpretable than a single tree"],
        },
        "logistic_regression": {
            "name": "Logistic / Linear Regression",
            "description": "Linear model (logistic for classification, linear for regression)",
            "pros": ["Fast", "Interpretable", "Probabilistic output"],
            "cons": ["Assumes linear relationships", "Sensitive to outliers"],
        },
        "xgboost": {
            "name": "XGBoost",
            "description": "Gradient boosting framework",
            "pros": ["High performance", "Feature importance", "Handles missing values"],
            "cons": ["More hyperparameters", "Can overfit on small datasets"],
        },
        "svm": {
            "name": "Support Vector Machine",
            "description": "Margin-based classifier/regressor (SVC/SVR)",
            "pros": ["Effective in high dimensions", "Flexible kernels"],
            "cons": ["Slow on large datasets", "Sensitive to scaling/params"],
        },
        "knn": {
            "name": "k-Nearest Neighbors",
            "description": "Instance-based learner using nearest neighbors",
            "pros": ["Simple", "No training cost", "Non-linear"],
            "cons": ["Slow at predict time", "Sensitive to scaling & k"],
        },
        "naive_bayes": {
            "name": "Gaussian Naive Bayes",
            "description": "Probabilistic classifier (classification only)",
            "pros": ["Very fast", "Works with little data"],
            "cons": ["Assumes feature independence", "Classification only"],
        },
        "decision_tree": {
            "name": "Decision Tree",
            "description": "Single interpretable tree",
            "pros": ["Highly interpretable", "Handles non-linearities"],
            "cons": ["Prone to overfitting"],
        },
        "ridge": {
            "name": "Ridge Regression",
            "description": "L2-regularized linear regression (regression only)",
            "pros": ["Handles multicollinearity", "Stable"],
            "cons": ["Linear only", "Regression only"],
        },
        "lasso": {
            "name": "Lasso Regression",
            "description": "L1-regularized linear regression (regression only)",
            "pros": ["Feature selection", "Sparse models"],
            "cons": ["Linear only", "Regression only"],
        },
    }

    supported = ml_processor.get_supported_algorithms()  # algo -> [problem types]
    algorithms = {
        algo: {
            **descriptions.get(algo, {"name": algo, "description": "", "pros": [], "cons": []}),
            "supported_problem_types": problem_types,
        }
        for algo, problem_types in supported.items()
    }

    return {
        "algorithms": algorithms,
        "model_types": {
            "auto": "Automatically detect classification vs regression based on target column",
            "classification": "Predict discrete categories or classes",
            "regression": "Predict continuous numerical values"
        },
        "default_algorithm": "random_forest",
        "default_model_type": "auto"
    }


@router.get("/status/{model_id}")
async def get_training_status(
    model_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Poll the lifecycle of a (background) training job for a model owned by the current user.

    Status progresses queued → training → completed | failed. When completed, the response
    carries the real evaluation metrics, feature importance, and training info so the client
    can render results without a second request. When failed, `error_message` explains why.
    """
    # Owner-scoped lookup (404 if missing or not owned — prevents IDOR)
    row = db.query(ModelMetadata).filter(
        ModelMetadata.model_id == model_id,
        ModelMetadata.user_id == current_user.id,
    ).first()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "MODEL_NOT_FOUND", "message": f"Model {model_id} not found", "model_id": model_id},
        )

    response: Dict[str, Any] = {
        "model_id": row.model_id,
        "status": row.status,
        "algorithm": row.algorithm,
        "problem_type": row.model_type,
        "target_column": row.target_column,
        "error_message": row.error_message,
    }

    if row.status == "completed":
        response.update({
            "evaluation_metrics": row.evaluation_metrics or {},
            "feature_importance": row.feature_importance or {},
            "model_path": row.model_path,
            "training_info": {
                "algorithm": row.algorithm,
                "problem_type": row.model_type,
                "target_column": row.target_column,
                "features_count": row.num_features,
                "training_samples": row.num_training_samples,
                "test_samples": row.num_test_samples,
                "training_duration": row.training_duration,
                **(row.training_parameters or {}),
            },
            "trained_at": row.trained_at.isoformat() if row.trained_at else None,
        })

    return response


@router.get("/{session_id}/model-recommendations")
async def get_model_recommendations(
    session_id: str,
    target_column: str,
    problem_type: str = "auto"
) -> Dict[str, Any]:
    """
    Get intelligent model recommendations based on dataset characteristics.

    This endpoint analyzes the dataset and provides smart recommendations for:
    - Best ML algorithms for the specific dataset
    - Hyperparameter suggestions
    - Expected performance estimates
    - Training time estimates
    - Model complexity analysis

    **Parameters:**
    - session_id: Session ID from file upload
    - target_column: Name of the target column
    - problem_type: 'auto', 'classification', or 'regression'

    **Returns:**
    - Ranked list of recommended models with detailed analysis
    """
    try:
        logger.info(f"Getting model recommendations for session {session_id}")

        # Check if file exists
        file_path = file_handler.get_file_path(session_id)
        if not file_path:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "SESSION_NOT_FOUND",
                    "message": f"No file found for session ID: {session_id}",
                    "session_id": session_id
                }
            )

        # Load and analyze data
        df = ml_processor.load_data(file_path)

        # Validate target column
        if target_column not in df.columns:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "INVALID_TARGET_COLUMN",
                    "message": f"Target column '{target_column}' not found in dataset",
                    "available_columns": df.columns.tolist()
                }
            )

        # Detect problem type if auto
        if problem_type == "auto":
            detected_type = ml_processor.detect_problem_type(df, target_column)
            problem_type = detected_type

        # Get dataset characteristics
        dataset_characteristics = {
            'dataset_size': len(df),
            'feature_count': len(df.columns) - 1,
            'target_column': target_column,
            'problem_type': problem_type,
            'missing_percentage': (df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100,
            'duplicate_percentage': (df.duplicated().sum() / len(df)) * 100,
            'data_quality': {
                'missing_percentage': (df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100,
                'outlier_percentage': 0  # Will be calculated by smart selector
            }
        }

        # Get model recommendations
        recommendations = smart_model_selector.recommend_models(
            dataset_characteristics,
            problem_type
        )

        # Filter out non-serializable data from recommendations
        serializable_recommendations = []
        for rec in recommendations:
            serializable_rec = {
                'model_name': rec['model_name'],
                'score': rec['score'],
                'reasons': rec['reasons'],
                'suitability_factors': rec['suitability_factors'],
                'recommended_params': rec['recommended_params'],
                'model_info': {
                    'best_for': rec['model_info']['best_for'],
                    'complexity': rec['model_info']['complexity'],
                    'training_time': rec['model_info']['training_time']
                }
            }
            serializable_recommendations.append(serializable_rec)

        logger.info(f"Model recommendations generated for session {session_id}")

        return {
            "session_id": session_id,
            "target_column": target_column,
            "problem_type": problem_type,
            "dataset_characteristics": dataset_characteristics,
            "model_recommendations": serializable_recommendations,
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error getting model recommendations for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "RECOMMENDATION_ERROR",
                "message": "An error occurred while generating model recommendations",
                "session_id": session_id,
                "details": str(e)
            }
        )

