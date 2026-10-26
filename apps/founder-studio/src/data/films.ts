/**
 * The curated film library: the 36 finished films the founder received on 2026-10-26, by file name.
 * Resolution, duration, hash and rights are NOT typed here: the studio build joins each file name to
 * media/manifests/MEDIA_MANIFEST.json (ffprobe on the actual file + the media-rights ledger by hash). A film whose file is not
 * found in the manifest is shown as NOT_RENDERED / NOT FOUND, never as available.
 */
export interface FilmEntry {
  key: string;
  file: string;
  title: string;
  series: 'Flagship' | 'Investor films' | 'V1.4.1 campaign' | 'Field Intelligence' | 'Empathia 2:00' | 'Campaign 2026-10-10' | 'Collaboro-Sing' | 'Social shorts';
  about: string;
}

const S = (n: string, hook: string): FilmEntry => ({
  key: `S${n}`, file: `Empathia_V141_S${n}_9x16_1080x1920_captioned.mp4`, title: `S${n} · ${hook}`, series: 'Social shorts',
  about: 'Vertical social short (9:16, captioned) from the V1.4.1 campaign; a square 1:1 version exists in the masters.',
});

export const FILMS: FilmEntry[] = [
  { key: 'FL', file: 'Empathia_V25_FL_16x9_3840x2160_captioned.mp4', title: 'The flagship film (4:18)', series: 'Flagship', about: 'The full cinematic walk through the V2.5 platform and Field Intelligence, mastered in 4K.' },
  { key: 'FT', file: 'Empathia_V25_FT_16x9_3840x2160_captioned.mp4', title: 'Flagship teaser (0:15)', series: 'Flagship', about: 'The 15-second teaser cut from the flagship film, 4K.' },
  { key: 'FA', file: 'Empathia_V25_FA_16x9_1920x1080_captioned.mp4', title: 'Film A — The Platform Vision (2:00)', series: 'Investor films', about: 'The platform vision for investors.' },
  { key: 'FB', file: 'Empathia_V25_FB_16x9_1920x1080_captioned.mp4', title: 'Film B — Intelligence Becomes Experience (1:30)', series: 'Investor films', about: 'How evidence and intelligence turn into the experience people have in a room.' },
  { key: 'F01', file: 'Empathia_V141_F01_16x9_1920x1080_captioned.mp4', title: 'F01 — The Living System', series: 'V1.4.1 campaign', about: 'The V1.4.1 demonstrator walkthrough: the whole connected estate.' },
  { key: 'F02', file: 'Empathia_V141_F02_16x9_1920x1080_captioned.mp4', title: 'F02 — One System (executive)', series: 'V1.4.1 campaign', about: 'The executive cut: one system across the products.' },
  { key: 'F03', file: 'Empathia_V141_F03_16x9_1920x1080_captioned.mp4', title: 'F03 — Empathia in Action', series: 'V1.4.1 campaign', about: 'Hands-on workflows in the V1.4.1 demonstrator.' },
  { key: 'IE', file: 'IE-film-4k-captioned.mp4', title: 'Field Intelligence film (4K)', series: 'Field Intelligence', about: 'Field Intelligence: authorized discovery and safe measurement planning.' },
  { key: 'IE-trailer', file: 'IE-trailer60-16x9.mp4', title: 'Field Intelligence trailer (0:60)', series: 'Field Intelligence', about: '60-second trailer.' },
  { key: 'IE-teaser', file: 'IE-teaser30-16x9.mp4', title: 'Field Intelligence teaser (0:30)', series: 'Field Intelligence', about: '30-second teaser.' },
  { key: 'M2', file: 'Empathia_Master_2m00_1080p_captioned.mp4', title: 'Empathia — the 2:00 master', series: 'Empathia 2:00', about: 'The original two-minute Empathia film.' },
  { key: 'M60', file: 'Empathia_Executive_60s_1080p.mp4', title: 'Empathia — executive cut (0:60)', series: 'Empathia 2:00', about: 'Sixty-second executive cut.' },
  { key: 'M30', file: 'Empathia_Social_30s_1080p_voice_captions.mp4', title: 'Empathia — social cut (0:30)', series: 'Empathia 2:00', about: 'Thirty-second social cut.' },
  { key: 'M15', file: 'Empathia_Teaser_15s_1080p_voice.mp4', title: 'Empathia — teaser (0:15)', series: 'Empathia 2:00', about: 'Fifteen-second teaser.' },
  { key: 'F02P', file: 'Empathia_F02_The-Living-System_3m00_1080p_captioned.mp4', title: 'The Living System (3:00)', series: 'Campaign 2026-10-10', about: 'Campaign film "The Living System".' },
  { key: 'F04', file: 'Empathia_F04_What-If-Your-Environment-Could-Explain-Itself_2m00_1080p_captioned.mp4', title: 'What If Your Environment Could Explain Itself? (2:00)', series: 'Campaign 2026-10-10', about: 'Campaign film F04.' },
  { key: 'SyncLab', file: 'Collabora-sing-SyncLab-From-Hypothesis-to-Evidence-1080p.mp4', title: 'SyncLab — From Hypothesis to Evidence', series: 'Collaboro-Sing', about: 'The Collaboro-Sing SyncLab explainer.' },
  S('01', 'Start with a building. Find everything connected.'),
  S('02', 'Don’t browse blindly. Ask where to look.'),
  S('03', 'An inventory isn’t an operating model.'),
  S('04', 'Replace a device. Keep its history.'),
  S('05', 'A room isn’t ready because someone says so.'),
  S('06', 'Reachable doesn’t mean working.'),
  S('07', 'See the room before you change the room.'),
  S('08', 'A projection should show its math.'),
  S('09', 'When remote evidence ends, field work begins.'),
  S('10', 'Not every critical space is a meeting room.'),
  S('11', 'Engineering knowledge shouldn’t disappear.'),
  S('12', 'Six screens shouldn’t mean six versions of the truth.'),
  S('13', 'Let the AI draft. You decide.'),
  S('14', 'A visitor shouldn’t need directions.'),
  S('15', 'Follow one issue to the room it lives in.'),
  S('16', 'Watch a room’s whole life.'),
  S('17', 'Who answers after hours?'),
  S('18', 'Who actually knows how?'),
  S('19', 'Hear what one EQ band does.'),
];
