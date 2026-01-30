/**
 * Actual vs Prediction Chart Component
 * Grouped bar chart comparing actual vs predicted quantities
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
import { PredictionMetrics } from '../../utils/predictionTransformations';
import { RotateCcw, TrendingUp } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, zoomPlugin);

interface ActualVsPredictionChartProps {
  metrics: PredictionMetrics[];
  onBarClick: (week: string) => void;
  itemCode?: string;
  itemName?: string;
  onShowFutureForecast?: () => void;
}

export const ActualVsPredictionChart: React.FC<ActualVsPredictionChartProps> = ({
  metrics,
  onBarClick,
  itemName,
  onShowFutureForecast
}) => {
  const chartRef = useRef<ChartJS<'bar'>>(null);

  const title = itemName ? `Actual vs Prediction - ${itemName}` : 'Actual vs Prediction';

  // Calculate week counts
  const totalWeeks = metrics.length;
  const weeksWithActual = metrics.filter(m => m.actualQty > 0).length;
  const weekInfo = `${weeksWithActual} weeks out of ${totalWeeks} weeks`;

  // Calculate minimum width based on number of data points (for horizontal scroll)
  const minChartWidth = Math.max(800, metrics.length * 50);

  // Determine actual colors based on whether actual is zero (missing data)
  const actualColors = metrics.map(m => {
    if (m.actualQty === 0) {
      return 'rgba(156, 163, 175, 0.2)';  // Very muted gray for missing actuals
    }
    return 'rgba(59, 130, 246, 0.8)';      // blue for actual data
  });

  const actualBorders = metrics.map(m => {
    if (m.actualQty === 0) {
      return 'rgb(156, 163, 175)';
    }
    return 'rgb(59, 130, 246)';
  });

  // Predicted bars - all orange (only Test/Train data shown, Forecast filtered out)
  const predictedColors = metrics.map(_m => 'rgba(249, 115, 22, 0.8)');  // orange-500
  const predictedBorders = metrics.map(_m => 'rgb(249, 115, 22)');       // orange-500

  const chartData = {
    labels: metrics.map(m => {
      const date = new Date(m.week);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Actual Quantity',
        data: metrics.map(m => m.actualQty),
        backgroundColor: actualColors,
        borderColor: actualBorders,
        borderWidth: 1,
      },
      {
        label: 'Predicted Quantity',
        data: metrics.map(m => m.predictedQty),
        backgroundColor: predictedColors,
        borderColor: predictedBorders,
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
    // Ensure datasets are ordered correctly (Actual first/left, Predicted second/right)
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,  // Right align within top position
        labels: {
          font: {
            size: 11
          },
          boxWidth: 12,
          padding: 15,
          // Use custom color generation to ensure legend shows correct colors
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.datasets.length === 0) return [];

            return data.datasets.map((dataset, i) => {
              // Use the primary color for the legend (ignore array of mixed colors)
              const backgroundColor = i === 0
                ? 'rgba(59, 130, 246, 0.8)'  // Blue for Actual
                : 'rgba(249, 115, 22, 0.8)'; // Orange for Predicted

              const borderColor = i === 0
                ? 'rgb(59, 130, 246)'         // Blue for Actual
                : 'rgb(249, 115, 22)';        // Orange for Predicted

              return {
                text: dataset.label || '',
                fillStyle: backgroundColor,
                strokeStyle: borderColor,
                lineWidth: 2,
                hidden: !chart.isDatasetVisible(i),
                datasetIndex: i
              };
            });
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            const metric = metrics[context.dataIndex];

            let result = `${label}: ${(value ?? 0).toFixed(0)}`;
            if (context.datasetIndex === 0 && metric?.actualQty === 0) {
              result += ' (No actual data)';
            }
            return result;
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
    },
    onClick: (_event, elements) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const week = metrics[index].week;
        onBarClick(week);
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
        <p className="text-center text-gray-500">No data available for the selected filters</p>
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
          <p className="text-xs text-gray-500 mt-1">{weekInfo}</p>
        </div>
        <div className="flex items-center space-x-2">
          {onShowFutureForecast && (
            <button
              onClick={onShowFutureForecast}
              className="flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition"
              title="View future forecast for this item"
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Future Forecast
            </button>
          )}
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

      {/* Scrollable container for chart - horizontal scroll when date range is large */}
      <div
        className="overflow-x-auto overflow-y-hidden border border-gray-100 rounded"
        style={{ maxWidth: '100%' }}
      >
        <div style={{ minWidth: `${minChartWidth}px`, height: '250px' }}>
          <Bar ref={chartRef} data={chartData} options={options} />
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-3 text-center">
        Click on any bar to see details • Scroll horizontally for more data
      </p>
    </div>
  );
};
