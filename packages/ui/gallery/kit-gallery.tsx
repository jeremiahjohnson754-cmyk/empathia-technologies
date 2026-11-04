/**
 * The kit section of the gallery (packages/ui/src/kit.tsx): every kit component in its states, both themes, synthetic figures computed
 * here from a small record set so the page follows the data rule (values from data, never typed into the markup).
 */
import { useState } from 'react';
import {
  PageHero, Card, Panel, TagChip, StatTile, ScoreRing, Donut, Sparkline, ProgressBar, Chip, StatusDot, Segmented, KitTabs, TabPanel, List, ListRow,
  EmptyState, ToastProvider, useToast, MeterRow, Icon, ICON_NAMES, DataTable, Button, type HealthState, type Column,
} from '@empathia/ui';

// a synthetic campus: five buildings, each with rooms and a measured health score
const BUILDINGS = [
  { id: 'atl', name: 'Atlas', rooms: 42, health: [82, 84, 85, 86, 88, 87], open: 3 },
  { id: 'brk', name: 'Birch Hall', rooms: 28, health: [91, 92, 90, 93, 94, 94], open: 1 },
  { id: 'cdr', name: 'Cedar Lab', rooms: 19, health: [76, 74, 73, 71, 72, 70], open: 6 },
  { id: 'dlt', name: 'Delta Commons', rooms: 33, health: [68, 66, 64, 63, 61, 62], open: 9 },
  { id: 'elm', name: 'Elm Annex', rooms: 12, health: [88, 89, 90, 90, 91, 92], open: 0 },
];
const last = (a: number[]) => a[a.length - 1]!;
const ISSUES = [{ k: 'display', label: 'Display', n: 7, tone: 'mission-control' as const }, { k: 'audio', label: 'Audio', n: 5, tone: 'servicehands' as const }, { k: 'network', label: 'Network', n: 4, tone: 'commissioning' as const }, { k: 'control', label: 'Control', n: 3, tone: 'pro' as const }];

export function KitGallery() {
  return <ToastProvider><Inner /></ToastProvider>;
}
function Inner() {
  const toast = useToast();
  const [seg, setSeg] = useState<'week' | 'month' | 'quarter'>('week');
  const [tab, setTab] = useState('overview');
  const [fav, setFav] = useState(false);
  const rooms = BUILDINGS.reduce((a, b) => a + b.rooms, 0);
  const weighted = Math.round(BUILDINGS.reduce((a, b) => a + last(b.health) * b.rooms, 0) / rooms);
  const prev = Math.round(BUILDINGS.reduce((a, b) => a + b.health[b.health.length - 2]! * b.rooms, 0) / rooms);
  const open = BUILDINGS.reduce((a, b) => a + b.open, 0);
  const series = BUILDINGS[0]!.health.map((_, i) => Math.round(BUILDINGS.reduce((a, b) => a + b.health[i]! * b.rooms, 0) / rooms));
  const cols: Column<typeof BUILDINGS[number]>[] = [
    { key: 'name', header: 'Building', render: (b) => <b>{b.name}</b>, sort: (b) => b.name },
    { key: 'rooms', header: 'Rooms', render: (b) => b.rooms, sort: (b) => b.rooms, align: 'right' },
    { key: 'health', header: 'Health', render: (b) => last(b.health), sort: (b) => last(b.health), align: 'right' },
    { key: 'open', header: 'Open issues', render: (b) => b.open, sort: (b) => b.open, align: 'right', minor: true },
  ];
  const band = (s: number): HealthState => (s >= 85 ? 'healthy' : s >= 70 ? 'monitor' : 'action');
  return (
    <div className="g-kit">
      <PageHero eyebrow="Mission Control · Living Campus" icon="campus" title="Five buildings, one picture of health" lede="Every figure on this card is computed from the synthetic records above it: rooms weight each building's score."
        meta={[<Chip key="s" tone="warn" small icon="info">Synthetic data</Chip>, <Chip key="r" small icon="building">{BUILDINGS.length} buildings · {rooms} rooms</Chip>, <StatusDot key="d" state="modelled" />]}
        actions={<><Button kind="primary">Open the campus</Button><Button>Brief me</Button></>}
        aside={<ScoreRing value={weighted} label="Campus health" caption={`${weighted - prev >= 0 ? '+' : '−'}${Math.abs(weighted - prev)} since last week`} />} />
      <div className="kit-grid kit-grid--tiles">
        <StatTile label="Campus health" value={weighted} unit="/100" icon="pulse" delta={{ value: weighted - prev, good: 'up', label: 'vs last week' }} spark={series} />
        <StatTile label="Open issues" value={open} icon="alert" tone="warn" delta={{ value: 2, good: 'down', label: 'this week' }} />
        <StatTile label="Rooms" value={rooms} icon="room" tone="lite" hint="across five buildings" href="#kit" />
        <StatTile label="Uptime" value={null} unit="%" icon="clock" hint="no collector reporting" />
      </div>
      <div className="kit-grid g-kit-row">
        <Card title="Issues by class" sub="open, this week" icon="chart" tone="mission-control" action={<Segmented small label="Period" value={seg} onChange={setSeg} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'quarter', label: 'Quarter' }]} />}>
          <Donut label="Open issues by equipment class" total="open" segments={ISSUES.map((x) => ({ key: x.k, label: x.label, value: x.n, tone: x.tone }))} />
        </Card>
        <Card title="Building health" sub="score out of 100, weighted by rooms" icon="building" footer="Bands: 85+ healthy · 70+ monitor · under 70 action needed">
          <ul className="kit-meters">{BUILDINGS.map((b) => <MeterRow key={b.id} label={b.name} sub={`${b.rooms} rooms · ${b.open} open`} value={last(b.health)} href="#kit" />)}</ul>
        </Card>
        <Card title="Readiness" icon="check" tone="learn">
          <div className="g-stack">
            <ProgressBar label="Commissioning evidence" value={36} max={48} valueText="36 of 48" tone="commissioning" />
            <ProgressBar label="Competencies signed off" value={7} max={12} valueText="7 of 12" tone="learn" />
            <ProgressBar label="Rooms baselined" value={rooms - open} max={rooms} tone="ok" small />
          </div>
        </Card>
      </div>
      <div className="kit-grid g-kit-row">
        <Card title="Recent rooms" icon="room" pad={false} action={<Chip onClick={() => setFav(!fav)} selected={fav} icon="spark" small>Favourites</Chip>}>
          <List label="Recent rooms">{BUILDINGS.slice(0, 4).map((b, i) => <ListRow key={b.id} href="#kit" title={`${b.name} ${i + 1}.2${i}8`} sub={`${b.name} · floor ${i + 1}`} leading={<StatusDot state={band(last(b.health))} hideLabel />} trailing={<Sparkline values={b.health} label={`${b.name} health`} width={64} height={20} area={false} tone={band(last(b.health)) === 'healthy' ? 'ok' : band(last(b.health)) === 'monitor' ? 'warn' : 'bad'} />} />)}</List>
        </Card>
        <Card title="Tabs and states" icon="layers">
          <KitTabs idBase="g-kit" label="Room views" active={tab} onChange={setTab} tabs={[{ key: 'overview', label: 'Overview', icon: 'eye' }, { key: 'devices', label: 'Devices', count: 14 }, { key: 'issues', label: 'Issues', count: 0 }]} />
          <TabPanel idBase="g-kit" tab={tab}>{tab === 'issues' ? <EmptyState title="No open issues" icon="check" tone="ok">Nothing is waiting on a person in this room.</EmptyState> : <div className="g-chips">{(['healthy', 'monitor', 'action', 'modelled', 'offline'] as HealthState[]).map((s) => <StatusDot key={s} state={s} />)}<Chip tone="accent">Selected</Chip><Chip tone="search-party">Search Party</Chip><Chip tone="bad" icon="alert">Blocked</Chip><TagChip kind="status" state="monitor">Monitor</TagChip><TagChip kind="room">Atlas 4.218</TagChip><TagChip kind="building">Atlas HQ</TagChip><TagChip kind="device" category="camera">Cam 1</TagChip><TagChip kind="device" category="micceil">Mic array</TagChip><TagChip kind="device" category="switch">SW-ATL-4A</TagChip></div>}</TabPanel>
        </Card>
        <Panel raised>
          <p className="g-note">Toast with Undo (pauses on hover or focus, Escape dismisses)</p>
          <Button onClick={() => toast({ message: 'Ticket ST-204 archived.', undo: () => toast({ message: 'Ticket ST-204 restored.', tone: 'ok' }) })}>Archive a ticket</Button>
        </Panel>
      </div>
      <Card title="Buildings" sub="responsive table: stacks into labelled cards under 640 px" icon="grid">
        <DataTable responsive rows={BUILDINGS} columns={cols} rowKey={(b) => b.id} caption="Buildings" />
      </Card>
      <Card title={`Icons (${ICON_NAMES.length})`} sub="24 grid · 1.75 stroke · currentColor" icon="spark">
        <ul className="g-icons">{ICON_NAMES.map((n) => <li key={n}><Icon name={n} size={22} /><span>{n}</span></li>)}</ul>
      </Card>
    </div>
  );
}
