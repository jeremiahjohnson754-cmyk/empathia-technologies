"""Empathia v1.8 package static integrity checks; does NOT certify live software or security."""
import csv, json, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def read_csv(p):
    with open(p, newline='', encoding='utf-8-sig') as f: return list(csv.DictReader(f))

def main():
    r=read_csv(ROOT/'matrices'/'EMPATHIA_CONSOLIDATED_REQUIREMENTS_v1_8.csv')
    t=read_csv(ROOT/'matrices'/'EMPATHIA_CONSOLIDATED_QA_TESTS_v1_8.csv')
    dr=read_csv(ROOT/'matrices'/'V1_8_ONLY_REQUIREMENTS.csv')
    dt=read_csv(ROOT/'matrices'/'V1_8_ONLY_QA_TESTS.csv')
    assert (len(r),len(t),len(dr),len(dt))==(1099,652,90,90)
    assert r[-90:]==dr and t[-90:]==dt
    assert len({x['requirement_id'] for x in r})==len(r)
    assert len({x['test_id'] for x in t})==len(t)
    assert all(x['result']=='NOT_RUN' for x in dt)
    assert all(x['implementation_status']=='AUDIT_REPOSITORY' for x in dr)
    for p in (ROOT/'contracts').glob('*.json'):json.loads(p.read_text())
    print('STATIC PASS: 1099 requirements; 652 QA scenarios; 90 new each; distinct IDs and no new PASS claims.')
    print('This does not show any current deployed feature or customer integration passed functional tests.')
if __name__=='__main__': main()
