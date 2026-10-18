import { useEffect, useState, useSyncExternalStore } from 'react';
import OverviewContent from '../components/overview/OverviewContent.jsx';
import { fetchOverview } from '../services/overviewService.js';
import { createOverviewResource } from '../state/overviewResource.js';

export default function OverviewPage() {
  const [resource] = useState(() => createOverviewResource(fetchOverview));
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot);

  useEffect(() => {
    void resource.load();
    // Cancel on unmount and React StrictMode's development cleanup cycle.
    return resource.cancel;
  }, [resource]);

  return (
    <OverviewContent state={state} onRetry={resource.load} />
  );
}
