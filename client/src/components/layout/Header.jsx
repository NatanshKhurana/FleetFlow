import { ChevronRight, Menu, PanelsTopLeft, X } from 'lucide-react';
import Brand from './Brand.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { DashboardNavigation } from './Sidebar.jsx';

export default function Header({ title, navigationOpen, onToggleNavigation, onNavigate, menuButtonRef }) {
  return (
    <header className="sticky top-0 z-20 border-b border-edge bg-surface">
      <div className="flex min-h-20 items-center justify-between flex-wrap gap-3 px-5 py-3 sm:flex-nowrap sm:gap-4 sm:px-8 sm:py-0 lg:px-10">
        <div className="min-w-0">
          <div className="lg:hidden"><Brand subtitle={title} /></div>
          <div className="hidden items-center gap-2 text-sm lg:flex">
            <span className="text-muted">Workspace</span>
            <ChevronRight size={14} className="text-muted" aria-hidden="true" />
            <span className="font-medium text-heading">{title}</span>
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 text-xs text-muted lg:flex">
            <PanelsTopLeft size={16} aria-hidden="true" />
            Operations workspace
          </div>
          <ThemeToggle />
          <button ref={menuButtonRef} type="button" onClick={onToggleNavigation}
            aria-label={navigationOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={navigationOpen} aria-controls="mobile-navigation"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-edge text-body hover:bg-subtle lg:hidden">
            {navigationOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {/* A non-modal disclosure: normal Tab navigation works without a focus trap. */}
      <div id="mobile-navigation" hidden={!navigationOpen} className="border-t border-line px-5 py-4 sm:px-8 lg:hidden">
        <DashboardNavigation onNavigate={onNavigate} />
      </div>
    </header>
  );
}
