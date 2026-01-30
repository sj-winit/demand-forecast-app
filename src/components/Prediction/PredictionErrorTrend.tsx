/**
 * Prediction Error Trend Component
 * Line chart showing prediction error percentage over time
 */

import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Line } from 'react-chartjs-2';
import { PredictionMetrics } from '../../utils/predictionTransformations';
import { RotateCcw } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, zoomPlugin);

interface PredictionErrorTrendProps {
  metrics: PredictionMetrics[];
}

export const PredictionErrorTrend: React.FC<PredictionErrorTrendProps> = ({ metrics }) => {
  const chartRef = useRef<ChartJS<'line'>>(null);

  const chartData = {
    labels: metrics.map(m => {
      const date = new Date(m.week);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Error %',
        data: metrics.map(m => m.errorPct),
        borderColor: 'rgb(239, 68, 68)', // red-500
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.2,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            return `Error: ${(value ?? 0).toFixed(1)}%`;
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
          },
          callback: function(value) {
            return value + '%';
          }
        },
        title: {
          display: true,
          text: 'Error Percentage',
          font: {
            size: 12
          }
        }
      }
    }
  };

  // Add zoom configuration (needs to be added separately due to type limitations)
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

  if (metrics.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-8">
        <p className="text-center text-gray-500">No data available</p>
      </div>
    );
  }

  // Calculate average error
  const avgError = metrics.reduce((sum, m) => sum + m.errorPct, 0) / metrics.length;

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Prediction Error Trend</h3>
          <p className="text-xs text-gray-500">Scroll to zoom | Drag to pan | Double-click to reset</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <span className="text-gray-600">Average Error: </span>
            <span className="font-semibold text-gray-900">{avgError.toFixed(1)}%</span>
          </div>
          <button
            onClick={handleResetZoom}
            className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition"
            title="Reset zoom (also double-click on chart)"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset Zoom
          </button>
        </div>
      </div>
      <div style={{ height: '300px' }}>
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
};
