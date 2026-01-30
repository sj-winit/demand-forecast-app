/**
 * Section 1: Data Coverage & Health
 * Charts: Active SKUs per Week, Total Quantity per Week, History Length per SKU
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Calendar, Package, ChevronDown, X, Users } from 'lucide-react';
import { commonLineOptions, _commonBarOptions, COLORS, _createHistogramBins } from '../../../utils/chartConfig';
import {
  calculateActiveSKUsPerWeek,
  calculateTotalQuantityPerWeek,
  _groupBySKU,
  WeeklySalesData
} from '../../../utils/dataTransformations';

interface DataCoverageHealthProps {
  data: WeeklySalesData[];
}

type DateRangeType = '1month' | '6months' | '1year' | 'all';

export const DataCoverageHealth: React.FC<DataCoverageHealthProps> = ({ data }) => {
  // Filter states
  const [selectedItemCodes, setSelectedItemCodes] = useState<string[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeType>('all');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const itemDropdownRef = useRef<HTMLDivElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target as Node)) {
        setShowItemDropdown(false);
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter data by date range
  const filteredByDate = useMemo(() => {
    if (selectedDateRange === 'all') return data;

    const now = new Date();
    const cutoffDate = new Date();

    switch (selectedDateRange) {
      case '1month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '6months':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return data.filter(d => {
      const trxDate = new Date(d.TrxDate);
      return trxDate >= cutoffDate;
    });
  }, [data, selectedDateRange]);

  // Get unique items (only items active within the selected date range and purchased by selected customers)
  const uniqueItems = useMemo(() => {
    const itemMap = new Map<string, string>();
    filteredByDate.forEach(d => {
      // If customers are selected, only include items from those customers
      if (selectedCustomers.length > 0 && !selectedCustomers.includes(d.CustomerName)) {
        return;
      }
      if (!itemMap.has(d.ItemCode)) {
        itemMap.set(d.ItemCode, d.ItemName);
      }
    });
    return Array.from(itemMap.entries()).map(([code, name]) => ({ code, name }));
  }, [filteredByDate, selectedCustomers]);

  // Get unique customers (only customers active within the selected date range)
  const uniqueCustomers = useMemo(() => {
    const customerSet = new Set<string>();
    filteredByDate.forEach(d => {
      customerSet.add(d.CustomerName);
    });
    return Array.from(customerSet).sort();
  }, [filteredByDate]);

  // Filter data by items and customers
  const filteredData = useMemo(() => {
    let result = filteredByDate;
    if (selectedItemCodes.length > 0) {
      result = result.filter(d => selectedItemCodes.includes(d.ItemCode));
    }
    if (selectedCustomers.length > 0) {
      result = result.filter(d => selectedCustomers.includes(d.CustomerName));
    }
    return result;
  }, [filteredByDate, selectedItemCodes, selectedCustomers]);

  // Chart 1: Active SKUs per Week
  const activeSKUsData = React.useMemo(() => {
    return calculateActiveSKUsPerWeek(filteredData);
  }, [filteredData]);

  const activeSKUsChartData = {
    labels: activeSKUsData.map(d => d.week),
    datasets: [{
      label: 'Active SKUs',
      data: activeSKUsData.map(d => d.count),
      borderColor: COLORS.blueBorder,
      backgroundColor: COLORS.blueLight,
      fill: true,
      tension: 0.3
    }]
  };

  // Chart 2: Total Quantity per Week
  const totalQuantityData = React.useMemo(() => {
    return calculateTotalQuantityPerWeek(filteredData);
  }, [filteredData]);

  const totalQuantityChartData = {
    labels: totalQuantityData.map(d => d.week),
    datasets: [{
      label: 'Total Quantity',
      data: totalQuantityData.map(d => d.quantity),
      borderColor: COLORS.greenBorder,
      backgroundColor: COLORS.greenLight,
      fill: true,
      tension: 0.3
    }]
  };

  const handleDateRangeClick = (range: DateRangeType) => {
    setSelectedDateRange(range);
  };

  const handleItemToggle = (itemCode: string) => {
    setSelectedItemCodes(prev =>
      prev.includes(itemCode)
        ? prev.filter(c => c !== itemCode)
        : [...prev, itemCode]
    );
  };

  const clearAllFilters = () => {
    setSelectedItemCodes([]);
    setSelectedCustomers([]);
    setSelectedDateRange('all');
  };

  const hasActiveFilters = selectedItemCodes.length > 0 || selectedCustomers.length > 0 || selectedDateRange !== 'all';

  const dateRangeOptions = [
    { key: '1month' as DateRangeType, label: 'Last 1 Month' },
    { key: '6months' as DateRangeType, label: 'Last 6 Months' },
    { key: '1year' as DateRangeType, label: 'Last 1 Year' },
    { key: 'all' as DateRangeType, label: 'All Time' }
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Section 1: Data Coverage & Health
            </h3>
            <p className="text-sm text-gray-500">
              Analyze data completeness and historical depth
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          {/* Date Range Filter */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
            <div className="flex space-x-1">
              {dateRangeOptions.map(option => (
                <button
                  key={option.key}
                  onClick={() => handleDateRangeClick(option.key)}
                  className={`px-3 py-1 text-sm rounded-md transition ${
                    selectedDateRange === option.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Filter */}
          <div className="relative" ref={customerDropdownRef}>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Customer:</span>
              <button
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 flex items-center"
              >
                {selectedCustomers.length === 0 ? 'All Customers' : `${selectedCustomers.length} selected`}
                <ChevronDown className="h-4 w-4 ml-1" />
              </button>
            </div>

            {/* Customer Dropdown */}
            {showCustomerDropdown && (
              <div className="absolute z-10 mt-2 w-64 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                <div className="p-2 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <button
                        onClick={() => setSelectedCustomers(uniqueCustomers)}
                        className="text-xs text-blue-600 hover:text-blue-700 underline mr-3"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedCustomers([])}
                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        Clear
                      </button>
                    </div>
                    <span className="text-xs text-gray-600">
                      {uniqueCustomers.length} active
                    </span>
                  </div>
                </div>
                {uniqueCustomers.map(customer => (
                  <label
                    key={customer}
                    className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(customer)}
                      onChange={() => {
                        setSelectedCustomers(prev =>
                          prev.includes(customer)
                            ? prev.filter(c => c !== customer)
                            : [...prev, customer]
                        );
                      }}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
                    />
                    <span className="text-sm text-gray-900">{customer}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Item Filter */}
          <div className="relative" ref={itemDropdownRef}>
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Items:</span>
              <button
                onClick={() => setShowItemDropdown(!showItemDropdown)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 flex items-center"
              >
                {selectedItemCodes.length === 0 ? 'Select Items' : `${selectedItemCodes.length} selected`}
                <ChevronDown className="h-4 w-4 ml-1" />
              </button>
            </div>

            {/* Item Dropdown */}
            {showItemDropdown && (
              <div className="absolute z-10 mt-2 w-80 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                <div className="p-2 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <button
                        onClick={() => setSelectedItemCodes(uniqueItems.map(i => i.code))}
                        className="text-xs text-blue-600 hover:text-blue-700 underline mr-3"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedItemCodes([])}
                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        Clear
                      </button>
                    </div>
                    <span className="text-xs text-gray-600">
                      {uniqueItems.length} items active
                    </span>
                  </div>
                </div>
                {uniqueItems.map(item => (
                  <label
                    key={item.code}
                    className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedItemCodes.includes(item.code)}
                      onChange={() => handleItemToggle(item.code)}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 truncate">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.code}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500">Active filters:</span>
            {selectedDateRange !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                {dateRangeOptions.find(o => o.key === selectedDateRange)?.label}
              </span>
            )}
            {selectedCustomers.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
                {selectedCustomers.length} customers
              </span>
            )}
            {selectedItemCodes.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-md">
                {selectedItemCodes.length} items
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Chart 1: Active SKUs per Week */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <h4 className="text-base font-semibold text-gray-800 mb-4">
            1. Active SKUs per Week
          </h4>
          <div style={{ height: '300px' }}>
            <Line data={activeSKUsChartData} options={{
              ...commonLineOptions,
              plugins: {
                ...commonLineOptions.plugins,
                title: { display: false }
              }
            }} />
          </div>
        </div>

        {/* Chart 2: Total Quantity per Week */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <h4 className="text-base font-semibold text-gray-800 mb-4">
            2. Total Quantity per Week
          </h4>
          <div style={{ height: '300px' }}>
            <Line data={totalQuantityChartData} options={{
              ...commonLineOptions,
              plugins: {
                ...commonLineOptions.plugins,
                title: { display: false }
              }
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};
