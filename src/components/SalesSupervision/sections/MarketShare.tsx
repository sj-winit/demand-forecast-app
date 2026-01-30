/**
 * Market Share Section
 * Shows items contributing to specified % of market share for a customer
 */

import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, TrendingUp, Filter, Calendar } from 'lucide-react';
import { WeeklySalesData } from '../../../utils/dataTransformations';
import { useMarketShare } from '../../../contexts/MarketShareContext';

interface MarketShareProps {
  data: WeeklySalesData[];
}

interface MarketShareItem {
  ItemCode: string;
  ItemName: string;
  TotalQuantity: number;
  ItemCode_Percent_of_Total: number;
  Cumulative_Percent: number;
}

export const MarketShare: React.FC<MarketShareProps> = ({ data }) => {
  const [selectedCustomer, setSelectedCustomer] = useState<string>('SaudiMarket');
  const [referenceDate, setReferenceDate] = useState<string>('2025-12-01');
  const [marketSharePercent, setMarketSharePercent] = useState<number | undefined>(undefined);
  const [tempPercent, setTempPercent] = useState<string>('');

  const { setMarketShareData } = useMarketShare();

  // Get unique customers from data
  const customers = useMemo(() => {
    const uniqueCustomers = new Set(data.map(d => d.CustomerName));
    return Array.from(uniqueCustomers).sort();
  }, [data]);

  // Calculate market share
  const marketShareData = useMemo(() => {
    // If no market share percent is set, return empty
    if (!marketSharePercent) return [];

    // Filter by selected customer
    const customerData = data.filter(d => d.CustomerName === selectedCustomer);

    if (customerData.length === 0) return [];

    // Get reference date and calculate 6 months ago
    const refDate = new Date(referenceDate);
    const sixMonthsAgo = new Date(refDate);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Get active items (items with sales in last 6 months)
    const activeItems = new Set(
      customerData
        .filter(d => {
          const trxDate = new Date(d.TrxDate);
          return trxDate >= sixMonthsAgo;
        })
        .map(d => d.ItemCode)
    );

    // Filter for active items only
    const activeData = customerData.filter(d => activeItems.has(d.ItemCode));

    // Calculate total quantity
    const totalQty = activeData.reduce((sum, d) => sum + d.TotalQuantity, 0);

    if (totalQty === 0) return [];

    // Aggregate by ItemCode
    const itemMap = new Map<string, { quantity: number; itemName: string }>();

    activeData.forEach(d => {
      const existing = itemMap.get(d.ItemCode);
      if (existing) {
        existing.quantity += d.TotalQuantity;
      } else {
        itemMap.set(d.ItemCode, {
          quantity: d.TotalQuantity,
          itemName: d.ItemName
        });
      }
    });

    // Calculate percentages and sort
    const items: MarketShareItem[] = Array.from(itemMap.entries())
      .map(([itemCode, info]) => ({
        ItemCode: itemCode,
        ItemName: info.itemName,
        TotalQuantity: info.quantity,
        ItemCode_Percent_of_Total: (info.quantity / totalQty) * 100,
        Cumulative_Percent: 0 // Will be calculated after sorting
      }))
      .sort((a, b) => b.ItemCode_Percent_of_Total - a.ItemCode_Percent_of_Total);

    // Calculate cumulative percentage
    let cumulative = 0;
    items.forEach(item => {
      cumulative += item.ItemCode_Percent_of_Total;
      item.Cumulative_Percent = cumulative;
    });

    // Keep items covering specified market share percentage
    const targetItems = items.filter(item => item.Cumulative_Percent <= marketSharePercent);

    // If no items cross target%, show at least the first item
    if (items.length > 0 && targetItems.length === 0) {
      return [items[0]];
    }

    // Include the item that crosses the target percentage
    if (targetItems.length < items.length) {
      return items.slice(0, targetItems.length + 1);
    }

    return targetItems;
  }, [data, selectedCustomer, referenceDate, marketSharePercent]);

  // Calculate total number of active items for the customer
  const totalActiveItems = useMemo(() => {
    const customerData = data.filter(d => d.CustomerName === selectedCustomer);
    if (customerData.length === 0) return 0;

    const refDate = new Date(referenceDate);
    const sixMonthsAgo = new Date(refDate);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const activeItems = new Set(
      customerData
        .filter(d => {
          const trxDate = new Date(d.TrxDate);
          return trxDate >= sixMonthsAgo;
        })
        .map(d => d.ItemCode)
    );

    return activeItems.size;
  }, [data, selectedCustomer, referenceDate]);

  // Save market share results to context when they change
  useEffect(() => {
    if (marketShareData.length > 0 && marketSharePercent) {
      setMarketShareData({
        customerName: selectedCustomer,
        referenceDate: referenceDate,
        marketSharePercent: marketSharePercent,
        items: marketShareData
      });
    }
  }, [marketShareData, selectedCustomer, referenceDate, marketSharePercent, setMarketShareData]);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <PieChart className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Market Share By Volume</h3>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Customer Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name
            </label>
            <div className="flex items-center">
              <Filter className="h-4 w-4 text-gray-400 mr-2" />
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {customers.map(customer => (
                  <option key={customer} value={customer}>
                    {customer}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reference Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Date
            </label>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
              <input
                type="date"
                value={referenceDate}
                onChange={(e) => setReferenceDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Market Share Percentage Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              % Share (Volume)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                placeholder="Enter"
                value={tempPercent}
                onChange={(e) => {
                  setTempPercent(e.target.value);
                }}
                onKeyDown={(e) => {
                  // Allow Enter key to apply the value
                  if (e.key === 'Enter') {
                    const value = parseInt(tempPercent);
                    if (!isNaN(value) && value >= 1 && value <= 100) {
                      setMarketSharePercent(value);
                      setTempPercent(value.toString());
                    } else {
                      setMarketSharePercent(undefined);
                      setTempPercent('');
                    }
                  }
                }}
                className={`flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 transition ${
                  tempPercent !== (marketSharePercent?.toString() || '')
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-300'
                } focus:ring-blue-500 focus:border-blue-500`}
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
            {marketSharePercent && tempPercent !== marketSharePercent.toString() && (
              <p className="text-xs text-yellow-600 mt-1">
                Using {marketSharePercent}% (showing {marketShareData.length} items)
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600">
          {marketSharePercent ? (
            <>Items contributing to approximately <strong>{marketSharePercent}%</strong> of market share for{' '}
            <strong>{selectedCustomer}</strong> in the last 6 months (from {referenceDate})</>
          ) : (
            <>Enter a percentage and press Enter to see market share analysis for <strong>{selectedCustomer}</strong></>
          )}
        </p>
      </div>

      {marketShareData.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          {!marketSharePercent ? 'Enter a percentage and press Enter to calculate market share' : 'No data available for the selected customer'}
        </div>
      ) : (
        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-blue-600 font-medium">Total Items</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {marketShareData.length}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {marketShareData.length} items out of {totalActiveItems} covering {marketSharePercent}% of sales
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs text-green-600 font-medium">Total Quantity</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {marketShareData.reduce((sum, item) => sum + item.TotalQuantity, 0).toLocaleString()}
              </p>
              <p className="text-xs text-green-600 mt-1">
                From these top items
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-xs text-purple-600 font-medium">Market Share</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {marketShareData[marketShareData.length - 1]?.Cumulative_Percent.toFixed(1)}%
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Cumulative coverage
              </p>
            </div>
          </div>

          {/* Market Share Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % of Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cumulative %
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contribution
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {marketShareData.map((item, index) => (
                  <tr key={item.ItemCode} className={index === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 text-sm">
                      {index === 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          #1
                        </span>
                      )}
                      {index > 0 && (
                        <span className="text-sm text-gray-600">#{index + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {item.ItemCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {item.ItemName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                      {item.TotalQuantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {item.ItemCode_Percent_of_Total.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-bold">
                      {item.Cumulative_Percent.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2" style={{ width: '100px' }}>
                          <div
                            className={`h-2 rounded-full ${
                              index === 0 ? 'bg-blue-600' : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min(item.ItemCode_Percent_of_Total, 100)}%`
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {item.ItemCode_Percent_of_Total.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Note */}
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-gray-700">
              <TrendingUp className="h-3 w-3 inline mr-1 text-green-600" />
              Showing <strong>{marketShareData.length} items</strong> that contribute to approximately{' '}
              <strong>
                {marketShareData[marketShareData.length - 1]?.Cumulative_Percent.toFixed(1)}%
              </strong>{' '}
              of {selectedCustomer}'s total sales volume in the last 6 months from {referenceDate}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketShare;
