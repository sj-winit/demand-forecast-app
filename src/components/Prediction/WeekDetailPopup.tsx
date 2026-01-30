/**
 * Week Detail Popup Component
 * Shows detailed information for a selected week including rolling averages and indicators
 */

import React, { useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Activity, CheckCircle, XCircle } from 'lucide-react';
import { WeekDetail } from '../../utils/predictionTransformations';
import { RollingAveragesChart } from './RollingAveragesChart';

interface WeekDetailPopupProps {
  detail: WeekDetail | null;
  onClose: () => void;
}

export const WeekDetailPopup: React.FC<WeekDetailPopupProps> = ({ detail, onClose }) => {
  // Keyboard navigation - ESC to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!detail) return null;

  const exportToExcel = () => {
    // Create CSV content
    const rows = [
      ['Week Detail', ''],
      ['Week', detail.week],
      ['Customer', detail.customerName],
      ['Item Code', detail.itemCode],
      ['Item Name', detail.itemName],
      ['Actual Quantity', detail.actualQty.toString()],
      ['Predicted Quantity', detail.predictedQty.toString()],
      [''],
      ['Rolling Averages', ''],
      ['4-Week Average', detail.rollingAverages.week4Avg !== null ? detail.rollingAverages.week4Avg.toFixed(2) : 'N/A'],
      ['12-Week Average', detail.rollingAverages.week12Avg !== null ? detail.rollingAverages.week12Avg.toFixed(2) : 'N/A'],
      ['24-Week Average', detail.rollingAverages.week24Avg !== null ? detail.rollingAverages.week24Avg.toFixed(2) : 'N/A'],
      ['52-Week Average', detail.rollingAverages.week52Avg !== null ? detail.rollingAverages.week52Avg.toFixed(2) : 'N/A'],
      [''],
      ['Indicators', ''],
      ['Above Trend', detail.indicators.aboveTrend !== null ? (detail.indicators.aboveTrend ? 'Yes' : 'No') : 'N/A'],
      ['Stable Demand', detail.indicators.stableDemand !== null ? (detail.indicators.stableDemand ? 'Yes' : 'No') : 'N/A'],
      ['Within Historical Range', detail.indicators.withinHistoricalRange !== null ? (detail.indicators.withinHistoricalRange ? 'Yes' : 'No') : 'N/A']
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `week-detail-${detail.week}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Week Details</h2>
            <p className="text-sm text-gray-500">{detail.week}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Section A: Week Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Week Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Customer</p>
                <p className="text-sm font-medium text-gray-900">{detail.customerName}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Item Code</p>
                <p className="text-sm font-medium text-gray-900">{detail.itemCode}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Item Name</p>
                <p className="text-sm font-medium text-gray-900">{detail.itemName}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-xs text-blue-600 mb-1">Actual Quantity</p>
                <p className="text-2xl font-bold text-blue-900">{detail.actualQty.toFixed(0)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-xs text-purple-600 mb-1">Predicted Quantity</p>
                <p className="text-2xl font-bold text-purple-900">{detail.predictedQty.toFixed(0)}</p>
              </div>
            </div>
          </div>

          {/* Section B: Historical Context (Rolling Averages) */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Historical Context (Rolling Averages)</h3>

            {/* Mini Bar Chart */}
            <div className="mb-6">
              <RollingAveragesChart
                rollingAverages={detail.rollingAverages}
                actualQty={detail.actualQty}
              />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 mb-1">4-Week Average</p>
                <p className="text-xl font-bold text-blue-900">
                  {detail.rollingAverages.week4Avg !== null
                    ? detail.rollingAverages.week4Avg.toFixed(1)
                    : 'N/A'}
                </p>
                <p className="text-xs text-blue-600 mt-2">Excludes current week</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
                <p className="text-xs text-indigo-700 mb-1">12-Week Average</p>
                <p className="text-xl font-bold text-indigo-900">
                  {detail.rollingAverages.week12Avg !== null
                    ? detail.rollingAverages.week12Avg.toFixed(1)
                    : 'N/A'}
                </p>
                <p className="text-xs text-indigo-600 mt-2">Excludes current week</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-700 mb-1">24-Week Average</p>
                <p className="text-xl font-bold text-purple-900">
                  {detail.rollingAverages.week24Avg !== null
                    ? detail.rollingAverages.week24Avg.toFixed(1)
                    : 'N/A'}
                </p>
                <p className="text-xs text-purple-600 mt-2">Excludes current week</p>
              </div>
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg border border-pink-200">
                <p className="text-xs text-pink-700 mb-1">52-Week Average</p>
                <p className="text-xl font-bold text-pink-900">
                  {detail.rollingAverages.week52Avg !== null
                    ? detail.rollingAverages.week52Avg.toFixed(1)
                    : 'N/A'}
                </p>
                <p className="text-xs text-pink-600 mt-2">Excludes current week</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              * Rolling averages are calculated using historical data up to (but not including) the selected week
            </p>
          </div>

          {/* Section C: Indicators */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Indicators</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Above Trend */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Above Recent Trend</p>
                  {detail.indicators.aboveTrend !== null ? (
                    detail.indicators.aboveTrend ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )
                  ) : (
                    <Activity className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {detail.indicators.aboveTrend !== null
                    ? detail.indicators.aboveTrend
                      ? 'Actual is above 4-week average'
                      : 'Actual is below 4-week average'
                    : 'Insufficient data for comparison'}
                </p>
              </div>

              {/* Stable Demand */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Stable Demand</p>
                  {detail.indicators.stableDemand !== null ? (
                    detail.indicators.stableDemand ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-amber-600" />
                    )
                  ) : (
                    <Activity className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {detail.indicators.stableDemand !== null
                    ? detail.indicators.stableDemand
                      ? 'Low volatility (CV < 0.3)'
                      : 'High volatility detected'
                    : 'Insufficient data for analysis'}
                </p>
              </div>

              {/* Within Historical Range */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Within Historical Range</p>
                  {detail.indicators.withinHistoricalRange !== null ? (
                    detail.indicators.withinHistoricalRange ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )
                  ) : (
                    <Activity className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {detail.indicators.withinHistoricalRange !== null
                    ? detail.indicators.withinHistoricalRange
                      ? 'Prediction within 12-week min-max'
                      : 'Prediction outside historical range'
                    : 'Insufficient data for comparison'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition"
          >
            Export to Excel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
