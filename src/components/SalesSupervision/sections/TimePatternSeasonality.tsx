/**
 * Section 4: Time Pattern & Seasonality
 * Charts: Average Demand by Week of Year, Demand Distribution by Week of Year (Box Plot style)
 * Only for SKUs with history > 52 weeks
 */

import React from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { commonLineOptions, commonBarOptions, COLORS } from '../../../utils/chartConfig';
import {
  groupBySKU,
  getWeekOfYear,
  getHistoryLengthBucket,
  WeeklySalesData
} from '../../../utils/dataTransformations';

interface TimePatternSeasonalityProps {
  data: WeeklySalesData[];
}

export const TimePatternSeasonality: React.FC<TimePatternSeasonalityProps> = ({ data }) => {
  // Filter SKUs with history > 52 weeks
  const eligibleSKUs = React.useMemo(() => {
    const skuData = groupBySKU(data);
    const eligible: string[] = [];

    for (const [itemCode, records] of skuData.entries()) {
      const bucket = getHistoryLengthBucket(records.length);
      if (bucket === '> 52 weeks') {
        eligible.push(itemCode);
      }
    }

    return eligible;
  }, [data]);

  const hasEligibleSKUs = eligibleSKUs.length > 0;

  // Chart 10: Demand Distribution by Week of Year (Bar chart showing min/max range)
  const weeklyDistributionData = React.useMemo(() => {
    if (!hasEligibleSKUs) return { labels: [], min: [], max: [], avg: [] };

    const filteredData = data.filter(d => eligibleSKUs.includes(d.ItemCode));

    const weekMap = new Map<number, number[]>();

    for (const row of filteredData) {
      const weekOfYear = getWeekOfYear(row.TrxDate);
      if (!weekMap.has(weekOfYear)) {
        weekMap.set(weekOfYear, []);
      }
      weekMap.get(weekOfYear)!.push(row.TotalQuantity);
    }

    const labels: string[] = [];
    const minDemand: number[] = [];
    const maxDemand: number[] = [];
    const avgDemand: number[] = [];

    for (let week = 1; week <= 52; week++) {
      labels.push(`W${week}`);
      const values = weekMap.get(week) || [];

      if (values.length > 0) {
        minDemand.push(Math.min(...values));
        maxDemand.push(Math.max(...values));
        avgDemand.push(values.reduce((sum, v) => sum + v, 0) / values.length);
      } else {
        minDemand.push(0);
        maxDemand.push(0);
        avgDemand.push(0);
      }
    }

    return { labels, min: minDemand, max: maxDemand, avg: avgDemand };
  }, [data, eligibleSKUs, hasEligibleSKUs]);

  const weeklyDistributionChartData = {
    labels: weeklyDistributionData.labels,
    datasets: [
      {
        label: 'Max Demand',
        data: weeklyDistributionData.max,
        backgroundColor: COLORS.redLight,
        borderColor: COLORS.redBorder,
        borderWidth: 1
      },
      {
        label: 'Avg Demand',
        data: weeklyDistributionData.avg,
        backgroundColor: COLORS.blueLight,
        borderColor: COLORS.blueBorder,
        borderWidth: 1
      },
      {
        label: 'Min Demand',
        data: weeklyDistributionData.min,
        backgroundColor: COLORS.greenLight,
        borderColor: COLORS.greenBorder,
        borderWidth: 1
      }
    ]
  };

  if (!hasEligibleSKUs) {
    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Section 4: Time Pattern & Seasonality
          </h3>
          <p className="text-sm text-gray-500">
            Only shown for SKUs with history &gt; 52 weeks
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <p className="text-yellow-800 font-medium">
            No SKUs with more than 52 weeks of history found
          </p>
          <p className="text-yellow-600 text-sm mt-2">
            Seasonality analysis requires at least one year of historical data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Section 4: Time Pattern & Seasonality
        </h3>
        <p className="text-sm text-gray-500">
          Only for SKUs with history &gt; 52 weeks ({eligibleSKUs.length} SKUs eligible)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 10: Demand Distribution by Week of Year */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100 lg:col-span-2">
          <h4 className="text-base font-semibold text-gray-800 mb-4">
            10. Demand Distribution by Week of Year (Range)
          </h4>
          <p className="text-xs text-gray-500 mb-3">
            Shows min, average, and max demand per week across all eligible SKUs
          </p>
          <div style={{ height: '300px' }}>
            <Bar data={weeklyDistributionChartData} options={{
              ...commonBarOptions,
              plugins: {
                ...commonBarOptions.plugins,
                title: { display: false }
              },
              scales: {
                ...commonBarOptions.scales,
                x: {
                  ...commonBarOptions.scales.x,
                  ticks: {
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 26
                  }
                },
                y: {
                  ...commonBarOptions.scales.y,
                  stacked: false
                }
              }
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};
