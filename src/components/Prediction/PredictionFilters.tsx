/**
 * Prediction Filters Component
 * Filters for Customer, Item(s), and Date Range
 * Supports multiple item selection and market share filtering
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Filter, X, ChevronDown, ChevronUp, PieChart } from 'lucide-react';
import { PredictionData } from '../../utils/predictionTransformations';
import { useMarketShare } from '../../contexts/MarketShareContext';

interface PredictionFiltersProps {
  data: PredictionData[];
  filters: {
    customerName?: string;
    itemCode?: string;
    itemCodes?: string[]; // Multiple item selection
    marketSharePercent?: number;
    startDate?: string;
    endDate?: string;
    testDate?: string;
  };
  availableItems: Array<{ code: string; name: string }>;
  onFiltersChange: (filters: PredictionFiltersProps['filters']) => void;
  onApplyFilters: () => void;
}

export const PredictionFilters: React.FC<PredictionFiltersProps> = ({
  data,
  filters,
  availableItems,
  onFiltersChange,
  onApplyFilters
}) => {
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [tempMarketSharePercent, setTempMarketSharePercent] = useState<string>(
    filters.marketSharePercent?.toString() || ''
  );

  const itemDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target as Node)) {
        setShowItemDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Market share context
  const {
    getMarketShareForCustomerAndPercent,
    calculateMarketShare,
    trainingData
  } = useMarketShare();

  // Calculate market share items when customer and percentage are selected
  const marketShareItems = useMemo(() => {
    if (!filters.customerName || !filters.marketSharePercent || trainingData.length === 0) {
      return [];
    }

    // Check cache first
    let cachedData = getMarketShareForCustomerAndPercent(
      filters.customerName,
      filters.marketSharePercent
    );

    // If not in cache, calculate on the fly
    if (!cachedData) {
      const referenceDate = new Date().toISOString().split('T')[0];
      cachedData = calculateMarketShare(
        filters.customerName,
        referenceDate,
        filters.marketSharePercent
      );
    }

    return cachedData?.items || [];
  }, [filters.customerName, filters.marketSharePercent, trainingData, getMarketShareForCustomerAndPercent, calculateMarketShare]);

  // Use market share items if available, otherwise use all available items
  const displayItems = useMemo(() => {
    if (filters.marketSharePercent && marketShareItems.length > 0) {
      return marketShareItems.map(item => ({ code: item.ItemCode, name: item.ItemName }));
    }
    return availableItems;
  }, [filters.marketSharePercent, marketShareItems, availableItems]);

  // Extract unique customers
  const uniqueCustomers = React.useMemo(() => {
    const customerSet = new Set<string>();
    for (const row of data) {
      customerSet.add(row.CustomerName);
    }
    return Array.from(customerSet).sort();
  }, [data]);

  // Get date range
  const dateRange = React.useMemo(() => {
    if (data.length === 0) return { min: '', max: '', testDate: '' };
    const dates = data.map(d => String(d.TrxDate)).sort();
    const testDate = String(data[0]?.TestDate || dates[dates.length - 1]);
    return { min: dates[0], max: testDate, testDate };
  }, [data]);

  // Selected items (from itemCodes or fallback to itemCode)
  const selectedItemCodes = filters.itemCodes || (filters.itemCode ? [filters.itemCode] : []);

  const activeFilterCount = Object.values(filters).filter(v =>
    v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  const handleFilterChange = (key: string, value: string | string[] | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  const handleItemToggle = (itemCode: string) => {
    const newSelectedItems = selectedItemCodes.includes(itemCode)
      ? selectedItemCodes.filter(c => c !== itemCode)
      : [...selectedItemCodes, itemCode];
    onFiltersChange({
      ...filters,
      itemCodes: newSelectedItems.length > 0 ? newSelectedItems : undefined,
      itemCode: undefined
    });
  };

  const clearAllFilters = () => {
    setTempMarketSharePercent('');
    onFiltersChange({ testDate: filters.testDate });
    onApplyFilters();
  };

  const handleMarketSharePercentChange = (value: string) => {
    setTempMarketSharePercent(value);
  };

  const handleMarketSharePercentApply = () => {
    const numValue = parseInt(tempMarketSharePercent);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
      // Clear item selection when market share percent changes
      onFiltersChange({
        ...filters,
        marketSharePercent: numValue,
        itemCodes: undefined,
        itemCode: undefined
      });
    } else {
      // Clear if invalid
      onFiltersChange({
        ...filters,
        marketSharePercent: undefined,
        itemCodes: undefined,
        itemCode: undefined
      });
      setTempMarketSharePercent('');
    }
  };

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Filter className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
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
        <div className="flex flex-wrap items-center gap-3">
          {/* Customer Name */}
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Customer
            </label>
            <select
              value={filters.customerName || ''}
              onChange={(e) => {
                const customerName = e.target.value;
                // Clear item codes when customer changes
                onFiltersChange({
                  ...filters,
                  customerName: customerName || undefined,
                  itemCode: undefined,
                  itemCodes: undefined
                });
              }}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Customers</option>
              {uniqueCustomers.map(customer => (
                <option key={customer} value={customer}>
                  {customer}
                </option>
              ))}
            </select>
          </div>

          {/* Market Share Percentage */}
          {filters.customerName && (
            <div className="w-24">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                % Share (Volume)
              </label>
              <div className="flex items-center">
                <PieChart className="h-3 w-3 text-gray-400 mr-1" />
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  placeholder="Enter"
                  value={tempMarketSharePercent}
                  onChange={(e) => handleMarketSharePercentChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleMarketSharePercentApply();
                    }
                  }}
                  className={`flex-1 px-2 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-2 transition ${
                    tempMarketSharePercent !== (filters.marketSharePercent?.toString() || '')
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-gray-300'
                  } focus:ring-blue-500 focus:border-blue-500 h-[30px]`}
                />
                <span className="text-xs text-gray-500 ml-1">%</span>
              </div>
              {filters.marketSharePercent && marketShareItems.length > 0 && (
                <p className="text-[10px] text-green-600 mt-0.5">
                  {marketShareItems.length} items
                </p>
              )}
            </div>
          )}

          {/* Item Multi-Select */}
          <div className="relative w-40" ref={itemDropdownRef}>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Items
              {filters.marketSharePercent && marketShareItems.length > 0 && (
                <span className="text-[10px] text-green-600 ml-1">
                  ({marketShareItems.length})
                </span>
              )}
              {selectedItemCodes.length > 0 && !filters.marketSharePercent && (
                <span className="text-[10px] text-gray-500 ml-1">
                  ({selectedItemCodes.length})
                </span>
              )}
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowItemDropdown(!showItemDropdown)}
                disabled={!filters.customerName}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-left bg-white flex items-center justify-between h-[30px]"
              >
                <span className={selectedItemCodes.length === 0 ? 'text-gray-400 text-xs' : 'text-xs truncate'}>
                  {selectedItemCodes.length === 0 ? 'Select items' : `${selectedItemCodes.length} items`}
                </span>
                {showItemDropdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {/* Dropdown with checkboxes */}
              {showItemDropdown && filters.customerName && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {displayItems.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      {filters.marketSharePercent
                        ? 'No items match the market share criteria'
                        : 'No items available'}
                    </div>
                  ) : (
                    <div className="py-1">
                      {filters.marketSharePercent && (
                        <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
                          <p className="text-xs text-blue-700 font-medium">
                            Showing {displayItems.length} items from {filters.marketSharePercent}% market share
                          </p>
                        </div>
                      )}
                      <label className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                          checked={selectedItemCodes.length === displayItems.length && displayItems.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onFiltersChange({
                                ...filters,
                                itemCodes: displayItems.map(i => i.code),
                                itemCode: undefined
                              });
                            } else {
                              onFiltersChange({
                                ...filters,
                                itemCodes: undefined,
                                itemCode: undefined
                              });
                            }
                          }}
                        />
                        <span className="text-sm text-gray-700">Select All</span>
                      </label>
                      {displayItems.map(item => (
                        <label
                          key={item.code}
                          className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer border-t border-gray-100"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                            checked={selectedItemCodes.includes(item.code)}
                            onChange={() => handleItemToggle(item.code)}
                          />
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">{item.code}</div>
                            <div className="text-xs text-gray-500 truncate">{item.name}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {filters.customerName && displayItems.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {filters.marketSharePercent
                  ? 'Try a different market share percentage'
                  : 'No items available'}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              min={dateRange.min}
              max={dateRange.testDate}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-[30px]"
            />
            <p className="text-[10px] text-gray-500 mt-0.5">
              Max: {dateRange.testDate}
            </p>
          </div>

          {/* End Date */}
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              min={dateRange.min}
              max={dateRange.testDate}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-[30px]"
            />
          </div>

          {/* Apply Button */}
          <div className="self-end">
            <button
              type="button"
              onClick={onApplyFilters}
              className="px-4 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium h-[30px]"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {filters.customerName && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                Customer: {filters.customerName}
                <button
                  onClick={() => {
                    onFiltersChange({ ...filters, customerName: undefined, itemCode: undefined, itemCodes: undefined });
                    onApplyFilters();
                  }}
                  className="ml-1 hover:text-blue-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedItemCodes.length > 0 && (
              <>
                {selectedItemCodes.length <= 3 ? (
                  selectedItemCodes.map(code => (
                    <span key={code} className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                      Item: {code}
                      <button
                        onClick={() => {
                          handleItemToggle(code);
                          onApplyFilters();
                        }}
                        className="ml-1 hover:text-blue-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                    Items: {selectedItemCodes.length} selected
                    <button
                      onClick={() => {
                        onFiltersChange({ ...filters, itemCode: undefined, itemCodes: undefined });
                        onApplyFilters();
                      }}
                      className="ml-1 hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </>
            )}
            {filters.startDate && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                Start: {filters.startDate}
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
            {filters.endDate && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                End: {filters.endDate}
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
          </div>
        </div>
      )}
    </div>
  );
};
