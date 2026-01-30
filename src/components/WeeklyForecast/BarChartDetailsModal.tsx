import React from 'react';
import { X, TrendingUp, BarChart3, AlertCircle, PieChart } from 'lucide-react';

interface BarChartDetailsModalProps {
  dataPoint: {
    TrxDate: string;
    WeekLabel: string;
    TotalQuantity: number;
    Predicted: number;
    Demand_Probability: number;
    Confidence?: string;
    Demand_Pattern?: string;
    Lower_Bound?: number;
    Upper_Bound?: number;
  };
  clickedDataset?: 'Actual' | 'Predicted';
  onClose: () => void;
}

export const BarChartDetailsModal: React.FC<BarChartDetailsModalProps> = ({ dataPoint, clickedDataset, onClose }) => {
  const variance = dataPoint.Predicted - dataPoint.TotalQuantity;
  const variancePercent = dataPoint.TotalQuantity > 0
    ? ((variance / dataPoint.TotalQuantity) * 100).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <BarChart3 className="h-6 w-6 text-blue-600 mr-2" />
                Week Details
                {clickedDataset && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    (Clicked: {clickedDataset})
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-600 mt-1">{dataPoint.WeekLabel}</p>
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
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-blue-700">Actual Sales</p>
                  <p className="text-2xl font-bold text-blue-900">{dataPoint.TotalQuantity.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center">
                <BarChart3 className="h-5 w-5 text-orange-600 mr-2" />
                <div>
                  <p className="text-sm text-orange-700">Predicted</p>
                  <p className="text-2xl font-bold text-orange-900">{dataPoint.Predicted.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Variance Analysis */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Forecast Accuracy</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600 text-sm">Variance:</span>
                <span className={`ml-2 font-semibold ${variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {variance >= 0 ? '+' : ''}{variance.toFixed(2)}
                </span>
              </div>
              {variancePercent !== null && (
                <div>
                  <span className="text-gray-600 text-sm">Variance %:</span>
                  <span className={`ml-2 font-semibold ${parseFloat(variancePercent) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {parseFloat(variancePercent) >= 0 ? '+' : ''}{variancePercent}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Confidence & Pattern */}
          <div className="grid grid-cols-2 gap-4">
            {dataPoint.Confidence && (
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Confidence Level</p>
                <div className="flex items-center">
                  <AlertCircle className={`h-4 w-4 mr-2 ${
                    dataPoint.Confidence === 'high' ? 'text-green-600' : 'text-yellow-600'
                  }`} />
                  <span className={`font-semibold capitalize ${
                    dataPoint.Confidence === 'high' ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {dataPoint.Confidence}
                  </span>
                </div>
              </div>
            )}

            {dataPoint.Demand_Pattern && (
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Demand Pattern</p>
                <div className="flex items-center">
                  <PieChart className="h-4 w-4 mr-2 text-purple-600" />
                  <span className="font-semibold text-purple-700 capitalize">
                    {dataPoint.Demand_Pattern}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Demand Probability */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Demand Probability</span>
              <span className="text-2xl font-bold text-gray-900">
                {(dataPoint.Demand_Probability * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
                style={{ width: `${dataPoint.Demand_Probability * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {dataPoint.Demand_Probability >= 0.8 ? 'High probability' :
               dataPoint.Demand_Probability >= 0.5 ? 'Medium probability' :
               'Low probability'}
            </p>
          </div>

          {/* Confidence Interval */}
          {dataPoint.Lower_Bound !== undefined && dataPoint.Upper_Bound !== undefined && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-900 mb-3">Confidence Interval</h4>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-xs text-purple-700">Lower Bound</p>
                  <p className="text-lg font-bold text-purple-900">{dataPoint.Lower_Bound.toFixed(2)}</p>
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-2 bg-purple-200 rounded-full relative">
                    <div
                      className="h-2 bg-purple-500 rounded-full absolute top-0"
                      style={{
                        left: `${Math.min((dataPoint.Predicted - dataPoint.Lower_Bound) / (dataPoint.Upper_Bound - dataPoint.Lower_Bound) * 100, 100)}%`,
                        width: `${Math.min((dataPoint.Upper_Bound - dataPoint.Lower_Bound) / (dataPoint.Predicted * 2), 100)}%`
                      }}
                    />
                    <div
                      className="h-3 w-0.5 bg-gray-800 rounded-full absolute top-[-2px]"
                      style={{ left: '50%' }}
                    />
                  </div>
                  <p className="text-xs text-center text-gray-600 mt-1">Range</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-purple-700">Upper Bound</p>
                  <p className="text-lg font-bold text-purple-900">{dataPoint.Upper_Bound.toFixed(2)}</p>
                </div>
              </div>
              <p className="text-xs text-purple-600 mt-2 text-center">
                Forecast range: {dataPoint.Lower_Bound.toFixed(2)} - {dataPoint.Upper_Bound.toFixed(2)}
              </p>
            </div>
          )}

          {/* Historical Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-yellow-900 mb-2">Interpretation</h4>
            <ul className="text-xs text-yellow-800 space-y-1">
              <li>• Actual vs Predicted variance shows model accuracy for this week</li>
              <li>• Probability indicates likelihood of demand occurrence</li>
              {dataPoint.Lower_Bound && <li>• Confidence interval shows forecast uncertainty range</li>}
            </ul>
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

export default BarChartDetailsModal;
