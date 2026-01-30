/**
 * Future Forecast Dashboard Component
 * Shows only Forecast data split (future predictions after Test date)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { getPredictionData } from '../../services/api';
import { LoadingSpinner, ErrorMessage } from '../Common';
import {
  PredictionData,
  getItemsForCustomer
} from '../../utils/predictionTransformations';
import { FutureForecastChart } from './FutureForecastChart';

export const FutureForecast: React.FC = () => {
  const [rawData, setRawData] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Simple filters - just customer and item selection
  const [filters, setFilters] = useState<{
    customerName?: string;
    itemCode?: string;
  }>({});

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPredictionData();

      // Check if data is an array or has a data property
      const dataArray = Array.isArray(data) ? data : (data.data || []);

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
    } catch (err) {
      setError('Failed to load prediction data. Please ensure the backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique customers
  const customers = useMemo(() => {
    const customerSet = new Set<string>();
    for (const row of rawData) {
      customerSet.add(row.CustomerName);
    }
    return Array.from(customerSet).sort();
  }, [rawData]);

  // Get available items for selected customer
  const availableItems = useMemo(() => {
    if (!filters.customerName) return [];
    return getItemsForCustomer(rawData, filters.customerName);
  }, [rawData, filters.customerName]);

  // Filter data - EMPTY for now
  const forecastData = useMemo(() => {
    return [];
  }, []);

  // Get forecast date range from the data
  const forecastDateRange = useMemo(() => {
    if (forecastData.length === 0) return null;

    const dates = forecastData.map(d => String(d.TrxDate)).sort();
    return {
      start: dates[0],
      end: dates[dates.length - 1]
    };
  }, [forecastData]);

  // Group forecast data by item
  const dataByItem = useMemo(() => {
    const grouped: Record<string, PredictionData[]> = {};

    if (filters.itemCode) {
      // Single item selected
      const itemData = forecastData.filter(d => d.ItemCode === filters.itemCode);
      if (itemData.length > 0) {
        grouped[filters.itemCode] = itemData;
      }
    } else {
      // Show all items with forecast data
      const allItems = Array.from(new Set(forecastData.map(d => d.ItemCode)));
      for (const itemCode of allItems) {
        const itemData = forecastData.filter(d => d.ItemCode === itemCode);
        if (itemData.length > 0) {
          grouped[itemCode] = itemData;
        }
      }
    }

    return grouped;
  }, [forecastData, filters.itemCode]);

  // Get item names
  const itemNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const item of availableItems) {
      names[item.code] = item.name;
    }
    return names;
  }, [availableItems]);

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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="large" />
        <span className="ml-3 text-gray-600">Loading forecast data...</span>
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
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Forecast Data Available</h3>
        <p className="text-yellow-700">
          No forecast data found. Please ensure the backend has generated forecasts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Future Forecast</h2>
        <p className="text-sm text-gray-600 mt-1">
          {forecastDateRange
            ? `Forecast period: ${forecastDateRange.start} to ${forecastDateRange.end}`
            : 'All forecast predictions from DataSplit'}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={filters.customerName || ''}
              onChange={(e) => setFilters({ ...filters, customerName: e.target.value || undefined, itemCode: undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Customer</option>
              {customers.map(customer => (
                <option key={customer} value={customer}>{customer}</option>
              ))}
            </select>
          </div>

          {/* Item Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
            <select
              value={filters.itemCode || ''}
              onChange={(e) => setFilters({ ...filters, itemCode: e.target.value || undefined })}
              disabled={!filters.customerName}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">All Items</option>
              {availableItems.map(item => (
                <option key={item.code} value={item.code}>{item.code} - {item.name}</option>
              ))}
            </select>
          </div>

          {/* Info */}
          <div className="flex items-end">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200 w-full">
              <p className="text-xs text-green-600">Forecast Period</p>
              <p className="text-sm font-semibold text-green-900">
                {forecastDateRange
                  ? `${forecastDateRange.start} → ${forecastDateRange.end}`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* No filters selected */}
      {!filters.customerName && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Customer</h3>
          <p className="text-gray-600">
            Choose a customer to view future forecast data
          </p>
        </div>
      )}

      {/* Charts - Grouped by Item */}
      {filters.customerName && Object.keys(dataByItem).length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-12 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Forecast Data</h3>
          <p className="text-yellow-700">
            No forecast data found for the selected customer
          </p>
        </div>
      )}

      {filters.customerName && (
        <div className="space-y-4">
          {Object.entries(dataByItem)
            .filter(([_, data]) => data.length > 0)
            .sort(([_, dataA], [__, dataB]) => {
              // Sort by item code
              return dataA[0].ItemCode.localeCompare(dataB[0].ItemCode);
            })
            .map(([itemCode, data]) => {
              const itemName = itemNames[itemCode] || itemCode;
              const isExpanded = expandedItems.has(itemCode);

              // Calculate total predicted quantity
              const totalPredicted = data.reduce((sum, d) => sum + (d.PredictedQty || 0), 0);

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
                      <Package className="h-5 w-5 text-green-600" />
                      <div className="text-left">
                        <h3 className="text-base font-semibold text-gray-900">{itemName}</h3>
                        <p className="text-xs text-gray-500">
                          Item Code: {itemCode} • {data.length} forecast periods
                        </p>
                      </div>
                    </div>

                    {/* Show total predicted */}
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <span className="text-xs text-gray-500">Total Predicted</span>
                        <p className="text-base font-semibold text-green-600">
                          {Math.round(totalPredicted).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Chart for this item - Only show when expanded */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-200">
                      <FutureForecastChart
                        data={data}
                        itemCode={itemCode}
                        itemName={itemName}
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default FutureForecast;
