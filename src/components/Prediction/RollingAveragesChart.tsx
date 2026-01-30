/**
 * Rolling Averages Mini Chart Component
 * Horizontal bar chart showing different rolling average windows
 */

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { RollingAverages } from '../../utils/predictionTransformations';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface RollingAveragesChartProps {
  rollingAverages: RollingAverages;
  actualQty: number;
}

export const RollingAveragesChart: React.FC<RollingAveragesChartProps> = ({
  rollingAverages,
  actualQty
}) => {
  // Prepare data for the chart - only show rolling averages that have data
  // Order: 52 week, 24 week, 12 week, 4 week (left to right)
  const labels: string[] = [];
  const rollingData: number[] = [];
  const colors: string[] = [];
  const borders: string[] = [];

  if (rollingAverages.week52Avg !== null) {
    labels.push('52-Week');
    rollingData.push(rollingAverages.week52Avg);
    colors.push('rgba(236, 72, 153, 0.8)');
    borders.push('rgb(236, 72, 153)');
  }
  if (rollingAverages.week24Avg !== null) {
    labels.push('24-Week');
    rollingData.push(rollingAverages.week24Avg);
    colors.push('rgba(139, 92, 246, 0.8)');
    borders.push('rgb(139, 92, 246)');
  }
  if (rollingAverages.week12Avg !== null) {
    labels.push('12-Week');
    rollingData.push(rollingAverages.week12Avg);
    colors.push('rgba(99, 102, 241, 0.8)');
    borders.push('rgb(99, 102, 241)');
  }
  if (rollingAverages.week4Avg !== null) {
    labels.push('4-Week');
    rollingData.push(rollingAverages.week4Avg);
    colors.push('rgba(59, 130, 246, 0.8)');
    borders.push('rgb(59, 130, 246)');
  }

  // Create chart data
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Rolling Average',
        data: rollingData,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 2,
        borderRadius: 4,
      }
    ]
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Average: ${context.parsed.y.toFixed(1)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: { size: 12, weight: '500' as const }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.06)'
        },
        ticks: {
          font: { size: 11 }
        }
      }
    }
  };

  // Check if we have any data to display
  const hasData = rollingData.length > 0;

  if (!hasData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-sm text-gray-500">
          Insufficient historical data to calculate rolling averages
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div style={{ height: '200px' }}>
        <Bar data={chartData} options={options} />
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-xs text-gray-600">Current Week:</span>
          <span className="text-sm font-bold text-green-600">{actualQty.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};
