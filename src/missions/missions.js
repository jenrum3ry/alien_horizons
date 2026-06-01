// Data-driven mission definitions. Adding a mission = adding an entry here.
// objective types understood by MissionManager:
//   'destroyCount'  → kill `target` enemies (counts across all waves)
//   'survive'       → keep Earth alive for `duration` seconds
//   'killMothership'→ destroy the boss
// Every mission fails if Earth health reaches 0.
export const MISSIONS = [
  {
    id: 'first-contact',
    name: 'Mission 1 — First Contact',
    briefing:
      'Long-range sensors picked up an alien recon flight skimming the upper atmosphere. ' +
      'Intercept and destroy every contact before they map our defenses.',
    objective: { type: 'destroyCount', target: 6, label: 'Destroy the recon flight' },
    waves: [
      { at: 0, count: 3, variant: 'drone' },
      { at: 8, count: 3, variant: 'fighter' },
    ],
  },
  {
    id: 'orbital-defense',
    name: 'Mission 2 — Orbital Defense',
    briefing:
      'The vanguard is here. Wave after wave of raiders are diving on population centers. ' +
      'Hold the line for 75 seconds and keep Earth alive — reinforcements are inbound.',
    objective: { type: 'survive', duration: 75, label: 'Defend Earth — hold for 0:75' },
    waves: [
      { at: 0, count: 4, variant: 'fighter' },
      { at: 15, count: 4, variant: 'raider' },
      { at: 32, count: 5, variant: 'fighter' },
      { at: 50, count: 5, variant: 'raider' },
      { at: 64, count: 4, variant: 'drone' },
    ],
  },
  {
    id: 'decapitation',
    name: 'Mission 3 — Decapitation',
    briefing:
      'We found their command ship. Take out its defense turrets to expose the core, then ' +
      'destroy it. End this. Earth is counting on you, pilot.',
    objective: { type: 'killMothership', label: 'Destroy the alien Mothership' },
    mothership: true,
    waves: [
      { at: 0, count: 3, variant: 'fighter' },
      { at: 20, count: 3, variant: 'raider' },
      { at: 45, count: 3, variant: 'fighter' },
    ],
  },
];
