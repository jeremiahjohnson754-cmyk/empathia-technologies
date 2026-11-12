# Voice production plan, Seasons 1–6 (measured from the canon, 12 Nov 2026)

Dialogue characters (speech bubbles and beat lines) in the frozen canon, by season and main speaker:

| Season | Chapters | Characters of dialogue | Main speakers (characters of dialogue) |
|---|---|---|---|
| 1 The Sanctuary | 12 | 23,240 | Maya 6,841 · Ray 5,282 · Imani 1,420 · Theo 1,050 · Lily 869 |
| 2 The Load-In | 11 | 20,974 | Maya 6,110 · Ben 2,603 · Dante 2,027 · Leah 1,758 · Jordan 1,650 |
| 3 The Workplace | 11 | 26,931 | Maya 7,522 · Sam 5,974 · Mei 2,169 · Priya 1,701 · Nora 1,590 |
| 4 On Air | 11 | 15,856 | Maya 4,826 · Tess 2,193 · Vera 1,278 · Cal 903 · Lena 799 |
| 5 The Campus | 11 | 11,831 | Maya 4,224 · Wes 1,771 · Nadia 1,428 · Farah 990 · Tomas 772 |
| 6 The Drawing Set | 11 | 8,513 | Maya 2,456 · Anselm 2,173 · Kit 886 · Priya 840 · Farah 480 |
| **1–6** | **67** | **107,345** | Maya 31,979 · Ray 6,568 · Sam 6,345 · Priya 4,323 · … about 70 speakers |

- ElevenLabs bills about one credit per character on `eleven_multilingual_v2`: **about 107,000 credits** for every line of Seasons 1–6,
  one take each (more with retakes). That is more than one month of the current plan's credits: **spending beyond the plan is the
  founder's decision**, and nothing beyond it is started.
- **Casting:** two voices are locked (Maya, Ray). About seventy other speaking characters need voices; the canon fixes none of their
  accents or ages. Proposed: cast in the order the seasons need them, three auditions per main character (as for Maya and Ray), the
  founder choosing; minor characters (a line or two) from a small, consistent pool, recorded as such.
- **Delivery:** the workspace cannot download generated audio; each take reaches the repository when the founder attaches it. To keep
  that bearable, lines are generated **per character per chapter in one take** with 1.5 s pauses, split here at the pauses (as for
  S01E01 Act I), so a chapter is a handful of files, not dozens.
- **Order:** Season 1, Maya and Ray first (12,123 characters ≈ 12,100 credits), chapter by chapter; each chapter is checked line for
  line against the canon (unit test) and played in the browser before the next is generated.
- Until a chapter's voices exist, its scene plays with captions (`#/story/<chapter>` → Watch as a scene), and says so.
