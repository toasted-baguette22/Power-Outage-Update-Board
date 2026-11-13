/* data.js - constants and student-created sample records.
   Loaded before app.js. Times are generated relative to "now" so the
   durations and recovery estimates always look realistic when demoed. */
'use strict';

// Rule/variant knobs (change these for the instructor's individual rule).
const VERIFY_THRESHOLD = 3;       // neighbour confirmations needed to auto-verify
const DUPLICATE_WINDOW_HOURS = 6; // same-zone active report within this window => duplicate warning

const ZONES = [
  'Zone A - North Hostels',
  'Zone B - Academic Block',
  'Zone C - Faculty Housing',
  'Zone D - Market Road',
  'Zone E - Medical Centre'
];

const SERVICES = [
  { key: 'water',    label: 'Water pumps' },
  { key: 'lifts',    label: 'Elevators' },
  { key: 'signals',  label: 'Traffic signals' },
  { key: 'medical',  label: 'Medical / clinic' },
  { key: 'wifi',     label: 'Internet / Wi-Fi' },
  { key: 'lights',   label: 'Street lighting' },
  { key: 'cold',     label: 'Cold storage' }
];

const STATUSES = {
  reported: { label: 'Reported',   order: 0 },
  verified: { label: 'Verified',   order: 1 },
  crew:     { label: 'Crew on site', order: 2 },
  restored: { label: 'Restored',   order: 3 }
};

const MIN = 60 * 1000;
function minutesAgo(m) { return new Date(Date.now() - m * MIN).toISOString(); }
function minutesAhead(m) { return new Date(Date.now() + m * MIN).toISOString(); }

// Seven sample outage records, each with its own status history.
function buildSampleReports() {
  return [
    {
      id: 1, zone: ZONES[0], reporter: 'Hira Malik', email: '',
      severity: 'full', services: ['water', 'lifts'],
      description: 'Whole hostel block dark since evening. Water tank not refilling and lifts stopped.',
      startedAt: minutesAgo(190), status: 'crew', confirmations: 5,
      etr: minutesAhead(90), etrNote: 'Transformer replacement at sub-station A2.', restoredAt: null,
      timeline: [
        { at: minutesAgo(190), type: 'reported', text: 'Reported by Hira Malik.' },
        { at: minutesAgo(172), type: 'verified', text: 'Reached 3 neighbour confirmations - auto-verified.' },
        { at: minutesAgo(120), type: 'crew', text: 'Repair crew dispatched to sub-station A2.' },
        { at: minutesAgo(60),  type: 'note', text: 'Faulty transformer found. Replacement unit on the way.' }
      ]
    },
    {
      id: 2, zone: ZONES[1], reporter: 'Usman Tariq', email: '',
      severity: 'partial', services: ['wifi'],
      description: 'Computer lab corridor lost power. Rest of the block seems fine.',
      startedAt: minutesAgo(75), status: 'reported', confirmations: 1,
      etr: null, etrNote: '', restoredAt: null,
      timeline: [
        { at: minutesAgo(75), type: 'reported', text: 'Reported by Usman Tariq.' }
      ]
    },
    {
      id: 3, zone: ZONES[2], reporter: 'Dr. Sana Rauf', email: '',
      severity: 'full', services: ['water', 'cold'],
      description: 'Faculty housing lost power during the storm. Fridges are warming up.',
      startedAt: minutesAgo(400), status: 'restored', confirmations: 6,
      etr: minutesAgo(80), etrNote: 'Line fault between poles 14 and 15.', restoredAt: minutesAgo(45),
      timeline: [
        { at: minutesAgo(400), type: 'reported', text: 'Reported by Dr. Sana Rauf.' },
        { at: minutesAgo(385), type: 'verified', text: 'Reached 3 neighbour confirmations - auto-verified.' },
        { at: minutesAgo(330), type: 'crew', text: 'Crew on site, tracing line fault.' },
        { at: minutesAgo(200), type: 'note', text: 'Fault located between poles 14 and 15. Estimated fix within two hours.' },
        { at: minutesAgo(45),  type: 'restored', text: 'Power restored. Please report if flickering continues.' }
      ]
    },
    {
      id: 4, zone: ZONES[3], reporter: 'Bilal Ahmed', email: '',
      severity: 'partial', services: ['signals', 'lights'],
      description: 'Traffic lights at the market crossing are off and street lights are out on the east side.',
      startedAt: minutesAgo(30), status: 'verified', confirmations: 3,
      etr: null, etrNote: '', restoredAt: null,
      timeline: [
        { at: minutesAgo(30), type: 'reported', text: 'Reported by Bilal Ahmed.' },
        { at: minutesAgo(18), type: 'verified', text: 'Reached 3 neighbour confirmations - auto-verified.' }
      ]
    },
    {
      id: 5, zone: ZONES[4], reporter: 'Nurse Ayesha Khan', email: '',
      severity: 'full', services: ['medical', 'cold', 'lifts'],
      description: 'Clinic running on backup generator only. Vaccine fridge needs mains power soon.',
      startedAt: minutesAgo(55), status: 'crew', confirmations: 4,
      etr: minutesAhead(120), etrNote: 'Priority feeder - medical site. Crew bringing mobile generator as backup.', restoredAt: null,
      timeline: [
        { at: minutesAgo(55), type: 'reported', text: 'Reported by Nurse Ayesha Khan.' },
        { at: minutesAgo(48), type: 'verified', text: 'Verified by utility desk (priority site).' },
        { at: minutesAgo(35), type: 'crew', text: 'Priority crew dispatched.' }
      ]
    },
    {
      id: 6, zone: ZONES[0], reporter: 'Zainab Iqbal', email: '',
      severity: 'partial', services: ['wifi', 'lights'],
      description: 'Only the east wing of the hostel lost power for a short while.',
      startedAt: minutesAgo(1500), status: 'restored', confirmations: 3,
      etr: null, etrNote: '', restoredAt: minutesAgo(1380),
      timeline: [
        { at: minutesAgo(1500), type: 'reported', text: 'Reported by Zainab Iqbal.' },
        { at: minutesAgo(1470), type: 'verified', text: 'Reached 3 neighbour confirmations - auto-verified.' },
        { at: minutesAgo(1380), type: 'restored', text: 'Breaker reset by crew. Power restored.' }
      ]
    },
    {
      id: 7, zone: ZONES[1], reporter: 'Prof. Imran Shah', email: '',
      severity: 'full', services: ['lifts', 'wifi', 'cold'],
      description: 'Academic block outage during exams. Lecture halls and labs affected.',
      startedAt: minutesAgo(2900), status: 'restored', confirmations: 8,
      etr: minutesAgo(2760), etrNote: 'Cable fault, spare section being installed.', restoredAt: minutesAgo(2700),
      timeline: [
        { at: minutesAgo(2900), type: 'reported', text: 'Reported by Prof. Imran Shah.' },
        { at: minutesAgo(2880), type: 'verified', text: 'Reached 3 neighbour confirmations - auto-verified.' },
        { at: minutesAgo(2820), type: 'crew', text: 'Crew dispatched.' },
        { at: minutesAgo(2700), type: 'restored', text: 'Power restored to the academic block.' }
      ]
    }
  ];
}
