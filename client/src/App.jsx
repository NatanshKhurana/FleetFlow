import { Truck } from 'lucide-react';
import { Link, Route, Routes } from 'react-router';

function PlaceholderPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 sm:p-12" aria-labelledby="fleetflow-title">
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Truck size={28} aria-hidden="true" />
        </div>
        <p className="mb-3 text-sm font-medium text-emerald-700">Frontend ready</p>
        <h1 id="fleetflow-title" className="text-4xl font-semibold tracking-tight">FleetFlow</h1>
        <p className="mt-4 text-lg text-slate-600">Delivery agent management, in one place.</p>
        <p className="mt-6 border-t border-slate-100 pt-6 text-sm leading-6 text-slate-500">
          Your workspace is taking shape. Agent management tools are coming next.
        </p>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlaceholderPage />} />
      <Route path="*" element={
        <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
          <h1 className="mb-4 text-2xl font-semibold">Page not found</h1>
          <Link to="/" className="text-emerald-700 underline focus-visible:outline-2 focus-visible:outline-offset-4">
            Return to FleetFlow
          </Link>
        </main>
      } />
    </Routes>
  );
}
