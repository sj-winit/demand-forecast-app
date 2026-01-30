/**
 * Dashboard - Main Component
 * Comprehensive dashboard for supervising data readiness and demand behavior
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, BarChart3, Activity, PieChart } from 'lucide-react';
import { DataCoverageHealth } from './sections/DataCoverageHealth';
import { MarketShare } from './sections/MarketShare';
import { getTrainingSalesData } from '../../services/api';
import { LoadingSpinner, ErrorMessage } from '../Common';
import { WeeklySalesData } from '../../utils/dataTransformations';
import { useMarketShare } from '../../contexts/MarketShareContext';

type SectionType = 'coverage' | 'marketshare';

export const SalesSupervision: React.FC = () => {
  const [data, setData] = useState<WeeklySalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionType>('coverage');
  const { setTrainingData } = useMarketShare();

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const salesData = await getTrainingSalesData();

      // Normalize data: take first ItemName for each ItemCode, first CustomerName for each CustomerID
      const itemNameMap = new Map<string, string>();
      const customerNameMap = new Map<string, string>();

      // First pass: collect first names for each code/id
      for (const row of salesData) {
        const itemCodeStr = String(row.ItemCode);
        const customerIdStr = String(row.CustomerID);

        if (!itemNameMap.has(itemCodeStr)) {
          itemNameMap.set(itemCodeStr, row.ItemName);
        }

        if (!customerNameMap.has(customerIdStr)) {
          customerNameMap.set(customerIdStr, row.CustomerName);
        }
      }

      // Second pass: normalize the data
      const normalizedData = salesData.map(row => ({
        ...row,
        ItemCode: String(row.ItemCode),
        CustomerID: String(row.CustomerID),
        ItemName: itemNameMap.get(String(row.ItemCode)) || row.ItemName,
        CustomerName: customerNameMap.get(String(row.CustomerID)) || row.CustomerName
      }));

      setData(normalizedData);
      setTrainingData(normalizedData); // Store in context for Recommended Order
    } catch (err) {
      setError('Failed to load sales data. Please ensure the backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Section navigation
  const sections = [
    { id: 'coverage' as SectionType, label: 'Coverage', icon: Activity },
    { id: 'marketshare' as SectionType, label: 'Market Share', icon: PieChart }
  ];

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="large" />
        <span className="ml-3 text-gray-600">Loading sales supervision data...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-8">
        <ErrorMessage message={error} onRetry={loadData} />
      </div>
    );
  }

  // Empty data state
  if (data.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-12 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Data Available</h3>
        <p className="text-yellow-700">
          No training data found. Please ensure the backend has processed the sales data.
        </p>
      </div>
    );
  }

  const dataRecordCount = data.length;
  const uniqueSKUs = new Set(data.map(d => d.ItemCode)).size;
  const uniqueCustomers = new Set(data.map(d => d.CustomerName)).size;

  return (
    <div className="space-y-6">
      {/* Data Summary */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div>
              <span className="text-sm text-gray-500">Records:</span>
              <span className="ml-2 text-lg font-semibold text-gray-900">
                {dataRecordCount.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-500">SKUs:</span>
              <span className="ml-2 text-lg font-semibold text-gray-900">
                {uniqueSKUs.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Customers:</span>
              <span className="ml-2 text-lg font-semibold text-gray-900">
                {uniqueCustomers.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-2">
        <div className="flex overflow-x-auto">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${
                  activeSection === section.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dashboard Sections */}
      <div className="space-y-8">
        {activeSection === 'coverage' && (
          <DataCoverageHealth data={data} />
        )}

        {activeSection === 'marketshare' && (
          <MarketShare data={data} />
        )}
      </div>
    </div>
  );
};

export default SalesSupervision;
