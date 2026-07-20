'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  CpuChipIcon as Brain,
  ViewfinderCircleIcon as Target,
  LightBulbIcon as Lightbulb,
  ArrowTrendingUpIcon as TrendingUp,
  ExclamationTriangleIcon as AlertTriangle,
  CheckCircleIcon as CheckCircle,
  ClockIcon as Clock,
  BoltIcon as Zap,
  ChartBarIcon as BarChart3,
  CogIcon as Settings
} from '@heroicons/react/24/outline';

interface TargetRecommendation {
  column_name: string;
  suitability_score: number;
  problem_type: string;
  confidence: number;
  reasons: string[];
  data_type: string;
  unique_values: number;
  missing_percentage: number;
}

interface ModelRecommendation {
  model_name: string;
  score: number;
  reasons: string[];
  suitability_factors: Record<string, string>;
  model_info: {
    complexity: string;
    training_time: string;
    best_for: string[];
  };
}

interface IntelligentAnalysis {
  target_recommendations: {
    recommended_targets: TargetRecommendation[];
    has_clear_target: boolean;
    best_recommendation: TargetRecommendation | null;
  };
  data_quality: {
    overall_quality_score: number;
    quality_level: string;
    issues: Array<{
      type: string;
      severity: string;
      description: string;
      recommendation: string;
    }>;
  };
  feature_engineering_suggestions: {
    suggestions: Array<{
      type: string;
      suggestion: string;
      priority: string;
    }>;
  };
  preprocessing_recommendations: {
    recommendations: Array<{
      type: string;
      strategy: string;
      priority: string;
    }>;
  };
  model_recommendations: {
    classification_models: ModelRecommendation[];
    regression_models: ModelRecommendation[];
  };
}

interface SmartAnalysisProps {
  sessionId: string;
  onTargetSelected?: (target: string, problemType: string) => void;
  onModelSelected?: (model: string) => void;
}

export default function SmartAnalysis({ sessionId, onTargetSelected, onModelSelected }: SmartAnalysisProps) {
  const [analysis, setAnalysis] = useState<IntelligentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedProblemType, setSelectedProblemType] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetchIntelligentAnalysis();
    }
  }, [sessionId]);

  const fetchIntelligentAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      // For now, create mock data since the intelligent analysis endpoint doesn't exist yet
      // TODO: Replace with actual API call when backend endpoint is implemented
      const mockAnalysis: IntelligentAnalysis = {
        target_recommendations: {
          recommended_targets: [],
          has_clear_target: false,
          best_recommendation: null
        },
        data_quality: {
          overall_quality_score: 85,
          quality_level: "Good",
          issues: []
        },
        feature_engineering_suggestions: {
          suggestions: []
        },
        preprocessing_recommendations: {
          recommendations: []
        },
        model_recommendations: {
          classification_models: [
            {
              model_name: "random_forest",
              score: 95,
              reasons: ["Good for mixed data types", "Handles missing values well"],
              suitability_factors: {},
              model_info: {
                complexity: "Medium",
                training_time: "Fast",
                best_for: ["Mixed data", "Feature importance"]
              }
            }
          ],
          regression_models: [
            {
              model_name: "random_forest",
              score: 90,
              reasons: ["Robust to outliers", "Good performance"],
              suitability_factors: {},
              model_info: {
                complexity: "Medium",
                training_time: "Fast",
                best_for: ["Non-linear relationships", "Feature importance"]
              }
            }
          ]
        }
      };

      setAnalysis(mockAnalysis);
      setError("Smart analysis is not yet fully implemented. Using basic recommendations.");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTargetSelection = (target: TargetRecommendation) => {
    setSelectedTarget(target.column_name);
    setSelectedProblemType(target.problem_type);
    onTargetSelected?.(target.column_name, target.problem_type);
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Analyzing your data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchIntelligentAnalysis} className="mt-4">
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered Data Analysis
          </CardTitle>
          <CardDescription>
            Intelligent insights and recommendations for your dataset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="targets" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="targets" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Targets
              </TabsTrigger>
              <TabsTrigger value="quality" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Quality
              </TabsTrigger>
              <TabsTrigger value="features" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Features
              </TabsTrigger>
              <TabsTrigger value="models" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Models
              </TabsTrigger>
            </TabsList>

            <TabsContent value="targets" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Smart Target Column Recommendations</h3>
                
                {analysis.target_recommendations.recommended_targets.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No clear target columns detected. You may need to manually specify your target variable.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid gap-4">
                    {analysis.target_recommendations.recommended_targets.slice(0, 3).map((target, index) => (
                      <Card 
                        key={target.column_name} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedTarget === target.column_name ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => handleTargetSelection(target)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={index === 0 ? 'default' : 'secondary'}>
                                {index === 0 ? 'Best Match' : `Option ${index + 1}`}
                              </Badge>
                              <span className="font-medium">{target.column_name}</span>
                              <Badge variant="outline">{target.problem_type}</Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-600">Suitability</div>
                              <div className="font-bold text-lg">{target.suitability_score}%</div>
                            </div>
                          </div>
                          
                          <Progress value={target.suitability_score} className="mb-2" />
                          
                          <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-2">
                            <div>
                              <span className="font-medium">Type:</span> {target.data_type}
                            </div>
                            <div>
                              <span className="font-medium">Unique:</span> {target.unique_values}
                            </div>
                            <div>
                              <span className="font-medium">Missing:</span> {target.missing_percentage.toFixed(1)}%
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            {target.reasons.slice(0, 2).map((reason, idx) => (
                              <div key={idx} className="text-sm text-gray-700 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                {reason}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="quality" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Data Quality Assessment</h3>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Overall Score</div>
                    <div className={`text-2xl font-bold ${getQualityColor(analysis.data_quality.overall_quality_score)}`}>
                      {analysis.data_quality.overall_quality_score}/100
                    </div>
                    <Badge variant="outline" className={getQualityColor(analysis.data_quality.overall_quality_score)}>
                      {analysis.data_quality.quality_level}
                    </Badge>
                  </div>
                </div>
                
                <Progress value={analysis.data_quality.overall_quality_score} className="mb-4" />
                
                {analysis.data_quality.issues.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Issues & Recommendations</h4>
                    {analysis.data_quality.issues.map((issue, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {getPriorityIcon(issue.severity)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{issue.type.replace('_', ' ').toUpperCase()}</span>
                                <Badge variant={getSeverityColor(issue.severity) as any}>
                                  {issue.severity}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
                              <p className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
                                💡 {issue.recommendation}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Feature Engineering Suggestions</h3>
                
                {analysis.feature_engineering_suggestions.suggestions.length === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your data looks good! No immediate feature engineering suggestions.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {analysis.feature_engineering_suggestions.suggestions.map((suggestion, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {getPriorityIcon(suggestion.priority)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{suggestion.type.replace('_', ' ').toUpperCase()}</span>
                                <Badge variant={suggestion.priority === 'high' ? 'default' : 'secondary'}>
                                  {suggestion.priority} priority
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700">{suggestion.suggestion}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="models" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Model Recommendations</h3>
                
                {selectedProblemType && (
                  <div className="space-y-3">
                    <h4 className="font-medium">
                      Recommended for {selectedProblemType} problems:
                    </h4>
                    
                    {(selectedProblemType === 'classification' 
                      ? analysis.model_recommendations.classification_models 
                      : analysis.model_recommendations.regression_models
                    ).slice(0, 3).map((model, index) => (
                      <Card 
                        key={model.model_name} 
                        className="cursor-pointer transition-all hover:shadow-md"
                        onClick={() => onModelSelected?.(model.model_name)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={index === 0 ? 'default' : 'secondary'}>
                                {index === 0 ? 'Recommended' : `Option ${index + 1}`}
                              </Badge>
                              <span className="font-medium">{model.model_name.replace('_', ' ').toUpperCase()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{model.model_info.complexity} complexity</Badge>
                              <Badge variant="outline">{model.model_info.training_time} training</Badge>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-2">
                            Best for: {model.model_info.best_for.join(', ')}
                          </div>
                          
                          <div className="space-y-1">
                            {model.reasons.slice(0, 2).map((reason, idx) => (
                              <div key={idx} className="text-sm text-gray-700 flex items-center gap-1">
                                <Zap className="h-3 w-3 text-blue-500" />
                                {reason}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
