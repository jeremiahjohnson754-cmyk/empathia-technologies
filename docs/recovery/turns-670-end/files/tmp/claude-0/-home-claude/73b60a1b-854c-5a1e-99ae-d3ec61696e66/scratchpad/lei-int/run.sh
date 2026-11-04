#!/bin/bash
cd /home/claude/empathia-technologies
S=/tmp/claude-0/-home-claude/73b60a1b-854c-5a1e-99ae-d3ec61696e66/scratchpad/lei-int
node scripts/db.mjs up > $S/db.log 2>&1
flock /tmp/empathia-test.lock node scripts/test.mjs --browser --studio > $S/matrix.log 2>&1; echo "matrix exit $?" >> $S/matrix.log
node scripts/verify/no-unexpected-skips.mjs --profile=platform > $S/skips.log 2>&1; echo "skips exit $?" >> $S/skips.log
: > $S/dark.log
for t in demo demo-ux demo-hardening demo-decisions demo-campus demo-tours demo-searchbar demo-search-scenarios demo-dispatch demo-servicehands demo-replay demo-fi-scan demo-rooms demo-destructive demo-viewas demo-enquiry learn-labs; do
  f=tests/browser/$t.test.mjs; [ -f $f ] || { echo "$t MISSING" >> $S/dark.log; continue; }
  out=$(PW_COLOR_SCHEME=dark flock /tmp/empathia-test.lock node --import ./tests/browser/color-scheme.mjs $f 2>&1); rc=$?
  echo "$t rc=$rc :: $(echo "$out" | grep -E '[0-9]+/[0-9]+ (PASS|passed)|passed|failed|FAIL' | tail -2 | tr '\n' ' ')" >> $S/dark.log
  [ $rc -ne 0 ] && echo "$out" | tail -40 > $S/dark-$t.fail.log
done
echo DONE >> $S/dark.log
