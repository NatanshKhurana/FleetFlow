import { Truck } from 'lucide-react';
import { Link } from 'react-router';

export default function Brand({ subtitle = 'Delivery operations' }) {
  return (
    <Link to="/" className="flex w-fit items-center gap-3 rounded-lg" aria-label="FleetFlow overview">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
        <Truck size={23} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span>
        <span className="block text-xl font-semibold tracking-tight text-heading">FleetFlow<span className="text-accent">.</span></span>
        <span className="mt-0.5 block text-[10px] font-medium tracking-[0.16em] text-muted uppercase">{subtitle}</span>
      </span>
    </Link>
  );
}
