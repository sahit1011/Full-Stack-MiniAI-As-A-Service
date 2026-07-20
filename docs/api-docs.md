# 🔌 API Documentation - Klaro Assignment

## 📋 Overview

The Klaro API provides endpoints for CSV data analysis, machine learning model training, and predictions. All endpoints return JSON responses and use standard HTTP status codes.

**Base URL:** `http://localhost:8000`  
**API Documentation:** `http://localhost:8000/docs` (Swagger UI)

---

## 🔐 Authentication

Currently using session-based authentication with UUID tokens. Each uploaded file generates a unique session token for subsequent operations.

---

## 📊 Core Endpoints

### 1. Health Check

#### `GET /health`
Check if the API is running and healthy.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

---

### 2. File Upload

#### `POST /upload`
Upload a CSV file for analysis and processing.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:** Form data with file field

```bash
curl -X POST "http://localhost:8000/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sample_data.csv"
```

**Response:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "sample_data.csv",
  "file_size": 1024000,
  "rows": 1000,
  "columns": 15,
  "upload_timestamp": "2024-01-15T10:30:00Z",
  "schema": {
    "column_name": {
      "type": "numerical",
      "unique_values": 500,
      "null_percentage": 0.05,
      "is_high_cardinality": false,
      "is_constant": false
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file format or size
- `413 Payload Too Large`: File exceeds 50MB limit
- `422 Unprocessable Entity`: Invalid CSV format

---

### 3. Data Profiling

#### `GET /profile/{session_id}`
Get detailed statistical analysis of uploaded data.

**Parameters:**
- `session_id` (path): UUID of the uploaded file session

**Response:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "dataset_info": {
    "rows": 1000,
    "columns": 15,
    "memory_usage": "120KB",
    "missing_values_total": 25
  },
  "column_profiles": {
    "age": {
      "type": "numerical",
      "count": 1000,
      "mean": 35.5,
      "std": 12.3,
      "min": 18,
      "max": 65,
      "quartiles": [25, 35, 45],
      "outliers": [2, 98, 99],
      "skewness": 0.15,
      "null_count": 5,
      "null_percentage": 0.5
    },
    "category": {
      "type": "categorical",
      "count": 1000,
      "unique": 5,
      "top": "A",
      "freq": 300,
      "null_count": 0,
      "is_high_cardinality": false
    }
  },
  "correlations": {
    "age_income": 0.75,
    "age_experience": 0.85
  },
  "data_quality": {
    "completeness": 0.95,
    "consistency": 0.98,
    "potential_leakage": []
  }
}
```

---

### 4. Model Training

#### `POST /train`
Train a machine learning model on the uploaded data.

**Request Body:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "target_column": "target",
  "model_type": "auto",  // "auto", "classification", "regression"
  "algorithm": "random_forest",  // "random_forest", "logistic_regression", "xgboost"
  "test_size": 0.2,
  "random_state": 42
}
```

**Response:**
```json
{
  "model_id": "model_550e8400_20240115_103000",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "model_type": "classification",
  "algorithm": "random_forest",
  "training_info": {
    "training_samples": 800,
    "test_samples": 200,
    "features": 14,
    "target_column": "target",
    "training_time": 2.5
  },
  "evaluation_metrics": {
    "accuracy": 0.85,
    "precision": 0.83,
    "recall": 0.87,
    "f1_score": 0.85,
    "confusion_matrix": [[45, 5], [8, 42]]
  },
  "feature_importance": {
    "age": 0.25,
    "income": 0.20,
    "experience": 0.18
  },
  "model_path": "/data/models/model_550e8400_20240115_103000.joblib"
}
```

---

### 5. Predictions

#### `POST /predict`
Make predictions using a trained model.

**Request Body:**
```json
{
  "model_id": "model_550e8400_20240115_103000",
  "data": [
    {
      "age": 30,
      "income": 50000,
      "experience": 5
    },
    {
      "age": 45,
      "income": 75000,
      "experience": 15
    }
  ]
}
```

**Response:**
```json
{
  "model_id": "model_550e8400_20240115_103000",
  "predictions": [
    {
      "prediction": 1,
      "confidence": 0.85,
      "probabilities": {
        "class_0": 0.15,
        "class_1": 0.85
      }
    },
    {
      "prediction": 0,
      "confidence": 0.92,
      "probabilities": {
        "class_0": 0.92,
        "class_1": 0.08
      }
    }
  ],
  "prediction_timestamp": "2024-01-15T10:35:00Z"
}
```

---

### 6. Model Summary

#### `GET /summary/{model_id}`
Get a comprehensive summary of the trained model and dataset.

**Response:**
```json
{
  "model_id": "model_550e8400_20240115_103000",
  "dataset_summary": {
    "total_rows": 1000,
    "total_columns": 15,
    "target_column": "target",
    "target_distribution": {
      "class_0": 500,
      "class_1": 500
    }
  },
  "model_summary": {
    "algorithm": "random_forest",
    "model_type": "classification",
    "performance": {
      "accuracy": 0.85,
      "f1_score": 0.85
    },
    "top_features": [
      {"name": "age", "importance": 0.25},
      {"name": "income", "importance": 0.20},
      {"name": "experience", "importance": 0.18}
    ]
  },
  "insights": {
    "data_quality_score": 0.95,
    "model_confidence": "high",
    "recommendations": [
      "Model shows good performance with 85% accuracy",
      "Age is the most important feature for predictions",
      "Consider collecting more data for minority class"
    ]
  },
  "natural_language_summary": "This classification model predicts target outcomes with 85% accuracy. The model was trained on 1000 samples with 15 features. Age, income, and experience are the most important predictors."
}
```

---

## 📝 Request/Response Formats

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "target_column",
      "issue": "Column not found in dataset"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### HTTP Status Codes
- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `404 Not Found`: Resource not found
- `413 Payload Too Large`: File too large
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Server error

---

## 🔧 Usage Examples

### Complete Workflow Example

```bash
# 1. Upload CSV file
curl -X POST "http://localhost:8000/upload" \
  -F "file=@data.csv"

# Response: {"session_id": "550e8400-e29b-41d4-a716-446655440000", ...}

# 2. Get data profile
curl "http://localhost:8000/profile/550e8400-e29b-41d4-a716-446655440000"

# 3. Train model
curl -X POST "http://localhost:8000/train" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "target_column": "target",
    "algorithm": "random_forest"
  }'

# Response: {"model_id": "model_550e8400_20240115_103000", ...}

# 4. Make predictions
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "model_550e8400_20240115_103000",
    "data": [{"age": 30, "income": 50000}]
  }'

# 5. Get model summary
curl "http://localhost:8000/summary/model_550e8400_20240115_103000"
```

---

## 🚀 Rate Limits & Constraints

### File Upload Limits
- **Max file size:** 50MB
- **Supported formats:** CSV only
- **Max columns:** 1000
- **Max rows:** 1,000,000

### Session Management
- **Session duration:** 24 hours
- **Max concurrent sessions:** 100
- **Cleanup:** Automatic cleanup of expired sessions

### Model Limits
- **Max models per session:** 10
- **Model storage duration:** 7 days
- **Max prediction batch size:** 1000 rows

---

## 🔍 Testing the API

### Using Swagger UI
Visit `http://localhost:8000/docs` for interactive API testing.

### Using Postman
Import the OpenAPI specification from `http://localhost:8000/openapi.json`.

### Using curl
See examples above for command-line testing.
