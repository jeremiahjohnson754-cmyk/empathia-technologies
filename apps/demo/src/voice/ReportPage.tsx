/**
 * #/voice/report/<room> — "Report a calling problem" (J6B-VOICE step 1), made for a phone held in the room. The report becomes a real
 * ServiceHands incident in the demonstration workspace (workspace/store.raiseIncident: the service engine decides whether this
 * perspective may raise one, and a refusal is shown as a refusal). The reporter gets a receipt and sees only their own reports from
 * this browser: no call path, no session, nobody else's report. Opening a room this way proves nothing about being in it.
 */
import { useState } from 'react';
import { PageHero, Button, Notice, Field } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { ROLES, canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { fullName, roomById, roomHref } from '../campus/canon.js';
import { useWorkspace, isRefusal } from '../workspace/useWorkspace.js';
import * as S from '../workspace/store.js';
import { holds, personaOf } from '../hardening/kit.js';
import { SYMPTOMS, loadReports, saveReport, type VoiceReport } from './model.js';

export default function ReportPage({ role, params }: PageProps) {
  const room = roomById(params['room'] || ''); const { apply } = useWorkspace();
  const [symptom, setSymptom] = useState<string>(SYMPTOMS[0]); const [note, setNote] = useState(''); const [done, setDone] = useState<VoiceReport | null>(null); const [refused, setRefused] = useState<string[] | null>(null);
  const [mine, setMine] = useState<VoiceReport[]>(() => loadReports().filter((r) => r.by === role));
  const opens = (h: string) => { const r = resolve(h); return !!r && canOpen(role, r); };
  if (!room) return (<><PageHero eyebrow="VOICE" title="This room is not in the estate" lede="The address names a room the demonstration does not hold." product="pro" icon="network" /><Notice tone="warn"><a href="#/campus">Choose a room on the campus</a></Notice></>);
  const submit = () => {
    // raised with the role's own persona when it may raise a job, otherwise as a requestor, exactly as “In this room” does (here/store.ts)
    const persona = personaOf(role); const by = ['request.submit', 'service.triage', 'work.evidence'].some((a) => holds(persona, a)) ? persona : 'requestor';
    const out = apply((w) => S.raiseIncident(w, by, { roomId: room.id, roomName: fullName(room), buildingKey: room.building, title: `Calling problem: ${symptom.toLowerCase()}`, summary: `${note.trim() ? `${note.trim()} ` : ''}Reported from the room’s calling page by the ${ROLES[role].label}. Voice-quality evidence, if any, is in the room’s CallPath.` }));
    if (isRefusal(out)) { setRefused(out.why); return; }
    const rec = saveReport({ roomId: room.id, by: role, symptom, note: note.trim(), incidentId: (out as { id: string }).id });
    setRefused(null); setDone(rec); setMine(loadReports().filter((r) => r.by === role));
  };
  return (<div className="vc vc--report" data-testid="voice-report">
    <PageHero eyebrow="VOICE · report from the room" title="Report a calling problem" compact product="pro" icon="network" lede={<>For <a href={roomHref(room)}>{fullName(room)}</a>. Say what happened; the people who look after calling see it with the room attached.</>} />
    {done ? <Notice tone="ok"><span data-testid="voice-receipt"><b>Recorded.</b> Report {done.id}, job {done.incidentId}, {done.at.slice(0, 16).replace('T', ' ')} UTC. Kept in this browser (demonstration).</span></Notice> : null}
    {refused ? <Notice tone="bad"><span data-testid="voice-refused"><b>Not recorded.</b> {refused.join('; ')}</span></Notice> : null}
    {!done ? <form className="vc-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <fieldset className="vc-symptoms"><legend>What happened</legend>{SYMPTOMS.map((s) => <label key={s} className="vc-choice"><input type="radio" name="symptom" value={s} checked={symptom === s} onChange={() => setSymptom(s)} /> <span>{s}</span></label>)}</fieldset>
      <Field label="Anything else (optional)" hint="Do not write names, numbers or what was said on the call.">{(fid, described) => <textarea id={fid} aria-describedby={described} rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
      <Button kind="primary" type="submit" testId="voice-submit">Send the report</Button>
    </form> : null}
    <section className="vc-sec" aria-labelledby="vc-mine-h"><h2 id="vc-mine-h">Your reports from this browser</h2>
      {mine.length ? <ul className="vc-next" data-testid="voice-mine">{mine.map((r) => <li key={r.id}><b>{r.id}</b> · {r.symptom} · {roomById(r.roomId) ? fullName(roomById(r.roomId)!) : r.roomId} · job {r.incidentId}{opens('#/servicehands') ? <> · <a href="#/servicehands">open in ServiceHands</a></> : null}</li>)}</ul> : <p className="ui-muted">None yet.</p>}
      {opens(`#/voice/callpath/${room.id}`) ? <p><a href={`#/voice/callpath/${room.id}`} data-testid="voice-report-to-callpath">Open this room’s CallPath</a></p> : <p className="ui-muted">How the call travelled is read by the people who administer calling, not from this page.</p>}
    </section>
  </div>);
}
