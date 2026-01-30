import React, { useState, useEffect } from 'react';
import { Filter, ChevronDown, ChevronUp, Search, BarChart3 } from 'lucide-react';
import { getHistoricalData, getCustomers, getItems, getPatterns, getDailyBreakdown } from '../../services/api';
import type { WeeklyPrediction, DailyBreakdown } from '../../types';
import { WeeklyBarChart } from './WeeklyBarChart';
import { BarChartDetailsModal } from './BarChartDetailsModal';
import { WeekDrillDownModal } from './WeekDrillDownModal';
import { LoadingSpinner } from '../Common';

interface FilterState {
  customer: string;
  item_codes: string[];
  start_week: string;
  end_week: string;
  confidence: string;
}

interface WeeklyForecastProps {
  onSelectPrediction?: (prediction: WeeklyPrediction) => void;
}

export const WeeklyForecast: React.FC<WeeklyForecastProps> = ({ onSelectPrediction }) => {
  const [predictions, setPredictions] = useState<WeeklyPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Bar chart details modal
  const [selectedBarData, setSelectedBarData] = useState<any>(null);
  const [clickedDataset, setClickedDataset] = useState<'Actual' | 'Predicted' | null>(null);

  // Filter options
  const [customers, setCustomers] = useState<string[]>([]);
  const [items, setItems] = useState<Array<{ItemCode: string; ItemName: string}>>([]);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    customer: '',
    item_codes: [],
    start_week: '',
    end_week: '',
    confidence: ''
  });

  // Modal state
  const [selectedWeek, setSelectedWeek] = useState<WeeklyPrediction | null>(null);
  const [dailyData, setDailyData] = useState<DailyBreakdown[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Sort state
  const [sortColumn, setSortColumn] = useState<string>('TrxDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadFilterOptions();
    // Don't load data on init - wait for user to apply filters
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      const filterParams: any = {};
      if (filters.customer) filterParams.customer = filters.customer;
      if (filters.item_codes && filters.item_codes.length > 0) {
        filterParams.item_codes = filters.item_codes;
      }
      if (filters.start_week) filterParams.start_week = filters.start_week;
      if (filters.end_week) filterParams.end_week = filters.end_week;

      // Get historical data (Train/Test only, no Forecast)
      const historicalData = await getHistoricalData(filterParams);

      setPredictions(historicalData);

      if (historicalData.length === 0) {
        setError('No historical data found matching the selected filters. Try adjusting your criteria.');
      }
    } catch (err) {
      setError('Failed to load historical data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [custData, itemData] = await Promise.all([
        getCustomers(),
        getItems()
      ]);

      setCustomers(custData);
      setItems(itemData);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    // At least one filter should be selected
    if (!filters.customer && (!filters.item_codes || filters.item_codes.length === 0) && !filters.start_week && !filters.end_week && !filters.confidence) {
      setError('Please select at least one filter before applying.');
      return;
    }
    loadData();
  };

  const clearFilters = () => {
    setFilters({
      customer: '',
      item_codes: [],
      start_week: '',
      end_week: '',
      confidence: ''
    });
    setPredictions([]);
    setHasSearched(false);
    setError(null);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleWeekClick = async (prediction: WeeklyPrediction) => {
    setSelectedWeek(prediction);
    // Also notify parent for AI insights
    if (onSelectPrediction) {
      onSelectPrediction(prediction);
    }
    setModalLoading(true);

    try {
      const daily = await getDailyBreakdown(
        prediction.TrxDate,
        prediction.CustomerName,
        prediction.ItemCode
      );
      setDailyData(daily);
    } catch (err) {
      console.error('Failed to load daily breakdown:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedWeek(null);
    setDailyData([]);
  };

  // Sort predictions
  const sortedPredictions = [...predictions].sort((a, b) => {
    let aVal = a[sortColumn as keyof WeeklyPrediction];
    let bVal = b[sortColumn as keyof WeeklyPrediction];

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  const getConfidenceBadgeClass = (confidence: string) => {
    return confidence === 'high'
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="h-7 w-7 mr-2 text-blue-600" />
            Weekly Historical Data
          </h2>
          <p className="text-sm text-gray-500 mt-1">View historical train/test data (actual vs predicted)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </h3>
          <div className="space-x-2">
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition"
            >
              Clear
            </button>
            <button
              onClick={applyFilters}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-blue-300"
            >
              {loading ? 'Loading...' : 'Apply Filters'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={filters.customer}
              onChange={(e) => handleFilterChange('customer', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Customers</option>
              {customers.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Items (multi-select)</label>
            <div className="border border-gray-300 rounded-md p-2 max-h-32 overflow-y-auto bg-white">
              <div className="mb-2">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={filters.item_codes.length === 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters(prev => ({ ...prev, item_codes: [] }));
                      }
                    }}
                  />
                  All Items
                </label>
              </div>
              {items.slice(0, 20).map(item => (
                <label key={item.ItemCode} className="flex items-center text-sm mb-1">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={filters.item_codes.includes(item.ItemCode)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters(prev => ({
                          ...prev,
                          item_codes: [...prev.item_codes, item.ItemCode]
                        }));
                      } else {
                        setFilters(prev => ({
                          ...prev,
                          item_codes: prev.item_codes.filter(code => code !== item.ItemCode)
                        }));
                      }
                    }}
                  />
                  {item.ItemName}
                </label>
              ))}
              {items.length > 20 && (
                <p className="text-xs text-gray-500 mt-2">...and {items.length - 20} more items (select customer first to narrow down)</p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">{filters.item_codes.length} item(s) selected</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Week</label>
            <input
              type="date"
              value={filters.start_week}
              onChange={(e) => handleFilterChange('start_week', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Week</label>
            <input
              type="date"
              value={filters.end_week}
              onChange={(e) => handleFilterChange('end_week', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confidence</label>
            <select
              value={filters.confidence}
              onChange={(e) => handleFilterChange('confidence', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="high">High</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="large" />
          <span className="ml-3 text-gray-600">Loading historical data...</span>
        </div>
      )}

      {/* Initial State - No data yet */}
      {!hasSearched && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
          <Filter className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">No filters applied yet</h3>
          <p className="text-blue-700 mb-4">
            Select at least one filter from the options above and click "Apply Filters" to view historical data.
          </p>
          <div className="text-sm text-blue-600">
            <p className="font-medium mb-1">Tips:</p>
            <ul className="text-left inline-block text-left">
              <li>• Historical data shows Train/Test splits (actual vs predicted)</li>
              <li>• Select multiple items to see separate charts for each item</li>
              <li>• Use date range to filter by time period</li>
              <li>• Click on any bar to see detailed information</li>
            </ul>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Results - Charts + Table */}
      {hasSearched && !loading && predictions.length > 0 && (
        <>
          {/* Charts - One per item */}
          {(() => {
            // Group predictions by item
            const itemGroups = predictions.reduce((acc, pred) => {
              const key = pred.ItemCode;
              if (!acc[key]) {
                acc[key] = [];
              }
              acc[key].push(pred);
              return acc;
            }, {} as Record<string, typeof predictions>);

            const itemCodes = Object.keys(itemGroups).sort();

            return itemCodes.map((itemCode, idx) => {
              const itemPredictions = itemGroups[itemCode];
              const itemName = itemPredictions[0]?.ItemName || itemCode;

              return (
                <WeeklyBarChart
                  key={itemCode}
                  data={itemPredictions.map(p => ({
                    TrxDate: p.TrxDate,
                    WeekLabel: p.WeekLabel || '',
                    TotalQuantity: p.TotalQuantity,
                    Predicted: p.Predicted,
                    Demand_Probability: p.Demand_Probability,
                    Confidence: p.Confidence,
                    Demand_Pattern: p.Demand_Pattern,
                    Lower_Bound: p.Lower_Bound,
                    Upper_Bound: p.Upper_Bound
                  }))}
                  title={`${itemName} - Actual vs Predicted`}
                  onBarClick={(barData) => {
                    setSelectedBarData(barData.data);
                    setClickedDataset(barData.dataset);
                  }}
                />
              );
            });
          })()}

          {/* Results Summary */}
          <div className="text-sm text-gray-600 mb-2">
            Showing {sortedPredictions.length} historical record{sortedPredictions.length !== 1 ? 's' : ''} for selected filters
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {[
                      { key: 'TrxDate', label: 'Week' },
                      { key: 'WeekLabel', label: 'Week Range' },
                      { key: 'CustomerName', label: 'Customer' },
                      { key: 'ItemName', label: 'Item' },
                      { key: 'TotalQuantity', label: 'Actual' },
                      { key: 'Predicted', label: 'Predicted' },
                      { key: 'Demand_Probability', label: 'Probability' },
                      { key: 'Confidence', label: 'Confidence' }
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          {col.label}
                          {sortColumn === col.key && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedPredictions.map((pred, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleWeekClick(pred)}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {pred.TrxDate}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {pred.WeekLabel || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {pred.CustomerName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {pred.ItemName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {pred.TotalQuantity.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {pred.Predicted.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {(pred.Demand_Probability * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getConfidenceBadgeClass(pred.Confidence)}`}>
                          {pred.Confidence}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600">
                        <Search className="h-4 w-4" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Drill-down Modal */}
      {selectedWeek && (
        <WeekDrillDownModal
          prediction={selectedWeek}
          dailyData={dailyData}
          loading={modalLoading}
          onClose={closeModal}
        />
      )}

      {/* Bar Chart Details Modal */}
      {selectedBarData && (
        <BarChartDetailsModal
          dataPoint={selectedBarData}
          clickedDataset={clickedDataset || undefined}
          onClose={() => {
            setSelectedBarData(null);
            setClickedDataset(null);
          }}
        />
      )}
    </div>
  );
};

export default WeeklyForecast;
