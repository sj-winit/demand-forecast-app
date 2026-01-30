/**
 * Section 3: Volume & Volatility
 * Charts: Average Weekly Quantity per SKU (Log Scale), Mean vs CV Scatter Plot
 */

import React from 'react';
import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from 'chart.js';
import { DEMAND_TYPE_COLORS } from '../../../utils/chartConfig';
import {
  groupBySKU,
  calculateCV,
  calculateDemandDensity,
  getDemandType,
  WeeklySalesData
} from '../../../utils/dataTransformations';

// Register scatter chart components
ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

interface VolumeVolatilityProps {
  data: WeeklySalesData[];
}

export const VolumeVolatility: React.FC<VolumeVolatilityProps> = ({ data }) => {
  // Chart 8: Mean vs CV Scatter Plot
  const scatterData = React.useMemo(() => {
    const skuData = groupBySKU(data);
    const scatterPoints: Array<{ x: number; y: number; demandType: string; itemCode: string }> = [];

    for (const [itemCode, records] of skuData.entries()) {
      const quantities = records.map(r => r.TotalQuantity);
      const { mean, cv } = calculateCV(quantities);

      if (mean > 0 && cv < 10) { // Filter extreme values
        const density = calculateDemandDensity(records);
        const demandType = getDemandType(density);
        scatterPoints.push({ x: mean, y: cv, demandType, itemCode });
      }
    }

    return scatterPoints;
  }, [data]);

  const scatterChartData = {
    datasets: [
      {
        label: 'Smooth',
        data: scatterData.filter(d => d.demandType === 'Smooth'),
        backgroundColor: DEMAND_TYPE_COLORS['Smooth'],
        pointRadius: 6,
        pointHoverRadius: 8
      },
      {
        label: 'Intermittent',
        data: scatterData.filter(d => d.demandType === 'Intermittent'),
        backgroundColor: DEMAND_TYPE_COLORS['Intermittent'],
        pointRadius: 6,
        pointHoverRadius: 8
      },
      {
        label: 'Sparse',
        data: scatterData.filter(d => d.demandType === 'Sparse'),
        backgroundColor: DEMAND_TYPE_COLORS['Sparse'],
        pointRadius: 6,
        pointHoverRadius: 8
      }
    ]
  };

  const scatterChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const point = context.raw;
            return [
              `Mean: ${point.x.toFixed(2)}`,
              `CV: ${point.y.toFixed(2)}`,
              `SKU: ${point.itemCode}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: {
          display: true,
          text: 'Mean Weekly Demand',
          font: { size: 14, weight: 'bold' as const }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      y: {
        type: 'linear' as const,
        title: {
          display: true,
          text: 'Coefficient of Variation (CV = Std/Mean)',
          font: { size: 14, weight: 'bold' as const }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Section 3: Volume & Volatility
        </h3>
        <p className="text-sm text-gray-500">
          Analyze demand magnitude and variability
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 8: Mean vs CV Scatter Plot */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100 lg:col-span-2">
          <h4 className="text-base font-semibold text-gray-800 mb-4">
            8. Mean vs Coefficient of Variation
          </h4>
          <p className="text-xs text-gray-500 mb-3">
            CV measures relative variability. Lower CV = more stable demand
          </p>
          <div style={{ height: '350px' }}>
            <Scatter data={scatterChartData} options={scatterChartOptions} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: DEMAND_TYPE_COLORS['Smooth'] }}></div>
              <span>Smooth (stable)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: DEMAND_TYPE_COLORS['Intermittent'] }}></div>
              <span>Intermittent</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: DEMAND_TYPE_COLORS['Sparse'] }}></div>
              <span>Sparse (risky)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
