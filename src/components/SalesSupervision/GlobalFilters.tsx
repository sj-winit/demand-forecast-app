/**
 * Global Filters Component for Sales Supervision Dashboard
 */

import React from 'react';
import { Filter, X } from 'lucide-react';
import { WeeklySalesData } from '../../utils/dataTransformations';

interface GlobalFiltersProps {
  data: WeeklySalesData[];
  filters: {
    startDate?: string;
    endDate?: string;
    customerName?: string;
    itemCodes?: string[];
  };
  appliedFilters: {
    startDate?: string;
    endDate?: string;
    customerName?: string;
    itemCodes?: string[];
  };
  onFiltersChange: (filters: GlobalFiltersProps['filters']) => void;
  onApplyFilters: () => void;
}

export const GlobalFilters: React.FC<GlobalFiltersProps> = ({ data, filters, appliedFilters, onFiltersChange, onApplyFilters }) => {
  // Extract unique values from data - take first ID/Name for each
  const uniqueCustomers = React.useMemo(() => {
    const customerMap = new Map<string, string>(); // id -> name

    for (const row of data) {
      if (!customerMap.has(row.CustomerName)) {
        customerMap.set(row.CustomerName, row.CustomerID);
      }
    }

    return Array.from(customerMap.entries())
      .map(([name, id]) => ({ name, id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // Get available items based on selected customer (or all if no customer selected)
  const availableItems = React.useMemo(() => {
    const filteredByCustomer = filters.customerName
      ? data.filter(d => d.CustomerName === filters.customerName)
      : data;

    const itemMap = new Map<string, string>(); // code -> name
    for (const row of filteredByCustomer) {
      if (!itemMap.has(row.ItemCode)) {
        itemMap.set(row.ItemCode, row.ItemName);
      }
    }

    return Array.from(itemMap.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [data, filters.customerName]);

  const dateRange = React.useMemo(() => {
    if (data.length === 0) return { min: '', max: '' };
    const dates = data.map(d => String(d.TrxDate)).sort();
    return { min: dates[0], max: dates[dates.length - 1] };
  }, [data]);

  const activeFilterCount = Object.values(appliedFilters).filter(v =>
    v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0)
  ).length;

  const handleFilterChange = (key: string, value: string | string[] | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
    onApplyFilters();
  };

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Filter className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Global Filters</h3>
            {hasActiveFilters && (
              <span className="ml-3 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                {activeFilterCount} active
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range - Start */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              min={dateRange.min}
              max={dateRange.max}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Min: {dateRange.min}
            </p>
          </div>

          {/* Date Range - End */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              min={dateRange.min}
              max={dateRange.max}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Max: {dateRange.max}
            </p>
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <select
              value={filters.customerName || ''}
              onChange={(e) => {
                const customerName = e.target.value;
                // Clear item codes when customer changes - update both in single call
                onFiltersChange({
                  ...filters,
                  customerName: customerName || undefined,
                  itemCodes: undefined
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Customers</option>
              {uniqueCustomers.map(customer => (
                <option key={customer.name} value={customer.name}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Item Codes (Dropdown) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item
            </label>
            <select
              value={filters.itemCodes?.[0] || ''}
              onChange={(e) => {
                const itemCode = e.target.value;
                handleFilterChange('itemCodes', itemCode ? [itemCode] : undefined);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={!filters.customerName}
            >
              <option value="">All Items</option>
              {availableItems.map(item => (
                <option key={item.code} value={item.code}>
                  {item.code}
                </option>
              ))}
            </select>
            {availableItems.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">Select a customer first</p>
            )}
          </div>
        </div>

        {/* Apply Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onApplyFilters}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {appliedFilters.startDate && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                Start: {appliedFilters.startDate}
                <button
                  onClick={() => {
                    handleFilterChange('startDate', undefined);
                    onApplyFilters();
                  }}
                  className="ml-1 hover:text-blue-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {appliedFilters.endDate && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                End: {appliedFilters.endDate}
                <button
                  onClick={() => {
                    handleFilterChange('endDate', undefined);
                    onApplyFilters();
                  }}
                  className="ml-1 hover:text-blue-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {appliedFilters.customerName && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                Customer: {appliedFilters.customerName}
                <button
                  onClick={() => {
                    handleFilterChange('customerName', undefined);
                    handleFilterChange('itemCodes', undefined);
                    onApplyFilters();
                  }}
                  className="ml-1 hover:text-blue-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {appliedFilters.itemCodes && appliedFilters.itemCodes.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                Item: {appliedFilters.itemCodes[0]}
                <button
                  onClick={() => {
                    handleFilterChange('itemCodes', undefined);
                    onApplyFilters();
                  }}
                  className="ml-1 hover:text-blue-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
