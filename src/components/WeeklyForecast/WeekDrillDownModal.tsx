import React from 'react';
import { X, Calendar } from 'lucide-react';
import type { WeeklyPrediction, DailyBreakdown } from '../../types';

interface WeekDrillDownModalProps {
  prediction: WeeklyPrediction;
  dailyData: DailyBreakdown[];
  loading: boolean;
  onClose: () => void;
}

export const WeekDrillDownModal: React.FC<WeekDrillDownModalProps> = ({
  prediction,
  dailyData,
  loading,
  onClose
}) => {
  const weekTotal = dailyData.reduce((sum, day) => sum + day.TotalQuantity, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Daily Breakdown</h2>
              <p className="text-sm text-gray-600 mt-1">{prediction.WeekRange || prediction.TrxDate}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Customer</p>
                  <p className="text-sm text-blue-700">{prediction.CustomerName}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-900">Weekly Total</p>
              <p className="text-2xl font-bold text-green-700">{prediction.TotalQuantity.toFixed(2)}</p>
            </div>
          </div>

          {/* Item Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700">Item</p>
            <p className="text-lg font-semibold text-gray-900">{prediction.ItemName}</p>
            <p className="text-sm text-gray-500">Code: {prediction.ItemCode}</p>
          </div>

          {/* Daily Breakdown */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Daily Sales</h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : dailyData.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-yellow-800">No daily data available for this week</p>
              </div>
            ) : (
              <div className="space-y-2">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                  const dayData = dailyData.find(d => d.DayOfWeek === day);
                  return (
                    <div
                      key={day}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <span className="text-sm font-medium text-gray-700 w-24">{day}</span>
                      <span className="text-sm text-gray-500 flex-1">
                        {dayData ? dayData.TrxDate : '-'}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {dayData ? dayData.TotalQuantity.toFixed(2) : '0.00'}
                      </span>
                    </div>
                  );
                })}

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Week Sum</span>
                    <span className="text-lg font-bold text-blue-600">{weekTotal.toFixed(2)}</span>
                  </div>
                  {Math.abs(weekTotal - prediction.TotalQuantity) > 0.01 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Note: Week sum ({weekTotal.toFixed(2)}) differs from weekly total ({prediction.TotalQuantity.toFixed(2)})
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Prediction Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-purple-900 mb-2">Prediction Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-purple-700">Predicted:</span>
                <span className="ml-2 font-semibold text-purple-900">{prediction.Predicted.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-purple-700">Probability:</span>
                <span className="ml-2 font-semibold text-purple-900">{(prediction.Demand_Probability * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-purple-700">Confidence:</span>
                <span className="ml-2 font-semibold text-purple-900 capitalize">{prediction.Confidence}</span>
              </div>
              <div>
                <span className="text-purple-700">Pattern:</span>
                <span className="ml-2 font-semibold text-purple-900 capitalize">{prediction.Demand_Pattern}</span>
              </div>
            </div>

            {prediction.Lower_Bound !== undefined && prediction.Upper_Bound !== undefined && (
              <div className="mt-2 pt-2 border-t border-purple-200">
                <span className="text-purple-700 text-sm">Confidence Interval:</span>
                <span className="ml-2 font-semibold text-purple-900 text-sm">
                  [{prediction.Lower_Bound.toFixed(2)} - {prediction.Upper_Bound.toFixed(2)}]
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
