# The Draft Room

A football draft game: build an XI with friends (or against the computer), then the match decides who was right.

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # rules, balance and data checks
npm run build
```

## Where things live

| Folder | What it holds |
|---|---|
| `src/frontend/` | Everything you see. `App.tsx` is the game flow, `Root.tsx` wraps it with accounts, friends and online games. `screens/` are full pages, `components/` are shared pieces, `theme/` is the colour lab, `index.css` is all styling, `online.tsx` decides whose turn it is in an online game. |
| `src/game/` | The rules, with no screens in it. `engine/` has the draft, chemistry, match simulation, tournaments, each mode's logic, the Daily Draft, XP and achievements, saved-game storage and sound. `data/` has the players, formations and the trophy holders' squads. Tests sit next to the code they check. |
| `src/backend/` | Everything that talks to the server (Supabase). `schema.sql` is the whole database: tables, security rules and server functions. The `.ts` files are the app's calls to it: sign-in, friends, online games, seasons, the daily leaderboard and usage tracking. |
| `public/img/` | Photos. |

`src/main.tsx` starts the app. Online play is optional: without the keys in `.env.local` the game runs offline. See `SETUP-ONLINE.md` to switch it on.

Numbers that tune the game (match rates, chemistry, caps, timers) are all in `src/game/engine/config.ts`, and the balance tests fail if a change breaks them.
