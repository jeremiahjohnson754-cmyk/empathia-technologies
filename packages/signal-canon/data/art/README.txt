Every panel of SIGNAL as an SVG file, exactly as the reference build draws it (after the figure-layout pass).
defs.svg holds the shared sprite, prop and background symbols; panel files reference it as ../defs.svg#id.
Serve this folder over http (python3 -m http.server) to view them in a browser; some browsers block cross-file
SVG references on file:// URLs. index.json lists every panel with its chapter and alt text.
