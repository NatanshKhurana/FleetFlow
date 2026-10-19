import { ArrowUpRight, LayoutDashboard, UsersRound } from 'lucide-react';
import { NavLink } from 'react-router';
import Brand from './Brand.jsx';

// Desktop and mobile share navigation so labels and route behavior stay consistent.
export function DashboardNavigation({ onNavigate }) {
  return (
    <nav aria-label="Main navigation" className="space-y-1.5">
      <NavLink to="/" end onClick={onNavigate} className={({ isActive }) =>
        'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ' +
        (isActive ? 'bg-accent-soft text-accent' : 'text-body hover:bg-subtle hover:text-heading')
      }>
        <LayoutDashboard size={19} strokeWidth={1.8} aria-hidden="true" />
        Overview
      </NavLink>
      <NavLink to="/agents" onClick={onNavigate} className={({ isActive }) =>
        'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ' +
        (isActive ? 'bg-accent-soft text-accent' : 'text-body hover:bg-subtle hover:text-heading')
      }>
        <UsersRound size={19} strokeWidth={1.8} aria-hidden="true" />
        <span>Agents</span>
      </NavLink>
    </nav>
  );
}

export default function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh min-w-0 flex-col border-r border-edge bg-surface lg:flex" aria-label="Dashboard sidebar">
      <div className="px-6 py-8"><Brand /></div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Workspace</p>
        <DashboardNavigation />
      </div>
      <div className="m-4 rounded-xl border border-line bg-subtle p-4">
        <ArrowUpRight size={18} className="mb-3 text-accent" aria-hidden="true" />
        <p className="text-sm font-medium text-body">People behind every delivery.</p>
        <p className="mt-1.5 text-xs leading-5 text-muted">One workspace for your delivery team.</p>
      </div>
      <p className="border-t border-line px-7 py-5 text-[11px] text-muted">FleetFlow · Delivery agent management</p>
    </aside>
  );
}
