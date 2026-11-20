/**
 * The one line the shell shows while the browser reports no connection (and for a few seconds after it returns), and the hook the
 * offline page shares with it. Kept apart from the page so the shell does not carry the page's code.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { offlineState, subscribeOffline } from './offline.js';

export const useOffline = () => useSyncExternalStore(subscribeOffline, offlineState, offlineState);

export function OfflineStrip() {
  const s = useOffline(); const [back, setBack] = useState(false); const [was, setWas] = useState(s.online);
  useEffect(() => { if (s.online && !was) { setBack(true); const t = setTimeout(() => setBack(false), 5000); setWas(true); return () => clearTimeout(t); } setWas(s.online); return undefined; }, [s.online]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (s.online && !back) return <div className="of-strip of-strip--none" role="status" aria-live="polite" data-testid="offline-strip" data-online="true" />;
  return (
    <div className="of-strip" role="status" aria-live="polite" data-testid="offline-strip" data-online={s.online}>
      {s.online ? <span>Back online.</span> : <span><b>Offline.</b> {s.phase === 'ready' ? 'This app is saved on this device: every page still opens, and your work is kept in this browser.' : 'This app is not saved on this device yet: pages you have not opened will not load until the connection returns.'} <a href="#/offline">Offline and this device</a></span>}
    </div>
  );
}
