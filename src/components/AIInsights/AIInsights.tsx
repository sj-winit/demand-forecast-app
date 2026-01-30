import React, { useState } from 'react';
import { Sparkles, AlertCircle, TrendingUp, Package } from 'lucide-react';
import { getAIInsights } from '../../services/api';
import { LoadingSpinner } from '../Common';

type InsightType = 'trend_analysis' | 'anomaly_detection' | 'forecast_recommendation' | 'pattern_explanation';

interface InsightCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

const InsightCard: React.FC<InsightCardProps> = ({ icon, title, description, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg shadow p-6 border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all text-left w-full"
    >
      <div className="flex items-start">
        <div className="text-blue-600 mr-4">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </button>
  );
};

interface AIInsightsProps {
  metrics?: any;
  selectedPrediction?: any;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ metrics, selectedPrediction }) => {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [_activeType, setActiveType] = useState<InsightType | null>(null);

  const generateInsight = async (type: InsightType, context: Record<string, any>) => {
    setLoading(true);
    setError(null);
    setInsight(null);
    setActiveType(type);

    try {
      const result = await getAIInsights(type, context);
      setInsight(result.insight);
    } catch (err: any) {
      setError(err.message || 'Failed to generate insight');
    } finally {
      setLoading(false);
    }
  };

  const generateTrendAnalysis = () => {
    if (!metrics) {
      setError('Metrics not available');
      return;
    }

    generateInsight('trend_analysis', {
      total_predictions: metrics.total_predictions,
      start_date: metrics.date_range.start_label,
      end_date: metrics.date_range.end_label,
      avg_probability: metrics.avg_demand_probability,
      high_conf_pct: metrics.high_confidence_pct,
      pattern_distribution: JSON.stringify(metrics.pattern_distribution, null, 2)
    });
  };

  const generateAnomalyDetection = () => {
    if (!selectedPrediction) {
      setError('Please select a prediction first from the Weekly Forecast tab');
      return;
    }

    generateInsight('anomaly_detection', {
      week: selectedPrediction.WeekRange || selectedPrediction.TrxDate,
      customer: selectedPrediction.CustomerName,
      item: selectedPrediction.ItemName,
      actual: selectedPrediction.TotalQuantity,
      predicted: selectedPrediction.Predicted,
      probability: selectedPrediction.Demand_Probability,
      confidence: selectedPrediction.Confidence,
      pattern: selectedPrediction.Demand_Pattern
    });
  };

  const generateForecastRecommendation = () => {
    if (!selectedPrediction) {
      setError('Please select a prediction first from the Weekly Forecast tab');
      return;
    }

    generateInsight('forecast_recommendation', {
      item: selectedPrediction.ItemName,
      week: selectedPrediction.WeekRange || selectedPrediction.TrxDate,
      predicted: selectedPrediction.Predicted,
      probability: selectedPrediction.Demand_Probability,
      lower_bound: selectedPrediction.Lower_Bound || 0,
      upper_bound: selectedPrediction.Upper_Bound || 0,
      pattern: selectedPrediction.Demand_Pattern
    });
  };

  const generatePatternExplanation = () => {
    if (!selectedPrediction) {
      setError('Please select a prediction first from the Weekly Forecast tab');
      return;
    }

    generateInsight('pattern_explanation', {
      pattern: selectedPrediction.Demand_Pattern,
      item: selectedPrediction.ItemName,
      customer: selectedPrediction.CustomerName
    });
  };

  return (
    <div className="space-y-6">
      {/* Insight Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InsightCard
          icon={<TrendingUp className="h-6 w-6" />}
          title="Trend Analysis"
          description="Analyze overall demand trends and patterns in your forecast data"
          onClick={generateTrendAnalysis}
        />

        <InsightCard
          icon={<AlertCircle className="h-6 w-6" />}
          title="Anomaly Detection"
          description="Detect and explain anomalies in specific weekly predictions"
          onClick={generateAnomalyDetection}
        />

        <InsightCard
          icon={<Package className="h-6 w-6" />}
          title="Forecast Recommendations"
          description="Get inventory and order recommendations based on forecasts"
          onClick={generateForecastRecommendation}
        />

        <InsightCard
          icon={<Sparkles className="h-6 w-6" />}
          title="Pattern Explanation"
          description="Understand what demand patterns mean and how to handle them"
          onClick={generatePatternExplanation}
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-8 border border-gray-100">
          <div className="flex items-center justify-center">
            <LoadingSpinner size="large" />
            <span className="ml-3 text-gray-600">Generating AI insights...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Insight Result */}
      {insight && !loading && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
              AI Insight
            </h3>
            <button
              onClick={() => setInsight(null)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              ×
            </button>
          </div>

          <div className="prose prose-sm max-w-none">
            <div className="bg-gray-50 rounded-lg p-4 text-gray-800 whitespace-pre-wrap">
              {insight}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              AI insights are generated using Groq's LLM. Results may vary.
            </p>
          </div>
        </div>
      )}

      {/* Helper Text */}
      {!insight && !loading && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Tip:</span> Select an insight type above to generate AI-powered analysis.
            Some insights require selecting a prediction from the Weekly Forecast tab first.
          </p>
        </div>
      )}
    </div>
  );
};

export default AIInsights;
