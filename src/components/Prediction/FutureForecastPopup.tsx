/**
 * Future Forecast Popup Component
 * Shows future forecast for a specific item
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { PredictionData } from '../../utils/predictionTransformations';
import { FutureForecastChart } from '../FutureForecast/FutureForecastChart';

interface FutureForecastPopupProps {
  isOpen: boolean;
  data: PredictionData[];
  itemCode: string;
  itemName: string;
  onClose: () => void;
}

export const FutureForecastPopup: React.FC<FutureForecastPopupProps> = ({
  isOpen,
  data,
  itemCode,
  itemName,
  onClose
}) => {
  // Keyboard navigation - ESC to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Future Forecast</h2>
            <p className="text-sm text-gray-500">{itemName} (Item: {itemCode})</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {data.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No forecast data available for this item.</p>
            </div>
          ) : (
            <FutureForecastChart
              data={data}
              itemCode={itemCode}
              itemName={itemName}
            />
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
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
