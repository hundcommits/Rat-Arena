# Rat Arena (Wererat Hunters online)

Two teams fight over the 7 moon shards on Moon Isle.

- **2 vs 2**: every player brings three hunters and switches between them (1 2 3 / Q E). Anyone can carry the base.
- **3 vs 3**: one hunter each, plus a role:
  - **Guard**: +40% health. Only the guard can carry the base (G). The base heals faster next to the guard.
  - **Assassin**: +25% damage against players.
  - **Roamer**: +15% speed and a bigger pickup range. Can carry any number of shards; everyone else can carry only 2.

## How a match works

- 7 moon shards fall on the island on a timetable: at 0:15, 0:45, 1:30, 2:20, 3:20, 4:30 and 5:50.
## The draft (like a MOBA)
- The host makes a room and shares the code. The draft only starts when the room is **full** (4 players for 2v2, 6 for 3v3) with equal teams.
- In 3v3 everyone picks a role first: each team has one Guard, one Assassin and one Roamer.
- **Bans:** teams take turns, SUN then MOON (2 each in 3v3, 1 each in 2v2). 20 seconds per ban. You can skip.
- **Picks:** snake order SUN 1, MOON 2, SUN 2, MOON 2... 30 seconds per pick; if time runs out a random hunter is picked.
- A hunter can only be picked once in the whole match, so the two teams never share a hunter.
- If someone leaves during the draft, it goes back to the lobby.

## The match
- Shards are the 7 moon-heart pieces from the castle. They fill your base's moon heart as you bank them.
- Walk over a shard to pick it up. It floats over your head. Bring it to your base to **bank** it.
- If you get taken down, the shards you carry drop on the ground for anyone to take.
- **Bases are hidden.** You only see the enemy base when someone on your team is close to it.
- Stand on the enemy base for 2.5s to **steal** one of their banked shards.
- Monsters come in timed **camps** next to each lair (they come back about 50s after you clear them, faster at night). A roaming **wave** comes about every 70s, and a **mini-boss** appears in the Moon Meadow at 5:00 and 10:00. Monsters attack everyone, bases included.
- **You win by** banking all 7 shards, or by destroying the enemy base (2500 health).
- After 15 minutes, the team with more shards banked wins. If shards are tied, the healthier base wins.
- After a takedown you come back at your base: 7s in 3v3, 10s in 2v2. In 2v2 you only go down when all three of your hunters are down.
- Lairs, the castle and the shop are closed in the arena. Every hunter is unlocked.

## Files

| File | What it is |
|---|---|
| `server.js` | The server. Plain Node.js, no packages to install. It serves the page and passes messages between the players in a room. |
| `public/index.html` | The game plus the arena (lobby and online code), built by `build.py`. |
| `arena.js`, `lobby.html` | The arena's own code and lobby page (`build.py` puts them into `public/index.html`). |
| `build.py` | Rebuilds `public/index.html` after the game changes. |

## Try it on your computer

1. Install Node.js 18 or newer.
2. In this folder, run `node server.js` (or `npm start`).
3. Open `http://localhost:3000` in **two or more browser windows**. Make a room in one and join it from the others with the code.
4. To play with friends on the same Wi-Fi, they open `http://YOUR-PC-IP:3000`.

## Put it online on Render (free)

This is a **Web Service**, like your In Between game, not a Static Site like the main game.

1. Make a new GitHub repository (for example `rat-arena`). Upload `server.js`, `package.json`, `README.md` and the `public` folder with its `index.html` inside.
2. On Render, click **New → Web Service** and connect the repository.
3. Settings:
   - **Runtime**: Node
   - **Build Command**: leave empty (or `npm install`; there is nothing to install)
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Deploy. Your arena will be at something like `https://rat-arena.onrender.com`.
5. On the free plan the server sleeps when nobody is using it. The first person to open it waits about a minute for it to wake up. While a match is going, it stays awake.

## Good to know

- The **host** (whoever made the room) runs the monsters, shards and bases in their browser. They should keep the game tab open and in front for the whole match, because a hidden tab pauses the island for everyone. If the host leaves, the match ends.
- Damage is worked out on the attacker's screen, so it's made for playing with friends, not strangers. A cheater could fake hits.
- Best with a keyboard and mouse. Phones can play, but carrying the base needs the **G** key.
- `/health` on the server shows how many rooms are open.
