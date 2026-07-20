"""
Pydantic models for prediction endpoints
"""
from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field
from datetime import datetime


class TrainRequest(BaseModel):
    """Request model for model training"""
    session_id: str = Field(..., description="Session identifier")
    target_column: str = Field(..., description="Target column name")
    model_type: str = Field(default="auto", description="Model type: auto, classification, regression")
    algorithm: str = Field(default="random_forest", description="Algorithm: random_forest, logistic_regression, xgboost")
    test_size: float = Field(default=0.2, description="Test set size (0.1-0.5)")
    random_state: int = Field(default=42, description="Random state for reproducibility")


class TrainResponse(BaseModel):
    """Response model for model training"""
    model_id: str = Field(..., description="Unique model identifier")
    session_id: str = Field(..., description="Session identifier")
    model_type: str = Field(..., description="Model type (classification/regression)")
    algorithm: str = Field(..., description="Algorithm used")
    training_info: Dict[str, Any] = Field(..., description="Training information")
    evaluation_metrics: Dict[str, Any] = Field(..., description="Model evaluation metrics")
    feature_importance: Dict[str, float] = Field(..., description="Feature importance scores")
    model_path: str = Field(..., description="Path to saved model")
    timestamp: datetime = Field(default_factory=datetime.now)


class PredictRequest(BaseModel):
    """Request model for predictions"""
    model_id: str = Field(..., description="Model identifier")
    data: List[Dict[str, Any]] = Field(..., description="Input data for predictions")


class PredictionResult(BaseModel):
    """Single prediction result"""
    prediction: Union[int, float, str] = Field(..., description="Predicted value")
    confidence: Optional[float] = Field(
        None,
        description="Prediction confidence (max class probability). Null for regression or models "
                    "without probability estimates — never a fabricated value.",
    )
    probabilities: Optional[Dict[str, float]] = Field(None, description="Class probabilities (classification only)")
    interval_low: Optional[float] = Field(
        None, description="Lower bound of the ~95% prediction interval (regression only)."
    )
    interval_high: Optional[float] = Field(
        None, description="Upper bound of the ~95% prediction interval (regression only)."
    )


class PredictResponse(BaseModel):
    """Response model for predictions"""
    model_id: str = Field(..., description="Model identifier")
    predictions: List[PredictionResult] = Field(..., description="Prediction results")
    prediction_timestamp: datetime = Field(default_factory=datetime.now)


class ModelSummaryResponse(BaseModel):
    """Response model for model summary"""
    model_id: str = Field(..., description="Model identifier")
    dataset_summary: Dict[str, Any] = Field(..., description="Dataset summary")
    model_summary: Dict[str, Any] = Field(..., description="Model summary")
    insights: Dict[str, Any] = Field(..., description="Generated insights")
    natural_language_summary: str = Field(..., description="Human-readable summary")
    timestamp: datetime = Field(default_factory=datetime.now)
