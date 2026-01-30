/**
 * Section 5: Customer × Item Structure
 * Charts: Customer Count per SKU, Top Customer Contribution per SKU, Customer Activity Length
 */

import React from 'react';
import { Bar } from 'react-chartjs-2';
import { commonBarOptions, COLORS, _createHistogramBins } from '../../../utils/chartConfig';
import {
  groupBySKU,
  _groupByCustomer,
  _calculateCustomerContribution,
  WeeklySalesData
} from '../../../utils/dataTransformations';

interface CustomerItemStructureProps {
  data: WeeklySalesData[];
  onSKUClick?: (itemCode: string) => void;
}

export const CustomerItemStructure: React.FC<CustomerItemStructureProps> = ({ data, onSKUClick }) => {
  // Chart 11: Customer Count per SKU
  const customerCountData = React.useMemo(() => {
    const skuData = groupBySKU(data);
    const skuCustomerCount: Array<{ itemCode: string; customerCount: number }> = [];

    for (const [itemCode, records] of skuData.entries()) {
      const uniqueCustomers = new Set(records.map(r => r.CustomerID));
      skuCustomerCount.push({
        itemCode,
        customerCount: uniqueCustomers.size
      });
    }

    // Sort by customer count and take top 15
    return skuCustomerCount
      .sort((a, b) => b.customerCount - a.customerCount)
      .slice(0, 15);
  }, [data]);

  const customerCountChartData = {
    labels: customerCountData.map(d =>
      d.itemCode.length > 12 ? d.itemCode.substring(0, 12) + '...' : d.itemCode
    ),
    datasets: [{
      label: 'Customer Count',
      data: customerCountData.map(d => d.customerCount),
      backgroundColor: COLORS.purple,
      borderColor: COLORS.purpleBorder,
      borderWidth: 1
    }]
  };

  const customerCountOptions = {
    ...commonBarOptions,
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0 && onSKUClick) {
        const index = elements[0].index;
        onSKUClick(customerCountData[index].itemCode);
      }
    },
    plugins: {
      ...commonBarOptions.plugins,
      title: { display: false }
    },
    indexAxis: 'y' as const
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Section 5: Customer × Item Structure
        </h3>
        <p className="text-sm text-gray-500">
          Understand customer-item relationships and concentration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 11: Customer Count per SKU */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100 lg:col-span-2">
          <h4 className="text-base font-semibold text-gray-800 mb-4">
            11. Customer Count per SKU (Top 15)
          </h4>
          <p className="text-xs text-gray-500 mb-3">
            Number of unique customers per item
          </p>
          <div style={{ height: '350px' }}>
            <Bar data={customerCountChartData} options={customerCountOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};
