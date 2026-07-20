/**
 * API service for communicating with the Klaro backend
 * Includes authentication and history endpoints for database integration
 */
import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Add auth token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    
    // Handle 401 errors by clearing auth token
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      // Redirect to login page
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Type definitions for Authentication
export interface SignupRequest {
  email: string;
  username: string;
  full_name: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    username: string;
    email: string;
    full_name: string;
    is_active: boolean;
    is_admin: boolean;
    created_at: string;
  };
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

// Type definitions for History
export interface FileHistoryItem {
  id: number;
  session_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  num_rows?: number;
  num_columns?: number;
  status: string;
  uploaded_at: string;
  processed_at?: string;
}

export interface ModelHistoryItem {
  id: number;
  model_id: string;
  model_name?: string;
  algorithm: string;
  model_type: string;
  target_column: string;
  evaluation_metrics: Record<string, any>;
  training_duration?: number;
  num_features?: number;
  status: string;
  created_at: string;
  trained_at?: string;
  last_used_at?: string;
  file_session_id: string;
  file_original_name: string;
}

export interface UserStats {
  user_id: number;
  username: string;
  file_statistics: {
    total_files: number;
    by_status: Record<string, number>;
    total_size_bytes: number;
  };
  model_statistics: {
    total_models: number;
    by_status: Record<string, number>;
    by_algorithm: Record<string, number>;
  };
  generated_at: string;
}

// Existing type definitions
export interface UploadResponse {
  session_id: string;
  filename: string;
  file_size: number;
  rows: number;
  columns: number;
  upload_timestamp: string;
  data_schema: Record<string, any>;
  message: string;
}

export interface TrainRequest {
  session_id: string;
  target_column: string;
  model_type?: string;
  algorithm?: string;
  test_size?: number;
  random_state?: number;
}

export interface TrainResponse {
  model_id: string;
  session_id: string;
  model_type: string;
  algorithm: string;
  training_info: Record<string, any>;
  evaluation_metrics: Record<string, any>;
  feature_importance: Record<string, number>;
  model_path: string;
  timestamp: string;
}

// API Service Class
class ApiService {
  // Authentication endpoints. NOTE: /auth/signup returns the created User (201), NOT a
  // token — the client must log in afterward (the signup page auto-logs-in on success).
  async signup(data: SignupRequest): Promise<User> {
    const response = await api.post('/auth/signup', data);
    return response.data;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data;
  }

  async logout(): Promise<void> {
    // Clear local storage completely
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
  }

  // Utility to clear all auth data
  clearAuthData(): void {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
  }

  // History endpoints
  async getFileHistory(params?: {
    skip?: number;
    limit?: number;
    status?: string;
  }): Promise<FileHistoryItem[]> {
    const response = await api.get('/history/files', { params });
    return response.data;
  }

  async getModelHistory(params?: {
    skip?: number;
    limit?: number;
    algorithm?: string;
    model_type?: string;
    status?: string;
  }): Promise<ModelHistoryItem[]> {
    const response = await api.get('/history/models', { params });
    return response.data;
  }

  async getFileDetails(sessionId: string): Promise<FileHistoryItem> {
    const response = await api.get(`/history/files/${sessionId}`);
    return response.data;
  }

  async getModelDetails(modelId: string): Promise<ModelHistoryItem> {
    const response = await api.get(`/history/models/${modelId}`);
    return response.data;
  }

  async getUserStats(): Promise<UserStats> {
    const response = await api.get('/history/stats');
    return response.data;
  }

  async downloadModel(modelId: string): Promise<void> {
    const response = await api.get(`/history/models/${modelId}/download`, {
      responseType: 'blob'
    });

    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Extract filename from response headers or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `model_${modelId}.joblib`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Health check
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  }

  // File upload
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress ? (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      } : undefined,
    });

    return response.data;
  }

  // Data profiling
  async getDataProfile(sessionId: string, targetColumn?: string) {
    const params = targetColumn ? { target_column: targetColumn } : {};
    const response = await api.get(`/profile/${sessionId}`, { params });
    return response.data;
  }

  // Train model — now asynchronous: returns 202 { model_id, status: "queued" }.
  // Poll getTrainingStatus(model_id) until status is "completed" or "failed".
  async trainModel(request: TrainRequest): Promise<{ model_id: string; status: string; message?: string }> {
    const response = await api.post('/train/', request);
    return response.data;
  }

  // Enhanced training — also async (202 + poll). optimization runs server-side ("medium").
  async trainEnhancedModel(sessionId: string, request: any): Promise<{ model_id: string; status: string; message?: string }> {
    const response = await api.post(`/train/${sessionId}/enhanced-train`, request);
    return response.data;
  }

  // Poll the lifecycle of a background training job (queued → training → completed | failed).
  async getTrainingStatus(modelId: string) {
    const response = await api.get(`/train/status/${modelId}`);
    return response.data;
  }

  // Poll until a training job reaches a terminal state. Returns the final status payload
  // (which includes evaluation_metrics + training_info when completed).
  async waitForTraining(
    modelId: string,
    opts: { onTick?: (status: string) => void; intervalMs?: number; timeoutMs?: number } = {}
  ): Promise<any> {
    const intervalMs = opts.intervalMs ?? 1500;
    const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000; // 5 min ceiling
    const deadline = Date.now() + timeoutMs;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const status = await this.getTrainingStatus(modelId);
      opts.onTick?.(status.status);
      if (status.status === 'completed' || status.status === 'failed') return status;
      if (Date.now() > deadline) {
        return { ...status, status: 'failed', error_message: 'Training timed out. Please try again.' };
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  // Get model recommendations
  async getModelRecommendations(sessionId: string, targetColumn: string, problemType: string = 'auto') {
    const response = await api.get(`/train/${sessionId}/model-recommendations`, {
      params: {
        target_column: targetColumn,
        problem_type: problemType
      }
    });
    return response.data;
  }

  // Make predictions
  async makePredictions(request: { model_id: string; data: any[] }) {
    const response = await api.post('/predict/', request);
    return response.data;
  }

  // Batch predictions
  async makeBatchPredictions(request: { model_id: string; data: any[] }) {
    const response = await api.post('/predict/batch', request);
    return response.data;
  }

  // Get model info
  async getModelInfo(modelId: string) {
    const response = await api.get(`/predict/model/${modelId}/info`);
    return response.data;
  }

  // Summary endpoints
  async getModelSummary(modelId: string) {
    const response = await api.get(`/summary/${modelId}`);
    return response.data;
  }

  async getLLMEnhancedSummary(modelId: string) {
    const response = await api.get(`/summary/${modelId}/llm-enhanced`);
    return response.data;
  }

  async getSessionSummary(sessionId: string) {
    const response = await api.get(`/summary/session/${sessionId}`);
    return response.data;
  }

  // Profile endpoints
  async getIntelligentAnalysis(sessionId: string) {
    const response = await api.get(`/profile/${sessionId}/intelligent-analysis`);
    return response.data;
  }

  async getTargetRecommendations(sessionId: string) {
    const response = await api.get(`/profile/${sessionId}/target-recommendations`);
    return response.data;
  }

  // Comprehensive Analysis endpoints
  async getComprehensiveAnalysis(sessionId: string) {
    const response = await api.get(`/analysis/${sessionId}/comprehensive`);
    return response.data;
  }

  async getAnalysisSummary(sessionId: string) {
    const response = await api.get(`/analysis/${sessionId}/summary`);
    return response.data;
  }

  // Generic GET method for custom endpoints
  async get(endpoint: string, params?: any) {
    const response = await api.get(endpoint, { params });
    return response.data;
  }

  // Model listing
  async getAvailableModels() {
    const response = await api.get('/predict/models');
    return response.data;
  }

  // Cleanup session
  async cleanupSession(sessionId: string) {
    const response = await api.delete(`/upload/session/${sessionId}`);
    return response.data;
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export API instance for custom requests
export { api };

// Utility functions
export const handleApiError = (error: any) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    return {
      status,
      message: data.detail?.message || data.message || 'An error occurred',
      details: data.detail?.details || data.details,
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      status: 0,
      message: 'Network error - please check your connection',
      details: 'No response from server',
    };
  } else {
    // Something else happened
    return {
      status: -1,
      message: error.message || 'An unexpected error occurred',
      details: error.toString(),
    };
  }
};

export default apiService;
