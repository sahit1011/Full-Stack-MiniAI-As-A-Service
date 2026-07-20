# 📋 Klaro Assignment - Task Breakdown

## 🎯 Project Overview
Building a **Mini AI Analyst as a Service (AaaS)** with FastAPI backend and React frontend.

---

## 📅 Development Phases

### Phase 1: Project Setup & Infrastructure
- [ ] **Task 1.1:** Create project structure
- [ ] **Task 1.2:** Setup FastAPI backend with basic configuration
- [ ] **Task 1.3:** Setup React/Next.js frontend
- [ ] **Task 1.4:** Configure Docker environment
- [ ] **Task 1.5:** Setup basic testing framework
- [ ] **Task 1.6:** Initialize Git repository and documentation

### Phase 2: Backend Core - CSV Processing
- [ ] **Task 2.1:** Implement file upload endpoint (`/upload`)
  - File validation (CSV, size limits)
  - Streaming file processing
  - Session token generation (UUID)
- [ ] **Task 2.2:** Build schema inference engine
  - Column type detection (categorical, numerical, datetime, boolean)
  - Unique value counts
  - Null percentage calculation
  - High cardinality and constant column detection
- [ ] **Task 2.3:** Implement data profiling endpoint (`/profile`)
  - Outlier detection
  - Skewness calculation
  - Pairwise correlations
  - Imbalanced column identification
  - Data leakage detection

### Phase 3: Machine Learning Pipeline
- [ ] **Task 3.1:** Build preprocessing pipeline
  - Categorical encoding (One-hot, Label encoding)
  - Missing data handling
  - Feature scaling/normalization
- [ ] **Task 3.2:** Implement model training endpoint (`/train`)
  - Target column detection/selection
  - Model selection (RandomForest, LogisticRegression, XGBoost)
  - Classification vs Regression detection
  - Model persistence to disk
- [ ] **Task 3.3:** Add model evaluation
  - Classification metrics (accuracy, precision, recall, F1)
  - Regression metrics (RMSE, R², MAE)
  - Feature importance extraction
  - Optional: SHAP values integration

### Phase 4: Inference & Insights
- [ ] **Task 4.1:** Build prediction endpoint (`/predict`)
  - Model loading from disk
  - Input validation and preprocessing
  - Prediction generation with confidence scores
- [ ] **Task 4.2:** Implement summary endpoint (`/summary`)
  - Dataset statistics summary
  - Model performance summary
  - Top predictors identification
  - Natural language summary generation

### Phase 5: Frontend Development
- [ ] **Task 5.1:** Create main dashboard layout
  - Navigation structure
  - Responsive design
  - Loading states and error handling
- [ ] **Task 5.2:** Build file upload component
  - Drag & drop functionality
  - Upload progress indicator
  - File validation feedback
- [ ] **Task 5.3:** Data profiling visualization
  - Schema display table
  - Statistical summaries
  - Correlation heatmaps
  - Distribution charts
- [ ] **Task 5.4:** Model training interface
  - Target column selection
  - Training progress indicator
  - Model evaluation display
- [ ] **Task 5.5:** Prediction interface
  - Input form for new predictions
  - Results table display
  - Confidence score visualization

### Phase 6: Integration & Testing
- [ ] **Task 6.1:** API integration testing
  - End-to-end workflow testing
  - Error handling validation
  - Performance testing
- [ ] **Task 6.2:** Frontend-backend integration
  - API client setup
  - State management
  - Error boundary implementation
- [ ] **Task 6.3:** Unit test implementation
  - Backend endpoint tests
  - Data processing function tests
  - Model training/prediction tests

### Phase 7: Deployment & Documentation
- [ ] **Task 7.1:** Docker containerization
  - Backend Dockerfile
  - Frontend Dockerfile
  - Docker Compose setup
- [ ] **Task 7.2:** Documentation completion
  - API documentation (OpenAPI/Swagger)
  - Setup and installation guide
  - Usage examples
  - Architecture documentation
- [ ] **Task 7.3:** Sample data preparation
  - Create sample CSV files
  - Test data scenarios
  - Edge case examples

### Phase 8: Bonus Features (Optional)
- [ ] **Task 8.1:** Background job processing
  - Celery/Redis setup
  - Async model training
  - Job status tracking
- [ ] **Task 8.2:** Database integration
  - PostgreSQL/MongoDB setup
  - File metadata storage
  - Model metadata persistence
- [ ] **Task 8.3:** Authentication system
  - JWT implementation
  - User roles (admin/viewer)
  - Protected endpoints
- [ ] **Task 8.4:** Cloud storage integration
  - S3-compatible storage
  - File upload to cloud
  - Model artifact storage
- [ ] **Task 8.5:** Advanced visualizations
  - Feature importance charts
  - Clustering analysis
  - Interactive dashboards
- [ ] **Task 8.6:** Fault tolerance
  - Retry mechanisms
  - Circuit breakers
  - Health checks

---

## 🎯 Priority Levels

### 🔴 **Critical (Must Have)**
- Tasks 1.1 - 1.6 (Project Setup)
- Tasks 2.1 - 2.3 (CSV Processing)
- Tasks 3.1 - 3.3 (ML Pipeline)
- Tasks 4.1 - 4.2 (Inference)
- Tasks 5.1 - 5.5 (Frontend)
- Tasks 7.1 - 7.2 (Deployment & Docs)

### 🟡 **Important (Should Have)**
- Tasks 6.1 - 6.3 (Testing)
- Task 7.3 (Sample Data)

### 🟢 **Nice to Have (Bonus)**
- Tasks 8.1 - 8.6 (Bonus Features)

---

## ⏱️ Estimated Timeline

| Phase | Estimated Time | Priority |
|-------|---------------|----------|
| Phase 1 | 1-2 hours | 🔴 Critical |
| Phase 2 | 2-3 hours | 🔴 Critical |
| Phase 3 | 2-3 hours | 🔴 Critical |
| Phase 4 | 1-2 hours | 🔴 Critical |
| Phase 5 | 2-3 hours | 🔴 Critical |
| Phase 6 | 1-2 hours | 🟡 Important |
| Phase 7 | 1-2 hours | 🔴 Critical |
| Phase 8 | 2-4 hours | 🟢 Bonus |

**Total Core Development:** ~8-12 hours  
**With Bonus Features:** ~10-16 hours

---

## 📝 Notes

- Focus on core functionality first
- Implement proper error handling throughout
- Document decisions and assumptions
- Test each component thoroughly
- Keep code clean and well-commented

---

## 🚀 Next Steps

1. Start with **Phase 1: Project Setup**
2. Create basic project structure
3. Setup development environment
4. Begin with FastAPI backend foundation
