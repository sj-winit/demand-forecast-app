/**
 * Section 6: Zero & Sparsity Visuals
 * Charts: SKU × Week Zero-Demand Map (Heatmap), Sparsity Trend Over Time
 */

import React from 'react';
import { COLORS } from '../../../utils/chartConfig';
import {
  createZeroDemandHeatmap,
  WeeklySalesData
} from '../../../utils/dataTransformations';

interface ZeroSparsityVisualsProps {
  data: WeeklySalesData[];
}

export const ZeroSparsityVisuals: React.FC<ZeroSparsityVisualsProps> = ({ data }) => {
  // Chart 14: SKU × Week Zero-Demand Map (Heatmap)
  const heatmapData = React.useMemo(() => {
    return createZeroDemandHeatmap(data, 30);
  }, [data]);

  // Custom heatmap rendering using CSS grid
  const renderHeatmap = () => {
    const { skus, weeks, grid } = heatmapData;
    const maxWeeks = Math.min(weeks.length, 52); // Limit to prevent overflow

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Week headers */}
          <div className="flex" style={{ marginLeft: '120px' }}>
            {weeks.slice(0, maxWeeks).map((week, idx) => (
              <div
                key={week}
                className="text-xs text-gray-500 flex-shrink-0"
                style={{ width: '20px', transform: 'rotate(-45deg)', transformOrigin: 'top left' }}
              >
                {idx % 4 === 0 ? week.substring(5) : ''}
              </div>
            ))}
          </div>

          {/* Grid */}
          {skus.map((sku, skuIdx) => (
            <div key={sku} className="flex items-center" style={{ height: '20px' }}>
              {/* SKU label */}
              <div
                className="text-xs text-gray-700 truncate flex-shrink-0 mr-1"
                style={{ width: '120px' }}
                title={sku}
              >
                {sku.length > 15 ? sku.substring(0, 15) + '...' : sku}
              </div>

              {/* Cells */}
              <div className="flex">
                {grid[skuIdx].slice(0, maxWeeks).map((cell, cellIdx) => (
                  <div
                    key={cellIdx}
                    className="flex-shrink-0"
                    style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: cell === 1 ? COLORS.green : COLORS.gray,
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}
                    title={`${sku} - ${weeks[cellIdx]}: ${cell === 1 ? 'Demand' : 'Zero'}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Section 6: Zero & Sparsity Visuals
        </h3>
        <p className="text-sm text-gray-500">
          Identify gaps and patterns in demand data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 14: SKU × Week Zero-Demand Map */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100 lg:col-span-2">
          <h4 className="text-base font-semibold text-gray-800 mb-4">
            14. SKU × Week Zero-Demand Map (Top 30 SKUs)
          </h4>
          <p className="text-xs text-gray-500 mb-3">
            Green = Demand, Gray = Zero Demand
          </p>
          <div className="flex items-center gap-4 mb-3 text-xs">
            <div className="flex items-center">
              <div className="w-4 h-4 mr-1" style={{ backgroundColor: COLORS.green }}></div>
              <span>With Demand</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 mr-1" style={{ backgroundColor: COLORS.gray }}></div>
              <span>Zero Demand</span>
            </div>
            <span className="text-gray-500">
              Showing {heatmapData.skus.length} SKUs × {Math.min(heatmapData.weeks.length, 52)} weeks
            </span>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {renderHeatmap()}
          </div>
        </div>
      </div>
    </div>
  );
};
