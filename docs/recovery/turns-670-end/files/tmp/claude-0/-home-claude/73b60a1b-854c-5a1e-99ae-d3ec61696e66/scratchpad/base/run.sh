#!/bin/bash
cd /home/claude/empathia-technologies
S=/tmp/claude-0/-home-claude/73b60a1b-854c-5a1e-99ae-d3ec61696e66/scratchpad/base
node scripts/db.mjs up > $S/db.log 2>&1; echo "db exit $?" >> $S/db.log
flock /tmp/empathia-test.lock node scripts/test.mjs --browser --studio > $S/matrix.log 2>&1; echo "matrix exit $?" >> $S/matrix.log
node scripts/verify/no-unexpected-skips.mjs --profile=platform > $S/skips.log 2>&1; echo "skips exit $?" >> $S/skips.log
