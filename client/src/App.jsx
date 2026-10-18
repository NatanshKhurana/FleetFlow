import { Link, Route, Routes } from 'react-router';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import OverviewPage from './pages/OverviewPage.jsx';
import AgentsPage from './pages/AgentsPage.jsx';
import AgentDetailPage from './pages/AgentDetailPage.jsx';

function NotFoundPage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10" aria-labelledby="not-found-title">
      <h2 id="not-found-title" className="text-2xl font-semibold tracking-tight">This page isn't here.</h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">Head back to your FleetFlow workspace to continue.</p>
      <Link to="/" className="mt-6 inline-flex rounded-lg text-sm font-semibold text-emerald-700 underline underline-offset-4">
        Return to Overview
      </Link>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="agents/:id" element={<AgentDetailPage />} />
        <Route path="agents/:id/edit" element={<AgentDetailPage editing />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
