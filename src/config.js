export const MATCH_CONFIG = Object.freeze({
  tournamentName: 'FIFA WORLD CUP',
  stageName: 'GROUP G',
  matchType: 'group',
  targetScore: 5,
  activeMarblesPerTeam: 2,
  respawnDelayMs: { min: 700, max: 1500 },
  gravity: 1.05,
  marble: {
    radius: 24,
    restitution: 0.68,
    friction: 0.0008,
    frictionStatic: 0.0001,
    frictionAir: 0.0018,
    density: 0.0024
  },
  arena: {
    width: 1920,
    height: 1080,
    playTop: 238,
    killY: 1160
  },
  teams: [
    { id: 'france', name: 'FRANCE', flag: '🇫🇷', colors: ['#163db7', '#fff', '#ef3340'] },
    { id: 'senegal', name: 'SENEGAL', flag: '🇸🇳', colors: ['#00853f', '#fdef42', '#e31b23'] },
    { id: 'iraq', name: 'IRAQ', flag: '🇮🇶', colors: ['#ce1126', '#fff', '#000'] },
    { id: 'norway', name: 'NORWAY', flag: '🇳🇴', colors: ['#ba0c2f', '#fff', '#00205b'] }
  ]
});
