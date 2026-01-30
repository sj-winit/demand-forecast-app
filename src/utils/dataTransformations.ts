/**
 * Data transformation utilities for Sales Supervision Dashboard
 */

export interface WeeklySalesData {
  TrxDate: string | Date;
  CustomerID: string;
  CustomerName: string;
  ItemCode: string;
  ItemName: string;
  TotalQuantity: number;
}

export interface SKUMetrics {
  ItemCode: string;
  ItemName: string;
  historyLength: number;
  density: number;
  demandType: 'Smooth' | 'Intermittent' | 'Sparse';
  meanWeeklyDemand: number;
  stdWeeklyDemand: number;
  cv: number;
  customerCount: number;
  zeroDemandWeeks: number;
  trainabilityScore: number;
  recommendedApproach: 'Rule-based' | 'Statistical' | 'ML';
}

export interface CustomerMetrics {
  CustomerID: string;
  CustomerName: string;
  activeWeeks: number;
  totalQuantity: number;
}

export type HistoryLengthBucket = '< 26 weeks' | '26–52 weeks' | '> 52 weeks';

/**
 * Calculate demand density for an SKU
 * Density = (# weeks with TotalQuantity > 0) / (total weeks per SKU)
 */
export function calculateDemandDensity(weeklyData: WeeklySalesData[]): number {
  if (weeklyData.length === 0) return 0;

  const weeksWithDemand = weeklyData.filter(d => d.TotalQuantity > 0).length;
  return (weeksWithDemand / weeklyData.length) * 100;
}

/**
 * Determine demand type based on density
 */
export function getDemandType(density: number): 'Smooth' | 'Intermittent' | 'Sparse' {
  if (density > 70) return 'Smooth';
  if (density >= 30) return 'Intermittent';
  return 'Sparse';
}

/**
 * Get history length bucket
 */
export function getHistoryLengthBucket(weeks: number): HistoryLengthBucket {
  if (weeks < 26) return '< 26 weeks';
  if (weeks <= 52) return '26–52 weeks';
  return '> 52 weeks';
}

/**
 * Calculate coefficient of variation (CV = Std / Mean)
 */
export function calculateCV(values: number[]): { mean: number; std: number; cv: number } {
  if (values.length === 0) return { mean: 0, std: 0, cv: 0 };

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

  if (mean === 0) return { mean, std: 0, cv: 0 };

  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  const cv = std / mean;

  return { mean, std, cv };
}

/**
 * Calculate trainability score (0-100)
 * Based on: history length, demand density, stability (low CV)
 */
export function calculateTrainabilityScore(metrics: {
  historyLength: number;
  density: number;
  cv: number;
}): number {
  let score = 0;

  // History length score (max 40 points)
  if (metrics.historyLength >= 52) score += 40;
  else if (metrics.historyLength >= 26) score += 25;
  else if (metrics.historyLength >= 13) score += 10;

  // Density score (max 30 points)
  score += (metrics.density / 100) * 30;

  // Stability score (max 30 points) - lower CV is better
  if (metrics.cv <= 0.5) score += 30;
  else if (metrics.cv <= 1) score += 20;
  else if (metrics.cv <= 1.5) score += 10;
  else if (metrics.cv <= 2) score += 5;

  return Math.min(100, Math.round(score));
}

/**
 * Determine recommended modeling approach
 */
export function getRecommendedApproach(metrics: {
  trainabilityScore: number;
  demandType: string;
}): 'Rule-based' | 'Statistical' | 'ML' {
  if (metrics.trainabilityScore >= 70) return 'ML';
  if (metrics.trainabilityScore >= 40) return 'Statistical';
  return 'Rule-based';
}

/**
 * Calculate comprehensive SKU metrics
 */
export function calculateSKUMetrics(
  itemCode: string,
  itemName: string,
  weeklyData: WeeklySalesData[]
): SKUMetrics {
  const historyLength = weeklyData.length;
  const density = calculateDemandDensity(weeklyData);
  const demandType = getDemandType(density);

  const quantities = weeklyData.map(d => d.TotalQuantity);
  const { mean, std, cv } = calculateCV(quantities);

  const uniqueCustomers = new Set(weeklyData.map(d => d.CustomerID));
  const customerCount = uniqueCustomers.size;

  const zeroDemandWeeks = weeklyData.filter(d => d.TotalQuantity === 0).length;

  const trainabilityScore = calculateTrainabilityScore({
    historyLength,
    density,
    cv
  });

  const recommendedApproach = getRecommendedApproach({
    trainabilityScore,
    demandType
  });

  return {
    ItemCode: itemCode,
    ItemName: itemName,
    historyLength,
    density,
    demandType,
    meanWeeklyDemand: mean,
    stdWeeklyDemand: std,
    cv,
    customerCount,
    zeroDemandWeeks,
    trainabilityScore,
    recommendedApproach
  };
}

/**
 * Group data by week
 */
export function groupByWeek(data: WeeklySalesData[]): Map<string, WeeklySalesData[]> {
  const grouped = new Map<string, WeeklySalesData[]>();

  for (const row of data) {
    const week = String(row.TrxDate);
    if (!grouped.has(week)) {
      grouped.set(week, []);
    }
    grouped.get(week)!.push(row);
  }

  return grouped;
}

/**
 * Group data by SKU
 */
export function groupBySKU(data: WeeklySalesData[]): Map<string, WeeklySalesData[]> {
  const grouped = new Map<string, WeeklySalesData[]>();

  for (const row of data) {
    const sku = row.ItemCode;
    if (!grouped.has(sku)) {
      grouped.set(sku, []);
    }
    grouped.get(sku)!.push(row);
  }

  return grouped;
}

/**
 * Group data by customer
 */
export function groupByCustomer(data: WeeklySalesData[]): Map<string, WeeklySalesData[]> {
  const grouped = new Map<string, WeeklySalesData[]>();

  for (const row of data) {
    const customer = row.CustomerID;
    if (!grouped.has(customer)) {
      grouped.set(customer, []);
    }
    grouped.get(customer)!.push(row);
  }

  return grouped;
}

/**
 * Get week of year from date string or Date object
 */
export function getWeekOfYear(dateInput: string | Date): number {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Filter data by global filters
 */
export function filterByGlobalFilters(
  data: WeeklySalesData[],
  filters: {
    startDate?: string;
    endDate?: string;
    customerName?: string;
    itemCodes?: string[];
  },
  _skuMetricsMap: Map<string, SKUMetrics>
): WeeklySalesData[] {
  return data.filter(row => {
    // Date range filter - ensure both are in comparable format
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

    // Customer filter (by name)
    if (filters.customerName && row.CustomerName !== filters.customerName) return false;

    // Items filter (array of item codes)
    if (filters.itemCodes && filters.itemCodes.length > 0) {
      if (!filters.itemCodes.includes(row.ItemCode)) return false;
    }

    return true;
  });
}

/**
 * Calculate active SKUs per week
 */
export function calculateActiveSKUsPerWeek(data: WeeklySalesData[]): Array<{ week: string; count: number }> {
  const weeklyData = groupByWeek(data);
  const result: Array<{ week: string; count: number }> = [];

  for (const [week, records] of weeklyData.entries()) {
    const uniqueSKUs = new Set(records.map(r => r.ItemCode));
    // Ensure week is a string for consistent sorting
    const weekStr = String(week);
    result.push({ week: weekStr, count: uniqueSKUs.size });
  }

  return result.sort((a, b) => a.week.localeCompare(b.week));
}

/**
 * Calculate total quantity per week
 */
export function calculateTotalQuantityPerWeek(data: WeeklySalesData[]): Array<{ week: string; quantity: number }> {
  const weeklyData = groupByWeek(data);
  const result: Array<{ week: string; quantity: number }> = [];

  for (const [week, records] of weeklyData.entries()) {
    const totalQuantity = records.reduce((sum, r) => sum + r.TotalQuantity, 0);
    const weekStr = String(week);
    result.push({ week: weekStr, quantity: totalQuantity });
  }

  return result.sort((a, b) => a.week.localeCompare(b.week));
}

/**
 * Calculate customer contribution (Pareto analysis)
 */
export function calculateCustomerContribution(
  data: WeeklySalesData[],
  itemCode?: string
): Array<{ customer: string; quantity: number; cumulativePct: number }> {
  let filteredData = data;
  if (itemCode) {
    filteredData = data.filter(d => d.ItemCode === itemCode);
  }

  const customerMap = new Map<string, number>();
  for (const row of filteredData) {
    const current = customerMap.get(row.CustomerName) || 0;
    customerMap.set(row.CustomerName, current + row.TotalQuantity);
  }

  const customers = Array.from(customerMap.entries())
    .map(([customer, quantity]) => ({ customer, quantity }))
    .sort((a, b) => b.quantity - a.quantity);

  const totalQuantity = customers.reduce((sum, c) => sum + c.quantity, 0);
  let cumulativeSum = 0;

  return customers.map(c => {
    cumulativeSum += c.quantity;
    return {
      ...c,
      cumulativePct: (cumulativeSum / totalQuantity) * 100
    };
  });
}

/**
 * Calculate demand by week of year (for seasonality)
 */
export function calculateDemandByWeekOfYear(
  data: WeeklySalesData[],
  itemCode?: string
): Array<{ weekOfYear: number; avgDemand: number; count: number }> {
  let filteredData = data;
  if (itemCode) {
    filteredData = data.filter(d => d.ItemCode === itemCode);
  }

  const weekMap = new Map<number, number[]>();

  for (const row of filteredData) {
    const weekOfYear = getWeekOfYear(row.TrxDate);
    if (!weekMap.has(weekOfYear)) {
      weekMap.set(weekOfYear, []);
    }
    weekMap.get(weekOfYear)!.push(row.TotalQuantity);
  }

  const result: Array<{ weekOfYear: number; avgDemand: number; count: number }> = [];

  for (let week = 1; week <= 52; week++) {
    const values = weekMap.get(week) || [];
    const avgDemand = values.length > 0
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : 0;
    result.push({ weekOfYear: week, avgDemand, count: values.length });
  }

  return result;
}

/**
 * Create zero-demand heatmap data
 */
export function createZeroDemandHeatmap(
  data: WeeklySalesData[],
  maxSKUs: number = 50
): { skus: string[]; weeks: string[]; grid: number[][] } {
  const skuData = groupBySKU(data);

  // Get top SKUs by activity
  const skuCounts = Array.from(skuData.entries())
    .map(([sku, records]) => ({ sku, count: records.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxSKUs);

  const skus = skuCounts.map(s => s.sku);

  // Get all unique weeks as strings
  const allWeeks = Array.from(new Set(data.map(d => String(d.TrxDate)))).sort();

  // Create grid (0 = zero demand, 1 = non-zero demand)
  const grid: number[][] = skus.map(sku => {
    const skuRecords = skuData.get(sku) || [];
    const weekMap = new Map(skuRecords.map(r => [String(r.TrxDate), r.TotalQuantity]));

    return allWeeks.map(week => {
      const quantity = weekMap.get(week) || 0;
      return quantity > 0 ? 1 : 0;
    });
  });

  return { skus, weeks: allWeeks, grid };
}

/**
 * Calculate sparsity trend over time
 */
export function calculateSparsityTrend(data: WeeklySalesData[]): Array<{ week: string; sparsityPct: number }> {
  const weeklyData = groupByWeek(data);
  const result: Array<{ week: string; sparsityPct: number }> = [];

  for (const [week, records] of weeklyData.entries()) {
    const totalSKUs = new Set(records.map(r => r.ItemCode)).size;
    const zeroDemandSKUs = new Set(
      records.filter(r => r.TotalQuantity === 0).map(r => r.ItemCode)
    ).size;

    const sparsityPct = totalSKUs > 0 ? (zeroDemandSKUs / totalSKUs) * 100 : 0;
    result.push({ week, sparsityPct });
  }

  return result.sort((a, b) => a.week.localeCompare(b.week));
}
