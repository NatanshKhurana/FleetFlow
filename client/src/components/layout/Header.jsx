import { ChevronRight, Menu, PanelsTopLeft, X } from 'lucide-react';
import Brand from './Brand.jsx';
import { DashboardNavigation } from './Sidebar.jsx';

export default function Header({ title, navigationOpen, onToggleNavigation, onNavigate, menuButtonRef }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="flex min-h-20 items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <div className="min-w-0">
          <div className="lg:hidden"><Brand subtitle={title} /></div>
          <div className="hidden items-center gap-2 text-sm lg:flex">
            <span className="text-slate-500">Workspace</span>
            <ChevronRight size={14} className="text-slate-300" aria-hidden="true" />
            <span className="font-medium text-slate-800">{title}</span>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-xs text-slate-500 lg:flex">
          <PanelsTopLeft size={16} aria-hidden="true" />
          Operations workspace
        </div>
        <button ref={menuButtonRef} type="button" onClick={onToggleNavigation}
          aria-label={navigationOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={navigationOpen} aria-controls="mobile-navigation"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden">
          {navigationOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
        </button>
      </div>
      {/* A non-modal disclosure: normal Tab navigation works without a focus trap. */}
      <div id="mobile-navigation" hidden={!navigationOpen} className="border-t border-slate-100 px-5 py-4 sm:px-8 lg:hidden">
        <DashboardNavigation onNavigate={onNavigate} />
      </div>
    </header>
  );
}
