/**
 * Recommended Order Component
 * Displays recommended orders with buffer calculations and customer filtering
 * Uses the recommended_order.py logic with Sunday date handling and caching
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, Filter, RefreshCw, Package, TrendingUp, AlertCircle, ChevronDown, ChevronRight, X, Box, PieChart } from 'lucide-react';
import { getRecommendedOrders, getOrderCustomers, clearOrdersCache } from '../../services/api';
import type { RecommendedOrder, RecommendedOrderSummary } from '../../types';
import { useMarketShare, MarketShareItem } from '../../contexts/MarketShareContext';

export function RecommendedOrder() {
  const [orders, setOrders] = useState<RecommendedOrder[]>([]);
  const [summary, setSummary] = useState<RecommendedOrderSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Filter states
  const [targetDate, setTargetDate] = useState<string>('');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedMarketShareItems, setSelectedMarketShareItems] = useState<string[]>([]);
  const [marketSharePercent, setMarketSharePercent] = useState<number | undefined>(undefined);
  const [tempMarketSharePercent, setTempMarketSharePercent] = useState<string>('');
  const [allOrders, setAllOrders] = useState<RecommendedOrder[]>([]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [itemsWithoutDataForDate, setItemsWithoutDataForDate] = useState<string[]>([]);
  const [expandedRowIndex, setExpandedRowIndex] = useState<number | null>(null);

  // Market share context
  const {
    getMarketShareForCustomerAndPercent,
    calculateMarketShare,
    trainingData
  } = useMarketShare();

  // Calculate market share items for selected customers and percentage
  const availableMarketShareItems = useMemo(() => {
    if (selectedCustomers.length === 0 || trainingData.length === 0) {
      return [];
    }

    const allItems: MarketShareItem[] = [];
    const referenceDate = new Date().toISOString().split('T')[0]; // Use today as reference

    selectedCustomers.forEach(customerName => {
      // Check cache first
      let cachedData = getMarketShareForCustomerAndPercent(customerName, marketSharePercent ?? 80);

      // If not in cache, calculate on the fly
      if (!cachedData) {
        cachedData = calculateMarketShare(customerName, referenceDate, marketSharePercent ?? 80);
      }

      if (cachedData && cachedData.items && cachedData.items.length > 0) {
        allItems.push(...cachedData.items);
      }
    });

    // Remove duplicates
    const uniqueItems = Array.from(
      new Map(allItems.map(item => [item.ItemCode, item])).values()
    );

    return uniqueItems;
  }, [selectedCustomers, marketSharePercent, trainingData, getMarketShareForCustomerAndPercent, calculateMarketShare]);

  // UI states
  const [showFilters, setShowFilters] = useState(true);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const itemDropdownRef = useRef<HTMLDivElement>(null);

  // Clear items when customer or percent changes
  useEffect(() => {
    setSelectedMarketShareItems([]);
    setItemsWithoutDataForDate([]);
  }, [selectedCustomers]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target as Node)) {
        setShowItemDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load customers on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const customersRes = await getOrderCustomers();

        if (customersRes.success) {
          setCustomers(customersRes.customers);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Failed to load initial data');
      }
    };

    loadInitialData();
  }, []);

  // Filter orders by customer and items (client-side)
  useEffect(() => {
    if (allOrders.length > 0) {
      let filtered = allOrders;

      // Filter by customers
      if (selectedCustomers.length > 0) {
        filtered = filtered.filter(order => selectedCustomers.includes(order.CustomerName));
      }

      // Track items without data for the selected date
      const itemsWithoutData: string[] = [];

      // Filter by market share items
      if (selectedMarketShareItems.length > 0) {
        filtered = filtered.filter(order => selectedMarketShareItems.includes(order.ItemCode));

        // Find selected items that don't have any order data
        const itemCodesWithData = new Set(filtered.map(o => o.ItemCode));
        selectedMarketShareItems.forEach(itemCode => {
          if (!itemCodesWithData.has(itemCode)) {
            const item = availableMarketShareItems.find(i => i.ItemCode === itemCode);
            if (item) {
              itemsWithoutData.push(`${item.ItemName} (${itemCode})`);
            }
          }
        });
      }

      setOrders(filtered);

      // Update summary
      const totalOrderQty = filtered.reduce((sum, o) => sum + o.RecommendedOrderQty, 0);
      const totalPredicted = filtered.reduce((sum, o) => sum + o.Predicted, 0);
      const totalBuffer = filtered.reduce((sum, o) => sum + o.BufferQty, 0);
      const uniqueCustomers = new Set(filtered.map(o => o.CustomerName)).size;

      const filterDescription = [
        selectedCustomers.length > 0 ? `${selectedCustomers.join(', ')}` : 'All',
        selectedMarketShareItems.length > 0 ? `(${selectedMarketShareItems.length} items)` : ''
      ].filter(Boolean).join(' ');

      setSummary({
        date: allOrders[0]?.TrxDate || '',
        customers: uniqueCustomers,
        items: filtered.length,
        total_order_qty: Math.round(totalOrderQty),
        total_predicted_qty: Math.round(totalPredicted),
        total_buffer_qty: Math.round(totalBuffer),
        customer_filter: filterDescription || 'All'
      });

      // Store items without data for display
      setItemsWithoutDataForDate(itemsWithoutData);
    } else {
      setItemsWithoutDataForDate([]);
    }
  }, [selectedCustomers, selectedMarketShareItems, allOrders, availableMarketShareItems]);

  const loadOrders = async () => {
    if (!targetDate) {
      setError('Please select a target date');
      return;
    }

    setLoading(true);
    setError(null);
    setItemsWithoutDataForDate([]); // Clear previous warnings

    try {
      const response = await getRecommendedOrders(targetDate, undefined); // No customer filter on API

      if (response.success) {
        setAllOrders(response.data); // Store all orders
        setOrders(response.data);
        setSummary(response.summary || null);
        setHasLoadedOnce(true);
        setSelectedCustomers([]); // Reset customer filter
      } else {
        setError(response.error || 'Failed to load orders');
        setAllOrders([]);
        setOrders([]);
        setSummary(null);
      }
    } catch (err: any) {
      console.error('Error loading orders:', err);
      // Show the actual error message from the backend
      if (err.response?.data?.detail) {
        setError(`Backend error: ${err.response.data.detail}`);
      } else {
        setError(`Failed to load recommended orders: ${err.message || 'Unknown error'}`);
      }
      setAllOrders([]);
      setOrders([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    loadOrders();
  };

  const handleRefresh = async () => {
    // Clear cache and reload
    await clearOrdersCache();
    loadOrders();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getConfidenceBadgeClass = (confidence: string) => {
    return confidence === 'High'
      ? 'bg-green-100 text-green-800'
      : 'bg-yellow-100 text-yellow-800';
  };

  const getPatternBadgeClass = (pattern: string) => {
    switch (pattern) {
      case 'Smooth':
        return 'bg-blue-100 text-blue-800';
      case 'Intermittent':
        return 'bg-orange-100 text-orange-800';
      case 'Lumpy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getReasonIcon = (reason: string) => {
    if (reason.includes('New or rarely')) {
      return <AlertCircle className="h-4 w-4 text-purple-500" />;
    } else if (reason.includes('Low forecast')) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    } else if (reason.includes('High demand')) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return <TrendingUp className="h-4 w-4 text-green-500" />;
  };

  const handleRowClick = (index: number) => {
    // Toggle row expansion
    if (expandedRowIndex === index) {
      setExpandedRowIndex(null);
    } else {
      setExpandedRowIndex(index);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recommended Order</h1>
          <p className="text-sm text-gray-600 mt-1">
            AI-powered order recommendations with buffer calculations
          </p>
        </div>
        {hasLoadedOnce && (
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-medium text-gray-700">Filters</h2>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showFilters ? 'Hide' : 'Show'}
          </button>
        </div>

        {showFilters && (
          <div className="p-3 space-y-3">
            {/* All filters in one line */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Target Date */}
              <div className="w-40">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Target Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Apply Button */}
              <button
                onClick={handleApply}
                disabled={loading || !targetDate}
                className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium h-[34px] self-end"
              >
                {loading ? '...' : 'Apply'}
              </button>

              {/* Customer Multi-select Dropdown (only show after data loads) */}
              {hasLoadedOnce && allOrders.length > 0 && (
                <div className="w-48" ref={customerDropdownRef}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Customer
                  </label>
                  <button
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    className="w-full px-3 py-1.5 text-sm text-left border border-gray-300 rounded-md bg-white flex items-center justify-between hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-[34px]"
                  >
                    <span className="truncate">
                      {selectedCustomers.length === 0
                        ? 'All Customers'
                        : `${selectedCustomers.length} customer${selectedCustomers.length !== 1 ? 's' : ''} selected`
                      }
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>

                  {/* Dropdown Menu */}
                  {showCustomerDropdown && (
                    <div className="absolute z-50 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div className="p-2 border-b border-gray-200">
                        <button
                          onClick={() => setSelectedCustomers(customers)}
                          className="text-xs text-blue-600 hover:text-blue-700 underline mr-3"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCustomers([]);
                            setSelectedMarketShareItems([]); // Also clear items when customer changes
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                        >
                          Clear
                        </button>
                      </div>
                      {customers.map(customer => (
                        <label
                          key={customer}
                          className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCustomers.includes(customer)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCustomers([...selectedCustomers, customer]);
                              } else {
                                setSelectedCustomers(selectedCustomers.filter(c => c !== customer));
                                setSelectedMarketShareItems([]); // Clear items when customer is deselected
                              }
                            }}
                            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mr-2 flex-shrink-0"
                          />
                          <span className="truncate">{customer}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Market Share Percentage Filter */}
              {hasLoadedOnce && selectedCustomers.length > 0 && (
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    % Share (Volume)
                  </label>
                  <div className="flex items-center">
                    <PieChart className="h-3.5 w-3.5 text-gray-400 mr-1" />
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      placeholder="Enter"
                      value={tempMarketSharePercent}
                      onChange={(e) => {
                        setTempMarketSharePercent(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = parseInt(tempMarketSharePercent);
                          if (!isNaN(value) && value >= 1 && value <= 100) {
                            setMarketSharePercent(value);
                            setTempMarketSharePercent(value.toString());
                          } else {
                            setMarketSharePercent(undefined);
                            setTempMarketSharePercent('');
                          }
                        }
                      }}
                      className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 transition ${
                        tempMarketSharePercent !== (marketSharePercent?.toString() || '')
                          ? 'border-yellow-400 bg-yellow-50'
                          : 'border-gray-300'
                      } focus:ring-blue-500 focus:border-blue-500 h-[34px]`}
                    />
                  </div>
                </div>
              )}

              {/* Market Share Items Filter (only show when market share data is available) */}
              {hasLoadedOnce && availableMarketShareItems.length > 0 && (
                <div className="w-64" ref={itemDropdownRef}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Items ({availableMarketShareItems.length})
                  </label>
                  <button
                    onClick={() => setShowItemDropdown(!showItemDropdown)}
                    className="w-full px-3 py-1.5 text-sm text-left border border-blue-300 rounded-md bg-blue-50 flex items-center justify-between hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-[34px]"
                  >
                    <span className="truncate flex items-center">
                      <Box className="h-3.5 w-3.5 text-blue-600 mr-2 flex-shrink-0" />
                      {selectedMarketShareItems.length === 0
                        ? `All Items`
                        : `${selectedMarketShareItems.length} item${selectedMarketShareItems.length !== 1 ? 's' : ''} selected`
                      }
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>

                  {/* Dropdown Menu */}
                  {showItemDropdown && (
                    <div className="absolute z-50 mt-1 w-80 bg-white border border-blue-300 rounded-md shadow-lg max-h-80 overflow-auto">
                      <div className="p-2 border-b border-gray-200 bg-blue-50">
                        <div className="text-xs text-blue-700 font-medium mb-1">
                          {marketSharePercent}% Market Share Items ({availableMarketShareItems.length})
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          From {selectedCustomers.length === 1 ? selectedCustomers[0] : `${selectedCustomers.length} customers`}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedMarketShareItems(availableMarketShareItems.map(item => item.ItemCode))}
                            className="text-xs text-blue-600 hover:text-blue-700 underline"
                          >
                            Select All
                          </button>
                          <button
                            onClick={() => setSelectedMarketShareItems([])}
                            className="text-xs text-blue-600 hover:text-blue-700 underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      {availableMarketShareItems.map(item => (
                        <label
                          key={item.ItemCode}
                          className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMarketShareItems.includes(item.ItemCode)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMarketShareItems([...selectedMarketShareItems, item.ItemCode]);
                              } else {
                                setSelectedMarketShareItems(selectedMarketShareItems.filter(code => code !== item.ItemCode));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mr-2 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-gray-900">{item.ItemName}</div>
                            <div className="text-xs text-gray-500">
                              {item.ItemCode} • {item.ItemCode_Percent_of_Total.toFixed(1)}%
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected customers and items chips */}
            {hasLoadedOnce && (selectedCustomers.length > 0 || selectedMarketShareItems.length > 0 || marketSharePercent !== undefined) && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-gray-500">Active filters:</span>
                {selectedCustomers.map(customer => (
                  <span
                    key={customer}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                  >
                    {customer}
                    <button
                      onClick={() => {
                        setSelectedCustomers(selectedCustomers.filter(c => c !== customer));
                        setSelectedMarketShareItems([]); // Clear items when customer is removed
                      }}
                      className="hover:text-blue-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {marketSharePercent !== undefined && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md"
                  >
                    {marketSharePercent}% Share (Volume)
                    <button
                      onClick={() => {
                        setMarketSharePercent(undefined);
                        setTempMarketSharePercent('');
                      }}
                      className="hover:text-green-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedMarketShareItems.length > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-md"
                  >
                    {selectedMarketShareItems.length} items
                    <button
                      onClick={() => setSelectedMarketShareItems([])}
                      className="hover:text-purple-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedCustomers([]);
                    setSelectedMarketShareItems([]);
                    setMarketSharePercent(undefined);
                    setTempMarketSharePercent('');
                    setItemsWithoutDataForDate([]);
                  }}
                  className="text-xs text-red-600 hover:text-red-700 underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600">Loading recommended orders...</span>
        </div>
      )}

      {/* Initial State - No data yet */}
      {!hasLoadedOnce && !loading && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
          <Package className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900">Select a date to generate recommendations</h3>
        </div>
      )}

      {/* Summary Cards */}
      {summary && !loading && hasLoadedOnce && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Week ending</p>
                <p className="text-lg font-semibold text-gray-900">{formatDate(summary.date)}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Customers</p>
                <p className="text-lg font-semibold text-gray-900">{summary.customers}</p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-lg font-semibold text-gray-900">{summary.items}</p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Order Qty</p>
                <p className="text-lg font-semibold text-gray-900">{summary.total_order_qty.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Additional Summary Details */}
      {summary && !loading && hasLoadedOnce && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Buffer Qty</p>
            <p className="text-xl font-semibold text-green-600">{summary.total_buffer_qty.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Customer Filter</p>
            <p className="text-xl font-semibold text-purple-600">{summary.customer_filter}</p>
          </div>
        </div>
      )}

      {/* Items without data warning */}
      {itemsWithoutDataForDate.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-900">
                {itemsWithoutDataForDate.length} selected item{itemsWithoutDataForDate.length > 1 ? 's' : ''} without prediction data for {targetDate ? formatDate(targetDate) : 'this date'}
              </h4>
              <p className="text-xs text-yellow-700 mt-1">
                These items from your market share selection don't have sales history or predictions for the selected date:
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {itemsWithoutDataForDate.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-md">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      {!loading && orders.length > 0 && hasLoadedOnce && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actual
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buffer
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recommended
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pattern
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order, index) => (
                  <React.Fragment key={index}>
                    {/* Data Row - Clickable */}
                    <tr
                      onClick={() => handleRowClick(index)}
                      className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                        expandedRowIndex === index ? 'bg-blue-100' : ''
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {expandedRowIndex === index ? (
                            <ChevronDown className="h-4 w-4 text-blue-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                          <div className="text-sm font-medium text-gray-900">{order.CustomerName}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{order.ItemName}</div>
                        <div className="text-xs text-gray-500">{order.ItemCode}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                        {order.ActualQty !== null && order.ActualQty !== undefined ? order.ActualQty.toFixed(0) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">
                        +{order.BufferQty.toFixed(0)} ({(order.BufferPct * 100).toFixed(0)}%)
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-blue-600">
                        {order.RecommendedOrderQty.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getConfidenceBadgeClass(order.Confidence)}`}>
                          {order.Confidence}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPatternBadgeClass(order.Demand_Pattern)}`}>
                          {order.Demand_Pattern}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          {getReasonIcon(order.ReasonCode)}
                          <span className="text-xs text-gray-600">{order.ReasonCode}</span>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {expandedRowIndex === index && (
                      <tr>
                        <td colSpan={8} className="px-4 py-0 bg-gray-50">
                          <div className="p-4 border-b border-gray-200">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">4-Week Avg</p>
                                <p className="font-semibold text-gray-900">{order.avg_4w?.toFixed(1) || '-'}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">12-Week Avg</p>
                                <p className="font-semibold text-gray-900">{order.avg_12w?.toFixed(1) || '-'}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Buying Cycle</p>
                                <p className="font-semibold text-gray-900">{order.BuyingCycleWeeks?.toFixed(1) || '-'} weeks</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Density</p>
                                <p className="font-semibold text-gray-900">{(order.Density * 100)?.toFixed(0) || '-'}%</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Data After Search */}
      {!loading && hasLoadedOnce && orders.length === 0 && !error && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recommended orders found</h3>
          <p className="text-sm text-gray-600">
            Try selecting a different date or adjust your customer filter.
          </p>
        </div>
      )}
    </div>
  );
}

export default RecommendedOrder;
