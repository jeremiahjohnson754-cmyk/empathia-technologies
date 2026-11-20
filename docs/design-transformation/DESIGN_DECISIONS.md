# Design decisions

| Decision | Reason | Alternatives | Trade-offs | Exception approved |
|---|---|---|---|---|
| The handoff's prototype and React concepts are references, not code to import | the working application is the authority (founder, 11 Nov 16:46) | importing the prototype | none for the product; the concepts guide layout only | — |
| No Tailwind migration | the existing token system and CSS architecture work; the handoff says so too | migrate | none | — |
| Fonts only where they may legally be self-hosted (Inter, OFL) | licensing | licensed display faces | a narrower type palette | — |
| The five axes are separate components with separate shapes (`packages/ui/src/Axes.tsx`): condition a filled pill with a glyph, provenance a square-cornered outline with a source mark, confidence a dashed outline in words, workflow a step marker, maturity a bracketed label | the language says provenance, confidence, freshness and review must never collapse into one colour chip | one chip with a tone per value | more visual vocabulary to learn; the reference page `#/design/axes` shows every value | — |
| Type stays Inter (OFL, self-hosted) for now; the handoff's faces (Plus Jakarta Sans, Work Sans, JetBrains Mono) are also open licences but are not in the repository and the shell here cannot fetch them | fonts only where they may legally be self-hosted, and only what is in hand | add the faces now | the corporate and app stacks stay one family until the files are added from their official sources | — |
