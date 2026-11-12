# SIGNAL Season 1: generated footage

33 shots (vidIQ, minimax-h3, 768p, 8 s, 16:9), three per episode (two for S01E11) plus the Ten Seats fill loudspeaker aimed at the
ceiling, as the canon says. `shots.tsv` gives each shot's chapter, the canon item it opens on, and its note; `urls.tsv` the
generated file; `CHARACTER_BIBLE.md` the fixed descriptions repeated in every prompt. One prompt (the S01E09 "pass" shot, which
asked for a handshake) was refused by the provider and refunded; the shot was rewritten without it.

Cost: 33 x 120 = 3,960 credits, plus two composites (32 + 34). 12 Nov 2026.

The workspace cannot download from vidIQ, so the shots were joined into two composites for the founder to download:
- A (128 s; S01E00, E02-E05, then the E01 fill): https://assets.vidiq.com/compositions/e7ec6a97-bd7e-420a-ac60-5e9928295665/rbko18tnimfuoh5oh2wgpxjt.mp4
- B (136 s; S01E06-E11): https://assets.vidiq.com/compositions/e7ec6a97-bd7e-420a-ac60-5e9928295665/i6o9serm574emwshsupqvyps.mp4

`import-film.py composite.mp4 A|B` cuts a composite back into one muted clip per shot (order in `compose-A.json` / `compose-B.json`)
and `../build-takes.py` lists the clips that exist. Every clip is generated footage of a fictional setting and fictional people; the
scene labels it so. Each clip is reviewed before it is kept (founder's rule: never teach the wrong thing).

## Import, 12 Nov 2026, 13:56 CT

The founder attached seven of the eight voice takes (all but Priya's) and nine single shots. All seven takes were split (Theo's at
0.9 s: Ilya's breaks ran 1.0 to 1.9 s); one short line ("Better.", spoken quietly) was re-cut wider after the splitter clipped it,
and every split line was checked to be audible. Eight of the nine shots were reviewed frame by frame and kept. **Rejected:** the
S01E03 isolator shot. It shows a laptop power plug lying unplugged on the desk next to the isolator, in an episode whose point is that
the safety earth is never touched: footage that could suggest the wrong fix is worse than none. It was regenerated with no power
cords in frame (120 credits).

The remaining 25 shots, the new isolator shot first among them, are joined in one composite (200 s, order in `compose-C.json`):
https://assets.vidiq.com/compositions/e7ec6a97-bd7e-420a-ac60-5e9928295665/b335dds66mbmbfzvceij87sl.mp4

## Import, 12 Nov 2026, 14:05 CT

The founder attached composites A and B, the new isolator shot, and Priya's take. Priya's take is quieter than the others (about
-37 LUFS) and Vicki paused inside "No, pancakes are not a network protocol. Sorry. Go on. … Which switch?", so it was cut by hand at its
three measured two-second pauses and brought to -18 LUFS. All 25 remaining shots were reviewed frame by frame; 23 kept, two rejected:

- **S01E10 "read before you touch"**: Maya's fingers rest on the console faders, in the scene whose lesson is to read before you touch.
- **S01E01 centre fill**: the loudspeaker sits upright facing the seats and the camera then tilts to the ceiling; the canon's point is
  that the loudspeaker itself is aimed at the ceiling, and this shot does not show that.

Both were regenerated with the point stated outright (hands clasped behind her back; the grille facing the ceiling at about 45
degrees), 240 credits. Season 1 now has 31 reviewed shots in place.
