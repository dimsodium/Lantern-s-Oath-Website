// Three trials. Each level has its own enemy family, a difficulty ramp
// (phases unlock as the Warden travels further) and a boss at the end.
export const LEVELS = [
  {
    id: 1,
    name: 'The Drift',
    tagline: 'A salvage graveyard on the outer rim',
    briefing:
      'Scavenger machines have overrun the wrecks of the old fleet. Clear the drones and gunships, then face their tyrant, RUSTMAW.',
    length: 70, // seconds of travel before the boss
    boss: 'rustmaw',
    theme: {
      bg: '#03050c',
      nebula: ['rgba(255,140,60,0.09)', 'rgba(70,110,255,0.07)', 'rgba(255,170,90,0.05)'],
      bullet: '#ffae42',
      accent: '#ff8a3d',
    },
    phases: [
      { at: 0.0, every: 2.5, pool: { drone: 1 } },
      { at: 0.2, every: 2.2, pool: { drone: 3, skimmer: 2 } },
      { at: 0.45, every: 2.0, pool: { drone: 2, skimmer: 2, gunship: 1 } },
      { at: 0.7, every: 1.6, pool: { drone: 2, skimmer: 3, gunship: 2 } },
    ],
  },
  {
    id: 2,
    name: 'The Ember Nebula',
    tagline: 'A crimson storm of living fire',
    briefing:
      'The crimson brood nests inside the nebula: homing wisps, diving lancers and drifting mines. At its heart waits VEXA, the Ember Matriarch.',
    length: 80,
    boss: 'vexa',
    theme: {
      bg: '#08030a',
      nebula: ['rgba(255,60,90,0.11)', 'rgba(255,120,60,0.07)', 'rgba(140,30,80,0.09)'],
      bullet: '#ff4d6d',
      accent: '#ff4d6d',
    },
    phases: [
      { at: 0.0, every: 2.4, pool: { wisp: 1 } },
      { at: 0.2, every: 2.1, pool: { wisp: 2, lancer: 2 } },
      { at: 0.45, every: 1.9, pool: { wisp: 2, lancer: 2, mine: 1 } },
      { at: 0.7, every: 1.5, pool: { wisp: 2, lancer: 3, mine: 2 } },
    ],
  },
  {
    id: 3,
    name: 'The Hollow',
    tagline: 'Where starlight goes to die',
    briefing:
      'Beyond the last star, wraiths of the void phase in and out of sight. Survive their crystal splitters and sentinels, then end the HOLLOW KING.',
    length: 90,
    boss: 'hollowKing',
    theme: {
      bg: '#04020a',
      nebula: ['rgba(150,80,255,0.10)', 'rgba(60,20,140,0.10)', 'rgba(199,125,255,0.06)'],
      bullet: '#c77dff',
      accent: '#c77dff',
    },
    phases: [
      { at: 0.0, every: 2.4, pool: { splitter: 1 } },
      { at: 0.2, every: 2.1, pool: { splitter: 2, shade: 2 } },
      { at: 0.45, every: 1.9, pool: { splitter: 2, shade: 2, sentinel: 1 } },
      { at: 0.7, every: 1.6, pool: { splitter: 2, shade: 3, sentinel: 2 } },
    ],
  },
];
