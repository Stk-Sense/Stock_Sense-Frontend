
import { BarChart3, History, Layers, LayoutDashboard, PlayCircle, PlusCircle } from 'lucide-react';
import { type TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const sidebarItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'market' as TabType, label: 'Market', icon: BarChart3 },
    { id: 'strategies' as TabType, label: 'Strategies', icon: Layers },
    { id: 'new-backtest' as TabType, label: 'New backtest', icon: PlusCircle },
    { id: 'backtests' as TabType, label: 'Backtests', icon: History },
    { id: 'paper-trading' as TabType, label: 'Paper trading', icon: PlayCircle },
  ];

  return (
    <aside className="flex w-64 flex-col border-r border-slate-300 bg-white px-4 py-6 justify-between shrink-0">
      <div>
        <div className="mb-8 px-2">
          <h1 className="border border-slate-950 px-6 py-2 text-xl font-bold tracking-tight text-slate-950 inline-block">
            StockSense
          </h1>
        </div>

        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm transition-all text-left ${
                  isActive
                    ? 'bg-slate-900 text-white font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-2 text-[10px] leading-relaxed text-slate-400 font-medium">
        Simulated results only. <br /> Not financial advice.
      </div>
    </aside>
  );
}
