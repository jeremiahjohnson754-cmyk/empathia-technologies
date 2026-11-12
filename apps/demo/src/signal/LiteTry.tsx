/**
 * "Try it in Lite": a story idea opened in Empathia Lite (signal/lite.ts). Drawn only where the reader's role may open that Lite address
 * (D44: absent, not disabled), and always with the caveat that Lite is a modeled campus room, not the story's church.
 */
import { openable } from '../pages/V25Nav.js';
import { LITE_CAVEAT, liteHref, type LiteTry } from './lite.js';

export function LiteTryCard({ t, role, after, compact }: { t: LiteTry | null; role: string; after: string; compact?: boolean }) {
  if (!t || !openable(role, liteHref(t))) return null;
  if (compact) return <p className="sg-lite sg-lite--compact" data-testid="story-lite" data-lite={t.key} data-after={after}>
    <a className="ui-btn ui-btn--quiet" href={liteHref(t)}>▣ See it in Lite: {t.title.toLowerCase()}</a> <span className="ui-meta">{t.roomName}, modeled</span></p>;
  return <aside className="sg-lite" data-testid="story-lite" data-lite={t.key} data-after={after} aria-label={`Try it in Lite: ${t.title}`}>
    <p className="sg-lite__k">Try it in Lite · after the {after}</p>
    <p><b>{t.title}.</b> {t.look}</p>
    <p><a className="ui-btn" href={liteHref(t)} data-testid="story-lite-open">Open the {t.roomName} in Lite</a></p>
    <p className="ui-meta">{LITE_CAVEAT}</p>
  </aside>;
}
