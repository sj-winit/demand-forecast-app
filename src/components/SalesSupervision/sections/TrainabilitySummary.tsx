/**
 * Section 7: Trainability Summary
 * Charts: Trainable SKU Summary Table, Trainability Score Heatmap
 */

import React, { useState, useMemo } from 'react';
import { WeeklySalesData, SKUMetrics, calculateSKUMetrics, groupBySKU } from '../../../utils/dataTransformations';

interface TrainabilitySummaryProps {
  data: WeeklySalesData[];
  onSKUClick?: (itemCode: string) => void;
}

export const TrainabilitySummary: React.FC<TrainabilitySummaryProps> = ({ data, onSKUClick }) => {
  const [sortBy, setSortBy] = useState<keyof SKUMetrics>('trainabilityScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterApproach, setFilterApproach] = useState<string>('all');

  // Calculate SKU metrics
  const skuMetrics = useMemo(() => {
    const skuData = groupBySKU(data);
    const metrics: SKUMetrics[] = [];

    for (const [itemCode, records] of skuData.entries()) {
      const itemName = records[0]?.ItemName || itemCode;
      metrics.push(calculateSKUMetrics(itemCode, itemName, records));
    }

    return metrics;
  }, [data]);

  // Filter and sort
  const filteredMetrics = useMemo(() => {
    let filtered = skuMetrics;

    if (filterApproach !== 'all') {
      filtered = filtered.filter(m => m.recommendedApproach === filterApproach);
    }

    return filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
  }, [skuMetrics, sortBy, sortOrder, filterApproach]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: skuMetrics.length,
      ml: skuMetrics.filter(m => m.recommendedApproach === 'ML').length,
      statistical: skuMetrics.filter(m => m.recommendedApproach === 'Statistical').length,
      ruleBased: skuMetrics.filter(m => m.recommendedApproach === 'Rule-based').length
    };
  }, [skuMetrics]);

  // Trainability score heatmap data
  const heatmapData = useMemo(() => {
    // Group by history length bucket and demand type
    const buckets = ['< 26 weeks', '26–52 weeks', '> 52 weeks'] as const;
    const types = ['Smooth', 'Intermittent', 'Sparse'] as const;

    const grid: Array<{ bucket: string; type: string; avgScore: number; count: number }> = [];

    for (const bucket of buckets) {
      for (const type of types) {
        const matching = skuMetrics.filter(
          m => {
            const historyBucket = m.historyLength < 26 ? '< 26 weeks' :
                               m.historyLength <= 52 ? '26–52 weeks' : '> 52 weeks';
            return historyBucket === bucket && m.demandType === type;
          }
        );

        const avgScore = matching.length > 0
          ? matching.reduce((sum, m) => sum + m.trainabilityScore, 0) / matching.length
          : 0;

        grid.push({
          bucket,
          type,
          avgScore: Math.round(avgScore),
          count: matching.length
        });
      }
    }

    return grid;
  }, [skuMetrics]);

  const handleSort = (column: keyof SKUMetrics) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getApproachBadge = (approach: string) => {
    const styles = {
      'ML': 'bg-purple-100 text-purple-800',
      'Statistical': 'bg-blue-100 text-blue-800',
      'Rule-based': 'bg-gray-100 text-gray-800'
    };
    return styles[approach as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Section 7: Trainability Summary
        </h3>
        <p className="text-sm text-gray-500">
          SKU-level analysis and modeling recommendations
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total SKUs</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <div className="text-sm text-gray-600">ML Ready</div>
          <div className="text-2xl font-bold text-purple-600">{stats.ml}</div>
          <div className="text-xs text-gray-500">Score ≥70</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Statistical</div>
          <div className="text-2xl font-bold text-blue-600">{stats.statistical}</div>
          <div className="text-xs text-gray-500">Score 40-69</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Rule-based</div>
          <div className="text-2xl font-bold text-gray-600">{stats.ruleBased}</div>
          <div className="text-xs text-gray-500">Score &lt;40</div>
        </div>
      </div>

      {/* Trainability Heatmap */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
        <h4 className="text-base font-semibold text-gray-800 mb-4">
          17. Trainability Score by SKU Bucket
        </h4>
        <div className="grid grid-cols-4 gap-2">
          <div></div>
          <div className="text-center text-sm font-medium text-gray-700">Smooth</div>
          <div className="text-center text-sm font-medium text-gray-700">Intermittent</div>
          <div className="text-center text-sm font-medium text-gray-700">Sparse</div>

          {['< 26 weeks', '26–52 weeks', '> 52 weeks'].map(bucket => (
            <React.Fragment key={bucket}>
              <div className="text-sm font-medium text-gray-700">{bucket}</div>
              {['Smooth', 'Intermittent', 'Sparse'].map(type => {
                const cell = heatmapData.find(h => h.bucket === bucket && h.type === type);
                const bgColor = cell && cell.avgScore >= 70 ? 'bg-green-100' :
                               cell && cell.avgScore >= 40 ? 'bg-yellow-100' :
                               cell && cell.avgScore > 0 ? 'bg-red-100' : 'bg-gray-50';
                const textColor = cell && cell.avgScore >= 70 ? 'text-green-800' :
                                 cell && cell.avgScore >= 40 ? 'text-yellow-800' :
                                 cell && cell.avgScore > 0 ? 'text-red-800' : 'text-gray-400';

                return (
                  <div
                    key={`${bucket}-${type}`}
                    className={`p-3 rounded text-center ${bgColor} ${textColor}`}
                  >
                    <div className="text-lg font-bold">{cell?.avgScore || 0}</div>
                    <div className="text-xs">{cell?.count || 0} SKUs</div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Filter by Approach:
          </label>
          <select
            value={filterApproach}
            onChange={(e) => setFilterApproach(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Approaches</option>
            <option value="ML">ML Only</option>
            <option value="Statistical">Statistical Only</option>
            <option value="Rule-based">Rule-based Only</option>
          </select>
          <span className="text-sm text-gray-500">
            Showing {filteredMetrics.length} of {stats.total} SKUs
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <h4 className="text-base font-semibold text-gray-800 p-4 pb-2">
          16. Trainable SKU Summary Table
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { key: 'ItemCode', label: 'Item Code' },
                  { key: 'ItemName', label: 'Item Name' },
                  { key: 'historyLength', label: 'History (weeks)' },
                  { key: 'density', label: 'Density %' },
                  { key: 'meanWeeklyDemand', label: 'Mean Demand' },
                  { key: 'cv', label: 'CV' },
                  { key: 'customerCount', label: 'Customers' },
                  { key: 'trainabilityScore', label: 'Score (0-100)' },
                  { key: 'recommendedApproach', label: 'Approach' }
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key as keyof SKUMetrics)}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      {col.label}
                      {sortBy === col.key && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMetrics.slice(0, 50).map((metric) => (
                <tr
                  key={metric.ItemCode}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSKUClick?.(metric.ItemCode)}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {metric.ItemCode}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {metric.ItemName.length > 30
                      ? metric.ItemName.substring(0, 30) + '...'
                      : metric.ItemName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {metric.historyLength}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {metric.density.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {metric.meanWeeklyDemand.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {metric.cv.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {metric.customerCount}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getScoreColor(metric.trainabilityScore)}`}>
                      {metric.trainabilityScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getApproachBadge(metric.recommendedApproach)}`}>
                      {metric.recommendedApproach}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredMetrics.length > 50 && (
          <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 border-t">
            Showing first 50 of {filteredMetrics.length} SKUs. Apply filters to narrow results.
          </div>
        )}
      </div>
    </div>
  );
};
