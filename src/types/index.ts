/**
 * Type definitions for the demand forecast app
 */

export interface WeeklyPrediction {
  TrxDate: string;
  CustomerName: string;
  ItemCode: string;
  ItemName: string;
  TotalQuantity: number;
  Predicted: number;
  Demand_Probability: number;
  DataSplit: 'Train' | 'Test' | 'Forecast';
  Method: string;
  Confidence: 'high' | 'low';
  Demand_Pattern: string;
  Density_Pct: number;
  Lower_Bound?: number;
  Upper_Bound?: number;
  WeekLabel?: string;
  WeekRange?: string;
}

export interface DailyBreakdown {
  TrxDate: string;
  CustomerID: string;
  CustomerName: string;
  ItemCode: string;
  ItemName: string;
  TotalQuantity: number;
  DayOfWeek?: string;
}

export interface SummaryMetrics {
  total_weeks: number;
  total_predictions: number;
  date_range: {
    start: string;
    end: string;
    start_label: string;
    end_label: string;
  };
  avg_demand_probability: number;
  high_confidence_pct: number;
  avg_weekly_demand: number;
  avg_predicted_demand: number;
  pattern_distribution: Record<string, number>;
  total_customers: number;
  total_items: number;
}

export interface AccuracyMetrics {
  mae: number;
  rmse: number;
  mape?: number;
  mase?: number;
  n_samples: number;
  mean_actual: number;
  mean_predicted: number;
}

export interface TimelineData {
  TrxDate: string;
  WeekLabel: string;
  TotalQuantity: number;
  Predicted: number;
  Demand_Probability: number;
}

export interface Item {
  ItemCode: string;
  ItemName: string;
}

export interface ForecastFilters {
  customer?: string;
  item_code?: string;
  item_codes?: string[];
  start_week?: string;
  end_week?: string;
  confidence?: string;
  pattern?: string;
  data_split?: string;
  min_probability?: number;
}

export interface RecommendedOrder {
  TrxDate: string;
  CustomerName: string;
  ItemCode: string;
  ItemName: string;
  ActualQty: number | null;
  Predicted: number;
  RecommendedOrderQty: number;
  Confidence: string;
  Demand_Pattern: string;
  BuyingCycleWeeks: number | null;
  avg_4w: number;
  avg_12w: number;
  avg_24w: number;
  avg_52w: number;
  BufferQty: number;
  BufferPct: number;
  Density: number;
  CV: number;
  ReasonCode: string;
}

export interface RecommendedOrderSummary {
  date: string;
  customers: number;
  items: number;
  total_order_qty: number;
  total_predicted_qty: number;
  total_buffer_qty: number;
  customer_filter: string;
}

export interface RecommendedOrderResponse {
  success: boolean;
  date: string;
  data: RecommendedOrder[];
  summary?: RecommendedOrderSummary;
  error?: string;
}
