/**
 * The facts of AVIXA's three certification exams, as AVIXA itself publishes them, each with its source and the date it was read
 * (founder, 18 Nov 2026: CTS, CTS-D and CTS-I study spaces). Only what the candidate handbooks and AVIXA's pages say. 18 Nov 2026
 * (checked with Firecrawl): AVIXA's proctoring notice and its "about the CTS credential" page now answer 404; AVIXA's CTS page says
 * the exams are only delivered at in-person Pearson testing centres, so that page is cited instead. Fees and policies change: every page that
 * shows these says when they were read and sends the reader to AVIXA before paying or booking.
 *
 * CTS®, CTS-D® and CTS-I® are certifications of AVIXA®. Empathia is not affiliated with or endorsed by AVIXA, and nothing here is an
 * AVIXA product, an AVIXA practice exam, or a question from any AVIXA exam.
 */
export type CertId = 'CTS' | 'CTS-D' | 'CTS-I';
export const READ_ON = '18 November 2026';

export interface Source { label: string; url: string }
export const SOURCES: Record<string, Source> = {
  ctsHandbook: { label: 'AVIXA, CTS Candidate Handbook (dated 13 November 2023; fee table effective 1 January 2025)', url: 'https://a-us.storyblok.com/f/570395326227278/x/726c898d76/cts_handbook_2026.pdf' },
  ctsdHandbook: { label: 'AVIXA, CTS-D Candidate Handbook (dated 13 November 2023; fee table effective 1 January 2025)', url: 'https://a-us.storyblok.com/f/570395326227278/x/6343519a6d/cts-d_handbook_2026.pdf' },
  ctsiHandbook: { label: 'AVIXA, CTS-I Candidate Handbook (dated 13 November 2023; fee table effective 1 January 2025)', url: 'https://a-us.storyblok.com/f/570395326227278/x/687329bcaf/cts-i_handbook_2026.pdf' },
  proctoring: { label: 'AVIXA, CTS Certification: “Can I take the exam online?”', url: 'https://www.avixa.org/training-certification/certification/cts-certification' },
};

export interface Task { code: string; title: string; weight: number }
/** a duty of the exam content outline: its title and its tasks are the handbook's own words (Appendix A); `plain` is ours */
export interface Domain { code: string; title: string; weight: number; tasks: Task[]; plain: string }
export interface Cert {
  id: CertId; name: string; path: string; who: string; one: string;
  questions: { total: number; scored: number; pilot: number }; minutes: number; options: number; languages: string[];
  passing: string; prerequisite: string; experience: string; fees: { member: number; nonMember: number; note: string };
  delivery: string; retakes: string; renewal: string; aids: string; domains: Domain[]; source: keyof typeof SOURCES;
}

const T = (code: string, title: string, weight: number): Task => ({ code, title, weight });

export const CERTS: Record<CertId, Cert> = {
  CTS: {
    id: 'CTS', name: 'Certified Technology Specialist', path: '/learn/cts', source: 'ctsHandbook',
    who: 'Anyone who creates, implements, operates or services AV solutions: technicians, sales engineers, project coordinators, programmers, support staff.',
    one: 'The general AV credential: enough of design, installation, operation and service to talk to every trade on the job and do the work right.',
    questions: { total: 115, scored: 100, pilot: 15 }, minutes: 150, options: 4, languages: ['English', 'Spanish', 'German'],
    passing: 'A scaled score of 350 on a scale up to 500. The pass mark is criterion-referenced: set by subject-matter experts for what a minimally qualified candidate should know, not by how others scored.',
    prerequisite: 'None stated beyond agreeing to AVIXA’s terms and Code of Ethics; the application is approved for 120 days.',
    experience: 'The handbook states no minimum experience; AVIXA recommends the AV Essentials and CTS Prep training (not required).',
    fees: { member: 390, nonMember: 490, note: 'US dollars, as the handbook’s fee table lists them; confirm on AVIXA’s site before paying.' },
    delivery: 'Pearson VUE test centers, in person: AVIXA’s CTS page says its exams are only delivered at secure, in-person Pearson testing centers (no online proctoring). Confirm with AVIXA when you book.',
    retakes: 'Up to two retakes at a reduced fee, at least 30 days apart; after two unsuccessful retakes, a 90-day wait.',
    renewal: 'Every three years with 30 renewal units (RUs).',
    aids: 'An on-screen calculator and a non-erasable note board supplied at the test center; nothing of your own.',
    domains: [
      { code: 'A', title: 'Creating AV Solutions', weight: 35, plain: 'What the customer needs, what the site is like, what the job includes, and the design that meets it.',
        tasks: [T('A1', 'Conduct A Customer Needs Analysis', 7), T('A2', 'Conduct Site Survey', 9), T('A3', 'Develop an AV Project Scope', 9), T('A4', 'Design AV Solutions', 10)] },
      { code: 'B', title: 'Implementing AV Solutions', weight: 30, plain: 'Building it: integrating the system, and managing the integration around the other trades.',
        tasks: [T('B1', 'Integrate AV Solution', 15), T('B2', 'Managing AV Integration', 15)] },
      { code: 'C', title: 'Supporting AV System Operation', weight: 15, plain: 'Running it for the people who use it: operation, training, support during use.',
        tasks: [T('C1', 'Provide AV Support', 15)] },
      { code: 'D', title: 'Servicing AV Solutions', weight: 20, plain: 'Keeping it working: supervising operation, maintaining, troubleshooting and repairing.',
        tasks: [T('D1', 'Supervise AV Operations', 4), T('D2', 'Conduct Maintenance Activities', 8), T('D3', 'Troubleshoot and Repair AV Solutions', 8)] },
    ],
  },
  'CTS-D': {
    id: 'CTS-D', name: 'Certified Technology Specialist — Design', path: '/learn/cts-d', source: 'ctsdHandbook',
    who: 'AV designers and systems engineers who assess needs, coordinate with architects and engineers, and produce the design documents a system is built from.',
    one: 'The design specialty: the needs analysis, the coordination with every other discipline, the drawings and documents, and the design’s verification.',
    questions: { total: 110, scored: 100, pilot: 10 }, minutes: 150, options: 4, languages: ['English'],
    passing: 'A scaled score of 350 on a scale up to 500, criterion-referenced.',
    prerequisite: 'A current CTS.', experience: 'AVIXA recommends three to four years of AV design experience.',
    fees: { member: 490, nonMember: 590, note: 'US dollars, as the handbook’s fee table lists them; confirm on AVIXA’s site before paying.' },
    delivery: 'Pearson VUE test centers; confirm the current delivery options with AVIXA when you book.',
    retakes: 'As for CTS: limited retakes with waiting periods; read the handbook’s retake policy before booking.',
    renewal: 'Every three years with 30 renewal units for the specialty (in addition to CTS renewal).',
    aids: 'An on-screen calculator and a non-erasable note board at the test center.',
    domains: [
      { code: 'A', title: 'Conduct a Needs Assessment', weight: 20, plain: 'Turning what people do in a space into functional requirements, a technology master plan and a program report.',
        tasks: [T('A1', 'Identify functional requirements (e.g., user stories, user experience, benchmarking, client expectations)', 7), T('A2', 'Review or formulate client technology master plan', 7), T('A3', 'Generate and/or Review the Program Report', 6)] },
      { code: 'B', title: 'Coordinate with Other Professionals', weight: 28, plain: 'Architecture, structure, MEP, IT and security, acoustics, life safety: what each needs from AV and what AV needs from each.',
        tasks: [T('B1', 'Coordinate with architectural/interior design professionals', 6), T('B2', 'Coordinate with structural professionals', 4), T('B3', 'Coordinate with mechanical, electrical, and plumbing professionals', 6), T('B4', 'Coordinate with IT and network security professionals', 4), T('B5', 'Coordinate with acoustical professionals', 4), T('B6', 'Coordinate with life safety and security professionals', 2), T('B7', 'Coordinate with site or project specific professionals (e.g., content creators, theatrical, exhibit designer)', 2)] },
      { code: 'C', title: 'Develop and Document AV Designs', weight: 38, plain: 'The conceptual design, revising it to the site and the A&E design, the final design and drawing package, and the project documents.',
        tasks: [T('C1', 'Create conceptual AV design', 11), T('C2', 'Revise conceptual design to be compatible with site conditions and/or A&E drawing package', 7), T('C3', 'Produce final design and drawing package', 10), T('C4', 'Finalize project documentation (e.g., bill of materials, bid spec, drawings, scope of work)', 10)] },
      { code: 'D', title: 'Deploy AV Designs', weight: 14, plain: 'Supporting the build, verifying that the system performs as designed, and closing the project out.',
        tasks: [T('D1', 'Support project execution activities', 5), T('D2', 'Verify system performance', 5), T('D3', 'Conduct project close out activities (e.g., as-builts, system manuals, training, programing information)', 4)] },
    ],
  },
  'CTS-I': {
    id: 'CTS-I', name: 'Certified Technology Specialist — Installation', path: '/learn/cts-i', source: 'ctsiHandbook',
    who: 'Installers, lead technicians and installation supervisors who read the documents, prepare the site, rough in, build and terminate, test, calibrate and hand over.',
    one: 'The installation specialty: from reading the drawings and preparing the site to the rack, the terminations, the network settings, testing, calibration and closeout.',
    questions: { total: 110, scored: 100, pilot: 10 }, minutes: 150, options: 4, languages: ['English'],
    passing: 'A scaled score of 350 on a scale up to 500, criterion-referenced.',
    prerequisite: 'A current CTS.', experience: 'AVIXA recommends three to four years of AV installation experience.',
    fees: { member: 490, nonMember: 590, note: 'US dollars, as the handbook’s fee table lists them; confirm on AVIXA’s site before paying.' },
    delivery: 'Pearson VUE test centers; confirm the current delivery options with AVIXA when you book.',
    retakes: 'As for CTS: limited retakes with waiting periods; read the handbook’s retake policy before booking.',
    renewal: 'Every three years with 30 renewal units for the specialty (in addition to CTS renewal).',
    aids: 'An on-screen calculator and a non-erasable note board at the test center.',
    domains: [
      { code: 'A', title: 'Implement Pre-Installation Activities', weight: 17, plain: 'Reading the documents, surveying the site, checking the facility is ready, and preparing the job.',
        tasks: [T('A1', 'Review AV Project Documentation', 6), T('A2', 'Conduct Site Survey', 4), T('A3', 'Evaluate Overall Facility Readiness', 3), T('A4', 'Prepare for Installation', 4)] },
      { code: 'B', title: 'Practice Ongoing Project Responsibilities', weight: 12, plain: 'Field reports, working with the allied trades, and field modifications documented properly.',
        tasks: [T('B1', 'Complete Field Reports (e.g., daily, issues, progress, risk, injury)', 4), T('B2', 'Coordinate with Allied Trades', 4), T('B3', 'Address Needed Field Modifications', 4)] },
      { code: 'C', title: 'Conduct Site Rough-In/First-Fix', weight: 12, plain: 'Taking out the old system, substructure and rigging points, and pulling cable.',
        tasks: [T('C1', 'Deinstallation of Existing Equipment and Cabling', 2), T('C2', 'Mount Substructure and Rigging', 5), T('C3', 'Pull Cable', 5)] },
      { code: 'D', title: 'Install AV Systems', weight: 39, plain: 'Racks, wiring, distribution, mounting, termination, network properties, device settings, testing and calibration.',
        tasks: [T('D1', 'Assemble AV Rack', 2), T('D2', 'Wire the AV Equipment Rack', 6), T('D3', 'Distribute AV Equipment (e.g., placement of loose equipment, peripherals)', 2), T('D4', 'Mount AV Equipment (e.g., projectors, loud speakers, monitors)', 5), T('D5', 'Terminate Cables', 5), T('D6', 'Configure Network Properties of Equipment', 5), T('D7', 'Configure Control and Device Settings', 5), T('D8', 'Test the AV System', 5), T('D9', 'Calibrate the AV System', 4)] },
      { code: 'E', title: 'Perform AV Systems Closeout', weight: 12, plain: 'Demonstrating the system, training the people who use it, and finishing the documentation.',
        tasks: [T('E1', "Demonstrate to Client or Client's Representative that System Performs to Specifications", 4), T('E2', 'Provide Training on AV System Operation', 2), T('E3', 'Finalize AV Project Documentation (e.g., punch list, programming files, manuals, completion documentation, as-builts)', 6)] },
      { code: 'F', title: 'Conduct Post Project Activities (e.g., support, warranties, maintenance)', weight: 8, plain: 'Maintaining and repairing what was installed.',
        tasks: [T('F1', 'Maintain AV Systems (e.g., equipment, software, tools)', 3), T('F2', 'Repair AV Systems (e.g., failed equipment, warranty, troubleshooting)', 5)] },
    ],
  },
};
export const CERT_IDS: readonly CertId[] = ['CTS', 'CTS-D', 'CTS-I'];

/** what sets the three apart, row by row, for the comparison page */
export const COMPARE: { label: string; get: (c: Cert) => string }[] = [
  { label: 'Who it is for', get: (c) => c.who },
  { label: 'In one line', get: (c) => c.one },
  { label: 'Before you sit it', get: (c) => `${c.prerequisite} ${c.experience}` },
  { label: 'Questions', get: (c) => `${c.questions.total} (${c.questions.scored} scored, ${c.questions.pilot} unscored pilot), ${c.options} options each` },
  { label: 'Time', get: (c) => `${c.minutes} minutes (about ${Math.round(c.minutes * 60 / c.questions.total)} s a question)` },
  { label: 'Languages', get: (c) => c.languages.join(', ') },
  { label: 'To pass', get: () => 'A scaled score of 350 out of 500, criterion-referenced' },
  { label: 'Fee (member / non-member)', get: (c) => `USD ${c.fees.member} / ${c.fees.nonMember}` },
  { label: 'Biggest domain', get: (c) => { const d = [...c.domains].sort((a, b) => b.weight - a.weight)[0]!; return `${d.title} (${d.weight} %)`; } },
  { label: 'Renewal', get: (c) => c.renewal },
];
