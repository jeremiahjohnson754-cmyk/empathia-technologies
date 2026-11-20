# People intelligence: who did the work, and the experience it gives

Founder, 14 Nov 2026: *"we want to be able to track everyone that touched the project as well for dispatch and search party and the relationships … projects done by a person can increase their expertise scores depending on the complexity of work and type of work control systems audio etc."*

## What is built

- **`#/v25/people`** (service manager, operations, executive, project managers, architect, systems engineer, commissioning engineer):
  - lists everyone with worked jobs, with the rooms and projects they touched;
  - shows experience by layer (audio, video, display, control, network, power) and by quarter;
  - can be filtered by layer ("who has the most control-system work");
  - opening a person shows their layers, their quarterly trend and each job with its weight.
- **Each room's record** has a card for everyone who touched the room. It lists the people from its service jobs, with their layers, and the roles from its commissioning record, with how many steps each took. Each person links to their experience.
- **Dispatch.** Each eligible candidate shows their record experience in the job's layer *beside* the engine's ranking. It is never part of the ranking or the hard gates.

## How experience is worked out (`apps/demo/src/people/involvement.ts`)

Each worked job (one that was responded to or restored) gives its technician:

> **room complexity × kind of work × severity**

| Factor | Values |
|---|---|
| Room complexity | up to 6 people 1 · up to 14 people 1.5 · up to 40 people 2 · larger 3 · a divisible room adds 0.5 |
| Kind of work | break-fix 1 · preventive 0.5 · change 1.5 |
| Severity | Mission critical 1.5 · High 1.2 · Standard 1 |

Levels describe experience, not qualification:

| Level | From |
|---|---|
| Started | 0 |
| Practised | 10 |
| Experienced | 40 |
| Deep experience | 100 |

## Rules

- **Experience is evidence from the record.** It is never a credential or a certification, and it grants no authority. Dispatch's hard gates still decide who may take a job: competency records, licences, site access and availability.
- **Every person is synthetic.** On a workspace job, the person is the technician named on the work order. In the synthetic service history, the person is taken from the vendor's roster by the job's ID, so the result is the same every time. Internal jobs go to the internal team, and each vendor's jobs go to its own synthetic field engineers.

## Tests

- `tests/unit/people-involvement.test.mjs` (PI-01..04) checks:
  - who did a job is stable and belongs to the job's vendor;
  - the weight formula;
  - the levels;
  - each person's totals equal the sums over their layers and over their quarters;
  - who-touched-a-room counts people from the jobs and roles from the record.
- `tests/browser/demo-people.test.mjs` (PE-01..06) checks the list, the layer filter, a person, the room card, dispatch, and that a visitor cannot see the page.

## Not built yet

- (Built since: people in Search Party — each person is a record, involved in the rooms and units they worked; `tests/unit/search-asset-person.test.mjs`.)
- An export of people intelligence.
- Commissioning work credited to named people. The room record names roles, not people.
