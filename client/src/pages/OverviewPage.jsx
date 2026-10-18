import { Route, Truck } from 'lucide-react';

export default function OverviewPage() {
  return (
    <section aria-labelledby="welcome-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="h-1 bg-emerald-700" />
      <div className="p-6 sm:p-10 xl:p-12">
        <div className="mb-8 flex size-14 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">
          <Truck size={29} strokeWidth={1.6} aria-hidden="true" />
        </div>
        <p className="mb-3 text-xs font-semibold tracking-[0.12em] text-emerald-700 uppercase">Made for the road ahead</p>
        <h2 id="welcome-title" className="max-w-xl text-2xl leading-tight font-semibold tracking-tight text-slate-950 sm:text-3xl">Welcome to FleetFlow.</h2>
        <p className="mt-4 max-w-lg text-sm leading-7 text-slate-500 sm:text-base">
          A single workspace for the people behind every delivery. Your team's next chapter starts here.
        </p>
        <div className="mt-10 flex items-start gap-3 border-t border-slate-100 pt-6 sm:mt-14">
          <Route size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
          <p className="max-w-md text-sm leading-6 text-slate-500">Agent management tools and your operations overview will arrive here soon.</p>
        </div>
      </div>
    </section>
  );
}
