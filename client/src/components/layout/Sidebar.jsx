import { ArrowUpRight, LayoutDashboard, UsersRound } from 'lucide-react';
import { NavLink } from 'react-router';
import Brand from './Brand.jsx';

// Desktop and mobile share navigation so labels and route behavior stay consistent.
export function DashboardNavigation({ onNavigate }) {
  return (
    <nav aria-label="Main navigation" className="space-y-1.5">
      <NavLink to="/" end onClick={onNavigate} className={({ isActive }) =>
        'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ' +
        (isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950')
      }>
        <LayoutDashboard size={19} strokeWidth={1.8} aria-hidden="true" />
        Overview
      </NavLink>
      <button type="button" disabled aria-label="Agents, coming soon" className="flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-500">
        <UsersRound size={19} strokeWidth={1.8} aria-hidden="true" />
        <span>Agents</span>
        <span className="ml-auto rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium">Soon</span>
      </button>
    </nav>
  );
}

export default function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh min-w-0 flex-col border-r border-slate-200 bg-white lg:flex" aria-label="Dashboard sidebar">
      <div className="px-6 py-8"><Brand /></div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">Workspace</p>
        <DashboardNavigation />
      </div>
      <div className="m-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <ArrowUpRight size={18} className="mb-3 text-emerald-700" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-700">People behind every delivery.</p>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">One workspace for your delivery team.</p>
      </div>
      <p className="border-t border-slate-100 px-7 py-5 text-[11px] text-slate-500">FleetFlow · Delivery agent management</p>
    </aside>
  );
}
