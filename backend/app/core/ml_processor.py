"""
Machine Learning processing utilities for model training and prediction
"""
import pandas as pd
import numpy as np
import joblib
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple, Union
from pathlib import Path
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Set up logger
logger = logging.getLogger(__name__)

# ML imports
from sklearn.model_selection import (
    train_test_split, RandomizedSearchCV, cross_val_score, StratifiedKFold, KFold
)
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge, Lasso
from sklearn.svm import SVC, SVR
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.naive_bayes import GaussianNB
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    mean_squared_error, r2_score, mean_absolute_error,
    classification_report, confusion_matrix,
    roc_auc_score, balanced_accuracy_score, explained_variance_score,
)
try:
    from sklearn.metrics import mean_absolute_percentage_error
except ImportError:  # older sklearn without MAPE
    mean_absolute_percentage_error = None
from sklearn.pipeline import Pipeline
import xgboost as xgb

from .data_processor import data_processor
from .storage import storage


class MLProcessor:
    """Handles machine learning model training and prediction"""
    
    def __init__(self):
        self.models_dir = Path("data/models")
        self.models_dir.mkdir(parents=True, exist_ok=True)
        
        # Algorithm registry: algorithm -> problem_type -> (estimator class, default params).
        # Classes (not instances) so a fresh, isolated estimator is built per training run.
        # Only problem types an algorithm genuinely supports are listed — anything missing is
        # rejected at train time rather than silently substituted with a different model.
        # (random_state is only set for estimators that accept it.)
        self.algorithm_registry = {
            "random_forest": {
                "classification": (RandomForestClassifier, {"n_estimators": 100, "random_state": 42}),
                "regression": (RandomForestRegressor, {"n_estimators": 100, "random_state": 42}),
            },
            "logistic_regression": {
                "classification": (LogisticRegression, {"random_state": 42, "max_iter": 1000}),
                "regression": (LinearRegression, {}),
            },
            "xgboost": {
                "classification": (xgb.XGBClassifier, {"random_state": 42, "eval_metric": "logloss"}),
                "regression": (xgb.XGBRegressor, {"random_state": 42}),
            },
            "svm": {
                # probability=True so classification confidence is a real calibrated-ish proba
                "classification": (SVC, {"probability": True, "random_state": 42}),
                "regression": (SVR, {}),
            },
            "knn": {
                "classification": (KNeighborsClassifier, {}),
                "regression": (KNeighborsRegressor, {}),
            },
            "naive_bayes": {
                # Gaussian NB is classification-only — no honest regression counterpart
                "classification": (GaussianNB, {}),
            },
            "decision_tree": {
                "classification": (DecisionTreeClassifier, {"random_state": 42}),
                "regression": (DecisionTreeRegressor, {"random_state": 42}),
            },
            "ridge": {
                "regression": (Ridge, {"random_state": 42}),
            },
            "lasso": {
                "regression": (Lasso, {"random_state": 42}),
            },
        }

        # RandomizedSearch grids (keys prefixed "model__" for the Pipeline step). Params that
        # don't apply to a given estimator are filtered out at tune time, so a single grid per
        # algorithm safely covers both its classification and regression heads.
        self.param_distributions = {
            "random_forest": {
                "model__n_estimators": [100, 200, 300],
                "model__max_depth": [None, 10, 20, 30],
                "model__min_samples_split": [2, 5, 10],
                "model__max_features": ["sqrt", "log2", None],
            },
            "xgboost": {
                "model__n_estimators": [100, 200, 300],
                "model__max_depth": [3, 5, 7],
                "model__learning_rate": [0.01, 0.05, 0.1, 0.3],
                "model__subsample": [0.8, 1.0],
            },
            "logistic_regression": {  # classification head only; LinearRegression has none of these
                "model__C": [0.01, 0.1, 1, 10],
            },
            "svm": {
                "model__C": [0.1, 1, 10],
                "model__gamma": ["scale", "auto"],
                "model__kernel": ["rbf", "linear"],
            },
            "knn": {
                "model__n_neighbors": [3, 5, 7, 11],
                "model__weights": ["uniform", "distance"],
            },
            "decision_tree": {
                "model__max_depth": [None, 5, 10, 20],
                "model__min_samples_split": [2, 5, 10],
            },
            "ridge": {"model__alpha": [0.1, 1.0, 10.0, 100.0]},
            "lasso": {"model__alpha": [0.001, 0.01, 0.1, 1.0]},
        }

        # n_iter budget per optimization level (capped by grid size at tune time)
        self.optimization_budgets = {"none": 0, "fast": 8, "medium": 20, "thorough": 40}

    def get_supported_algorithms(self) -> Dict[str, List[str]]:
        """Map of algorithm -> the problem types it genuinely supports (for API validation/UX)."""
        return {algo: sorted(by_type.keys()) for algo, by_type in self.algorithm_registry.items()}
    
    def generate_model_id(self, session_id: str) -> str:
        """Generate unique model ID"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"model_{session_id[:8]}_{timestamp}"
    
    def train_model(
        self,
        file_path: Path = None,
        target_column: str = None,
        session_id: str = None,
        model_type: str = "auto",
        algorithm: str = "random_forest",
        test_size: float = 0.2,
        random_state: int = 42,
        optimization_level: str = "none",
        model_id: str = None,
        X_train: Any = None,
        X_test: Any = None,
        y_train: Any = None,
        y_test: Any = None
    ) -> Dict[str, Any]:
        """Train a machine learning model"""
        try:
            # Check if pre-processed data is provided
            if X_train is not None and X_test is not None and y_train is not None and y_test is not None:
                # Use provided pre-processed data
                logger.info("Using pre-processed data for training")
                X_train_processed = X_train
                X_test_processed = X_test
                y_train_processed = y_train
                y_test_processed = y_test

                # Infer problem type from target
                if model_type == "auto":
                    problem_type = self.detect_problem_type(pd.DataFrame({'target': y_train}), 'target')
                else:
                    problem_type = model_type
            else:
                # Load data from file
                if file_path is None:
                    raise ValueError("Either file_path or pre-processed data must be provided")

                df = pd.read_csv(file_path)

                # Validate target column
                if target_column not in df.columns:
                    raise ValueError(f"Target column '{target_column}' not found in dataset")

                # Prepare features and target
                X, y = data_processor.prepare_features_and_target(df, target_column)

                # Infer problem type if auto
                if model_type == "auto":
                    problem_type = data_processor.infer_problem_type(y)
                else:
                    problem_type = model_type

                # Create preprocessing pipeline
                preprocessor = data_processor.create_preprocessing_pipeline(X)

                # Split and preprocess data
                from sklearn.model_selection import train_test_split
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=test_size, random_state=random_state,
                    stratify=y if problem_type == "classification" else None
                )

                X_train_processed = preprocessor.fit_transform(X_train)
                X_test_processed = preprocessor.transform(X_test)
                y_train_processed = y_train
                y_test_processed = y_test

            if problem_type not in ["classification", "regression"]:
                raise ValueError(f"Invalid problem type: {problem_type}")

            # Resolve the estimator — never silently substitute a different algorithm.
            if algorithm not in self.algorithm_registry:
                supported = sorted(self.algorithm_registry.keys())
                raise ValueError(f"Unsupported algorithm '{algorithm}'. Supported algorithms: {supported}")

            if problem_type not in self.algorithm_registry[algorithm]:
                supported_types = sorted(self.algorithm_registry[algorithm].keys())
                raise ValueError(
                    f"Algorithm '{algorithm}' does not support {problem_type}. "
                    f"It supports: {supported_types}."
                )

            # Build a fresh estimator instance for this run (registry holds classes, not instances)
            model_class, model_params = self.algorithm_registry[algorithm][problem_type]
            model = model_class(**model_params)

            # ---- Class imbalance handling (classification only) ----
            # If the minority class is under-represented, give the estimator a fighting chance:
            # prefer class_weight="balanced" when supported, else XGBoost's scale_pos_weight.
            imbalance_handling = False
            if problem_type == "classification":
                try:
                    y_train_series = pd.Series(np.asarray(y_train_processed))
                    class_counts = y_train_series.value_counts()
                    n_train = int(class_counts.sum())
                    minority_fraction = (class_counts.min() / n_train) if n_train > 0 else 1.0
                    if minority_fraction < 0.2:
                        if "class_weight" in model.get_params():
                            new_params = dict(model_params)
                            new_params["class_weight"] = "balanced"
                            model = model_class(**new_params)
                            imbalance_handling = True
                        elif algorithm == "xgboost" and len(class_counts) == 2:
                            # binary: scale_pos_weight = n_negative / n_positive
                            sorted_counts = class_counts.sort_index()
                            n_negative = int(sorted_counts.iloc[0])
                            n_positive = int(sorted_counts.iloc[1])
                            if n_positive > 0:
                                new_params = dict(model_params)
                                new_params["scale_pos_weight"] = n_negative / n_positive
                                model = model_class(**new_params)
                                imbalance_handling = True
                except Exception as e:
                    logger.warning(f"Class imbalance check failed, training without balancing: {e}")

            # Create pipeline with preprocessing and model
            from sklearn.pipeline import Pipeline
            pipeline = Pipeline([
                ('preprocessor', preprocessor),
                ('model', model)
            ])

            # ---- Cross-validation splitter + scoring (shared by CV and tuning) ----
            n_train_samples = len(y_train_processed)
            if problem_type == "classification":
                try:
                    smallest_class_count = int(pd.Series(np.asarray(y_train_processed)).value_counts().min())
                except Exception:
                    smallest_class_count = 2
                cv_folds = max(2, min(5, smallest_class_count))
                cv_splitter = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
                cv_scoring = "f1_weighted"
            else:
                cv_folds = min(5, max(2, n_train_samples))
                cv_splitter = KFold(n_splits=cv_folds, shuffle=True, random_state=42)
                cv_scoring = "r2"

            # ---- Cross-validation (always; cheap, honest signal on the TRAINING split) ----
            cv_mean = None
            cv_std = None
            try:
                cv_scores = cross_val_score(
                    pipeline, X_train, y_train_processed,
                    cv=cv_splitter, scoring=cv_scoring, n_jobs=-1
                )
                cv_mean = float(np.mean(cv_scores))
                cv_std = float(np.std(cv_scores))
            except Exception as e:
                logger.warning(f"Cross-validation failed, continuing without CV metrics: {e}")
                cv_mean = None
                cv_std = None

            # ---- Hyperparameter tuning (only when requested and enough data) ----
            best_params = None
            tuned = False
            do_tune = optimization_level != "none" and n_train_samples >= 200
            if do_tune:
                raw_grid = self.param_distributions.get(algorithm, {})
                supported_model_params = pipeline.named_steps['model'].get_params()
                filtered_grid = {
                    k: v for k, v in raw_grid.items()
                    if k.startswith("model__") and k[len("model__"):] in supported_model_params
                }
                if filtered_grid:
                    # n_iter capped by total grid size so we never request more combos than exist
                    grid_size = 1
                    for v in filtered_grid.values():
                        grid_size *= len(v)
                    budget = self.optimization_budgets.get(optimization_level, 0)
                    n_iter = min(budget, grid_size)
                    if n_iter >= 1:
                        try:
                            search = RandomizedSearchCV(
                                pipeline,
                                param_distributions=filtered_grid,
                                n_iter=n_iter,
                                cv=cv_splitter,
                                scoring=cv_scoring,
                                n_jobs=-1,
                                random_state=42,
                                refit=True,
                            )
                            search.fit(X_train, y_train_processed)
                            pipeline = search.best_estimator_  # already fitted
                            best_params = {k: self._jsonable(v) for k, v in search.best_params_.items()}
                            tuned = True
                        except Exception as e:
                            logger.warning(f"Hyperparameter tuning failed, falling back to untuned model: {e}")
                            tuned = False

            # Fit the untuned pipeline only if tuning didn't already produce a fitted estimator
            if not tuned:
                pipeline.fit(X_train, y_train_processed)

            # Make predictions using the pipeline
            y_pred = pipeline.predict(X_test)

            # Probabilities for classification metrics (roc_auc) when the model supports it
            y_proba = None
            if hasattr(pipeline.named_steps['model'], 'predict_proba'):
                try:
                    y_proba = pipeline.predict_proba(X_test)
                except Exception:
                    y_proba = None

            # Calculate metrics
            metrics = self._calculate_metrics(y_test_processed, y_pred, problem_type, y_proba=y_proba)
            # Attach honest CV signal
            metrics["cv_mean"] = cv_mean
            metrics["cv_std"] = cv_std
            logger.info(f"Calculated metrics: {metrics}")

            # Get feature importance — pass the full pipeline (the helper needs both the
            # fitted model and the preprocessor to map importances back to feature names).
            # Previously the bare estimator was passed, so .named_steps always threw and
            # feature_importance was silently empty for every model.
            try:
                feature_importance = self._get_feature_importance(pipeline, X)
            except Exception as e:
                logger.warning(f"Could not extract feature importance: {e}")
                feature_importance = {}

            # Regression: capture the test-residual std so predict() can return honest
            # prediction intervals (pred ± 1.96·σ) instead of a meaningless scalar "confidence".
            residual_std = None
            if problem_type == "regression":
                try:
                    residual_std = float(
                        np.std(np.asarray(y_test_processed, dtype=float) - np.asarray(y_pred, dtype=float))
                    )
                except Exception as e:
                    logger.warning(f"Could not compute residual std: {e}")
                    residual_std = None

            # Generate model ID and save
            # Use a caller-supplied id (async-job flow pre-registers it) or generate one
            model_id = model_id or self.generate_model_id(session_id or "enhanced")

            # Store original feature names (before preprocessing) for prediction
            original_feature_names = X.columns.tolist() if hasattr(X, 'columns') else [f'feature_{i}' for i in range(X.shape[1])]

            model_path = self._save_model(pipeline, model_id, {
                'session_id': session_id or "enhanced",
                'target_column': target_column or "target",
                'problem_type': problem_type,
                'algorithm': algorithm,
                'feature_names': original_feature_names,  # Store original feature names
                'evaluation_metrics': metrics,  # Include evaluation metrics (incl. cv_mean/cv_std)
                'feature_importance': feature_importance,  # Include feature importance
                'optimization_level': optimization_level,
                'tuned': tuned,
                'best_params': best_params,
                'class_weight_applied': imbalance_handling,
                'residual_std': residual_std,  # for regression prediction intervals
                'timestamp': datetime.now(),  # Include timestamp
                'preprocessing_info': {
                    'enhanced_preprocessing': False,  # This is the regular training method
                    'original_feature_names': original_feature_names,
                    'numerical_cols': X.select_dtypes(include=['int64', 'float64']).columns.tolist(),
                    'categorical_cols': X.select_dtypes(include=['object', 'category']).columns.tolist()
                }
            })

            # Training info
            training_info = {
                "features_count": X_train_processed.shape[1] if hasattr(X_train_processed, 'shape') else len(X_train_processed[0]),
                "target_column": target_column or "target",
                "problem_type": problem_type,
                "algorithm": algorithm,
                "test_size": test_size,
                "training_samples": len(X_train_processed),
                "test_samples": len(X_test_processed),
                "optimization_level": optimization_level,
                "tuned": tuned,
                "best_params": best_params,
                "class_weight_applied": imbalance_handling,
            }

            result = {
                "model_id": model_id,
                "session_id": session_id or "enhanced",
                "model_type": problem_type,
                "algorithm": algorithm,
                "training_info": training_info,
                "evaluation_metrics": metrics,
                "feature_importance": feature_importance,
                "model_path": str(model_path),
                "timestamp": datetime.now()
            }

            logger.info(f"Training result structure: {result}")
            return result
            
        except Exception as e:
            raise ValueError(f"Model training failed: {str(e)}")
    
    @staticmethod
    def _jsonable(value):
        """Cast numpy scalars/arrays to plain Python types so results stay JSON-serializable."""
        if isinstance(value, (np.integer,)):
            return int(value)
        if isinstance(value, (np.floating,)):
            return float(value)
        if isinstance(value, (np.bool_,)):
            return bool(value)
        if isinstance(value, np.ndarray):
            return value.tolist()
        return value

    def _calculate_metrics(self, y_true, y_pred, problem_type: str, y_proba=None) -> Dict[str, Any]:
        """Calculate evaluation metrics based on problem type"""
        metrics = {}

        if problem_type == "classification":
            metrics.update({
                "accuracy": float(accuracy_score(y_true, y_pred)),
                "precision": float(precision_score(y_true, y_pred, average='weighted', zero_division=0)),
                "recall": float(recall_score(y_true, y_pred, average='weighted', zero_division=0)),
                "f1_score": float(f1_score(y_true, y_pred, average='weighted', zero_division=0)),
                "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
            })

            # Full per-class report (precision/recall/f1/support per class)
            try:
                report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
                # Cast every nested numpy value to plain Python for JSON safety
                metrics["per_class_report"] = {
                    label: ({k: self._jsonable(v) for k, v in stats.items()}
                            if isinstance(stats, dict) else self._jsonable(stats))
                    for label, stats in report.items()
                }
            except Exception as e:
                logger.warning(f"Could not compute per-class report: {e}")

            # Confusion matrix for ALL classes (not just binary)
            try:
                cm = confusion_matrix(y_true, y_pred)
                metrics["confusion_matrix"] = cm.tolist()
            except Exception as e:
                logger.warning(f"Could not compute confusion matrix: {e}")

            # ROC AUC when probabilities are available
            if y_proba is not None:
                try:
                    classes = np.unique(y_true)
                    if len(classes) == 2:
                        metrics["roc_auc"] = float(roc_auc_score(y_true, y_proba[:, 1]))
                    else:
                        metrics["roc_auc"] = float(
                            roc_auc_score(y_true, y_proba, multi_class="ovr", average="weighted")
                        )
                except Exception as e:
                    logger.warning(f"Could not compute ROC AUC: {e}")

        else:  # regression
            metrics.update({
                "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
                "mae": float(mean_absolute_error(y_true, y_pred)),
                "r2_score": float(r2_score(y_true, y_pred)),
                "explained_variance": float(explained_variance_score(y_true, y_pred)),
            })

            # MAPE — guard against zero targets (division by zero) and missing sklearn impl
            try:
                y_true_arr = np.asarray(y_true, dtype=float)
                if mean_absolute_percentage_error is not None and not np.any(y_true_arr == 0):
                    metrics["mape"] = float(mean_absolute_percentage_error(y_true, y_pred))
                else:
                    mask = y_true_arr != 0
                    if np.any(mask):
                        y_pred_arr = np.asarray(y_pred, dtype=float)
                        metrics["mape"] = float(
                            np.mean(np.abs((y_true_arr[mask] - y_pred_arr[mask]) / y_true_arr[mask]))
                        )
            except Exception as e:
                logger.warning(f"Could not compute MAPE: {e}")

        return metrics
    
    def _get_feature_importance(self, pipeline, X: pd.DataFrame) -> Dict[str, float]:
        """Extract feature importance from trained model"""
        try:
            model = pipeline.named_steps['model']
            
            # Get feature importance if available
            if hasattr(model, 'feature_importances_'):
                importances = model.feature_importances_
                
                # Get feature names after preprocessing
                feature_names = data_processor.get_feature_names_after_preprocessing(
                    pipeline.named_steps['preprocessor'], X
                )
                
                # Create importance dictionary
                if len(feature_names) == len(importances):
                    importance_dict = dict(zip(feature_names, importances))
                    # Sort by importance and return top features
                    sorted_importance = dict(sorted(importance_dict.items(), key=lambda x: x[1], reverse=True))
                    return {k: float(v) for k, v in list(sorted_importance.items())[:10]}  # Top 10 features
                else:
                    # Fallback to original column names
                    return dict(zip(X.columns[:len(importances)], importances))
            
            elif hasattr(model, 'coef_'):
                # For linear models
                coefficients = np.abs(model.coef_).flatten() if model.coef_.ndim > 1 else np.abs(model.coef_)
                feature_names = data_processor.get_feature_names_after_preprocessing(
                    pipeline.named_steps['preprocessor'], X
                )
                
                if len(feature_names) == len(coefficients):
                    importance_dict = dict(zip(feature_names, coefficients))
                    sorted_importance = dict(sorted(importance_dict.items(), key=lambda x: x[1], reverse=True))
                    return {k: float(v) for k, v in list(sorted_importance.items())[:10]}
                else:
                    return dict(zip(X.columns[:len(coefficients)], coefficients))
            
            else:
                return {}
                
        except Exception as e:
            print(f"Warning: Could not extract feature importance: {e}")
            return {}
    
    def _save_model(self, pipeline, model_id: str, metadata: Dict[str, Any]) -> Path:
        """Save trained model and metadata to disk, mirrored to Supabase Storage."""
        model_path = self.models_dir / f"{model_id}.joblib"
        metadata_path = self.models_dir / f"{model_id}_metadata.joblib"

        # Save model
        joblib.dump(pipeline, model_path)

        # Save metadata
        joblib.dump(metadata, metadata_path)

        # Write-through so the trained model survives a redeploy (no-op when storage
        # is not configured — local disk is authoritative then).
        storage.upload(model_path, f"models/{model_id}.joblib")
        storage.upload(metadata_path, f"models/{model_id}_metadata.joblib")

        return model_path

    def load_model(self, model_id: str) -> Tuple[Pipeline, Dict[str, Any]]:
        """Load trained model and metadata from disk.

        On a local cache miss (e.g. after a redeploy wiped the disk), restore the
        artifacts from Supabase Storage before loading.
        """
        model_path = self.models_dir / f"{model_id}.joblib"
        metadata_path = self.models_dir / f"{model_id}_metadata.joblib"

        if not model_path.exists():
            storage.download_to(f"models/{model_id}.joblib", model_path)
        if not metadata_path.exists():
            storage.download_to(f"models/{model_id}_metadata.joblib", metadata_path)

        if not model_path.exists():
            raise ValueError(f"Model {model_id} not found")

        if not metadata_path.exists():
            raise ValueError(f"Model metadata for {model_id} not found")

        # Load model and metadata
        pipeline = joblib.load(model_path)
        metadata = joblib.load(metadata_path)

        return pipeline, metadata

    def load_data(self, file_path: Path) -> pd.DataFrame:
        """Load CSV data for processing"""
        try:
            df = pd.read_csv(file_path)
            return df
        except Exception as e:
            logger.error(f"Error loading CSV file {file_path}: {str(e)}")
            raise ValueError(f"Failed to load CSV file: {str(e)}")

    def detect_problem_type(self, df: pd.DataFrame, target_column: str) -> str:
        """Detect whether the problem is classification or regression"""
        try:
            target_data = df[target_column].dropna()

            # Check if target is numeric
            if pd.api.types.is_numeric_dtype(target_data):
                # Check cardinality
                unique_ratio = target_data.nunique() / len(target_data)

                # If low cardinality (< 10 unique values or < 5% unique), likely classification
                if target_data.nunique() <= 10 or unique_ratio < 0.05:
                    return "classification"
                else:
                    return "regression"
            else:
                # Non-numeric target is classification
                return "classification"

        except Exception as e:
            logger.error(f"Error detecting problem type: {str(e)}")
            # Default to classification if detection fails
            return "classification"

    def predict(self, model_id: str, input_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Make predictions using a trained model"""
        try:
            # Load model and metadata
            pipeline, metadata = self.load_model(model_id)

            # Convert input data to DataFrame
            df = pd.DataFrame(input_data)

            # Validate input features
            expected_features = metadata['feature_names']
            missing_features = set(expected_features) - set(df.columns)
            if missing_features:
                raise ValueError(f"Missing required features: {list(missing_features)}")

            # Select only expected features in correct order
            df = df[expected_features]

            # Make predictions
            predictions = pipeline.predict(df)

            # Get prediction probabilities for classification
            probabilities = None
            if hasattr(pipeline.named_steps['model'], 'predict_proba'):
                try:
                    proba = pipeline.predict_proba(df)
                    if proba is not None:
                        classes = pipeline.named_steps['model'].classes_
                        probabilities = []
                        for prob_row in proba:
                            prob_dict = {f"class_{cls}": float(prob) for cls, prob in zip(classes, prob_row)}
                            probabilities.append(prob_dict)
                except:
                    probabilities = None

            # Calculate confidence scores
            problem_type = metadata['problem_type']
            confidence_scores = self._calculate_confidence_scores(pipeline, df, problem_type)

            # Regression: honest ~95% prediction interval from the stored test-residual std
            residual_std = metadata.get('residual_std') if problem_type == "regression" else None

            # Format results
            results = []
            for i, pred in enumerate(predictions):
                pred_value = self._convert_prediction_type(pred)
                result = {
                    "prediction": pred_value,
                    # Real probability-derived confidence, or null when the model can't produce one
                    # (e.g. regression, or a classifier without predict_proba) — never a fabricated number
                    "confidence": float(confidence_scores[i]) if confidence_scores is not None else None
                }

                if probabilities and i < len(probabilities):
                    result["probabilities"] = probabilities[i]

                # Attach a real prediction interval for regression (pred ± 1.96·σ_residual)
                if residual_std is not None and isinstance(pred_value, (int, float)):
                    margin = 1.96 * residual_std
                    result["interval_low"] = float(pred_value - margin)
                    result["interval_high"] = float(pred_value + margin)

                results.append(result)

            return {
                "model_id": model_id,
                "predictions": results,
                "prediction_timestamp": datetime.now()
            }

        except Exception as e:
            raise ValueError(f"Prediction failed: {str(e)}")

    def _calculate_confidence_scores(self, pipeline, X: pd.DataFrame, problem_type: str) -> Optional[List[float]]:
        """
        Real per-prediction confidence for classification (max class probability).

        Returns None for regression — a single scalar "confidence" is not a meaningful quantity
        for a continuous prediction. (Honest prediction intervals are a planned P1 upgrade; until
        then we return null rather than the old fabricated 1/(1+std) batch statistic.)
        """
        try:
            if problem_type == "classification" and hasattr(pipeline.named_steps['model'], 'predict_proba'):
                proba = pipeline.predict_proba(X)
                return [float(np.max(prob)) for prob in proba]
            return None
        except Exception:
            return None

    def _convert_prediction_type(self, prediction):
        """Convert prediction to JSON-serializable type"""
        if isinstance(prediction, (np.integer, np.int64, np.int32)):
            return int(prediction)
        elif isinstance(prediction, (np.floating, np.float64, np.float32)):
            return float(prediction)
        elif isinstance(prediction, np.bool_):
            return bool(prediction)
        else:
            return str(prediction)

    def get_model_summary(self, model_id: str) -> Dict[str, Any]:
        """Get comprehensive model summary"""
        try:
            # Load model and metadata
            pipeline, metadata = self.load_model(model_id)

            # Basic model info with safe access
            model_summary = {
                "model_id": model_id,
                "algorithm": metadata.get('algorithm', 'unknown'),
                "problem_type": metadata.get('problem_type', 'unknown'),
                "target_column": metadata.get('target_column', 'unknown'),
                "feature_count": len(metadata.get('feature_names', [])),
                "created_timestamp": metadata.get('timestamp', 'Unknown'),
                "evaluation_metrics": metadata.get('evaluation_metrics', {})
            }

            # Dataset summary with safe access
            preprocessing_info = metadata.get('preprocessing_info', {})
            dataset_summary = {
                "session_id": metadata.get('session_id', 'unknown'),
                "features": metadata.get('feature_names', []),
                "numerical_features": preprocessing_info.get('numerical_cols', []),
                "categorical_features": preprocessing_info.get('categorical_cols', [])
            }

            return {
                "model_id": model_id,
                "dataset_summary": dataset_summary,
                "model_summary": model_summary,
                "timestamp": datetime.now()
            }

        except Exception as e:
            raise ValueError(f"Failed to get model summary: {str(e)}")


# Global ML processor instance
ml_processor = MLProcessor()
