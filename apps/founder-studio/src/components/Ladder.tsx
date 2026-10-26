import { EVIDENCE_MEANING, EVIDENCE_STATES, type EvidenceState, type Rung } from '../data/products';

const color = (s: EvidenceState) => `var(--ev-${s.toLowerCase().replace(/_/g, '-')})`;
const words: Record<Rung, string> = { YES: 'achieved', PARTIAL: 'partly', NO: 'not achieved' };

/** The evidence ladder: eight rungs, filled (achieved), hatched (partly) or empty. Always carries its words for assistive tech. */
export function Ladder({ ladder, big, legend }: { ladder: Record<EvidenceState, Rung>; big?: boolean; legend?: boolean }) {
  const text = EVIDENCE_STATES.map((s) => `${s.replace(/_/g, ' ').toLowerCase()}: ${words[ladder[s]]}`).join('; ');
  return (
    <div>
      <div className={`ladder${big ? ' big' : ''}`} role="img" aria-label={`Evidence — ${text}`}>
        {EVIDENCE_STATES.map((s) => (
          <i key={s} data-r={ladder[s]} style={{ ['--c' as string]: color(s) }} title={`${s}: ${words[ladder[s]]}`} />
        ))}
      </div>
      {legend && (
        <div className="ladder-legend" aria-hidden="true">
          {EVIDENCE_STATES.map((s) => <span key={s}>{s.replace(/_/g, ' ').toLowerCase()}</span>)}
        </div>
      )}
    </div>
  );
}

/** The ladder as a readable list, one rung per row, with what each state means. */
export function LadderRows({ ladder }: { ladder: Record<EvidenceState, Rung> }) {
  return (
    <div className="ladder-rows">
      {EVIDENCE_STATES.map((s) => (
        <div className="ladder-row" key={s} title={EVIDENCE_MEANING[s]}>
          <i data-r={ladder[s]} style={{ ['--c' as string]: color(s) }} aria-hidden="true" />
          <span>{s.replace(/_/g, ' ').toLowerCase()}</span>
          <b>{words[ladder[s]]}</b>
        </div>
      ))}
    </div>
  );
}
