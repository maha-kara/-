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
  const held = [];
  const MOVE_FRAMES = 8;
  const mv = { active: false, fx: 0, fy: 0, t: 0, steps: 0 };
  const DIRS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
                 w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
  const DELTA = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

  window.addEventListener("keydown", e => {
    if (ui && ui.kind === "ask") return;
    if (DIRS[e.key]) { if (!held.includes(e.key)) held.push(e.key); e.preventDefault(); }
    if (e.key === " " || e.key === "Enter" || e.key === "z") {
      e.preventDefault();
      if (e.repeat) return;
      if (ui) advance(); else if (!mv.active) interact();
    }
  });
  window.addEventListener("keyup", e => { const i = held.indexOf(e.key); if (i >= 0) held.splice(i, 1); });
  window.addEventListener("blur", () => { held.length = 0; });

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
    if (!o || !o.interact) return;
    if (o.sprite === "npc") o.dir = OPPOSITE[game.player.dir];
    o.interact();
  }

  function update() {
    if (mv.active) {
      mv.t++;
      if (mv.t >= MOVE_FRAMES) mv.active = false;
      else return;
    }
    if (ui) return;
    const key = held[held.length - 1];
    if (!key) return;
    const dir = DIRS[key];
    game.player.dir = dir;
    const [dx, dy] = DELTA[dir];
    const nx = game.player.x + dx, ny = game.player.y + dy;
    if (solidAt(nx, ny)) return;
    Object.assign(mv, { active: true, fx: game.player.x, fy: game.player.y, t: 0 });
    mv.steps++;
    game.player.x = nx; game.player.y = ny;
  }

  // ---------- 描画 ----------
  function renderPos() {
    const p = game.player;
    if (!mv.active) return [p.x * TILE, p.y * TILE];
    const k = mv.t / MOVE_FRAMES;
    return [Math.round((mv.fx + (p.x - mv.fx) * k) * TILE), Math.round((mv.fy + (p.y - mv.fy) * k) * TILE)];
  }

  function draw() {
    const p = game.player;
    const [prx, pry] = renderPos();
    const cw = canvas.width, ch = canvas.height;
    const camX = Math.max(0, Math.min(world.w * TILE - cw, prx + 8 - cw / 2));
    const camY = Math.max(0, Math.min(world.h * TILE - ch, pry + 8 - ch / 2));
    const tx0 = Math.floor(camX / TILE), ty0 = Math.floor(camY / TILE);
    const tileAt = (x, y) => (x < 0 || y < 0 || x >= world.w || y >= world.h) ? "#" : world.tiles[y][x];

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);
    for (let y = ty0; y <= ty0 + VIEW_H; y++) {
      for (let x = tx0; x <= tx0 + VIEW_W; x++) {
        if (x >= world.w || y >= world.h) continue;
        Art.ground(ctx, world.tiles[y][x], x * TILE - camX, y * TILE - camY, x, y, tick, (dx, dy) => tileAt(x + dx, y + dy));
      }
    }

    // 背の高いものは y の順に描く(奥から手前へ)
    const items = [];
    for (let y = ty0; y <= ty0 + VIEW_H + 1; y++) for (let x = tx0 - 1; x <= tx0 + VIEW_W + 1; x++) {
      if (tileAt(x, y) === "T" && x >= 0 && y < world.h) items.push({ y: y * TILE, kind: "tree", x, ty: y });
    }
    for (const o of world.objects) {
      if (o.x < tx0 - 3 || o.x > tx0 + VIEW_W + 1 || o.y < ty0 - 1 || o.y > ty0 + VIEW_H + 4) continue;
      items.push({ y: o.y * TILE + (o.flat ? -1 : 0), kind: "obj", o });
    }
    items.push({ y: pry + 0.5, kind: "player" });
    items.sort((a, b) => a.y - b.y);

    const lights = [];
    const walkFrame = mv.active && mv.t < MOVE_FRAMES * 0.75 ? (mv.steps % 2 ? 1 : 2) : 0;
    for (const it of items) {
      if (it.kind === "tree") Art.tree(ctx, it.x * TILE - camX, it.ty * TILE - camY, it.x, it.ty);
      else if (it.kind === "obj") Art.object(ctx, it.o, it.o.x * TILE - camX, it.o.y * TILE - camY, tick, lights);
      else Art.character(ctx, prx - camX, pry - camY, p.dir, walkFrame);
    }
    Art.atmosphere(ctx, cw, ch, camX, tick, lights);

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
