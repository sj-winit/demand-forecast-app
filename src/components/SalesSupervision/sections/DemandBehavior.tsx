/**
 * Section 2: Demand Behavior
 * Charts: Demand Density Distribution, Demand Type Split, Zero-Demand Percentage per SKU
 */

import React from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { commonBarOptions, COLORS, DEMAND_TYPE_COLORS, createHistogramBins } from '../../../utils/chartConfig';
import {
  groupBySKU,
  calculateDemandDensity,
  getDemandType,
  WeeklySalesData
} from '../../../utils/dataTransformations';

interface DemandBehaviorProps {
  data: WeeklySalesData[];
  onSKUClick?: (itemCode: string) => void;
}

export const DemandBehavior: React.FC<DemandBehaviorProps> = ({ data, onSKUClick: _onSKUClick }) => {
  // Chart 4: Demand Density Distribution (Histogram)
  const demandDensityData = React.useMemo(() => {
    const skuData = groupBySKU(data);
    const densities = Array.from(skuData.values()).map(records =>
      calculateDemandDensity(records)
    );
    return createHistogramBins(densities, 10);
  }, [data]);

  const demandDensityChartData = {
    labels: demandDensityData.bins.map(b => `${b}%`),
    datasets: [{
      label: 'Number of SKUs',
      data: demandDensityData.frequencies,
      backgroundColor: COLORS.blue,
      borderColor: COLORS.blueBorder,
      borderWidth: 1
    }]
  };

  // Chart 5: Demand Type Split (Donut)
  const demandTypeData = React.useMemo(() => {
    const skuData = groupBySKU(data);
    const typeCount: Record<string, number> = { 'Smooth': 0, 'Intermittent': 0, 'Sparse': 0 };

    for (const records of skuData.values()) {
      const density = calculateDemandDensity(records);
      const type = getDemandType(density);
      typeCount[type]++;
    }

    return typeCount;
  }, [data]);

  const demandTypeChartData = {
    labels: Object.keys(demandTypeData),
    datasets: [{
      data: Object.values(demandTypeData),
      backgroundColor: Object.keys(demandTypeData).map(t => DEMAND_TYPE_COLORS[t as keyof typeof DEMAND_TYPE_COLORS]),
      borderColor: '#ffffff',
      borderWidth: 2
    }]
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Section 2: Demand Behavior
        </h3>
        <p className="text-sm text-gray-500">
          Understand demand patterns and intermittency
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 4: Demand Density Distribution */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <h4 className="text-base font-semibold text-gray-800 mb-4">
            4. Demand Density Distribution
          </h4>
          <p className="text-xs text-gray-500 mb-3">
            Density = (# weeks with demand) / (total weeks)
          </p>
          <div style={{ height: '300px' }}>
            <Bar data={demandDensityChartData} options={{
              ...commonBarOptions,
              plugins: { ...commonBarOptions.plugins, title: { display: false } }
            }} />
          </div>
        </div>

        {/* Chart 5: Demand Type Split */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <h4 className="text-base font-semibold text-gray-800 mb-4">
            5. Demand Type Split
          </h4>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{demandTypeData['Smooth']}</div>
              <div className="text-xs text-gray-500">Smooth (&gt;70%)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{demandTypeData['Intermittent']}</div>
              <div className="text-xs text-gray-500">Intermittent (30-70%)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{demandTypeData['Sparse']}</div>
              <div className="text-xs text-gray-500">Sparse (&lt;30%)</div>
            </div>
          </div>
          <div style={{ height: '200px' }}>
            <Doughnut data={demandTypeChartData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom' as const
                }
              }
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};
