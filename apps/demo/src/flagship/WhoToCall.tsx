/**
 * Who to call for this room (migration 0044, the support directory; founder, 18 Nov: "the teams outlook and copy contact info on
 * search party"). The approved support paths of the room's site, as the server holds them: for each domain the primary contact, a
 * backup who is someone else, the escalation contact, the vendor, the queue and the hours. Each contact offers the hand-offs the server
 * built from its channels — a Teams chat or call, an email in the viewer's own mail program, a call, the contact copied — each a link
 * into the viewer's own app. Nothing is sent from here and no meeting is booked; after a click the page says what was opened, never
 * that anything was delivered. Every name, address and number here is synthetic.
 */
import { useState } from 'react';
import { Card, Tag } from '@empathia/ui';

export interface ContactAction { id: string; label: string; href?: string; text?: string; note: string }
export interface DirContact { code: string; name: string; role: string; org: { code: string; name: string }; signsIn: boolean; verified: boolean; actions: ContactAction[] }
export interface SupportPath { code: string; domain: string; primary: DirContact | null; backup: DirContact | null; escalation: DirContact | null; vendor: { code: string; name: string } | null; queue: string | null; hours: string }
export interface Support { site: string; paths: SupportPath[]; uncovered: string[]; words: string }

const DOMAIN_WORDS: Record<string, string> = { audio: 'Audio', video: 'Video', network: 'Network', control: 'Control', av_infrastructure: 'AV infrastructure', power_ups: 'Power and UPS', lighting: 'Lighting', signage: 'Signage', conferencing: 'Conferencing', integration: 'Integration' };

export function ContactActions({ who, testId }: { who: DirContact; testId: string }) {
  const [said, setSaid] = useState<string | null>(null);
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setSaid('Copied.'); } catch { setSaid('Copying was refused by this browser: select the text below and copy it.'); } };
  return (
    <div className="wc__acts" data-testid={testId} data-contact={who.code}>
      {who.actions.map((a) => a.href
        ? <a key={a.id} className="ui-btn ui-btn--sm" href={a.href} target={a.href.startsWith('https:') ? '_blank' : undefined} rel="noreferrer" data-action={a.id} title={a.note}
            onClick={() => setSaid(`${a.label}: opened in your own app. Nothing was sent from here; what happens next is yours.`)}>{a.label}</a>
        : <button key={a.id} type="button" className="ui-btn ui-btn--sm" data-action={a.id} title={a.note} onClick={() => void copy(a.text || '')}>{a.label}</button>)}
      {said ? <p className="ui-meta" role="status" data-testid={`${testId}-said`}>{said}</p> : null}
    </div>
  );
}

function Person({ who, label, testId }: { who: DirContact | null; label: string; testId: string }) {
  if (!who) return null;
  return (
    <li className="wc__who" data-testid={testId} data-contact={who.code}>
      <span><span className="ui-muted">{label}</span> <b>{who.name}</b> <span className="ui-muted">· {who.role}, {who.org.name}</span>{' '}
        {who.verified ? <Tag tone="ok">verified</Tag> : <Tag tone="warn">not verified</Tag>}{who.signsIn ? null : <span className="ui-muted"> · does not sign in here</span>}</span>
      <ContactActions who={who} testId={`${testId}-actions`} />
    </li>
  );
}

export function WhoToCall({ support }: { support: Support | null }) {
  return (
    <Card icon="user" title="Who to call" sub={support ? `${support.paths.length} approved support path${support.paths.length === 1 ? '' : 's'} at ${support.site}` : 'Not readable as this person'} testId="fl-who-card">
      {support ? <>
        {support.paths.length ? <ul className="fl__list wc__paths" data-testid="fl-who-paths">{support.paths.map((p) => (
          <li key={p.code} data-domain={p.domain} data-path={p.code}>
            <p><b>{DOMAIN_WORDS[p.domain] || p.domain}</b> <span className="ui-muted">· {p.hours}{p.queue ? ` · queue ${p.queue}` : ''}{p.vendor ? ` · vendor ${p.vendor.name}` : ''}</span></p>
            <ul className="wc__people">
              <Person who={p.primary} label="Call first" testId={`fl-who-${p.domain}-primary`} />
              <Person who={p.backup} label="Backup" testId={`fl-who-${p.domain}-backup`} />
              <Person who={p.escalation} label="Escalation" testId={`fl-who-${p.domain}-escalation`} />
            </ul>
          </li>))}</ul> : <p data-testid="fl-who-none">{support.words}</p>}
        <p className="ui-meta">From the support directory: each path approved by a data steward who did not propose it, each contact verified by someone other than its recorder. Every name, address and number here is synthetic. Teams, email and call open your own apps; nothing is sent or booked from this page.</p>
      </> : <p className="ui-muted">The support directory could not be read.</p>}
    </Card>
  );
}
