// ゲームエンジン:描画・入力・会話・セーブ
const TILE = 16, VIEW_W = 20, VIEW_H = 15;
const SAVE_KEY = "secquest_save";
const SIG_SALT = "s3cQ_salt_v1";

// 外から見える部分は player だけ。
const game = { player: { x: 3, y: 10, dir: "down", clearance: 1 } };
window.game = game;

const Engine = (function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  canvas.width = VIEW_W * TILE;
  canvas.height = VIEW_H * TILE;
  ctx.imageSmoothingEnabled = false;

  const dialogEl = document.getElementById("dialog");
  const hudArea = document.getElementById("hud-area");
  const hudCount = document.getElementById("hud-count");

  const state = { flags: new Set(), role: "guest" };
  let world = null;
  let ui = null; // 会話中の状態
  let tick = 0;
  let notice = null;

  // ---------- セーブ ----------
  function sign(flags) { return sha256(flags.join(",") + "|" + SIG_SALT).slice(0, 16); }

  function save() {
    const flags = [...state.flags].sort();
    const data = { flags, sig: sign(flags), role: state.role, x: game.player.x, y: game.player.y };
    try { localStorage.setItem(SAVE_KEY, btoa(JSON.stringify(data))); } catch (e) {}
  }

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
    if (!raw) return;
    try {
      const data = JSON.parse(atob(raw));
      const flags = Array.isArray(data.flags) ? data.flags.slice().sort() : [];
      if (data.sig === sign(flags)) {
        flags.forEach(f => state.flags.add(f));
      } else {
        notice = "セーブデータの改ざんを検知した。進行状況は破棄された。";
      }
      if (typeof data.role === "string") state.role = data.role;
      if (Number.isInteger(data.x) && Number.isInteger(data.y)) {
        game.player.x = data.x; game.player.y = data.y;
      }
    } catch (e) {
      notice = "セーブデータが読めなかった。";
    }
  }

  function reset() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    location.reload();
  }

  // ---------- 会話 ----------
  function esc(s) { return s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

  function say(name, pages, then) {
    ui = { kind: "say", name, pages: [].concat(pages), i: 0, then };
    renderDialog();
  }

  function ask(name, question, onAnswer) {
    ui = { kind: "ask", name, question, onAnswer };
    dialogEl.innerHTML = (name ? `<div class="name">${esc(name)}</div>` : "") +
      `<div>${esc(question)}</div><input id="answer" autocomplete="off" spellcheck="false">`;
    dialogEl.style.display = "block";
    const input = document.getElementById("answer");
    setTimeout(() => input.focus(), 0);
    input.addEventListener("keydown", e => {
      e.stopPropagation();
      if (e.key === "Enter") { const v = input.value; close(); onAnswer(v); }
      if (e.key === "Escape") close();
    });
  }

  function renderDialog() {
    const p = ui.pages[ui.i];
    dialogEl.innerHTML = (ui.name ? `<div class="name">${esc(ui.name)}</div>` : "") +
      `<div>${esc(p)}</div><div class="more">▼</div>`;
    dialogEl.style.display = "block";
  }

  function advance() {
    if (!ui || ui.kind !== "say") return;
    ui.i++;
    if (ui.i >= ui.pages.length) { const t = ui.then; close(); if (t) t(); }
    else renderDialog();
  }

  function close() { ui = null; dialogEl.style.display = "none"; dialogEl.innerHTML = ""; }

  // ---------- 判定 ----------
  function check(input, hash) { return sha256(String(input).trim().toUpperCase()) === hash; }

  function setFlag(f) { state.flags.add(f); save(); }
  function has(f) { return state.flags.has(f); }

  // ---------- 入力 ----------
  const held = new Set();
  let moveCooldown = 0;
  const DIRS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
                 w: "up", s: "down", a: "left", d: "right" };
  const DELTA = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  window.addEventListener("keydown", e => {
    if (ui && ui.kind === "ask") return;
    if (DIRS[e.key]) { held.add(e.key); e.preventDefault(); }
    if (e.key === " " || e.key === "Enter" || e.key === "z") {
      e.preventDefault();
      if (e.repeat) return;
      if (ui) advance(); else interact();
    }
  });
  window.addEventListener("keyup", e => held.delete(e.key));

  function objectAt(x, y) { return world.objects.find(o => o.x === x && o.y === y); }

  function solidAt(x, y) {
    if (x < 0 || y < 0 || x >= world.w || y >= world.h) return true;
    const o = objectAt(x, y);
    if (o) return typeof o.solid === "function" ? o.solid() : o.solid !== false;
    return world.isSolidTile(world.tiles[y][x]);
  }

  function interact() {
    const [dx, dy] = DELTA[game.player.dir];
    const o = objectAt(game.player.x + dx, game.player.y + dy);
    if (o && o.interact) o.interact();
  }

  function update() {
    if (moveCooldown > 0) moveCooldown--;
    if (ui || moveCooldown > 0) return;
    const key = [...held].pop();
    if (!key) return;
    const dir = DIRS[key];
    game.player.dir = dir;
    const [dx, dy] = DELTA[dir];
    const nx = game.player.x + dx, ny = game.player.y + dy;
    if (!solidAt(nx, ny)) { game.player.x = nx; game.player.y = ny; }
    moveCooldown = 7;
  }

  // ---------- 描画 ----------
  function draw() {
    const p = game.player;
    const camX = Math.max(0, Math.min(world.w - VIEW_W, p.x - Math.floor(VIEW_W / 2)));
    const camY = Math.max(0, Math.min(world.h - VIEW_H, p.y - Math.floor(VIEW_H / 2)));
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < VIEW_H; y++) {
      for (let x = 0; x < VIEW_W; x++) {
        const wx = camX + x, wy = camY + y;
        if (wy < world.h && wx < world.w) Art.tile(ctx, world.tiles[wy][wx], x * TILE, y * TILE, wx, wy, tick);
      }
    }
    for (const o of world.objects) {
      const sx = (o.x - camX) * TILE, sy = (o.y - camY) * TILE;
      if (sx < -TILE || sy < -TILE || sx > canvas.width || sy > canvas.height) continue;
      Art.object(ctx, o, sx, sy, tick);
    }
    Art.person(ctx, (p.x - camX) * TILE, (p.y - camY) * TILE, Art.PLAYER, p.dir);
    hudArea.textContent = world.areaName(p.x);
    hudCount.textContent = `解いた謎 ${world.solvedCount()} / ${world.totalPuzzles}`;
  }

  function loop() {
    tick++;
    update();
    draw();
    requestAnimationFrame(loop);
  }

  function start(w) {
    world = w;
    load();
    if (solidAt(game.player.x, game.player.y)) { game.player.x = 3; game.player.y = 10; }
    if (notice) say("SYSTEM", notice, () => save());
    else if (state.flags.size === 0) world.intro();
    loop();
  }

  return { start, say, ask, check, setFlag, has, reset, getRole: () => state.role };
})();
