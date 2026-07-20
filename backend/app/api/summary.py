"""
Model summary and insights API endpoints
"""
import asyncio
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, List
import logging

from ..models.prediction import ModelSummaryResponse
from ..core.ml_processor import ml_processor
from ..core.file_handler import file_handler
from ..core.data_processor import data_processor
from ..core.llm_service import llm_service
from ..auth.dependencies import get_current_user, verify_model_access, verify_session_access
from ..database.database import get_db
from ..database.models import User

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/summary", tags=["Model Summary"])


@router.get("/{model_id}", response_model=ModelSummaryResponse)
async def get_model_summary(
    model_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ModelSummaryResponse:
    """
    Get comprehensive summary of a trained model and its dataset.
    
    This endpoint provides:
    
    **Dataset Summary:**
    - Original dataset statistics
    - Feature information and types
    - Data quality metrics
    
    **Model Summary:**
    - Algorithm and problem type
    - Training performance metrics
    - Feature importance rankings
    
    **Insights:**
    - Key findings about the data
    - Model performance interpretation
    - Top predictive features
    - Recommendations for improvement
    
    **Natural Language Summary:**
    - Human-readable description of the analysis
    - Key insights in plain English
    - Model performance explanation
    
    **Parameters:**
    - model_id: Unique identifier of the trained model
    
    **Returns:**
    - Comprehensive model and dataset summary with insights
    """
    try:
        logger.info(f"Generating summary for model {model_id}")

        # Ownership check (prevents IDOR)
        verify_model_access(model_id, current_user, db)

        # Get basic model summary
        basic_summary = ml_processor.get_model_summary(model_id)
        
        # Load model and metadata for detailed analysis
        pipeline, metadata = ml_processor.load_model(model_id)
        
        # Get original dataset for additional analysis
        session_id = metadata['session_id']
        file_path = file_handler.get_file_path(session_id)
        
        if not file_path:
            logger.warning(f"Original dataset not found for session {session_id}")
            dataset_analysis = None
        else:
            # Generate comprehensive profile of original dataset
            dataset_analysis = data_processor.generate_comprehensive_profile(
                file_path, metadata['target_column']
            )
        
        # Generate traditional (pure-Python) insights — no LLM call here
        insights = _generate_model_insights(metadata, dataset_analysis)

        # Run the two independent LLM workloads concurrently:
        #   - the natural-language summary (itself two LLM calls, gathered internally)
        #   - the insights/recommendations call
        # This collapses what were sequential ~30s calls into overlapping work.
        natural_summary, llm_insights = await asyncio.gather(
            _generate_llm_enhanced_summary(metadata, dataset_analysis, insights),
            llm_service.generate_insights_and_recommendations(
                dataset_analysis, metadata, insights.get("evaluation_metrics")
            ),
        )

        # Merge traditional and LLM insights
        enhanced_insights = {**insights, **llm_insights}
        
        # Enhanced dataset summary
        enhanced_dataset_summary = basic_summary["dataset_summary"].copy()
        if dataset_analysis:
            enhanced_dataset_summary.update({
                "total_rows": dataset_analysis["dataset_info"]["rows"],
                "total_columns": dataset_analysis["dataset_info"]["columns"],
                "missing_values": dataset_analysis["dataset_info"]["missing_values_total"],
                "duplicate_rows": dataset_analysis["dataset_info"]["duplicate_rows"],
                "data_quality_score": _calculate_data_quality_score(dataset_analysis)
            })
        
        # Enhanced model summary
        enhanced_model_summary = basic_summary["model_summary"].copy()
        enhanced_model_summary.update({
            "training_date": metadata.get('timestamp', 'Unknown'),
            "model_file_size": _get_model_file_size(model_id),
            "preprocessing_steps": _get_preprocessing_summary(metadata)
        })
        
        response = ModelSummaryResponse(
            model_id=model_id,
            dataset_summary=enhanced_dataset_summary,
            model_summary=enhanced_model_summary,
            insights=enhanced_insights,
            natural_language_summary=natural_summary,
            timestamp=datetime.now()
        )
        
        logger.info(f"Summary generated successfully for model {model_id}")
        return response
        
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "MODEL_NOT_FOUND",
                    "message": f"Model {model_id} not found",
                    "model_id": model_id
                }
            )
        else:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "SUMMARY_VALIDATION_ERROR",
                    "message": str(e),
                    "model_id": model_id
                }
            )
        
    except Exception as e:
        logger.error(f"Error generating summary for model {model_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "SUMMARY_GENERATION_ERROR",
                "message": "Failed to generate model summary",
                "model_id": model_id,
                "details": str(e)
            }
        )


def _generate_model_insights(metadata: Dict[str, Any], dataset_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Generate insights about the model and dataset"""
    insights = {
        "model_insights": [],
        "data_insights": [],
        "performance_insights": [],
        "recommendations": []
    }
    
    # Model insights
    algorithm = metadata.get('algorithm', 'unknown')
    problem_type = metadata.get('problem_type', 'unknown')

    insights["model_insights"].append(f"Trained a {algorithm} model for {problem_type}")

    feature_count = len(metadata.get('feature_names', []))
    insights["model_insights"].append(f"Model uses {feature_count} features for prediction")

    # Surface the REAL, persisted evaluation metrics so downstream LLM prompts are grounded
    # in actual numbers (this dict was previously dropped, leaving the LLM to invent metrics).
    evaluation_metrics = metadata.get('evaluation_metrics', {}) or {}
    insights["evaluation_metrics"] = evaluation_metrics
    if problem_type == "classification":
        if evaluation_metrics.get("accuracy") is not None:
            insights["performance_insights"].append(
                f"Test accuracy: {evaluation_metrics['accuracy'] * 100:.1f}%"
            )
        if evaluation_metrics.get("f1_score") is not None:
            insights["performance_insights"].append(
                f"Weighted F1 score: {evaluation_metrics['f1_score']:.3f}"
            )
    elif problem_type == "regression":
        if evaluation_metrics.get("r2_score") is not None:
            insights["performance_insights"].append(
                f"R² score: {evaluation_metrics['r2_score']:.3f}"
            )
        if evaluation_metrics.get("rmse") is not None:
            insights["performance_insights"].append(
                f"RMSE: {evaluation_metrics['rmse']:.4g}"
            )
    
    # Data insights
    if dataset_analysis:
        dataset_info = dataset_analysis["dataset_info"]
        insights["data_insights"].append(
            f"Dataset contains {dataset_info['rows']:,} rows and {dataset_info['columns']} columns"
        )
        
        if dataset_info["missing_values_total"] > 0:
            missing_pct = (dataset_info["missing_values_total"] / 
                          (dataset_info["rows"] * dataset_info["columns"])) * 100
            insights["data_insights"].append(f"Dataset has {missing_pct:.1f}% missing values")
        
        if dataset_info["duplicate_rows"] > 0:
            insights["data_insights"].append(f"Found {dataset_info['duplicate_rows']} duplicate rows")
        
        # Correlation insights
        correlations = dataset_analysis.get("correlations", {})
        if correlations:
            strong_correlations = [k for k, v in correlations.items() if abs(v) > 0.7]
            if strong_correlations:
                insights["data_insights"].append(
                    f"Found {len(strong_correlations)} strong feature correlations"
                )
    
    # Recommendations
    if algorithm == "random_forest":
        insights["recommendations"].append("Random Forest is robust to overfitting and handles missing values well")
    elif algorithm == "logistic_regression":
        insights["recommendations"].append("Logistic regression provides interpretable results and fast predictions")
    elif algorithm == "xgboost":
        insights["recommendations"].append("XGBoost often provides high accuracy but may require hyperparameter tuning")
    
    if feature_count > 50:
        insights["recommendations"].append("Consider feature selection to reduce model complexity")
    
    if dataset_analysis and dataset_analysis["dataset_info"]["missing_values_total"] > 0:
        insights["recommendations"].append("Consider investigating patterns in missing data")
    
    return insights


async def _generate_llm_enhanced_summary(
    metadata: Dict[str, Any],
    dataset_analysis: Dict[str, Any],
    insights: Dict[str, Any]
) -> str:
    """Generate LLM-enhanced human-readable summary"""

    # Try LLM-based summary first
    if dataset_analysis:
        try:
            # The dataset summary and model summary are independent LLM calls — run them
            # concurrently. Each method returns its deterministic fallback on failure.
            dataset_summary, model_summary = await asyncio.gather(
                llm_service.generate_dataset_summary(dataset_analysis),
                llm_service.generate_model_summary(
                    metadata, dataset_analysis, insights.get("evaluation_metrics")
                ),
            )

            # Combine both summaries
            combined_summary = f"{model_summary}\n\nDataset Analysis: {dataset_summary}"

            logger.info("Successfully generated LLM-enhanced summary")
            return combined_summary

        except Exception as e:
            logger.warning(f"LLM summary generation failed, using fallback: {str(e)}")

    # Fallback to original template-based summary
    return _generate_fallback_natural_language_summary(metadata, dataset_analysis, insights)


def _generate_fallback_natural_language_summary(
    metadata: Dict[str, Any],
    dataset_analysis: Dict[str, Any],
    insights: Dict[str, Any]
) -> str:
    """Generate fallback human-readable summary (original implementation)"""
    algorithm = metadata.get('algorithm', 'unknown').replace('_', ' ').title()
    problem_type = metadata.get('problem_type', 'unknown')
    target_column = metadata.get('target_column', 'unknown')
    feature_count = len(metadata.get('feature_names', []))

    summary_parts = []

    # Model description
    summary_parts.append(
        f"This {algorithm} model was trained for {problem_type} to predict the '{target_column}' column. "
        f"The model uses {feature_count} features from the dataset."
    )

    # Dataset description
    if dataset_analysis:
        dataset_info = dataset_analysis["dataset_info"]
        summary_parts.append(
            f"The training dataset contains {dataset_info['rows']:,} rows and {dataset_info['columns']} columns."
        )

        # Data quality
        quality_score = _calculate_data_quality_score(dataset_analysis)
        if quality_score >= 0.8:
            quality_desc = "high"
        elif quality_score >= 0.6:
            quality_desc = "moderate"
        else:
            quality_desc = "low"

        summary_parts.append(f"The dataset has {quality_desc} data quality (score: {quality_score:.2f}).")

    # Key insights
    if insights.get("data_insights"):
        summary_parts.append("Key findings: " + "; ".join(insights["data_insights"][:2]) + ".")

    # Recommendations
    if insights.get("recommendations"):
        summary_parts.append("Recommendations: " + "; ".join(insights["recommendations"][:2]) + ".")

    return " ".join(summary_parts)


@router.get("/session/{session_id}")
async def get_session_summary(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get summary for a session (dataset analysis without model).

    This endpoint provides dataset analysis and insights for uploaded data
    even if no model has been trained yet.

    **Parameters:**
    - session_id: The session ID from file upload

    **Returns:**
    - Dataset analysis and insights
    """
    try:
        logger.info(f"Generating session summary for session {session_id}")

        # Ownership check (prevents IDOR)
        verify_session_access(session_id, current_user, db)

        # Get file path for session
        from ..core.file_handler import file_handler
        file_path = file_handler.get_file_path(session_id)

        if not file_path:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "SESSION_NOT_FOUND",
                    "message": f"Session {session_id} not found",
                    "session_id": session_id
                }
            )

        # Get dataset analysis
        from ..core.data_processor import data_processor
        dataset_analysis = data_processor.generate_comprehensive_profile(file_path)

        # Generate dataset summary
        dataset_summary = await llm_service.generate_dataset_summary(dataset_analysis)

        # Generate basic insights (simplified for dataset-only analysis)
        llm_insights = {
            "insights": [
                f"Dataset contains {dataset_analysis.get('dataset_info', {}).get('rows', 0)} rows and {dataset_analysis.get('dataset_info', {}).get('columns', 0)} columns",
                f"Data quality score: {_calculate_data_quality_score(dataset_analysis):.2f}",
                f"Missing values: {dataset_analysis.get('data_quality', {}).get('missing_values_total', 0)}"
            ],
            "recommendations": [
                "Upload complete to proceed with model training",
                "Review data quality metrics before training",
                "Consider feature engineering for better model performance"
            ]
        }

        response = {
            "session_id": session_id,
            "dataset_summary": dataset_summary,
            "dataset_insights": llm_insights,
            "dataset_analysis": dataset_analysis,
            "data_quality_score": _calculate_data_quality_score(dataset_analysis),
            "api_info": {
                **llm_service.provenance(),
                "generation_timestamp": datetime.now().isoformat()
            },
            "timestamp": datetime.now().isoformat()
        }

        logger.info(f"Session summary generated successfully for session {session_id}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating session summary for {session_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "SESSION_SUMMARY_ERROR",
                "message": "Failed to generate session summary",
                "session_id": session_id,
                "details": str(e)
            }
        )


def _calculate_data_quality_score(dataset_analysis: Dict[str, Any]) -> float:
    """Calculate overall data quality score"""
    if not dataset_analysis:
        return 0.0
    
    quality_factors = []
    
    # Completeness (missing values)
    data_quality = dataset_analysis.get("data_quality", {})
    completeness = data_quality.get("completeness", 0)
    quality_factors.append(completeness)
    
    # Uniqueness (duplicate rows)
    total_rows = dataset_analysis["dataset_info"]["rows"]
    duplicate_rows = dataset_analysis["dataset_info"]["duplicate_rows"]
    uniqueness = (total_rows - duplicate_rows) / total_rows if total_rows > 0 else 1.0
    quality_factors.append(uniqueness)
    
    # Consistency (constant columns penalty)
    constant_cols = len(data_quality.get("constant_columns", []))
    total_cols = dataset_analysis["dataset_info"]["columns"]
    consistency = (total_cols - constant_cols) / total_cols if total_cols > 0 else 1.0
    quality_factors.append(consistency)
    
    # Average quality score
    return sum(quality_factors) / len(quality_factors) if quality_factors else 0.0


def _get_model_file_size(model_id: str) -> str:
    """Get model file size in human-readable format"""
    try:
        from pathlib import Path
        model_path = Path("data/models") / f"{model_id}.joblib"
        if model_path.exists():
            size_bytes = model_path.stat().st_size
            if size_bytes < 1024:
                return f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                return f"{size_bytes / 1024:.1f} KB"
            else:
                return f"{size_bytes / (1024 * 1024):.1f} MB"
        else:
            return "Unknown"
    except:
        return "Unknown"


def _get_preprocessing_summary(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Get summary of preprocessing steps"""
    preprocessing_info = metadata.get('preprocessing_info', {})
    
    return {
        "numerical_features": len(preprocessing_info.get('numerical_cols', [])),
        "categorical_features": len(preprocessing_info.get('categorical_cols', [])),
        "steps": [
            "Missing value imputation",
            "Feature scaling (numerical)",
            "One-hot encoding (categorical)"
        ]
    }


@router.get("/{model_id}/insights")
async def get_model_insights(
    model_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get detailed insights about a specific model.

    **Parameters:**
    - model_id: The model ID to analyze

    **Returns:**
    - Detailed insights and recommendations
    """
    try:
        # Ownership check (prevents IDOR)
        verify_model_access(model_id, current_user, db)

        # Load model metadata
        pipeline, metadata = ml_processor.load_model(model_id)
        
        # Get dataset analysis if available
        session_id = metadata['session_id']
        file_path = file_handler.get_file_path(session_id)
        
        dataset_analysis = None
        if file_path:
            dataset_analysis = data_processor.generate_comprehensive_profile(
                file_path, metadata['target_column']
            )
        
        # Generate insights
        insights = _generate_model_insights(metadata, dataset_analysis)
        
        return {
            "model_id": model_id,
            "insights": insights,
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


@router.get("/{model_id}/llm-enhanced")
async def get_llm_enhanced_summary(
    model_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get LLM-enhanced comprehensive summary with natural language insights.

    This endpoint uses OpenRouter API with DeepSeek to generate:
    - Natural language dataset analysis
    - Model performance interpretation
    - Business-focused insights and recommendations
    - Actionable next steps

    **Parameters:**
    - model_id: Unique identifier of the trained model

    **Returns:**
    - Enhanced summary with LLM-generated insights
    """
    try:
        logger.info(f"Generating LLM-enhanced summary for model {model_id}")

        # Ownership check (prevents IDOR)
        verify_model_access(model_id, current_user, db)

        # Load model and metadata
        pipeline, metadata = ml_processor.load_model(model_id)

        # Get original dataset for analysis
        session_id = metadata['session_id']
        file_path = file_handler.get_file_path(session_id)

        if not file_path:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "DATASET_NOT_FOUND",
                    "message": f"Original dataset not found for session {session_id}",
                    "model_id": model_id
                }
            )

        # Generate comprehensive dataset analysis
        dataset_analysis = data_processor.generate_comprehensive_profile(
            file_path, metadata['target_column']
        )

        # Generate LLM-enhanced summaries — feed the real persisted metrics so the LLM
        # is grounded in actual numbers rather than inventing them. The three calls are
        # independent, so run them concurrently instead of sequentially.
        evaluation_metrics = metadata.get('evaluation_metrics', {}) or {}
        dataset_summary, model_summary, llm_insights = await asyncio.gather(
            llm_service.generate_dataset_summary(dataset_analysis),
            llm_service.generate_model_summary(metadata, dataset_analysis, evaluation_metrics),
            llm_service.generate_insights_and_recommendations(
                dataset_analysis, metadata, evaluation_metrics
            ),
        )

        # Prepare response
        response = {
            "model_id": model_id,
            "llm_enhanced_summaries": {
                "dataset_summary": dataset_summary,
                "model_summary": model_summary,
                "combined_summary": f"{model_summary}\n\nDataset Analysis: {dataset_summary}"
            },
            "llm_insights": llm_insights,
            "technical_details": {
                "algorithm": metadata.get('algorithm'),
                "problem_type": metadata.get('problem_type'),
                "feature_count": len(metadata.get('feature_names', [])),
                "target_column": metadata.get('target_column'),
                "dataset_shape": [
                    dataset_analysis["dataset_info"]["rows"],
                    dataset_analysis["dataset_info"]["columns"]
                ],
                "data_quality_score": _calculate_data_quality_score(dataset_analysis)
            },
            "api_info": {
                **llm_service.provenance(),
                "generation_timestamp": datetime.now().isoformat()
            },
            "timestamp": datetime.now().isoformat()
        }

        logger.info(f"LLM-enhanced summary generated successfully for model {model_id}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating LLM-enhanced summary for model {model_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "LLM_SUMMARY_ERROR",
                "message": "Failed to generate LLM-enhanced summary",
                "model_id": model_id,
                "details": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Error generating insights for model {model_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "INSIGHTS_ERROR",
                "message": "Failed to generate model insights",
                "model_id": model_id,
                "details": str(e)
            }
        )
