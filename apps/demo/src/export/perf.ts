/** The device performance report: what the performance check measured on one device (play/perf.ts), as one Report for the six files.
 *  Every figure comes from the result; the lines that say what the result is and is not travel with it into every file. */
import type { Report } from './model.js';
import type { MadeBy } from './cx.js';
import { HONESTY, IDEAL, LADDER, SCENES, TARGET, headline, largestHeld, memoryWords, standing, type PerfResult } from '../play/perf.js';

const word = { held: 'held', below: 'below', 'not run': 'not run' } as const;
const n = (x: number | null | undefined) => (x == null ? '—' : x.toLocaleString('en-US'));
export function performanceReport(r: PerfResult, by: MadeBy): Report {
  const t = largestHeld(r.ladder, TARGET); const d = r.device; const ran = r.ladder.filter((s) => s.pace).length;
  return {
    schema: 'empathia.report/1', id: `PERF-${r.at.slice(0, 19).replace(/[-:T]/g, '')}`, kind: 'device-performance', title: 'Device performance check', subtitle: `${d.renderer || 'renderer not reported'} · ${d.screen} at ${d.pixelRatio}×`,
    scope: { tenant: '—', site: '—', building: '—', floor: '—', room: 'This device', roomId: '' },
    status: r.interrupted ? { label: 'Interrupted', tone: 'warn', why: r.interrupted } : t === null ? { label: `Did not hold ${TARGET} frames a second`, tone: 'warn', why: 'in the synthetic environment, at any size tried' } : { label: `Held ${TARGET} frames a second up to ${n(t)} triangles`, tone: 'ok', why: 'in the synthetic environment, on this run' },
    generatedAt: by.at, role: by.role, build: by.build, primary: 'Synthetic environment',
    provenance: [...HONESTY, ...(r.short ? ['A short run (the address asked for it): each step was measured for under a second. Use a full run for a figure to rely on.'] : []), `Made as ${by.role}: a perspective, which grants no permission.`],
    headline: headline(r),
    kpis: [{ label: `Held ${TARGET} fps up to`, value: t === null ? 'none' : `${n(t)} triangles`, note: 'synthetic environment' }, { label: `Held ${IDEAL} fps up to`, value: largestHeld(r.ladder, IDEAL) === null ? 'none' : `${n(largestHeld(r.ladder, IDEAL))} triangles` }, { label: 'Sizes measured', value: `${ran} of ${LADDER.length}` }, { label: 'Scenes measured', value: `${r.scenes.filter((s) => s.pace).length} of ${SCENES.length}` }],
    // only the sizes that were measured are charted: a size not run has no pace, and is not a pace of nought
    ...(ran ? { chart: { title: 'Frames a second by size of the synthetic environment (sizes measured)', categories: r.ladder.filter((s) => s.pace).map((s) => n(s.triangles)), series: [{ name: 'Frames a second', tone: 'info' as const, values: r.ladder.filter((s) => s.pace).map((s) => s.pace!.fps) }] } } : {}),
    sections: [
      { id: 'device', heading: 'The device, as its browser reports it', facts: [['Processor threads', d.cores == null ? 'not reported' : String(d.cores)], ['Memory', memoryWords(d.memoryGb)], ['Screen', `${d.screen} at ${d.pixelRatio}×`], ['Graphics', d.renderer || 'not reported'], ['Browser', d.browser], ['Touch', d.touch ? 'yes' : 'no'], ['Asks for reduced motion', d.reducedMotion ? 'yes' : 'no'], ['Picture measured', r.canvas ? `${r.canvas.cssWidth} × ${r.canvas.cssHeight} on the page, ${r.canvas.width} × ${r.canvas.height} drawn` : 'nothing was drawn']] },
      { id: 'ladder', heading: 'A larger and larger environment', text: ['The check draws the same block of plain towers once, then twice, up to thirty-two times, at full quality with nothing simplified, and stops going larger once a size is too slow. It shows how much this device can draw before the pace falls. The count is of the towers; the ground and sky add a few hundred triangles.'],
        table: { title: 'Synthetic environment', cols: [{ key: 'tri', label: 'Triangles a frame', kind: 'number' }, { key: 'fps', label: 'Frames a second', kind: 'number' }, { key: 'med', label: 'Usual frame (ms)', kind: 'number' }, { key: 'p95', label: 'Slow frame, 1 in 20 (ms)', kind: 'number' }, { key: 'worst', label: 'Slowest frame (ms)', kind: 'number' }, { key: 't', label: `Against ${TARGET}`, kind: 'status' }, { key: 'i', label: `Against ${IDEAL}`, kind: 'status' }, { key: 'note', label: 'Note' }],
          rows: r.ladder.map((s) => ({ tri: s.triangles, fps: s.pace?.fps ?? null, med: s.pace?.medianMs ?? null, p95: s.pace?.p95Ms ?? null, worst: s.pace?.worstMs ?? null, t: word[standing(s, TARGET)], i: word[standing(s, IDEAL)], note: s.skipped || '' })) } },
      { id: 'scenes', heading: 'The three scenes, as a visitor meets them', text: ['Each scene is opened at the size its own page gives it and left to run as it does for a visitor: it may draw fewer pixels, or draw distant figures more simply, to keep its pace, and the table says when it did. The pace is of the second half of its time, after it has settled. The time to the first frame includes downloading the scene if this browser did not already hold it.'],
        table: { title: 'Scenes', cols: [{ key: 'scene', label: 'Scene' }, { key: 'first', label: 'To the first frame (ms)', kind: 'number' }, { key: 'fps', label: 'Frames a second', kind: 'number' }, { key: 'p95', label: 'Slow frame, 1 in 20 (ms)', kind: 'number' }, { key: 'worst', label: 'Slowest frame (ms)', kind: 'number' }, { key: 'detail', label: 'Drawn at' }, { key: 'far', label: 'Distant figures' }, { key: 'tri', label: 'Triangles a frame', kind: 'number' }, { key: 'pic', label: 'Picture' }, { key: 'note', label: 'Note' }],
          rows: r.scenes.map((s) => ({ scene: s.title, first: s.firstFrameMs, fps: s.pace?.fps ?? null, p95: s.pace?.p95Ms ?? null, worst: s.pace?.worstMs ?? null, detail: s.detail == null ? '—' : `${s.detail}%`, far: s.simple == null ? '—' : s.simple ? 'drawn simply' : 'whole', tri: s.triangles, pic: s.picture ? `${s.picture.cssWidth} × ${s.picture.cssHeight} on the page, ${s.picture.width} × ${s.picture.height} drawn` : '—', note: s.note || '' })) } },
      { id: 'memory', heading: 'Memory', text: ['JavaScript memory as this browser reports it. Many browsers report none. It is not the memory the graphics use.'],
        table: { title: 'Memory', cols: [{ key: 'when', label: 'When' }, { key: 'mb', label: 'In use (MB)', kind: 'number' }], rows: r.memory.map((m) => ({ when: m.when, mb: m.usedMb })), note: r.memory.every((m) => m.usedMb == null) ? 'This browser reports no memory figure.' : undefined } },
    ],
    dossier: { result: r as unknown as Record<string, unknown>, targets: { interactive: TARGET, ideal: IDEAL } },
  };
}
