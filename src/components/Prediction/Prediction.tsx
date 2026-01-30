/**
 * Prediction Dashboard - Main Component
 * Compares Actual vs Prediction with historical context
 * Supports multiple item selection with vertical chart stacking
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { PredictionFilters } from './PredictionFilters';
import { ActualVsPredictionChart } from './ActualVsPredictionChart';
import { WeekDetailPopup } from './WeekDetailPopup';
import { FutureForecastPopup } from './FutureForecastPopup';
import { getPredictionData } from '../../services/api';
import { LoadingSpinner, ErrorMessage } from '../Common';
import {
  PredictionData,
  PredictionMetrics,
  filterPredictionData,
  calculateMetrics,
  getItemsForCustomer,
  getDateRange,
  calculateWeekDetail
} from '../../utils/predictionTransformations';

export const Prediction: React.FC = () => {
  const [rawData, setRawData] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedItemCode, setSelectedItemCode] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Future forecast popup state
  const [showFutureForecast, setShowFutureForecast] = useState(false);
  const [futureForecastItemCode, setFutureForecastItemCode] = useState<string | null>(null);

  // Pending filters (what user selects in UI)
  const [pendingFilters, setPendingFilters] = useState<{
    customerName?: string;
    itemCode?: string;
    itemCodes?: string[];
    startDate?: string;
    endDate?: string;
    testDate?: string;
  }>({});

  // Applied filters (what actually filters data)
  const [appliedFilters, setAppliedFilters] = useState<{
    customerName?: string;
    itemCode?: string;
    itemCodes?: string[];
    startDate?: string;
    endDate?: string;
    testDate?: string;
  }>({});

  // Track if filters have been applied at least once
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Add timestamp to bypass cache
      const data = await getPredictionData();
      console.log('=== Data Loading Debug ===');
      console.log('Timestamp:', new Date().toISOString());

      // Check if data is an array or has a data property
      const dataArray = Array.isArray(data) ? data : ((data as any).data || []);

      console.log('=== Data Loading Debug ===');
      console.log('Total records loaded:', dataArray.length);

      // Check for item 1061101 forecast records
      const item1061101Forecast = dataArray.filter((row: any) =>
        String(row.ItemCode) === '1061101' &&
        row.DataSplit?.toLowerCase() === 'forecast'
      );
      console.log('Item 1061101 forecast records loaded:', item1061101Forecast.length);
      console.log('Item 1061101 forecast dates:', item1061101Forecast.map((r: any) => String(r.TrxDate)).sort());

      // Normalize data
      const normalizedData = dataArray.map((row: any) => ({
        TrxDate: row.TrxDate,
        CustomerName: row.CustomerName,
        ItemCode: String(row.ItemCode),
        ItemName: row.ItemName,
        ActualQty: row.ActualQty || 0,
        PredictedQty: row.PredictedQty || 0,
        Confidence: row.Confidence || 50,
        TestDate: row.TestDate || row.TrxDate,
        DataSplit: row.DataSplit
      }));

      setRawData(normalizedData);

      // Get date range for filter limits only
      const dateRange = getDateRange(normalizedData);

      // Don't set any default filters - leave everything empty
      // User must manually select and apply
      setPendingFilters({
        testDate: dateRange.testDate
      });
      setAppliedFilters({
        testDate: dateRange.testDate
      });
    } catch (err) {
      setError('Failed to load prediction data. Please ensure the backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Get available items for selected customer (use pendingFilters for real-time dropdown)
  const availableItems = useMemo(() => {
    // Check both pending and applied filters to show items as user selects
    const customerName = pendingFilters.customerName || appliedFilters.customerName;
    if (!customerName) return [];
    return getItemsForCustomer(rawData, customerName);
  }, [rawData, pendingFilters.customerName, appliedFilters.customerName]);

  // Get the item codes to filter by (itemCodes or fallback to single itemCode)
  const itemCodesToFilter = appliedFilters.itemCodes || (appliedFilters.itemCode ? [appliedFilters.itemCode] : []);

  // Filter data base (customer + date range) - DON'T filter by items yet
  const baseFilteredData = useMemo(() => {
    const filtered = filterPredictionData(rawData, {
      customerName: appliedFilters.customerName,
      startDate: appliedFilters.startDate,
      endDate: appliedFilters.endDate
    });

    // Debug: Check actuals in FILTERED data
    if (filtered.length > 0 && appliedFilters.customerName) {
      const withActual = filtered.filter(d => d.ActualQty > 0).length;
      const withoutActual = filtered.filter(d => d.ActualQty === 0).length;
      console.log('=== FILTERED Data ActualQty Check ===');
      console.log('Customer:', appliedFilters.customerName);
      console.log('Date Range:', appliedFilters.startDate, 'to', appliedFilters.endDate);
      console.log('Total FILTERED records:', filtered.length);
      console.log('With ActualQty > 0:', withActual);
      console.log('With ActualQty = 0:', withoutActual);
      console.log('% with actuals:', ((withActual / filtered.length) * 100).toFixed(1) + '%');
      console.log('Sample with actuals:', filtered.filter(d => d.ActualQty > 0).slice(0, 3).map(d => ({
        TrxDate: d.TrxDate,
        ItemCode: d.ItemCode,
        ActualQty: d.ActualQty,
        PredictedQty: d.PredictedQty
      })));
    }

    return filtered;
  }, [rawData, appliedFilters.customerName, appliedFilters.startDate, appliedFilters.endDate]);

  // Group data by item code when multiple items selected
  const dataByItem = useMemo(() => {
    const grouped: Record<string, PredictionData[]> = {};

    if (itemCodesToFilter.length === 0) {
      // No item filter - show all items grouped
      const allItems = Array.from(new Set(baseFilteredData.map(d => d.ItemCode)));
      for (const itemCode of allItems) {
        const itemData = baseFilteredData.filter(d => d.ItemCode === itemCode);
        // Only include items that have data in the selected date range
        if (itemData.length > 0) {
          grouped[itemCode] = itemData;
        }
      }
    } else {
      // Filter by selected items, but only include those with data
      for (const itemCode of itemCodesToFilter) {
        const itemData = baseFilteredData.filter(d => d.ItemCode === itemCode);
        // Only include if this item has data in the date range
        if (itemData.length > 0) {
          grouped[itemCode] = itemData;
        }
      }
    }

    return grouped;
  }, [baseFilteredData, itemCodesToFilter]);

  // Calculate metrics for each item
  const metricsByItem = useMemo(() => {
    const result: Record<string, PredictionMetrics[]> = {};
    for (const [itemCode, data] of Object.entries(dataByItem)) {
      result[itemCode] = calculateMetrics(data);

      // Debug: Log metrics for each item
      console.log(`=== Metrics for Item ${itemCode} ===`);
      console.log('Data points:', data.length);
      console.log('Sample data:', data.slice(0, 2).map(d => ({
        TrxDate: d.TrxDate,
        ActualQty: d.ActualQty,
        PredictedQty: d.PredictedQty
      })));
      console.log('Sample metrics:', result[itemCode].slice(0, 2).map(m => ({
        week: m.week,
        actualQty: m.actualQty,
        predictedQty: m.predictedQty
      })));
    }
    return result;
  }, [dataByItem]);

  // Get item names
  const itemNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const item of availableItems) {
      names[item.code] = item.name;
    }
    return names;
  }, [availableItems]);

  // Get selected week detail - use unfiltered data for rolling averages
  const weekDetail = useMemo(() => {
    if (!selectedWeek || !selectedItemCode) return null;

    // Get ALL data for the selected item (not date-filtered) for rolling average calculation
    const allItemData = rawData.filter(d =>
      d.CustomerName === appliedFilters.customerName &&
      String(d.ItemCode) === String(selectedItemCode)
    );

    // Calculate week detail using unfiltered data for accurate rolling averages
    return calculateWeekDetail(allItemData, selectedWeek);
  }, [selectedWeek, selectedItemCode, rawData, appliedFilters.customerName]);

  // Get forecast data for selected item
  const futureForecastData = useMemo(() => {
    if (!futureForecastItemCode || !appliedFilters.customerName) return [];

    // First, get ALL records for this item/customer (not just forecast)
    const allItemRecords = rawData.filter(d => {
      const itemMatch = String(d.ItemCode) === String(futureForecastItemCode);
      const customerMatch = d.CustomerName === appliedFilters.customerName;
      return itemMatch && customerMatch;
    });

    // Debug: Show ALL records for this item
    console.log('=== ALL Records for Item ===');
    console.log('Item Code:', futureForecastItemCode);
    console.log('Customer:', appliedFilters.customerName);
    console.log('Total records:', allItemRecords.length);
    allItemRecords.forEach(d => {
      console.log(`  ${d.TrxDate} | ${d.DataSplit} | ${d.PredictedQty}`);
    });

    const filtered = rawData.filter(d => {
      const itemMatch = String(d.ItemCode) === String(futureForecastItemCode);
      const customerMatch = d.CustomerName === appliedFilters.customerName;
      const isForecast = d.DataSplit?.trim().toLowerCase() === 'forecast';
      return itemMatch && customerMatch && isForecast;
    });

    // Debug logging
    console.log('=== Future Forecast Filter ===');
    console.log('Item Code:', futureForecastItemCode);
    console.log('Customer:', appliedFilters.customerName);
    console.log('Raw data total:', rawData.length);
    console.log('Filtered forecast records:', filtered.length);
    console.log('Forecast dates:', filtered.map(d => ({
      date: d.TrxDate,
      dataSplit: d.DataSplit,
      predicted: d.PredictedQty
    })));

    return filtered.sort((a, b) => new Date(a.TrxDate).getTime() - new Date(b.TrxDate).getTime());
  }, [rawData, futureForecastItemCode, appliedFilters.customerName]);

  // Calculate summary metrics (MUST be before early returns - React hooks rule)
  const hasFilteredData = hasAppliedFilters && Object.keys(dataByItem).length > 0 && Object.values(dataByItem).some(d => d.length > 0);

  const summaryMetrics = useMemo(() => {
    if (!hasFilteredData) return null;

    let totalActual = 0;
    let totalPredicted = 0;
    let recordCount = 0;

    Object.values(dataByItem).forEach(data => {
      data.forEach(d => {
        totalActual += d.ActualQty || 0;

        // Only include predicted from non-forecast data
        const dataSplit = d.DataSplit?.trim().toLowerCase();
        if (dataSplit !== 'forecast') {
          totalPredicted += d.PredictedQty || 0;
        }

        recordCount++;
      });
    });

    return {
      totalActual: Math.round(totalActual),
      totalPredicted: Math.round(totalPredicted),
      recordCount
    };
  }, [dataByItem, hasFilteredData]);

  // Apply filters handler
  const handleApplyFilters = () => {
    setAppliedFilters(pendingFilters);
    setHasAppliedFilters(true);
  };

  // Handle bar click
  const handleBarClick = (week: string, itemCode: string) => {
    setSelectedWeek(week);
    setSelectedItemCode(itemCode);
  };

  // Toggle item expansion
  const toggleItemExpansion = (itemCode: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemCode)) {
        newSet.delete(itemCode);
      } else {
        newSet.add(itemCode);
      }
      return newSet;
    });
  };

  // Handle show future forecast
  const handleShowFutureForecast = (itemCode: string) => {
    setFutureForecastItemCode(itemCode);
    setShowFutureForecast(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="large" />
        <span className="ml-3 text-gray-600">Loading prediction data...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-8">
        <ErrorMessage message={error} onRetry={loadData} />
      </div>
    );
  }

  // Empty data state
  if (rawData.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-12 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Prediction Data Available</h3>
        <p className="text-yellow-700">
          No prediction data found. Please ensure the backend has generated predictions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <PredictionFilters
        data={rawData}
        filters={pendingFilters}
        availableItems={availableItems}
        onFiltersChange={setPendingFilters}
        onApplyFilters={handleApplyFilters}
      />

      {/* Data Summary */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {appliedFilters.customerName && (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">Customer</p>
              <p className="text-base font-semibold text-gray-900">
                {appliedFilters.customerName}
              </p>
            </div>
          )}
          {itemCodesToFilter.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">Items</p>
              <p className="text-base font-semibold text-gray-900">
                {itemCodesToFilter.length} {itemCodesToFilter.length === 1 ? 'item' : 'items'} out of {availableItems.length} total
              </p>
            </div>
          )}
          {summaryMetrics && (
            <>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-600">Actual</p>
                <p className="text-base font-bold text-blue-900">
                  {summaryMetrics.totalActual.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="text-xs text-green-600">Predicted</p>
                <p className="text-base font-bold text-green-900">
                  {summaryMetrics.totalPredicted.toLocaleString()}
                </p>
              </div>
            </>
          )}
        </div>
        {!hasFilteredData && hasAppliedFilters && (
          <div className="mt-3 text-sm text-yellow-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            No data matches current filters
          </div>
        )}
      </div>

      {/* Charts - Grouped by Item */}
      {hasFilteredData && (
        <div className="space-y-4">
          {Object.entries(dataByItem)
            .filter(([_, data]) => data.length > 0)
            .sort(([_, dataA], [__, dataB]) => {
              // Count weeks where actual > 0 for each item
              const weeksWithActualA = dataA.filter(d => (d.ActualQty || 0) > 0).length;
              const weeksWithActualB = dataB.filter(d => (d.ActualQty || 0) > 0).length;
              // Sort descending (more weeks with actual data first)
              return weeksWithActualB - weeksWithActualA;
            })
            .map(([itemCode, _data]) => {
              const metrics = metricsByItem[itemCode];
              const itemName = itemNames[itemCode] || itemCode;
              const isExpanded = expandedItems.has(itemCode);

              // Skip items with no Train/Test metrics (only Forecast data)
              if (!metrics || metrics.length === 0) {
                return null;
              }

              // Calculate per-item totals from Train/Test data only
              const itemActual = metrics.reduce((sum, m) => sum + (m.actualQty || 0), 0);
              const itemPredicted = metrics.reduce((sum, m) => sum + (m.predictedQty || 0), 0);

              return (
                <div key={itemCode} className="bg-white rounded-lg shadow border border-gray-200">
                  {/* Item Header - Clickable to toggle */}
                  <button
                    onClick={() => toggleItemExpansion(itemCode)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-600" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                      )}
                      <Package className="h-5 w-5 text-purple-600" />
                      <div className="text-left">
                        <h3 className="text-base font-semibold text-gray-900">{itemName}</h3>
                        <p className="text-xs text-gray-500">
                          Item Code: {itemCode} • {metrics.length} weeks
                        </p>
                      </div>
                    </div>

                    {/* Show Actual and Predicted totals */}
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <span className="text-xs text-gray-500">Actual</span>
                        <p className="text-base font-semibold text-blue-600">
                          {Math.round(itemActual).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">Predicted</span>
                        <p className="text-base font-semibold text-green-600">
                          {Math.round(itemPredicted).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Charts for this item - Only show when expanded */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-200">
                      <ActualVsPredictionChart
                        metrics={metrics}
                        onBarClick={(week) => handleBarClick(week, itemCode)}
                        itemCode={itemCode}
                        itemName={itemName}
                        onShowFutureForecast={() => handleShowFutureForecast(itemCode)}
                      />
                    </div>
                  )}
                </div>
              );
            }).filter(Boolean)}
        </div>
      )}

      {/* No data message */}
      {!hasFilteredData && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          {hasAppliedFilters ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Matching Data</h3>
              <p className="text-gray-600">
                Try adjusting your filters to see results
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Filters to View Data</h3>
              <p className="text-gray-600">
                Choose a customer, select items, set date range, then click <strong>Apply Filters</strong>
              </p>
            </>
          )}
        </div>
      )}

      {/* Week Detail Popup */}
      {selectedWeek && weekDetail && (
        <WeekDetailPopup
          detail={weekDetail}
          onClose={() => setSelectedWeek(null)}
        />
      )}

      {/* Future Forecast Popup */}
      {showFutureForecast && futureForecastItemCode && futureForecastData.length > 0 && (
        <FutureForecastPopup
          isOpen={showFutureForecast}
          data={futureForecastData}
          itemCode={futureForecastItemCode}
          itemName={itemNames[futureForecastItemCode] || futureForecastItemCode}
          onClose={() => setShowFutureForecast(false)}
        />
      )}
    </div>
  );
};

export default Prediction;
