
import { type BacktestData, type TabType } from '../types';

interface BacktestTableProps {
  data: BacktestData[];
  setActiveTab: (tab: TabType) => void;
}

export default function BacktestTable({ data, setActiveTab }: BacktestTableProps) {
  return (
    <div className="border border-slate-400 bg-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-400 px-6 py-4 bg-white">
        <h3 className="font-bold text-slate-950">Recent backtests</h3>
        <button 
          onClick={() => setActiveTab('backtests')}
          className="text-xs text-slate-500 hover:text-slate-950 transition-colors underline underline-offset-4"
        >
          View all
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-xs font-semibold text-slate-500">
              <th className="px-6 py-3">Strategy</th>
              <th className="px-6 py-3">Symbol</th>
              <th className="px-6 py-3">TF</th>
              <th className="px-6 py-3">Return</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">
                  <span 
                    onClick={() => setActiveTab('backtests')}
                    className="cursor-pointer hover:underline text-slate-700"
                  >
                    {row.strategy}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 font-mono text-xs">{row.symbol}</td>
                <td className="px-6 py-4 text-slate-600 text-xs">{row.timeframe}</td>
                <td className="px-6 py-4 font-medium text-xs text-slate-800">
                  {row.returnVal}
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-semibold tracking-wide text-slate-700">
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
