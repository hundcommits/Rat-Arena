# Rat Arena (Wererat Hunters online)

A Mobile Legends style **Brawl**: one straight lane through the Moon Meadow, two teams, towers and minions.

- **1 vs 1**: a duel. Each player bans 1 and picks 2 hunters, switching with 1 2 / Q E.
- **2 vs 2**: every player bans 1 and picks 2 hunters (4 bans, 8 hunters), switching with 1 2 / Q E.
- **3 vs 3**: every player bans 1 and picks 1 (6 bans, 6 hunters).

## The draft (like a MOBA)
- The host makes a room and shares the code. The draft only starts when the room is **full** (4 players for 2v2, 6 for 3v3) with equal teams.
- **Bans:** every player bans one hunter, teams taking turns SUN, MOON, SUN, MOON. 20 seconds per ban. You can skip.
- **Picks:** snake order SUN 1, MOON 2, SUN 2, MOON 2... 30 seconds per pick; if time runs out a random hunter is picked.
- A hunter can only be picked once in the whole match, so the two teams never share a hunter.
- If someone leaves during the draft, it goes back to the lobby.

## The match
- **MOON sees the map mirrored**, like Mobile Legends: whichever team you are on, your base is on the left and you push right. Left/right keys and mouse aim flip to match.
- The map is a short lane: SUN's base on the left, MOON's on the right. Each team has **three towers** in front of its base: a cone tower (three bolts), a sniper tower (aims a laser, then a burst of needles) and a cannon tower (lobs a shell at where you stand).
- The lane is long, with a **big river** across the middle that doesn't slow anyone (Anu and Brine love it).
- Every **26 seconds** a **line** of minions walks out of each base: snake, snake, big skeleton, eagle rider, eagle rider. When a rider falls, a fast-attacking mage skeleton gets up. If a team has lost both towers, the other team sends **double lines** (more XP to catch up). Minions get tougher over time.
- Killing enemy minions gives **XP** to everyone on your team who is nearby (the last hit gets a little more), so you **level up** and pick upgrades like in the normal game. Takedowns and destroyed towers give XP too.
- **Towers** shoot minions first. They shoot players in range, and each shot in a row on the same player hurts more. If you hit an enemy player under their own tower, that tower turns on you.
- Towers fall **in order**: outer tower, inner tower, then the base. They take much less damage from players when none of your minions are close, so push with your wave.
- Your **base** heals you fast when you stand next to it, and you walk 50% faster near it.
- Players have about **400 health** in the arena, and nobody can lose more than about a fifth of their health per second to other players, so fights last a few seconds instead of being instant. Every hunter's damage against players is evened out.
- **Untargetable** players (Shade's ghost, Celeste praying, smoke, etc.) still show, see-through, with UNTARGETABLE over them. Bushes still hide you.
- You see everyone's attacks and effects. When a player hits you, their name flashes at the bottom of your screen, a red ring shows around them, and an arrow points at them if they are off screen.
- **Monsters:** at 1:00 the **King Cobra** (in his little fort, top) and the **Giant Crab** (on the beach, bottom) appear. Whoever lands the last hit gets the buff: Cobra Fang (+25% damage for 90s) or Crab Shell (a shield as big as your health, 60s). They come back 2 minutes after dying.
- At **6:00** the Cobra becomes the **Skeleton Lord**. The team that beats him gets him in place of their next minion wave. He comes back 3 minutes later.
- Each side has a small **monster camp** (two bone snakes and an imp) for extra XP.
- Low stone walls line the lane, with gaps into the sides.
- **Stuns, freezes, slows, pulls and pushes work on players** (stuns last 1s at most, then 1.6s of stun immunity).
- **Basic attacks are aimed** with the mouse: they only go for enemies near where you point.
- In 2v2 **each hunter has its own comeback timer**.
- **Chat:** Enter = team chat, Shift+Enter = all chat (Tab switches while typing). Team messages only reach your team.
- **Team voice:** the MIC button sends your voice straight to your teammates' browsers (never to the enemy). TEAM VOICE mutes them. It needs the https link (Render gives you one). On a few strict school or office networks, voice may not connect.
- The arena's **level cap is 15**.
- Arena-only hunter changes: **Sable's watchtower** has its own health (70% of hers): hits on her go into the tower, and when it breaks she drops out. **Captain Brine's** chest becomes **Iron Hull**: a shield worth 45% of his health for 5s that ends in the SURPRISE stun burst. Short **bushes** sit along the lane walls for snipers like Agent Shade.
- At the end, a big banner drops (VICTORY / DEFEAT) over everyone's hunters, and the scroll under it opens to show each player's takedowns, times down, towers broken and level.
- **You win** by destroying the enemy base. There is no time limit.
- After a takedown you come back at your base. The wait grows as the match goes on: 5 seconds at the start, up to 32 seconds late in the game.

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

- The **host** (whoever made the room) runs the minions and towers in their browser. They should keep the game tab open and in front for the whole match, because a hidden tab pauses the island for everyone. If the host leaves, the match ends.
- Damage is worked out on the attacker's screen, so it's made for playing with friends, not strangers. A cheater could fake hits.
- Best with a keyboard and mouse. Phones can play too.
- `/health` on the server shows how many rooms are open.
