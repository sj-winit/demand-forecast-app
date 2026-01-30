import React, { useEffect, useState } from 'react';
import { Calendar, TrendingUp, AlertCircle, Package, ShoppingCart, PieChart, BarChart3 } from 'lucide-react';
import { MetricCard } from '../Common/MetricCard';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import type { SummaryMetrics } from '../../types';
import { getWeeklyForecast, getCustomers, getItems, getSalesAnalytics } from '../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardProps {
  metrics: SummaryMetrics | null;
}

interface TopItem {
  ItemCode: string;
  ItemName: string;
  TotalQuantity: number;
  Predicted: number;
  PredictionsCount: number;
}

type TimePeriod = '1month' | '3months' | '6months' | '1year' | 'all';

export const Dashboard: React.FC<DashboardProps> = ({ metrics }) => {
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [customerShare, setCustomerShare] = useState<Array<{name: string, count: number, percentage: number}>>([]);

  // Sales Supervision state
  const [salesAnalytics, setSalesAnalytics] = useState<any>(null);
  const [salesLoading, setSalesLoading] = useState(false);

  // Filter state
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [customers, setCustomers] = useState<string[]>([]);
  const [items, setItems] = useState<Array<{ItemCode: string; ItemName: string}>>([]);

  // Sales supervision filters
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');

  useEffect(() => {
    loadFilterOptions();
    loadEnhancedMetrics();
  }, []);

  useEffect(() => {
    loadEnhancedMetrics();
  }, [selectedCustomer, selectedItem]);

  const loadFilterOptions = async () => {
    try {
      const [custData, itemData] = await Promise.all([
        getCustomers(),
        getItems()
      ]);

      setCustomers(custData);
      setItems(itemData);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const loadEnhancedMetrics = async () => {
    try {
      setLoading(true);

      // Get predictions with filters
      const filterParams: any = {};
      if (selectedCustomer) filterParams.customer = selectedCustomer;
      if (selectedItem) filterParams.item_code = selectedItem;
      filterParams.limit = 10000;

      const allPredictions = await getWeeklyForecast(filterParams);

      // Calculate top items by sales volume
      const itemMap = new Map<string, TopItem>();
      allPredictions.forEach(pred => {
        const existing = itemMap.get(pred.ItemCode);
        if (existing) {
          existing.TotalQuantity += pred.TotalQuantity;
          existing.Predicted += pred.Predicted;
          existing.PredictionsCount++;
        } else {
          itemMap.set(pred.ItemCode, {
            ItemCode: pred.ItemCode,
            ItemName: pred.ItemName,
            TotalQuantity: pred.TotalQuantity,
            Predicted: pred.Predicted,
            PredictionsCount: 1
          });
        }
      });

      const topItemsArray = Array.from(itemMap.values())
        .sort((a, b) => b.TotalQuantity - a.TotalQuantity)
        .slice(0, 10);
      setTopItems(topItemsArray);

      // Calculate customer market share
      const customerMap = new Map<string, number>();
      allPredictions.forEach(pred => {
        customerMap.set(pred.CustomerName, (customerMap.get(pred.CustomerName) || 0) + pred.TotalQuantity);
      });

      const totalVolume = Array.from(customerMap.values()).reduce((a, b) => a + b, 0);
      const customerShareArray = Array.from(customerMap.entries()).map(([name, count]) => ({
        name,
        count,
        percentage: (count / totalVolume) * 100
      })).sort((a, b) => b.count - a.count);

      setCustomerShare(customerShareArray);
    } catch (err) {
      console.error('Failed to load enhanced metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSalesAnalytics = async () => {
    try {
      setSalesLoading(true);
      setHasAppliedSalesFilters(true);

      const data = await getSalesAnalytics({
        customer: selectedCustomer || undefined,
        item_code: selectedItem || undefined,
        time_period: timePeriod
      });

      setSalesAnalytics(data);
    } catch (err) {
      console.error('Failed to load sales analytics:', err);
    } finally {
      setSalesLoading(false);
    }
  };

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No metrics available</p>
      </div>
    );
  }

  const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals);
  };

  const formatDateRange = (startLabel: string, endLabel: string): string => {
    return `${startLabel} to ${endLabel}`;
  };

  // Sales Supervision chart configurations
  const lineChartData = {
    labels: salesAnalytics?.weekly_trends?.map((d: any) => d.week) || [],
    datasets: [{
      label: 'Sales Volume',
      data: salesAnalytics?.weekly_trends?.map((d: any) => d.volume) || [],
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text: 'Weekly Sales Volume (Training Data)',
        font: { size: 16, weight: 'bold' as const }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Quantity' }
      }
    }
  };

  const marketShareChartData = {
    labels: salesAnalytics?.top_75_percent_items?.slice(0, 10).map((i: any) =>
      i.item_name.length > 20 ? i.item_name.substring(0, 20) + '...' : i.item_name
    ) || [],
    datasets: [{
      label: 'Market Share %',
      data: salesAnalytics?.top_75_percent_items?.slice(0, 10).map((i: any) => i.market_share_pct) || [],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)', 'rgba(34, 197, 94, 0.8)', 'rgba(168, 85, 247, 0.8)',
        'rgba(236, 72, 153, 0.8)', 'rgba(234, 179, 8, 0.8)', 'rgba(20, 184, 166, 0.8)',
        'rgba(239, 68, 68, 0.8)', 'rgba(99, 102, 241, 0.8)', 'rgba(107, 114, 128, 0.8)',
        'rgba(249, 115, 22, 0.8)'
      ]
    }]
  };

  const marketShareChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `Items Contributing to 75% of Sales (${salesAnalytics?.top_75_percent_items?.length || 0} items)`,
        font: { size: 16, weight: 'bold' as const }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.parsed.y.toFixed(1)}%`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Market Share (%)' }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Range Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          <div>
            <p className="text-sm font-medium text-blue-900">Forecast Period</p>
            <p className="text-sm text-blue-700">
              {formatDateRange(metrics.date_range.start_label, metrics.date_range.end_label)}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Weeks"
          value={metrics.total_weeks}
          subtitle="Weekly forecasts"
          icon={<Calendar className="h-6 w-6" />}
        />

        <MetricCard
          title="Total Predictions"
          value={metrics.total_predictions.toLocaleString()}
          subtitle={`${metrics.total_customers} customers, ${metrics.total_items} items`}
          icon={<Package className="h-6 w-6" />}
        />

        <MetricCard
          title="Avg Demand Probability"
          value={`${formatNumber(metrics.avg_demand_probability * 100)}%`}
          subtitle="Confidence level"
          icon={<TrendingUp className="h-6 w-6" />}
        />

        <MetricCard
          title="High Confidence"
          value={`${formatNumber(metrics.high_confidence_pct)}%`}
          subtitle="Of total predictions"
          icon={<AlertCircle className="h-6 w-6" />}
        />
      </div>

      {/* Sales Supervision Section */}
      <div className="bg-white rounded-lg shadow border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <BarChart3 className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Sales Supervision (Training Data)</h3>
            </div>
            <button
              onClick={() => {
                setSelectedCustomer('');
                setSelectedItem('');
                setTimePeriod('all');
                setHasAppliedSalesFilters(false);
                setSalesAnalytics(null);
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Customers</option>
                {customers.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
              <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Items</option>
                {items.map(item => (
                  <option key={item.ItemCode} value={item.ItemCode}>{item.ItemName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="1month">Last 1 Month</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last 1 Year</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={loadSalesAnalytics}
                disabled={salesLoading}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-blue-300 text-sm font-medium"
              >
                {salesLoading ? 'Loading...' : 'Apply Filters'}
              </button>
            </div>
          </div>
        </div>

        {/* Sales Analytics Charts */}
        {salesAnalytics && !salesLoading && (
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600">Total Sales Volume</p>
                <p className="text-xl font-bold text-gray-900">
                  {salesAnalytics.summary?.total_volume?.toFixed(0).toLocaleString() || 0}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600">Unique Items</p>
                <p className="text-xl font-bold text-gray-900">
                  {salesAnalytics.summary?.unique_items || 0}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600">Customers</p>
                <p className="text-xl font-bold text-gray-900">
                  {salesAnalytics.summary?.unique_customers || 0}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600">Data Source</p>
                <p className="text-sm font-semibold text-blue-600 capitalize">
                  {salesAnalytics.data_source}
                </p>
              </div>
            </div>

            {/* Weekly Volume Line Chart */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div style={{ height: '300px' }}>
                <Line data={lineChartData} options={lineChartOptions} />
              </div>
            </div>

            {/* Market Share and Customer Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <div style={{ height: '300px' }}>
                  <Bar data={marketShareChartData} options={marketShareChartOptions} />
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div style={{ height: '300px' }}>
                  <Pie
                    data={{
                      labels: customerShare.slice(0, 6).map(c => c.name),
                      datasets: [{
                        data: customerShare.slice(0, 6).map(c => c.count),
                        backgroundColor: [
                          'rgba(59, 130, 246, 0.8)', 'rgba(249, 115, 22, 0.8)',
                          'rgba(34, 197, 94, 0.8)', 'rgba(168, 85, 247, 0.8)',
                          'rgba(236, 72, 153, 0.8)', 'rgba(234, 179, 8, 0.8)'
                        ]
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'right' as const },
                        title: {
                          display: true,
                          text: 'Customer Market Share',
                          font: { size: 14, weight: 'bold' as const }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Demand Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          title="Avg Weekly Demand"
          value={formatNumber(metrics.avg_weekly_demand, 2)}
          subtitle="Actual historical data"
          icon={<ShoppingCart className="h-6 w-6" />}
        />

        <MetricCard
          title="Avg Predicted Demand"
          value={formatNumber(metrics.avg_predicted_demand, 2)}
          subtitle="ML model forecast"
          icon={<TrendingUp className="h-6 w-6" />}
        />
      </div>

      {/* Top Items by Volume */}
      {topItems.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package className="h-5 w-5 mr-2 text-green-600" />
            Top 10 Items by Sales Volume
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Quantity</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Predicted</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Weeks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">#{idx + 1}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{item.ItemCode}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">{item.ItemName}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right font-semibold">{item.TotalQuantity.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 text-right">{item.Predicted.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                    <td className="px-4 py-2 text-sm text-gray-500 text-center">{item.PredictionsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Demand Pattern Distribution */}
      {Object.keys(metrics.pattern_distribution).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-purple-600" />
            Demand Pattern Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(metrics.pattern_distribution)
              .sort(([, a], [, b]) => b - a)
              .map(([pattern, count]) => {
                const percentage = ((count / metrics.total_predictions) * 100).toFixed(1);
                return (
                  <div key={pattern} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 capitalize">{pattern}</span>
                      <span className="text-lg font-bold text-gray-900">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{percentage}% of predictions</p>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
