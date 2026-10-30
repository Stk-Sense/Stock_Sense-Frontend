import { LogOut, PlusCircle, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import BacktestTable from './components/BacktestTable';
import MetricCard from './components/MetricCard';
import Sidebar from './components/Sidebar';
import { type BacktestData, type TabType } from './types';

// Mock data remains isolated here as requested until your backend API hooks are ready
const MOCK_API_RESPONSE = {
  backtestsRun: 12,
  bestReturn: "+18.4%",
  liveSessions: 1,
  dataCoverage: "BTC, ETH",
  recentBacktests: [
    { id: '1', strategy: 'SMA crossover (20/50)', symbol: 'BTC/USDT', timeframe: '1h', returnVal: '+18.4%', status: 'DONE' as const },
    { id: '2', strategy: 'RSI mean reversion', symbol: 'ETH/USDT', timeframe: '1h', returnVal: '-3.1%', status: 'DONE' as const },
    { id: '3', strategy: 'Bollinger breakout', symbol: 'BTC/USDT', timeframe: '1d', returnVal: '-', status: 'RUNNING' as const },
  ]
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [userEmail] = useState<string>('you@example.com');

  const [metrics, setMetrics] = useState({
    backtestsRun: "0",
    bestReturn: "0%",
    liveSessions: "0",
    dataCoverage: "None"
  });
  const [backtestTable, setBacktestTable] = useState<BacktestData[]>([]);

  useEffect(() => {
    setMetrics({
      backtestsRun: MOCK_API_RESPONSE.backtestsRun.toString(),
      bestReturn: MOCK_API_RESPONSE.bestReturn,
      liveSessions: MOCK_API_RESPONSE.liveSessions.toString(),
      dataCoverage: MOCK_API_RESPONSE.dataCoverage
    });
    setBacktestTable(MOCK_API_RESPONSE.recentBacktests);
  }, []);

  return (
    <div className="flex h-screen w-full bg-white font-sans text-slate-800 antialiased">
      
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-end border-b border-slate-300 px-8 gap-6 bg-white shrink-0">
          <span className="text-sm text-slate-500">{userEmail}</span>
          <button 
            onClick={() => alert('Log out click detected')}
            className="flex items-center gap-2 border border-slate-400 px-4 py-1.5 text-sm text-slate-800 transition-colors hover:bg-slate-50 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </button>
        </header>

        <main className="flex-1 overflow-y-auto bg-white p-8">
          {activeTab === 'dashboard' ? (
            <div className="mx-auto max-w-6xl space-y-8">
              
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
                <button 
                  onClick={() => setActiveTab('new-backtest')}
                  className="flex items-center gap-2 bg-slate-900 px-4 py-2 text-sm text-white transition-all hover:bg-slate-800 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  + New backtest
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="BACKTESTS RUN" value={metrics.backtestsRun} />
                <MetricCard label="BEST RETURN" value={metrics.bestReturn} />
                <MetricCard label="LIVE PAPER SESSIONS" value={metrics.liveSessions} />
                <MetricCard label="DATA COVERAGE" value={metrics.dataCoverage} />
              </div>

              <BacktestTable data={backtestTable} setActiveTab={setActiveTab} />

            </div>
          ) : (
            <div className="mx-auto max-w-6xl border border-dashed border-slate-400 bg-white p-12 text-center">
              <TrendingUp className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-4 text-sm font-bold text-slate-950 capitalize">{activeTab.replace('-', ' ')} Window</h3>
              <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto">
                This area updates dynamically when clicking side options. Content layouts for the <span className="font-mono text-slate-700 font-bold">/{activeTab}</span> component layer go directly inside this view container.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
