import React, { useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface WeeklyBarChartProps {
  data: Array<{
    TrxDate: string;
    WeekLabel: string;
    TotalQuantity: number;
    Predicted: number;
    Demand_Probability: number;
    Confidence?: string;
    Demand_Pattern?: string;
    Lower_Bound?: number;
    Upper_Bound?: number;
  }>;
  title?: string;
  onBarClick?: (dataPoint: any) => void;
}

export const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({ data, title, onBarClick }) => {
  const chartRef = useRef<ChartJS<'bar'>>(null);

  const chartData = {
    labels: data.map(d => d.WeekLabel),
    datasets: [
      {
        label: 'Actual',
        data: data.map(d => d.TotalQuantity),
        backgroundColor: 'rgba(59, 130, 246, 0.8)', // Blue
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        borderRadius: 4,
      },
      {
        label: 'Predicted',
        data: data.map(d => d.Predicted),
        backgroundColor: 'rgba(249, 115, 22, 0.8)', // Orange
        borderColor: 'rgb(249, 115, 22)',
        borderWidth: 2,
        borderRadius: 4,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'rect' as const,
          padding: 15,
          font: {
            size: 13,
          },
        },
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          afterBody: function(tooltipItems: any[]) {
            const index = tooltipItems[0]?.dataIndex;
            if (index !== undefined) {
              const item = data[index];
              const lines = [
                `Probability: ${(item.Demand_Probability * 100).toFixed(1)}%`
              ];
              if (item.Confidence) {
                lines.push(`Confidence: ${item.Confidence}`);
              }
              if (item.Demand_Pattern) {
                lines.push(`Pattern: ${item.Demand_Pattern}`);
              }
              lines.push('Click bar for details →');
              return lines;
            }
            return '';
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Quantity',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Week',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
        },
        grid: {
          display: false,
        },
      },
    },
    onClick: (event: any, activeElements: any[]) => {
      if (activeElements.length > 0 && onBarClick) {
        const index = activeElements[0].index;
        const datasetIndex = activeElements[0].datasetIndex;
        onBarClick({
          index,
          datasetIndex,
          data: data[index],
          dataset: datasetIndex === 0 ? 'Actual' : 'Predicted'
        });
      }
    },
    onHover: (event: any, elements: any[]) => {
      const canvas = chartRef.current?.canvas;
      if (canvas) {
        canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
        <p className="text-center text-gray-500">No data available for chart</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title || 'Weekly Forecast Comparison'}</h3>
      <p className="text-sm text-gray-500 mb-4">Click on any bar to view detailed information</p>

      <div style={{ height: '400px' }}>
        <Bar ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
};

export default WeeklyBarChart;
