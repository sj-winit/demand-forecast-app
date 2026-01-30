/**
 * Future Forecast Chart Component
 * Bar chart showing forecasted quantities (green bars)
 */

import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Bar } from 'react-chartjs-2';
import { PredictionData } from '../../utils/predictionTransformations';
import { RotateCcw } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, zoomPlugin);

interface FutureForecastChartProps {
  data: PredictionData[];
  itemCode?: string;
  itemName?: string;
}

export const FutureForecastChart: React.FC<FutureForecastChartProps> = ({
  data,
  itemCode,
  itemName
}) => {
  const chartRef = useRef<ChartJS<'bar'>>(null);

  const title = itemName ? `Future Forecast - ${itemName}` : 'Future Forecast';
  const subtitle = itemCode ? `Item Code: ${itemCode}` : '';

  // Debug logging
  console.log('=== FutureForecastChart ===');
  console.log('Data points received:', data.length);
  console.log('Data dates:', data.map(d => String(d.TrxDate)));
  console.log('Data values:', data.map(d => d.PredictedQty));

  // Calculate info
  const totalPeriods = data.length;
  const totalPredicted = data.reduce((sum, d) => sum + (d.PredictedQty || 0), 0);
  const avgPredicted = totalPeriods > 0 ? totalPredicted / totalPeriods : 0;
  const forecastInfo = `${totalPeriods} periods • Avg: ${avgPredicted.toFixed(1)}/period`;

  // Calculate minimum width based on number of data points
  const minChartWidth = Math.max(800, data.length * 50);

  // All bars are green for forecast
  const forecastColors = data.map(() => 'rgba(34, 197, 94, 0.8)');  // green-500
  const forecastBorders = data.map(() => 'rgb(34, 197, 94)');       // green-500

  const chartData = {
    labels: data.map(d => {
      const date = new Date(d.TrxDate);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Forecasted Quantity',
        data: data.map(d => d.PredictedQty),
        backgroundColor: forecastColors,
        borderColor: forecastBorders,
        borderWidth: 2,
      }
    ]
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          font: {
            size: 11
          },
          boxWidth: 12,
          padding: 15,
          // Use custom color to ensure legend shows green
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.datasets.length === 0) return [];

            return data.datasets.map((dataset, i) => ({
              text: dataset.label || '',
              fillStyle: 'rgba(34, 197, 94, 0.8)',  // green
              strokeStyle: 'rgb(34, 197, 94)',       // green
              lineWidth: 2,
              hidden: !chart.isDatasetVisible(i),
              datasetIndex: i
            }));
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${(value ?? 0).toFixed(0)}`;
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
          font: {
            size: 11
          },
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 11
          }
        }
      }
    }
  };

  // Add zoom configuration
  (options as any).zoom = {
    pan: {
      enabled: true,
      mode: 'x',
    },
    zoom: {
      wheel: {
        enabled: true,
      },
      pinch: {
        enabled: true
      },
      mode: 'x',
    }
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-8">
        <p className="text-center text-gray-500">No forecast data available</p>
      </div>
    );
  }

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">{forecastInfo}</p>
        </div>
        <button
          onClick={handleResetZoom}
          className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition ml-4"
          title="Reset zoom (also double-click on chart)"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset Zoom
        </button>
      </div>

      {/* Scrollable container for chart */}
      <div
        className="overflow-x-auto overflow-y-hidden border border-gray-100 rounded"
        style={{ maxWidth: '100%' }}
      >
        <div style={{ minWidth: `${minChartWidth}px`, height: '250px' }}>
          <Bar ref={chartRef} data={chartData} options={options} />
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-3 text-center">
        Future forecast predictions • Scroll horizontally for more data
      </p>
    </div>
  );
};
