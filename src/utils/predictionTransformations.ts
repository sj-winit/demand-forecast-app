/**
 * Data transformation utilities for Prediction Dashboard
 */

export interface PredictionData {
  TrxDate: string | Date;
  CustomerName: string;
  ItemCode: string;
  ItemName: string;
  ActualQty: number;
  PredictedQty: number;
  Confidence: number | string;
  TestDate: string | Date;
  DataSplit?: string;
}

export interface PredictionMetrics {
  week: string;
  actualQty: number;
  predictedQty: number;
  error: number;
  errorPct: number;
  confidence: number;
  absError: number;
  dataSplit?: string;
}

export interface RollingAverages {
  week4Avg: number | null;
  week12Avg: number | null;
  week24Avg: number | null;
  week52Avg: number | null;
}

export interface WeekDetail {
  week: string;
  customerName: string;
  itemCode: string;
  itemName: string;
  actualQty: number;
  predictedQty: number;
  absError: number;
  errorPct: number;
  confidence: number;
  rollingAverages: RollingAverages;
  indicators: {
    aboveTrend: boolean | null;
    stableDemand: boolean | null;
    withinHistoricalRange: boolean | null;
  };
}

/**
 * Normalize confidence value to number (0-100)
 */
export function normalizeConfidence(confidence: number | string): number {
  if (typeof confidence === 'number') return confidence;
  if (typeof confidence === 'string') {
    const lower = confidence.toLowerCase();
    if (lower === 'high') return 80;
    if (lower === 'medium') return 50;
    if (lower === 'low') return 20;
  }
  return 50; // Default to medium
}

/**
 * Calculate prediction metrics
 */
export function calculateMetrics(data: PredictionData[]): PredictionMetrics[] {
  // Filter OUT Forecast data - only keep Train and Test
  const trainTestData = data.filter(row => {
    const dataSplit = row.DataSplit?.trim().toLowerCase();
    return dataSplit !== 'forecast';  // Exclude forecast
  });

  // Use shared deduplication helper
  const dedupedData = deduplicateTrainTestData(trainTestData);

  console.log('[calculateMetrics] Input rows:', data.length, 'Train/Test rows:', trainTestData.length, 'Deduped to:', dedupedData.length);

  return dedupedData.map(row => {
    const actual = row.ActualQty || 0;
    const predicted = row.PredictedQty || 0;
    const absError = Math.abs(actual - predicted);
    const errorPct = predicted !== 0 ? (absError / predicted) * 100 : 0;

    return {
      week: String(row.TrxDate),
      actualQty: actual,
      predictedQty: predicted,
      error: actual - predicted,
      errorPct,
      confidence: normalizeConfidence(row.Confidence),
      absError,
      dataSplit: row.DataSplit
    };
  });
}

/**
 * Calculate rolling average for data up to (but not including) the target week
 */
export function calculateRollingAverage(
  data: PredictionData[],
  targetWeek: string,
  windowSize: number
): number | null {
  // Sort by date
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.TrxDate);
    const dateB = new Date(b.TrxDate);
    return dateA.getTime() - dateB.getTime();
  });

  // Find the index of target week
  const targetIndex = sortedData.findIndex(d => String(d.TrxDate) === targetWeek);
  if (targetIndex <= 0) return null;

  // Get data before target week
  const historicalData = sortedData.slice(0, targetIndex);

  // Take last N records
  const windowData = historicalData.slice(-windowSize);

  // Check if we have enough data
  if (windowData.length < windowSize) return null;

  // Calculate average
  const sum = windowData.reduce((acc, row) => acc + (row.ActualQty || 0), 0);
  return sum / windowData.length;
}

/**
 * Calculate rolling averages for a specific week
 */
export function calculateRollingAverages(
  data: PredictionData[],
  targetWeek: string
): RollingAverages {
  return {
    week4Avg: calculateRollingAverage(data, targetWeek, 4),
    week12Avg: calculateRollingAverage(data, targetWeek, 12),
    week24Avg: calculateRollingAverage(data, targetWeek, 24),
    week52Avg: calculateRollingAverage(data, targetWeek, 52)
  };
}

/**
 * Determine if value is above recent trend (4-week average)
 */
export function isAboveTrend(
  actualQty: number,
  rollingAverages: RollingAverages
): boolean | null {
  if (rollingAverages.week4Avg === null) return null;
  return actualQty > rollingAverages.week4Avg;
}

/**
 * Determine if demand is stable (CV < 0.3 over 12 weeks)
 */
export function isStableDemand(
  data: PredictionData[],
  targetWeek: string
): boolean | null {
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.TrxDate);
    const dateB = new Date(b.TrxDate);
    return dateA.getTime() - dateB.getTime();
  });

  const targetIndex = sortedData.findIndex(d => String(d.TrxDate) === targetWeek);
  if (targetIndex <= 0) return null;

  const historicalData = sortedData.slice(0, targetIndex).slice(-12);
  if (historicalData.length < 4) return null;

  const values = historicalData.map(d => d.ActualQty || 0);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const cv = mean !== 0 ? Math.sqrt(variance) / mean : 0;

  return cv < 0.3;
}

/**
 * Determine if prediction is within historical range (min-max of 12 weeks)
 */
export function isWithinHistoricalRange(
  predictedQty: number,
  data: PredictionData[],
  targetWeek: string
): boolean | null {
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.TrxDate);
    const dateB = new Date(b.TrxDate);
    return dateA.getTime() - dateB.getTime();
  });

  const targetIndex = sortedData.findIndex(d => String(d.TrxDate) === targetWeek);
  if (targetIndex <= 0) return null;

  const historicalData = sortedData.slice(0, targetIndex).slice(-12);
  if (historicalData.length < 4) return null;

  const values = historicalData.map(d => d.ActualQty || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return predictedQty >= min && predictedQty <= max;
}

/**
 * Helper function to deduplicate data (Train > Test priority)
 * Used by both calculateMetrics and calculateWeekDetail to ensure consistency
 */
function deduplicateTrainTestData(data: PredictionData[]): PredictionData[] {
  // Remove duplicates: for same date, keep priority: Train > Test
  const priorityMap: { [key: string]: number } = { 'Train': 1, 'Test': 2 };

  // Group by unique date
  const uniqueData: { [key: string]: PredictionData } = {};
  data.forEach(row => {
    const key = String(row.TrxDate);
    const currentPriority = priorityMap[row.DataSplit || 'Test'] ?? 999;

    if (!uniqueData[key]) {
      uniqueData[key] = row;
    } else {
      const existingPriority = priorityMap[uniqueData[key].DataSplit || 'Test'] ?? 999;
      // Keep the one with higher priority (lower number)
      if (currentPriority < existingPriority) {
        uniqueData[key] = row;
      }
    }
  });

  return Object.values(uniqueData).sort((a, b) =>
    String(a.TrxDate).localeCompare(String(b.TrxDate))
  );
}

/**
 * Calculate detailed week information for popup
 */
export function calculateWeekDetail(
  data: PredictionData[],
  targetWeek: string
): WeekDetail | null {
  // Apply same filtering and deduplication as calculateMetrics for consistency
  // 1. Filter OUT Forecast data - only keep Train and Test
  const trainTestData = data.filter(row => {
    const dataSplit = row.DataSplit?.trim().toLowerCase();
    return dataSplit !== 'forecast';  // Exclude forecast
  });

  // 2. Deduplicate using same logic as chart (Train > Test priority)
  const dedupedData = deduplicateTrainTestData(trainTestData);

  // 3. Find target row in deduplicated data (ensures consistency with chart)
  const targetRow = dedupedData.find(d => String(d.TrxDate) === targetWeek);
  if (!targetRow) return null;

  const actual = targetRow.ActualQty || 0;
  const predicted = targetRow.PredictedQty || 0;
  const absError = Math.abs(actual - predicted);
  const errorPct = predicted !== 0 ? (absError / predicted) * 100 : 0;

  const rollingAverages = calculateRollingAverages(data, targetWeek);
  const aboveTrend = isAboveTrend(actual, rollingAverages);
  const stableDemand = isStableDemand(data, targetWeek);
  const withinRange = isWithinHistoricalRange(predicted, data, targetWeek);

  return {
    week: targetWeek,
    customerName: targetRow.CustomerName,
    itemCode: targetRow.ItemCode,
    itemName: targetRow.ItemName,
    actualQty: actual,
    predictedQty: predicted,
    absError,
    errorPct,
    confidence: normalizeConfidence(targetRow.Confidence),
    rollingAverages,
    indicators: {
      aboveTrend,
      stableDemand,
      withinHistoricalRange: withinRange
    }
  };
}

/**
 * Filter prediction data by filters
 */
export function filterPredictionData(
  data: PredictionData[],
  filters: {
    customerName?: string;
    itemCode?: string;
    itemCodes?: string[]; // Support multiple item selection
    startDate?: string;
    endDate?: string;
  }
): PredictionData[] {
  return data.filter(row => {
    if (filters.customerName && row.CustomerName !== filters.customerName) return false;
    // Handle single itemCode
    if (filters.itemCode && row.ItemCode !== filters.itemCode) return false;
    // Handle multiple itemCodes
    if (filters.itemCodes && filters.itemCodes.length > 0 && !filters.itemCodes.includes(row.ItemCode)) return false;
    if (filters.startDate) {
      const rowDate = row.TrxDate instanceof Date
        ? row.TrxDate.toISOString().split('T')[0]
        : String(row.TrxDate).split('T')[0];
      if (rowDate < filters.startDate) return false;
    }
    if (filters.endDate) {
      const rowDate = row.TrxDate instanceof Date
        ? row.TrxDate.toISOString().split('T')[0]
        : String(row.TrxDate).split('T')[0];
      if (rowDate > filters.endDate) return false;
    }
    return true;
  });
}

/**
 * Get unique customers from prediction data
 */
export function getUniqueCustomers(data: PredictionData[]): Array<{ name: string }> {
  const customerSet = new Set<string>();
  for (const row of data) {
    customerSet.add(row.CustomerName);
  }
  return Array.from(customerSet)
    .map(name => ({ name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get items for a specific customer
 */
export function getItemsForCustomer(
  data: PredictionData[],
  customerName: string
): Array<{ code: string; name: string }> {
  const itemMap = new Map<string, string>();

  for (const row of data) {
    if (row.CustomerName === customerName && !itemMap.has(row.ItemCode)) {
      itemMap.set(row.ItemCode, row.ItemName);
    }
  }

  return Array.from(itemMap.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Get date range from data
 */
export function getDateRange(data: PredictionData[]): { min: string; max: string; testDate: string } {
  if (data.length === 0) return { min: '', max: '', testDate: '' };

  const dates = data.map(d => String(d.TrxDate)).sort();
  const testDate = String(data[0]?.TestDate || dates[dates.length - 1]);

  return {
    min: dates[0],
    max: dates[dates.length - 1],
    testDate
  };
}

/**
 * Get default date range (last 26 weeks before TestDate)
 */
export function getDefaultDateRange(data: PredictionData[]): { start: string; end: string } {
  const dateRange = getDateRange(data);
  if (!dateRange.testDate) return { start: '', end: '' };

  const testDate = new Date(dateRange.testDate);
  const startDate = new Date(testDate);
  startDate.setDate(startDate.getDate() - (26 * 7)); // 26 weeks

  return {
    start: startDate.toISOString().split('T')[0],
    end: testDate.toISOString().split('T')[0]
  };
}

/**
 * Calculate error trend data
 */
export function calculateErrorTrend(metrics: PredictionMetrics[]): Array<{
  week: string;
  errorPct: number;
}> {
  return metrics.map(m => ({
    week: m.week,
    errorPct: m.errorPct
  }));
}
