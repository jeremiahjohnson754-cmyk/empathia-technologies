# Security review

The negative tests that exist (authorization by role, the access page instead of a forbidden screen, no request leaving the page, the
CSP refusing another origin, separation of duties in commissioning, standard kits and drawing review) run in the browser suites
(`demo-access`, `public-security`, `demo`, `demo-scouter`, `demo-manual` and others). Each transformation phase adds its own here.
