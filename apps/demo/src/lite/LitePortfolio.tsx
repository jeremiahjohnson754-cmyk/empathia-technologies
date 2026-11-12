/**
 * #/lite/optimize — Portfolio Optimize (V2.5.3, restored 12 Nov 2026): every room whose proposed state changes something, ranked by the
 * size of its best small move per device added, with how certain the model is. Modeled from the rooms' records and the coverage model;
 * a proposal changes nothing until it is approved, re-commissioned and accepted.
 */
import { useMemo } from 'react';
import { PageHero, Chip, Card } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { campusRecords } from '../campus/design.js';
import { buildingByKey } from '../campus/canon.js';
import { portfolio, liteRoomHref } from './model.js';
import { LiteNav } from './LiteApp.js';

export function LitePortfolio({ role }: PageProps) {
  const rows = useMemo(() => portfolio(campusRecords()), []);
  return <section className="lt-page" data-testid="lite-portfolio">
    <LiteNav here="optimize" role={role} />
    <PageHero product="lite" icon="chart" compact eyebrow="Lite · Portfolio Optimize" title="Where a small move helps most" lede="Every room whose proposed state would change something, ranked by the seats it gains per device added. The best move is the proposal’s own: a device where the coverage model finds a gap, or furniture back where commissioning proved it."
      meta={[<Chip key="m" small tone="muted">Modeled · not measured</Chip>, <Chip key="c" small tone="muted">Class templates · spec to verify</Chip>, <Chip key="n" small tone="info">{rows.length} rooms</Chip>]} />
    <Card title="Ranked by seats gained per device" icon="chart" testId="lite-portfolio-table">
      <div className="table-wrap"><table className="lt-table"><caption className="ui-sr">Rooms ranked by the modeled gain of their proposed state</caption>
        <thead><tr><th scope="col">#</th><th scope="col">Room</th><th scope="col">The move</th><th scope="col">Seats a camera frames</th><th scope="col">Microphone pickup</th><th scope="col">Per device</th><th scope="col">Certainty</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r.id} data-room={r.id}><td className="num">{i + 1}</td><th scope="row"><a href={`${liteRoomHref(r.id)}?mode=optimize&state=proposed`}>{r.name}</a><div className="ui-meta">{buildingByKey(r.building)?.name || r.building}</div></th>
          <td>{r.move}{r.added ? <span className="ui-meta"> · {r.added} added</span> : null}</td><td className="num">{r.camera[0]} → {r.camera[1]}</td><td className="num">{r.mic[0]} → {r.mic[1]}</td><td className="num"><b>{r.perDevice}</b></td><td className="ui-meta">{r.certainty}</td></tr>)}</tbody></table></div>
      <p className="ui-meta">“Per device” is the seats gained in camera framing and microphone pickup, added together and divided by the devices the move adds (a move that adds none counts its gain once). It ranks where to look first; it is not a score of the room, and every figure is the model’s, not a measurement.</p>
    </Card>
  </section>;
}
