/**
 * Common chart configurations and utilities
 */
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Color palettes
export const COLORS = {
  blue: 'rgba(59, 130, 246, 0.8)',
  blueBorder: 'rgb(59, 130, 246)',
  blueLight: 'rgba(59, 130, 246, 0.2)',
  green: 'rgba(34, 197, 94, 0.8)',
  greenBorder: 'rgb(34, 197, 94)',
  greenLight: 'rgba(34, 197, 94, 0.2)',
  red: 'rgba(239, 68, 68, 0.8)',
  redBorder: 'rgb(239, 68, 68)',
  redLight: 'rgba(239, 68, 68, 0.2)',
  purple: 'rgba(168, 85, 247, 0.8)',
  purpleBorder: 'rgb(168, 85, 247)',
  orange: 'rgba(249, 115, 22, 0.8)',
  orangeBorder: 'rgb(249, 115, 22)',
  yellow: 'rgba(234, 179, 8, 0.8)',
  yellowBorder: 'rgb(234, 179, 8)',
  teal: 'rgba(20, 184, 166, 0.8)',
  tealBorder: 'rgb(20, 184, 166)',
  pink: 'rgba(236, 72, 153, 0.8)',
  pinkBorder: 'rgb(236, 72, 153)',
  gray: 'rgba(107, 114, 128, 0.8)',
  grayBorder: 'rgb(107, 114, 128)',
};

export const DEMAND_TYPE_COLORS = {
  'Smooth': COLORS.green,
  'Intermittent': COLORS.yellow,
  'Sparse': COLORS.red
};

// Common chart options
export const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
    }
  }
};

export const commonLineOptions = {
  ...commonChartOptions,
  scales: {
    x: {
      grid: {
        display: false
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      }
    }
  }
};

export const commonBarOptions = {
  ...commonChartOptions,
  scales: {
    x: {
      grid: {
        display: false
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      }
    }
  }
};

// Histogram binning utility
export function createHistogramBins(data: number[], binCount: number = 20): { bins: string[], frequencies: number[] } {
  if (data.length === 0) return { bins: [], frequencies: [] };

  const min = Math.min(...data);
  const max = Math.max(...data);
  const binSize = (max - min) / binCount;

  const bins: string[] = [];
  const frequencies: number[] = [];

  for (let i = 0; i < binCount; i++) {
    const binStart = min + i * binSize;
    const binEnd = min + (i + 1) * binSize;
    bins.push(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`);

    const count = data.filter(v => v >= binStart && (i === binCount - 1 ? v <= binEnd : v < binEnd)).length;
    frequencies.push(count);
  }

  return { bins, frequencies };
}

// Format large numbers
export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(0);
}

// Format percentages
export function formatPercentage(num: number): string {
  return num.toFixed(1) + '%';
}
