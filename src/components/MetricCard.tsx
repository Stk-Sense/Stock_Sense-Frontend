
import { type MetricCardProps } from '../types';

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="border border-slate-400 bg-[#F1F3F5] p-5">
      <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}
