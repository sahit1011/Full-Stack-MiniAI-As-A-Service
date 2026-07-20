"""
LLM service for generating natural language summaries using OpenRouter API
"""
import os
import re
import json
import httpx
from typing import Dict, Any, Optional
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LLMService:
    """Service for generating natural language summaries using LLM"""
    
    # Anti-hallucination guardrail injected into every grounded prompt. The real metrics
    # are passed in by summary.py; the model must not invent numbers that aren't provided.
    GROUNDING_INSTRUCTION = (
        "Use ONLY the numeric facts provided in this prompt. Do not invent or estimate "
        "metrics. If a value is not provided, say it is unavailable."
    )

    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = "deepseek/deepseek-chat"  # DeepSeek free tier
        self.max_tokens = 500
        self.temperature = 0.3  # Lower temperature for more consistent outputs
        self.timeout = 30.0

    @property
    def is_available(self) -> bool:
        """Whether a real LLM call can be made (an API key is configured)."""
        return bool(self.api_key)

    def provenance(self) -> Dict[str, Any]:
        """Honest description of what produced a summary — the configured LLM, or the
        deterministic template fallback when no key is set. Used for response api_info."""
        if self.is_available:
            return {"source": "llm", "llm_model": self.model, "api_provider": "OpenRouter"}
        return {"source": "fallback", "llm_model": None, "api_provider": "template-fallback"}
        
    async def _make_api_request(
        self,
        messages: list,
        max_tokens: int = None,
        json_mode: bool = False,
    ) -> Optional[str]:
        """Make an async API request to OpenRouter.

        Returns the assistant message text, or None on any failure (missing key,
        network error, bad/unparseable response). Never raises to the caller.
        """
        if not self.api_key:
            logger.warning("OpenRouter API key not found. Using fallback summary generation.")
            return None

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8001",  # Required by OpenRouter
            "X-Title": "Klaro - ML Analysis Service"
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens or self.max_tokens,
            "temperature": self.temperature
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(self.base_url, headers=headers, json=payload)
            response.raise_for_status()

            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                return result["choices"][0]["message"]["content"].strip()
            else:
                logger.error(f"Unexpected API response format: {result}")
                return None

        except httpx.HTTPError as e:
            logger.error(f"API request failed: {str(e)}")
            return None
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse API response: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in API request: {str(e)}")
            return None

    @staticmethod
    def _strip_code_fences(text: str) -> str:
        """Strip markdown code fences (```json ... ``` or ``` ... ```) from a string."""
        if not text:
            return text
        stripped = text.strip()
        # Remove a leading fence with optional language tag, and a trailing fence.
        stripped = re.sub(r"^```[a-zA-Z0-9_-]*\s*\n?", "", stripped)
        stripped = re.sub(r"\n?```\s*$", "", stripped)
        return stripped.strip()
    
    async def generate_dataset_summary(self, dataset_analysis: Dict[str, Any]) -> str:
        """Generate natural language summary of dataset analysis"""
        
        # Extract key information
        dataset_info = dataset_analysis.get("dataset_info", {})
        data_quality = dataset_analysis.get("data_quality", {})
        correlations = dataset_analysis.get("correlations", {})
        column_profiles = dataset_analysis.get("column_profiles", {})
        
        # Prepare data summary for LLM
        data_summary = {
            "rows": dataset_info.get("rows", 0),
            "columns": dataset_info.get("columns", 0),
            "missing_values": dataset_info.get("missing_values_total", 0),
            "duplicate_rows": dataset_info.get("duplicate_rows", 0),
            "completeness": data_quality.get("completeness", 0),
            "correlations_count": len(correlations),
            "strong_correlations": [k for k, v in correlations.items() if abs(v) > 0.7],
            "numerical_columns": len([col for col, profile in column_profiles.items() 
                                    if profile.get("type") == "numerical"]),
            "categorical_columns": len([col for col, profile in column_profiles.items() 
                                      if profile.get("type") == "categorical"])
        }
        
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a data analyst expert. Generate a concise, professional summary "
                    "of a dataset analysis. Focus on key insights, data quality, and notable "
                    "patterns. Keep it under 150 words and make it accessible to business users. "
                    + self.GROUNDING_INSTRUCTION
                )
            },
            {
                "role": "user",
                "content": f"""Analyze this dataset and provide a summary:

Dataset Statistics:
- Rows: {data_summary['rows']:,}
- Columns: {data_summary['columns']}
- Missing values: {data_summary['missing_values']} ({(data_summary['missing_values']/(data_summary['rows']*data_summary['columns'])*100):.1f}% of total)
- Duplicate rows: {data_summary['duplicate_rows']}
- Data completeness: {data_summary['completeness']:.1%}

Column Types:
- Numerical columns: {data_summary['numerical_columns']}
- Categorical columns: {data_summary['categorical_columns']}

Correlations:
- Total correlations found: {data_summary['correlations_count']}
- Strong correlations (>0.7): {len(data_summary['strong_correlations'])}

Please provide a professional summary highlighting the dataset's characteristics, quality, and any notable patterns."""
            }
        ]
        
        llm_summary = await self._make_api_request(messages)

        if llm_summary:
            return llm_summary
        else:
            # Fallback to template-based summary
            return self._generate_fallback_dataset_summary(data_summary)
    
    async def generate_model_summary(
        self,
        metadata: Dict[str, Any],
        dataset_analysis: Optional[Dict[str, Any]] = None,
        evaluation_metrics: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate natural language summary of model performance and insights"""
        
        # Extract model information
        algorithm = metadata.get('algorithm', 'unknown').replace('_', ' ').title()
        problem_type = metadata.get('problem_type', 'unknown')
        target_column = metadata.get('target_column', 'unknown')
        feature_count = len(metadata.get('feature_names', []))
        
        # Prepare model summary for LLM
        model_info = {
            "algorithm": algorithm,
            "problem_type": problem_type,
            "target_column": target_column,
            "feature_count": feature_count,
            "dataset_rows": dataset_analysis.get("dataset_info", {}).get("rows", 0) if dataset_analysis else 0,
            "data_quality": dataset_analysis.get("data_quality", {}).get("completeness", 0) if dataset_analysis else 0
        }
        
        # Add evaluation metrics if available
        metrics_text = ""
        if evaluation_metrics:
            if problem_type == "classification":
                accuracy = evaluation_metrics.get("accuracy", 0)
                f1 = evaluation_metrics.get("f1_score", 0)
                metrics_text = f"Accuracy: {accuracy:.1%}, F1-Score: {f1:.3f}"
            else:
                r2 = evaluation_metrics.get("r2_score", 0)
                rmse = evaluation_metrics.get("rmse", 0)
                metrics_text = f"R² Score: {r2:.3f}, RMSE: {rmse:.3f}"
        
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a machine learning expert. Generate a clear, professional summary "
                    "of a trained ML model. Explain the model's purpose, performance, and "
                    "practical implications in business terms. Keep it under 200 words. "
                    + self.GROUNDING_INSTRUCTION
                )
            },
            {
                "role": "user",
                "content": f"""Summarize this machine learning model:

Model Details:
- Algorithm: {model_info['algorithm']}
- Problem Type: {model_info['problem_type']}
- Target Variable: {model_info['target_column']}
- Features Used: {model_info['feature_count']}

Dataset:
- Training Data: {model_info['dataset_rows']:,} rows
- Data Quality: {model_info['data_quality']:.1%} complete

Performance:
{metrics_text if metrics_text else 'Metrics not available'}

Please provide a professional summary explaining what this model does, how well it performs, and what insights it provides for business decision-making."""
            }
        ]
        
        llm_summary = await self._make_api_request(messages, max_tokens=300)

        if llm_summary:
            return llm_summary
        else:
            # Fallback to template-based summary
            return self._generate_fallback_model_summary(model_info, metrics_text)
    
    async def generate_insights_and_recommendations(
        self,
        dataset_analysis: Dict[str, Any],
        metadata: Dict[str, Any],
        evaluation_metrics: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate insights and recommendations using LLM"""
        
        # Prepare comprehensive context
        context = {
            "dataset": {
                "rows": dataset_analysis.get("dataset_info", {}).get("rows", 0),
                "columns": dataset_analysis.get("dataset_info", {}).get("columns", 0),
                "quality": dataset_analysis.get("data_quality", {}).get("completeness", 0),
                "correlations": len(dataset_analysis.get("correlations", {}))
            },
            "model": {
                "algorithm": metadata.get('algorithm', 'unknown'),
                "problem_type": metadata.get('problem_type', 'unknown'),
                "features": len(metadata.get('feature_names', []))
            },
            "performance": evaluation_metrics or {}
        }
        
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a senior data scientist. Provide actionable insights and "
                    "recommendations for a machine learning project. Focus on practical next "
                    "steps, potential improvements, and business implications. "
                    + self.GROUNDING_INSTRUCTION
                    + " Respond with a single JSON object only."
                )
            },
            {
                "role": "user",
                "content": f"""Analyze this ML project and provide insights:

Dataset: {context['dataset']['rows']:,} rows, {context['dataset']['columns']} columns, {context['dataset']['quality']:.1%} complete
Model: {context['model']['algorithm']} for {context['model']['problem_type']} using {context['model']['features']} features
Performance: {context['performance']}

Provide:
1. Key insights about the data and model
2. Specific recommendations for improvement
3. Potential business applications
4. Next steps for deployment

Format as JSON with keys: insights, recommendations, business_applications, next_steps (each a list of strings)"""
            }
        ]

        llm_response = await self._make_api_request(messages, max_tokens=400, json_mode=True)

        if not llm_response:
            # No usable response (no key / network error) -> deterministic fallback
            return self._generate_fallback_insights(context)

        try:
            cleaned = self._strip_code_fences(llm_response)
            parsed = json.loads(cleaned)
            if not isinstance(parsed, dict):
                raise ValueError("LLM JSON response was not an object")
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse LLM insights JSON, using fallback: {str(e)}")
            return self._generate_fallback_insights(context)

        # Validate/coerce the expected list keys so the response shape is stable for the frontend.
        expected_keys = ("insights", "recommendations", "business_applications", "next_steps")
        result: Dict[str, Any] = {}
        for key in expected_keys:
            value = parsed.get(key, [])
            if isinstance(value, list):
                result[key] = value
            elif value in (None, ""):
                result[key] = []
            else:
                # Coerce a stray scalar (e.g. a single string) into a one-item list.
                result[key] = [value]
        return result
    
    def _generate_fallback_dataset_summary(self, data_summary: Dict[str, Any]) -> str:
        """Generate fallback dataset summary when LLM is unavailable"""
        quality_desc = "high" if data_summary['completeness'] > 0.9 else "moderate" if data_summary['completeness'] > 0.7 else "low"
        
        return f"""Dataset contains {data_summary['rows']:,} rows and {data_summary['columns']} columns with {quality_desc} data quality ({data_summary['completeness']:.1%} complete). 
        The dataset has {data_summary['numerical_columns']} numerical and {data_summary['categorical_columns']} categorical features. 
        {data_summary['missing_values']} missing values and {data_summary['duplicate_rows']} duplicate rows were identified. 
        {data_summary['correlations_count']} feature correlations were detected, including {len(data_summary['strong_correlations'])} strong correlations."""
    
    def _generate_fallback_model_summary(self, model_info: Dict[str, Any], metrics_text: str) -> str:
        """Generate fallback model summary when LLM is unavailable"""
        return f"""This {model_info['algorithm']} model was trained for {model_info['problem_type']} to predict '{model_info['target_column']}' using {model_info['feature_count']} features from {model_info['dataset_rows']:,} training samples. 
        The model achieved {metrics_text if metrics_text else 'performance metrics are available in the detailed results'}. 
        This model can be used to make predictions on new data with similar characteristics."""
    
    def _generate_fallback_insights(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate fallback insights when LLM is unavailable"""
        return {
            "insights": [
                f"Model trained on {context['dataset']['rows']:,} samples with {context['dataset']['quality']:.1%} data completeness",
                f"Using {context['model']['features']} features for {context['model']['problem_type']} with {context['model']['algorithm']}"
            ],
            "recommendations": [
                "Validate model performance on new data",
                "Monitor prediction accuracy over time",
                "Consider feature engineering for improvement"
            ],
            "business_applications": [
                "Automated decision support",
                "Risk assessment and prediction",
                "Process optimization"
            ],
            "next_steps": [
                "Deploy model for testing",
                "Set up monitoring and alerts",
                "Collect feedback for model improvement"
            ]
        }


# Global LLM service instance
llm_service = LLMService()
