/**
 * API client for communicating with the backend
 */
import axios from 'axios';
import type {
  WeeklyPrediction,
  DailyBreakdown,
  SummaryMetrics,
  AccuracyMetrics,
  TimelineData,
  Item,
  ForecastFilters,
  RecommendedOrderResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Weekly forecast endpoints
export const getWeeklyForecast = async (filters: ForecastFilters = {}): Promise<WeeklyPrediction[]> => {
  const params = new URLSearchParams();
  if (filters.customer) params.append('customer', filters.customer);
  if (filters.item_code) params.append('item_code', filters.item_code);
  if (filters.start_week) params.append('start_week', filters.start_week);
  if (filters.end_week) params.append('end_week', filters.end_week);
  if (filters.confidence) params.append('confidence', filters.confidence);
  if (filters.pattern) params.append('pattern', filters.pattern);

  const response = await api.get(`/forecast/weekly?${params.toString()}`);
  return response.data;
};

export const getDailyBreakdown = async (
  weekStart: string,
  customer: string,
  itemCode: string
): Promise<DailyBreakdown[]> => {
  const response = await api.get(`/forecast/weekly/${weekStart}/daily`, {
    params: { customer, item_code: itemCode }
  });
  return response.data;
};

export const getAvailableWeeks = async () => {
  const response = await api.get('/forecast/weeks');
  return response.data;
};

// Analytics endpoints
export const getSummaryMetrics = async (): Promise<SummaryMetrics> => {
  const response = await api.get('/analytics/summary');
  return response.data;
};

export const getCustomers = async (): Promise<string[]> => {
  const response = await api.get('/analytics/customers');
  return response.data;
};

export const getItems = async (): Promise<Item[]> => {
  const response = await api.get('/analytics/items');
  return response.data;
};

export const getPatterns = async (): Promise<string[]> => {
  const response = await api.get('/analytics/patterns');
  return response.data;
};

export const getAccuracyMetrics = async (
  customer?: string,
  itemCode?: string,
  startWeek?: string,
  endWeek?: string
): Promise<AccuracyMetrics> => {
  const params = new URLSearchParams();
  if (customer) params.append('customer', customer);
  if (itemCode) params.append('item_code', itemCode);
  if (startWeek) params.append('start_week', startWeek);
  if (endWeek) params.append('end_week', endWeek);

  const response = await api.get(`/analytics/accuracy?${params.toString()}`);
  return response.data;
};

export const getTimelineData = async (
  customer?: string,
  itemCode?: string,
  startWeek?: string,
  endWeek?: string
): Promise<TimelineData[]> => {
  const params = new URLSearchParams();
  if (customer) params.append('customer', customer);
  if (itemCode) params.append('item_code', itemCode);
  if (startWeek) params.append('start_week', startWeek);
  if (endWeek) params.append('end_week', endWeek);

  const response = await api.get(`/analytics/timeline?${params.toString()}`);
  return response.data;
};

export const getAIInsights = async (
  insightType: string,
  context: Record<string, any>
): Promise<{ insight_type: string; insight: string }> => {
  const response = await api.post('/analytics/ai-insights', {
    insight_type: insightType,
    context
  });
  return response.data;
};

// Historical data endpoints (Train/Test)
export const getHistoricalData = async (filters: ForecastFilters = {}): Promise<WeeklyPrediction[]> => {
  const params = new URLSearchParams();
  if (filters.customer) params.append('customer', filters.customer);
  if (filters.item_code) params.append('item_code', filters.item_code);
  if (filters.item_codes && Array.isArray(filters.item_codes)) {
    filters.item_codes.forEach((code: string) => params.append('item_codes', code));
  }
  if (filters.start_week) params.append('start_week', filters.start_week);
  if (filters.end_week) params.append('end_week', filters.end_week);
  if (filters.data_split) params.append('data_split', filters.data_split);

  const response = await api.get(`/forecast/historical?${params.toString()}`);
  return response.data;
};

// Forecast recommendations endpoints (Future predictions)
export const getForecastRecommendations = async (filters: ForecastFilters & {
  min_probability?: number;
} = {}): Promise<WeeklyPrediction[]> => {
  const params = new URLSearchParams();
  if (filters.customer) params.append('customer', filters.customer);
  if (filters.item_code) params.append('item_code', filters.item_code);
  if (filters.start_week) params.append('start_week', filters.start_week);
  if (filters.end_week) params.append('end_week', filters.end_week);
  if (filters.confidence) params.append('confidence', filters.confidence);
  if (filters.min_probability) params.append('min_probability', filters.min_probability.toString());

  const response = await api.get(`/forecast/recommendations?${params.toString()}`);
  return response.data;
};

// Sales Supervision endpoints (Training data only - no predictions)
export const getTrainingSalesData = async (filters: {
  customer?: string;
  item_code?: string;
  start_date?: string;
  end_date?: string;
  time_period?: string;
} = {}): Promise<any[]> => {
  const params = new URLSearchParams();
  if (filters.customer) params.append('customer', filters.customer);
  if (filters.item_code) params.append('item_code', filters.item_code);
  if (filters.start_date) params.append('start_date', filters.start_date);
  if (filters.end_date) params.append('end_date', filters.end_date);
  if (filters.time_period) params.append('time_period', filters.time_period);

  const response = await api.get(`/sales/training-data?${params.toString()}`);
  return response.data;
};

export const getSalesAnalytics = async (filters: {
  customer?: string;
  item_code?: string;
  start_date?: string;
  end_date?: string;
  time_period?: string;
  use_daily?: boolean;
} = {}): Promise<any> => {
  const params = new URLSearchParams();
  if (filters.customer) params.append('customer', filters.customer);
  if (filters.item_code) params.append('item_code', filters.item_code);
  if (filters.start_date) params.append('start_date', filters.start_date);
  if (filters.end_date) params.append('end_date', filters.end_date);
  if (filters.time_period) params.append('time_period', filters.time_period);
  if (filters.use_daily) params.append('use_daily', 'true');

  const response = await api.get(`/sales/analytics?${params.toString()}`);
  return response.data;
};

// Prediction endpoints (Actual vs Prediction comparison)
export const getPredictionData = async (filters: {
  customer?: string;
  item_code?: string;
  start_date?: string;
  end_date?: string;
} = {}): Promise<any[]> => {
  const params = new URLSearchParams();
  if (filters.customer) params.append('customer', filters.customer);
  if (filters.item_code) params.append('item_code', filters.item_code);
  if (filters.start_date) params.append('start_date', filters.start_date);
  if (filters.end_date) params.append('end_date', filters.end_date);

  const response = await api.get(`/predictions/data?${params.toString()}`);
  return response.data;
};

// Recommended Orders endpoints
export const getRecommendedOrders = async (targetDate: string, customer?: string, useCache: boolean = true): Promise<RecommendedOrderResponse> => {
  const params = new URLSearchParams();
  params.append('target_date', targetDate);
  if (customer) params.append('customer', customer);
  params.append('use_cache', useCache.toString());

  const response = await api.get(`/orders/recommended?${params.toString()}`);
  return response.data;
};

export const getOrderCustomers = async (): Promise<{ success: boolean; customers: string[] }> => {
  const response = await api.get('/orders/customers');
  return response.data;
};

export const getOrderAvailableDates = async (dataSplit?: string): Promise<{ success: boolean; dates: string[]; count: number }> => {
  const params = new URLSearchParams();
  if (dataSplit) params.append('data_split', dataSplit);

  const response = await api.get(`/orders/dates?${params.toString()}`);
  return response.data;
};

export const clearOrdersCache = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete('/orders/cache');
  return response.data;
};

export default api;
