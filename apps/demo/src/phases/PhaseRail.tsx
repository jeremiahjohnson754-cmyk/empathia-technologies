/** A workflow's phases on the universal engine, drawn the same way for every product: a tile per phase with its verdict and count, the
 *  items of each phase with their result and why, and the sign-off with what it still waits for. No headings, so it sits inside any card. */
import { Tag } from '@empathia/ui';
import { VERDICT_WORD, VERDICT_TONE, type PhaseRun } from './universal.js';

const RESULT: Record<string, { word: string; tone: 'ok' | 'warn' | 'bad' | 'muted' }> = { pass: { word: 'Done', tone: 'ok' }, ran: { word: 'Awaiting verification', tone: 'warn' }, fail: { word: 'Failed', tone: 'bad' }, pending: { word: 'Not yet', tone: 'muted' }, na: { word: 'Does not apply', tone: 'muted' } };

export function PhaseRail({ run, sign, testId, who = (x: string) => x }: { run: PhaseRun[]; sign: { done: boolean; by: string | null; at: string | null; ready: boolean; why: string[] }; testId: string; who?: (id: string) => string }) {
  return (
    <div className="phr" data-testid={testId} data-signed={sign.done} data-ready={sign.ready}>
      <ol className="phr__tiles">{run.map((p) => <li key={p.n} className={`phr__tile phr__tile--${VERDICT_TONE[p.verdict]}`} data-testid={`${testId}-phase`} data-n={p.n} data-verdict={p.verdict}>
        <span className="ui-meta">{p.n} · {p.name}</span><b>{VERDICT_WORD[p.verdict]}</b><span className="ui-meta">{p.items.length ? `${p.pass} of ${p.items.length}` : '—'}</span></li>)}
        <li className={`phr__tile phr__tile--${sign.done ? (sign.ready ? 'ok' : 'warn') : 'muted'}`} data-testid={`${testId}-signoff`}><span className="ui-meta">Sign-off</span><b>{sign.done ? 'Signed off' : sign.ready ? 'Ready to sign' : 'Waiting'}</b><span className="ui-meta">{sign.done && sign.by ? `${who(sign.by)} · ${sign.at?.slice(0, 10)}` : `${sign.why.length} open point${sign.why.length === 1 ? '' : 's'}`}</span></li></ol>
      {run.map((p) => <details key={p.n} className="ln-dom" open={p.verdict === 'fail'}><summary><b>{p.n} · {p.name}</b> <span className="ui-meta">{p.q}</span> <Tag tone={VERDICT_TONE[p.verdict]}>{VERDICT_WORD[p.verdict]}</Tag></summary>
        <ul className="plain">{p.items.map((i) => <li key={i.id} data-testid={`${testId}-item`} data-result={i.result}><Tag tone={RESULT[i.result]!.tone}>{RESULT[i.result]!.word}</Tag> <b>{i.label}</b> <span className="ui-meta">{i.why}{i.by ? ` · ${who(i.by)}` : ''}{i.at ? ` · ${i.at.slice(0, 10)}` : ''}</span></li>)}</ul></details>)}
      {!sign.done && sign.why.length ? <p className="ui-meta" data-testid={`${testId}-waits`}>Sign-off waits for: {sign.why.join('; ')}.</p> : null}
      {sign.done && !sign.ready ? <p className="ui-meta" data-testid={`${testId}-waits`}>Signed off with open points: {sign.why.join('; ')}.</p> : null}
    </div>
  );
}
