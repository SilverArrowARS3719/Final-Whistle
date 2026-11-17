// Every release, newest first. When you ship, add an entry at the top: VERSION follows it, Settings → Updates
// shows it, and feedback is tagged with it. Big new things bump the first number, everything else the second.
export type Release = { version: string; date: string; title: string; changes: string[] }

export const RELEASES: Release[] = [
  {
    version: '1.7', date: '2026-11-17', title: 'Feedback and colours',
    changes: [
      'Send feedback from the menu, your profile or Settings',
      'Every colour theme checked so all text stays readable',
      'This updates timeline',
      'Settings tabs and the Daily Draft pill fit small screens',
    ],
  },
  {
    version: '1.6', date: '2026-11-17', title: 'Safer accounts',
    changes: [
      'Two-step login with an authenticator app',
      'A short wait after five wrong passwords',
      'Tighter database rules: only you see your own games',
      'Play the offline version from a shared link',
    ],
  },
  {
    version: '1.5', date: '2026-11-17', title: 'Faster loading',
    changes: ['Lighter photos', 'Screens load when you open them', 'A smaller download overall'],
  },
  {
    version: '1.4', date: '2026-11-17', title: 'The F logo',
    changes: ['The new F logo', 'Account menu', "Kicko's tips on every screen", 'Loading placeholders', 'Better on phones', 'Cookie choice'],
  },
  {
    version: '1.3', date: '2026-11-16', title: 'The Final Whistle',
    changes: ['A new name', 'Meet Kicko, the referee panda', 'New login and welcome', 'Leagues with your mates', 'Privacy policy and terms'],
  },
  {
    version: '1.2', date: '2026-11-14', title: 'Link lines',
    changes: ['Link lines between players who click', 'Daily Draft chip', 'Livelier matches with more detail', 'Roomier layout'],
  },
  {
    version: '1.1', date: '2026-11-12', title: 'Daily Draft',
    changes: ['A new Daily Draft puzzle every day', 'XP, levels and achievements', 'Play against the computer', 'Swipe between modes'],
  },
  {
    version: '1.0', date: '2026-11-11', title: 'Team of Winners',
    changes: ['Mode 5: Team of Winners', 'Spin the competition wheel', 'A three-season career'],
  },
  {
    version: '0.3', date: '2026-11-10', title: 'Chaos cards',
    changes: ['Chaos cards for every player', 'World Cup cards', 'Music and sound settings', 'Share cards, rematches and reactions', 'Seasons'],
  },
  {
    version: '0.2', date: '2026-11-09', title: 'Colour lab',
    changes: ['18 colour themes to unlock', 'Loading states'],
  },
  {
    version: '0.1', date: '2026-11-03', title: 'Kick-off',
    changes: ['Draft your all-time XI', 'Online play with friends'],
  },
]

export const VERSION = RELEASES[0].version
