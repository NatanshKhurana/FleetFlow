import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

const darkSnapshot = () => 'dark';
const noSubscription = () => () => {};

export default function ThemeToggle() {
  // Only this control subscribes: route resources and drafts are never remounted.
  const store = typeof window === 'undefined' ? undefined : window.fleetflowTheme;
  const theme = useSyncExternalStore(store?.subscribe || noSubscription,
    store?.getSnapshot || darkSnapshot, darkSnapshot);
  return <ThemeToggleButton theme={theme} onChange={(next) => store?.setTheme(next)} />;
}

export function ThemeToggleButton({ theme, onChange }) {
  const dark = theme === 'dark';
  return <button type="button" aria-label={`Color theme: ${dark ? 'Dark' : 'Light'}`} aria-pressed={dark}
    title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    onClick={() => onChange(dark ? 'light' : 'dark')}
    className="inline-flex min-h-11 w-24 shrink-0 items-center justify-center gap-2 rounded-lg border border-edge bg-surface px-3 text-sm font-medium text-body hover:bg-subtle">
    {dark ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
    <span>{dark ? 'Dark' : 'Light'}</span>
  </button>;
}
