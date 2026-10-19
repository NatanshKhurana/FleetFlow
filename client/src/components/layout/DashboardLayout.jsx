import { useEffect, useRef, useState } from 'react';
import { Outlet, matchPath, useLocation } from 'react-router';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';

export default function DashboardLayout() {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const { pathname } = useLocation();
  const titles = { '/': 'Overview', '/agents': 'Agents' };
  const title = titles[pathname.replace(/\/$/, '') || '/']
    || (matchPath('/agents/:id/edit', pathname) ? 'Edit agent'
      : matchPath('/agents/:id', pathname) ? 'Agent details' : 'Page not found');

  function closeNavigation() {
    setNavigationOpen(false);
    // The selected mobile link becomes hidden; keep keyboard focus on a visible control.
    menuButtonRef.current?.focus();
  }

  useEffect(() => {
    // Reset the mobile disclosure when moving to another route or desktop width.
    const desktop = window.matchMedia('(min-width: 64rem)');
    function handleResize() {
      if (desktop.matches) setNavigationOpen(false);
    }
    handleResize();
    desktop.addEventListener('change', handleResize);
    return () => desktop.removeEventListener('change', handleResize);
  }, []);

  useEffect(() => {
    setNavigationOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navigationOpen) return;
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setNavigationOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [navigationOpen]);

  return (
    <div className="min-h-dvh bg-canvas text-heading lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a href="#main-content" className="sr-only z-50 rounded-lg bg-primary-hover px-4 py-3 text-sm font-medium text-on-primary focus:not-sr-only focus:fixed focus:top-4 focus:left-4">Skip to content</a>
      <Sidebar />
      <div className="min-w-0">
        <Header title={title} navigationOpen={navigationOpen} menuButtonRef={menuButtonRef}
          onToggleNavigation={() => setNavigationOpen((open) => !open)} onNavigate={closeNavigation} />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl px-5 py-8 outline-none sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="mb-7 sm:mb-9">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted">YOUR WORKSPACE</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">A clearer view of your delivery operations.</p>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
