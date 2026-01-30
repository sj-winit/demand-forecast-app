/**
 * Market Share Context
 * Shares market share data between Dashboard (Market Share section) and Recommended Order tab
 * Caches market share results per customer and percentage
 * Stores training sales data for on-demand calculation
 */

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { WeeklySalesData } from '../utils/dataTransformations';

export interface MarketShareItem {
  ItemCode: string;
  ItemName: string;
  TotalQuantity: number;
  ItemCode_Percent_of_Total: number;
  Cumulative_Percent: number;
}

interface MarketShareResult {
  customerName: string;
  referenceDate: string;
  marketSharePercent: number;
  items: MarketShareItem[];
}

interface MarketShareContextType {
  marketShareData: MarketShareResult | null;
  marketShareCache: Map<string, MarketShareResult>;
  trainingData: WeeklySalesData[];
  setTrainingData: (data: WeeklySalesData[]) => void;
  setMarketShareData: (data: MarketShareResult) => void;
  getMarketShareForCustomerAndPercent: (customerName: string, percent: number) => MarketShareResult | null;
  calculateMarketShare: (
    customerName: string,
    referenceDate: string,
    marketSharePercent: number
  ) => MarketShareResult | null;
  clearMarketShareData: () => void;
  clearCache: () => void;
}

const MarketShareContext = createContext<MarketShareContextType | undefined>(undefined);

export function MarketShareProvider({ children }: { children: ReactNode }) {
  const [marketShareData, setMarketShareDataState] = useState<MarketShareResult | null>(null);
  const [marketShareCache, setMarketShareCache] = useState<Map<string, MarketShareResult>>(new Map());
  const [trainingData, setTrainingDataState] = useState<WeeklySalesData[]>([]);

  const setTrainingData = useCallback((data: WeeklySalesData[]) => {
    setTrainingDataState(data);
  }, []);

  const setMarketShareData = useCallback((data: MarketShareResult) => {
    // Create cache key: "CustomerName-Percentage"
    const cacheKey = `${data.customerName}-${data.marketSharePercent}`;

    setMarketShareDataState(data);
    setMarketShareCache(prev => {
      const newCache = new Map(prev);
      newCache.set(cacheKey, data);
      return newCache;
    });
  }, []);

  const getMarketShareForCustomerAndPercent = useCallback((customerName: string, percent: number): MarketShareResult | null => {
    const cacheKey = `${customerName}-${percent}`;
    return marketShareCache.get(cacheKey) || null;
  }, [marketShareCache]);

  const calculateMarketShare = useCallback((
    customerName: string,
    referenceDate: string,
    marketSharePercent: number
  ): MarketShareResult | null => {
    if (trainingData.length === 0) return null;

    // Check cache first
    const cacheKey = `${customerName}-${marketSharePercent}`;
    const cached = marketShareCache.get(cacheKey);
    if (cached) return cached;

    // Filter by selected customer
    const customerData = trainingData.filter(d => d.CustomerName === customerName);

    if (customerData.length === 0) return null;

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

    if (totalQty === 0) return null;

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
        Cumulative_Percent: 0
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

    let resultItems: MarketShareItem[];
    if (items.length > 0 && targetItems.length === 0) {
      resultItems = [items[0]];
    } else if (targetItems.length < items.length) {
      resultItems = items.slice(0, targetItems.length + 1);
    } else {
      resultItems = targetItems;
    }

    const result: MarketShareResult = {
      customerName,
      referenceDate,
      marketSharePercent,
      items: resultItems
    };

    // Cache the result
    setMarketShareCache(prev => {
      const newCache = new Map(prev);
      newCache.set(cacheKey, result);
      return newCache;
    });

    return result;
  }, [trainingData, marketShareCache]);

  const clearMarketShareData = useCallback(() => {
    setMarketShareDataState(null);
  }, []);

  const clearCache = useCallback(() => {
    setMarketShareCache(new Map());
    setMarketShareDataState(null);
  }, []);

  return (
    <MarketShareContext.Provider
      value={{
        marketShareData,
        marketShareCache,
        trainingData,
        setTrainingData,
        setMarketShareData,
        getMarketShareForCustomerAndPercent,
        calculateMarketShare,
        clearMarketShareData,
        clearCache
      }}
    >
      {children}
    </MarketShareContext.Provider>
  );
}

export function useMarketShare() {
  const context = useContext(MarketShareContext);
  if (context === undefined) {
    throw new Error('useMarketShare must be used within a MarketShareProvider');
  }
  return context;
}
