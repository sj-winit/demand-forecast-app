import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { MarketShareProvider } from './contexts/MarketShareContext';
import { SalesSupervision } from './components/SalesSupervision';
import { Prediction } from './components/Prediction';

type TabType = 'supervision' | 'prediction' | 'futureForecast' | 'orders';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('supervision');

  return (
    <MarketShareProvider>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 space-x-6">
            <BarChart3 className="h-8 w-8 text-blue-600" />

            {/* Tab Navigation */}
            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveTab('supervision')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  activeTab === 'supervision'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('prediction')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  activeTab === 'prediction'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Demand Forecast
              </button>
              {/* <button
                onClick={() => setActiveTab('futureForecast')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  activeTab === 'futureForecast'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Future Forecast
              </button> */}
              {/*
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  activeTab === 'orders'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Recommended Order
              </button>
              */}
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'supervision' && <SalesSupervision />}
        {activeTab === 'prediction' && <Prediction />}
        {/* {activeTab === 'futureForecast' && <FutureForecast />} */}
        {/* {activeTab === 'orders' && <RecommendedOrder />} */}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Data readiness, prediction accuracy, and insights
          </p>
        </div>
      </footer>
    </div>
    </MarketShareProvider>
  );
}

export default App;
