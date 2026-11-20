# SIGNAL story mode as a cinematic interactive game — design, v0.1 (9 November 2026)

Status: **DESIGN. Nothing in this document is built.** What is built today is the panel reader at `#/story` (the founder's canon,
unchanged, with gating decisions that can fail). This design turns story mode into played scenes: moving pictures, voices, choices
that carry, things to find and pick up. The panel reader stays as the accessible, low-data way to read the same story.

## The three layers, kept apart

| Layer | What it is | Rule |
|---|---|---|
| **Canon** | `packages/signal-canon`: the founder's text, art and decisions | Never edited. Hash-tested |
| **Director's Cut** | A script layer over the canon: tightened narration, added beats, staging, performance notes | Its own identifiers (`DC-…`), a line-by-line diff against the canon, and the founder's approval per episode. Where it adds a scene, the scene is marked as added |
| **Performance** | Voices, moving pictures, sound, music, hotspots | Says exactly what the approved script says. A take that differs from the script is rejected |

## How a scene plays

A scene is a timeline of **shots**. A shot is either drawn live by the player from the canon's own art (figures, props, backgrounds,
with camera moves, lighting and depth) or a pre-rendered video clip. Either way the interaction sits in the same frame:

- **Speak.** Lines play in the character's voice with captions. The reader can pause, replay a line, or read ahead.
- **Choose.** Dialogue and decision moments appear over the picture, with the canon's clock. The canon already defines the options,
  what fails and why, the hints and what each choice does to trust.
- **Look and take.** Hotspots are regions of the frame, active for a stretch of time. Hover or focus shows a label; click or Enter
  inspects; some things can be picked up. The canon's 250 discoveries become things found this way, and props become evidence.
- **Remember.** Choices, trust, what was found and what is carried are kept and can change later scenes: a line said differently,
  a hint available, a person who helps or does not. A recap at the end of each chapter shows what was done and what it changed.
- **Fail and recover.** A failed decision plays its consequence and returns to a checkpoint, as the canon's failures already do.

## The interaction contract (what the code will hold)

```
Scene    { id, chapter, shots[], music?, ambience? }
Shot     { id, kind: 'live' | 'clip', duration, art | clipUrl, camera?, lines[], hotspots[], choice? }
Line     { id, who, voice, text, audioUrl, start, end, captions }
Hotspot  { id, from, to, region (normalised x, y, w, h), label, action: 'inspect' | 'take' | 'talk', gives?: itemId, discovery?: id }
Item     { id, name, description, usedIn[]  }
Choice   { decisionId (canon), at, options → next shot | consequence shot }
Save     { chapter, shot, time, choices, trust, inventory[], found[] }
```

Every hotspot is reachable by keyboard and has a text label; every line has a caption; motion can be reduced; the whole scene has
a transcript. Clips are fetched one shot ahead, never bundled.

## Tone, and the lines that are not crossed

Harder, tenser and funnier than the panels: real stakes for the people the systems serve, countdowns that mean something, Maya
failing in front of people and carrying it. Danger is what is at stake, never a set of instructions. The canon's own rules bind every
scene: no real brands; the electrician owns power, the rigger owns what is overhead, the network owner owns the network; nobody is
shown defeating a protective earth, standing under a moving load or climbing in a storm.

## What it costs, and what I cannot check from here

- **Voices.** Stock voices, one per character (see `CASTING_SHEET.md`). The first episode has 62 spoken lines.
- **Generated video.** The connector prices generation by the second. The account holds 6,418 credits this month. A first test clip
  will give the exact rate; until then no per-episode figure is claimed. The canon has 1,610 panels: if every one became a
  generated clip the spend would be far beyond one month's credits, so the plan is drawn-live shots for most of a scene and
  generated clips for the moments that earn them.
- **Checking pictures and sound.** This workspace's network does not let me download a generated file, so I cannot watch or hear
  one. I can read a file's length, size and streams, and I can have speech transcribed back and compared with the script. Anything
  that needs eyes or ears is marked NOT RUN until a person watches it, or until the workspace network is allowed to reach the media
  hosts.

## Order of work

1. This contract as code, with tests (hotspots by time, inventory, carried choices, save and resume).
2. Voice tests for the core cast; the founder chooses.
3. S01E00 "Signal" as one fully played episode: Director's Cut script with its diff, voices, live shots from the canon art,
   two or three generated clips for the cold open and the turn, hotspots, items, recap.
4. The QC record and a written critic's review for that episode; the founder watches it.
5. Only then the rest, season by season, with the cost of each episode reported as it is made.
