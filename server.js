// Rat Arena server: serves the game page and relays messages between players in a room.
// No packages needed: plain Node.js (18+). Start with:  node server.js
// One player's browser (the room's host) runs the monsters, shards and bases; this server just passes messages along.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.pdf': 'application/pdf'};
const MAX = {'2v2': 4, '3v3': 6};

/* ---------- web pages ---------- */
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/health') { res.writeHead(200, {'Content-Type': 'text/plain'}); return res.end('ok ' + rooms.size + ' rooms'); }
  if (p === '/' || p === '') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, {'Content-Type': 'text/plain'}); return res.end('Not found'); }
    res.writeHead(200, {'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache'}); res.end(data);
  });
});

/* ---------- a small WebSocket implementation (RFC 6455), so no packages are needed ---------- */
server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || (req.headers.upgrade || '').toLowerCase() !== 'websocket') { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);
  const c = {socket, buf: Buffer.alloc(0), frag: [], alive: true, id: null, room: null};
  socket.on('data', d => { c.buf = Buffer.concat([c.buf, d]); readFrames(c); });
  socket.on('close', () => leave(c));
  socket.on('error', () => leave(c));
  hello(c);
});
function readFrames(c) {
  while (c.buf.length >= 2) {
    const b0 = c.buf[0], b1 = c.buf[1], fin = (b0 & 0x80) !== 0, op = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f, off = 2;
    if (len === 126) { if (c.buf.length < 4) return; len = c.buf.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (c.buf.length < 10) return; len = Number(c.buf.readBigUInt64BE(2)); off = 10; }
    if (len > 4 * 1024 * 1024) { c.socket.destroy(); return; }
    const need = off + (masked ? 4 : 0) + len; if (c.buf.length < need) return;
    let data = c.buf.subarray(off + (masked ? 4 : 0), need);
    if (masked) { const m = c.buf.subarray(off, off + 4); data = Buffer.from(data); for (let i = 0; i < data.length; i++) data[i] ^= m[i & 3]; }
    c.buf = c.buf.subarray(need);
    if (op === 0x8) { try { c.socket.end(Buffer.from([0x88, 0])); } catch (e) {} leave(c); return; }
    if (op === 0x9) { sendFrame(c, data, 0xA); continue; }
    if (op === 0xA) { c.alive = true; continue; }
    if (op === 0x1 || op === 0x0) { c.frag.push(data); if (fin) { const text = Buffer.concat(c.frag).toString('utf8'); c.frag = []; onMessage(c, text); } }
  }
}
function sendFrame(c, payload, op = 0x1) {
  if (!c.socket.writable) return; const len = payload.length; let head;
  if (len < 126) head = Buffer.from([0x80 | op, len]);
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  try { c.socket.write(Buffer.concat([head, payload])); } catch (e) {}
}
const send = (c, obj) => sendFrame(c, Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)));
// keep connections alive (and Render awake) while a game is on
setInterval(() => { for (const r of rooms.values()) for (const c of r.players.values()) { if (!c.alive) { c.socket.destroy(); continue; } c.alive = false; sendFrame(c, Buffer.alloc(0), 0x9); } }, 20000);

/* ---------- rooms ---------- */
const rooms = new Map(); let nextId = 1;
const HEROES = ['supernan', 'bulwark', 'frost', 'volt', 'kage', 'squeak', 'luna', 'brine', 'samunai', 'regina', 'shade', 'mirror', 'sable', 'anu', 'celeste', 'ash'];
const ROLES = ['guard', 'assassin', 'roamer'];
const BAN_SECS = 20, PICK_SECS = 30, START_SECS = 5;
function code() { const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s; do { s = 'RAT-'; for (let i = 0; i < 4; i++) s += L[Math.floor(Math.random() * L.length)]; } while (rooms.has(s)); return s; }
function hello(c) { c.id = 'p' + (nextId++); send(c, {t: 'hello', id: c.id}); }
const team = (r, t) => [...r.players.values()].filter(p => p.team === t);
const full = r => r.players.size === MAX[r.mode] && team(r, 0).length === team(r, 1).length;
function lobby(r) { const list = [...r.players.values()].map(p => ({id: p.id, name: p.name, team: p.team, role: p.role, heroes: p.heroes, host: p.id === r.host}));
  const D = r.draft && {seq: r.draft.seq, i: r.draft.i, bans: r.draft.bans, left: Math.max(0, Math.ceil((r.draft.until - Date.now()) / 1000))};
  for (const p of r.players.values()) send(p, {t: 'lobby', code: r.code, mode: r.mode, started: r.started, host: r.host, phase: r.phase, full: full(r), max: MAX[r.mode], draft: D, players: list}); }
/* ---------- the draft, MOBA style: bans and picks take turns, one player at a time, each with a timer ---------- */
function startDraft(r) {
  const T0 = team(r, 0), T1 = team(r, 1), per = r.mode === '3v3' ? 1 : 3, nb = r.mode === '3v3' ? 2 : 1, seq = [];
  // bans alternate SUN, MOON, SUN, MOON...; each team's bans go round its players
  for (let k = 0; k < nb; k++) { seq.push({type: 'ban', team: 0, pid: T0[k % T0.length].id}); seq.push({type: 'ban', team: 1, pid: T1[k % T1.length].id}); }
  // picks snake: SUN 1, MOON 2, SUN 2, MOON 2, ... so nobody gets two first picks in a row; each team's picks go round its players
  const order = [], left = [T0.length * per, T1.length * per]; let t = 0, step = 1; while (left[0] + left[1] > 0) { for (let k = 0; k < step && left[t] > 0; k++) { order.push(t); left[t]--; } t = 1 - t; step = 2; }
  const cnt = [0, 0]; for (const tt of order) { const T = tt ? T1 : T0; seq.push({type: 'pick', team: tt, pid: T[Math.floor(cnt[tt]++ / per) % T.length].id}); }
  // a player's 3 picks in 2v2 are spread out: rotate players inside the team instead
  if (per > 1) { const c2 = [0, 0]; for (const s of seq) if (s.type === 'pick') { const T = s.team ? T1 : T0; s.pid = T[c2[s.team]++ % T.length].id; } }
  for (const p of r.players.values()) p.heroes = [];
  r.draft = {seq, i: 0, bans: [], until: 0}; r.phase = 'draft'; nextTurn(r, true); }
function nextTurn(r, first) { const D = r.draft; clearTimeout(D.timer); if (!first) D.i++;
  if (D.i >= D.seq.length) { r.phase = 'done'; D.until = Date.now() + START_SECS * 1000; lobby(r); D.timer = setTimeout(() => startMatch(r), START_SECS * 1000); return; }
  const s = D.seq[D.i]; D.until = Date.now() + (s.type === 'ban' ? BAN_SECS : PICK_SECS) * 1000; D.timer = setTimeout(() => autoAct(r), (s.type === 'ban' ? BAN_SECS : PICK_SECS) * 1000 + 300); lobby(r); }
const taken = r => new Set([...r.draft.bans.filter(b => b !== 'skip'), ...[...r.players.values()].flatMap(p => p.heroes)]);
function act(r, pid, hero) { const D = r.draft; if (r.phase !== 'draft') return; const s = D.seq[D.i]; if (!s || s.pid !== pid) return; const T = taken(r);
  if (s.type === 'ban') { if (hero !== 'skip' && (!HEROES.includes(hero) || T.has(hero))) return; D.bans.push(hero); s.hero = hero; }
  else { if (!HEROES.includes(hero) || T.has(hero)) return; r.players.get(pid).heroes.push(hero); s.hero = hero; }
  nextTurn(r); }
function autoAct(r) { if (r.phase !== 'draft') return; const s = r.draft.seq[r.draft.i]; if (s.type === 'ban') return act(r, s.pid, 'skip'); const free = HEROES.filter(h => !taken(r).has(h)); act(r, s.pid, free[Math.floor(Math.random() * free.length)]); }
function startMatch(r) { if (r.phase !== 'done' || r.started) return; r.started = true; const players = [...r.players.values()].map(p => ({id: p.id, name: p.name, team: p.team, role: p.role, heroes: p.heroes}));
  for (const p of r.players.values()) send(p, {t: 'start', mode: r.mode, host: r.host, players, seed: Math.floor(Math.random() * 1e9)}); }
function resetLobby(r, why) { if (r.draft) clearTimeout(r.draft.timer); r.draft = null; r.phase = 'lobby'; r.started = false; for (const p of r.players.values()) p.heroes = []; if (why) for (const p of r.players.values()) send(p, {t: 'note', msg: why}); }
function freeRole(r, c) { const used = team(r, c.team).filter(p => p !== c).map(p => p.role); return ROLES.find(x => !used.includes(x)) || 'roamer'; }
function leave(c) { const r = c.room && rooms.get(c.room); c.room = null; if (!r) return; r.players.delete(c.id);
  if (!r.players.size) { if (r.draft) clearTimeout(r.draft.timer); rooms.delete(r.code); return; }
  if (r.host === c.id) { for (const p of r.players.values()) { send(p, {t: 'hostleft'}); p.room = null; } if (r.draft) clearTimeout(r.draft.timer); rooms.delete(r.code); return; }
  for (const p of r.players.values()) send(p, {t: 'left', id: c.id, name: c.name});
  if (!r.started && r.phase !== 'lobby') resetLobby(r, (c.name || 'A player') + ' left, so the draft starts over'); lobby(r); }
function onMessage(c, text) {
  let m; try { m = JSON.parse(text); } catch (e) { return; }
  if (!m || typeof m.t !== 'string') return;
  if (m.t === 'create') { if (c.room) leave(c); const r = {code: code(), mode: m.mode === '3v3' ? '3v3' : '2v2', host: c.id, players: new Map(), started: false, phase: 'lobby', draft: null}; rooms.set(r.code, r);
    Object.assign(c, {name: String(m.name || 'Hunter').slice(0, 14), team: 0, role: 'guard', heroes: [], room: r.code}); r.players.set(c.id, c); send(c, {t: 'joined', code: r.code, id: c.id, host: true, mode: r.mode}); lobby(r); return; }
  if (m.t === 'join') { const r = rooms.get(String(m.code || '').toUpperCase().trim()); if (!r) return send(c, {t: 'err', msg: 'No room with that code'}); if (r.started || r.phase !== 'lobby') return send(c, {t: 'err', msg: 'That room is already drafting or playing'}); if (r.players.size >= MAX[r.mode]) return send(c, {t: 'err', msg: 'That room is full'});
    if (c.room) leave(c); const n0 = team(r, 0).length, n1 = team(r, 1).length;
    Object.assign(c, {name: String(m.name || 'Hunter').slice(0, 14), team: n0 <= n1 ? 0 : 1, heroes: [], room: r.code}); c.role = freeRole(r, c); r.players.set(c.id, c); send(c, {t: 'joined', code: r.code, id: c.id, host: false, mode: r.mode}); lobby(r); return; }
  const r = c.room && rooms.get(c.room); if (!r) return;
  if (m.t === 'set') { if (r.phase !== 'lobby') return; const per = MAX[r.mode] / 2;
    if ((m.team === 0 || m.team === 1) && m.team !== c.team && team(r, m.team).length < per) { c.team = m.team; c.role = freeRole(r, c); }
    if (ROLES.includes(m.role) && !team(r, c.team).some(p => p !== c && p.role === m.role)) c.role = m.role;
    lobby(r); return; }
  if (m.t === 'draft') { if (c.id !== r.host || r.phase !== 'lobby' || !full(r)) return; if (r.mode === '3v3') for (const t of [0, 1]) { const T = team(r, t), used = new Set(); for (const p of T) { if (used.has(p.role)) p.role = ROLES.find(x => !used.has(x)); used.add(p.role); } } startDraft(r); return; }
  if (m.t === 'act') { act(r, c.id, String(m.hero || '')); return; }
  if (m.t === 'backToLobby') { if (c.id !== r.host) return; resetLobby(r); for (const p of r.players.values()) send(p, {t: 'lobbyAgain'}); lobby(r); return; }
  // everything else is game traffic: pass it on (to one player, or to everyone else in the room)
  m.from = c.id; const out = JSON.stringify(m);
  if (m.to) { const p = r.players.get(m.to); if (p) send(p, out); }
  else for (const p of r.players.values()) if (p !== c) send(p, out);
}
// the draft clock, sent once a second so everyone's timer stays right
setInterval(() => { for (const r of rooms.values()) if (r.phase === 'draft' || r.phase === 'done') lobby(r); }, 1000);

server.listen(PORT, () => console.log('Rat Arena running on http://localhost:' + PORT));
