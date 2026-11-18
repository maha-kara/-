// ドット絵の描画
// すべて手続き的に描いている。外部で描いた画像に差し替えたい場合は js/assets-config.js を参照。
const Art = (function () {
  const OUT = "#1a1020";
  const C = {
    grass: "#4f9a3b", grassD: "#3a7a2e", grassL: "#6cbf4a", grassDD: "#2e6326",
    path: "#d2a86a", pathD: "#b88b52", pathL: "#e6c48a",
    pave: "#a39e93", paveD: "#7f7a70", paveL: "#bdb8ad",
    water: "#1f4e8c", waterM: "#2d6cb5", waterL: "#6aa8e8", foam: "#e8f4ff",
    wood: "#8b5a2b", woodD: "#5e3a1a", woodL: "#b07a40",
    stone: "#5c6170", stoneD: "#3a3d48", stoneL: "#8a8f9e", stoneT: "#6b7080",
    lab: "#1b2130", labLine: "#273044", labL: "#323d55", accent: "#00d1b2",
    labWall: "#2b3550", labWallT: "#3d4a6b", labWallD: "#161b2b", cyan: "#5ef2ff",
  };

  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; }
  function px(ctx, c, x, y, w = 1, h = 1) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function makeCanvas(w, h, fn) { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d")); return c; }

  // ---------- 差し替え画像 ----------
  const TILE_ORDER = ".T,s~bX#=Wfh";
  const over = { tiles: null, player: null };
  if (typeof ASSET_OVERRIDES === "object") {
    for (const k of Object.keys(over)) {
      if (!ASSET_OVERRIDES[k]) continue;
      const img = new Image();
      img.onload = () => { over[k] = img; };
      img.src = ASSET_OVERRIDES[k];
    }
  }

  // ---------- 文字列で書いたスプライト ----------
  const cache = new Map();
  function sprite(key, rows, pal, flip) {
    const k = key + (flip ? "|f" : "");
    if (cache.has(k)) return cache.get(k);
    const h = rows.length, w = rows[0].length;
    const c = makeCanvas(w, h, g => {
      rows.forEach((row, y) => {
        for (let x = 0; x < w; x++) {
          const col = pal[row[x]];
          if (!col) continue;
          g.fillStyle = col;
          g.fillRect(flip ? w - 1 - x : x, y, 1, 1);
        }
      });
    });
    cache.set(k, c);
    return c;
  }

  // ---------- 人物 ----------
  const HEAD = {
    down: ["................", ".....oooooo.....", "....oHHHHHHo....", "...oHHhhHHHHo...",
           "...oHHHHHHHHo...", "...oHSSSSSSHo...", "...oSSESSESSo...", "....oSSSSSSo...."],
    up:   ["................", ".....oooooo.....", "....oHHHHHHo....", "...oHHHHHHHHo...",
           "...oHHHHhhHHo...", "...oHHHHHHHHo...", "...oHHHHHHHHo...", "....oHHHHHHo...."],
    side: ["................", ".....oooooo.....", "....oHHHHHHo....", "...oHHHHhhHHo...",
           "...oHHHHHHHSo...", "...oHHHHSSSSo...", "...oHHHSSSESo...", "....oHSSSSSo...."],
  };
  const BODY = {
    down: ["....oCCCCCCo....", "...oSCCccCCSo...", "...oSCCCCCCSo...", "....ocCCCCco...."],
    up:   ["....oCCCCCCo....", "...oSCCCCCCSo...", "...oSCCCCCCSo...", "....ocCCCCco...."],
    side: ["....oCCCCCCo....", "....oCCSSCCo....", "....oCCSSCCo....", "....ocCCCCco...."],
  };
  const LEGS = [
    ["....oPPPPPPo....", "....oPPooPPo....", "....oBBooBBo....", ".....oo..oo....."],
    ["....oPPPPPPo....", "....oBBooPPo....", ".....oo.oBBo....", ".........oo....."],
    ["....oPPPPPPo....", "....oPPooBBo....", "....oBBo.oo.....", ".....oo........."],
  ];
  // 帽子やひげなど(上から重ねる)
  const ACC = {
    helmet: { rows: ["....oooooooo....", "...oMMMMMMMMo...", "..oMmMMMMMMMMo..", "...oooooooooo..."], y: 0 },
    cap:    { rows: [".....oooooo.....", "....oWWWWWWo....", "...oNNNNNNNNo...", "..oooooooooooo.."], y: 0 },
    beard:  { rows: ["....oGGGGGGo....", "....oGGGGGGo....", ".....oGGGGo.....", "......oooo......"], y: 7, only: ["down", "side"] },
    goggles:{ rows: ["...oYYoooYYo....", "...oYyo.oYyo...."], y: 5, only: ["down"] },
  };
  const ACC_PAL = { o: OUT, M: "#7d8796", m: "#b8c2cf", W: "#f5f5f5", N: "#1a237e", G: "#eeeeee", Y: "#ffd54f", y: "#fff8e1" };

  function personSprite(key, pal, dir, frame, accName) {
    const d = dir === "left" || dir === "right" ? "side" : dir;
    const rows = [...HEAD[d], ...BODY[d], ...LEGS[frame]];
    const fullPal = Object.assign({ o: OUT, E: OUT }, pal);
    const id = `${key}|${d}|${frame}|${accName || ""}`;
    const base = sprite(id, rows, fullPal, dir === "left");
    if (!accName) return base;
    const acc = ACC[accName];
    if (acc.only && !acc.only.includes(d)) return base;
    const ck = id + "|acc" + (dir === "left" ? "|f" : "");
    if (cache.has(ck)) return cache.get(ck);
    const c = makeCanvas(16, 16, g => {
      g.drawImage(base, 0, 0);
      g.drawImage(sprite("acc_" + accName, acc.rows, ACC_PAL, dir === "left"), 0, acc.y);
    });
    cache.set(ck, c);
    return c;
  }

  const PLAYER = { H: "#2b1d14", h: "#4a3426", S: "#f1c27d", C: "#d1495b", c: "#a1334a", P: "#2e4057", B: "#3b2a1a" };

  function shadow(ctx, x, y, w = 10) {
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(x + 8 - w / 2 + 1, y + 15, w - 2, 1);
    ctx.fillRect(x + 8 - w / 2, y + 14, w, 1);
  }

  function character(ctx, x, y, dir, frame, opts = {}) {
    shadow(ctx, x, y);
    if (!opts.pal && over.player) {
      const row = { down: 0, left: 1, right: 2, up: 3 }[dir];
      ctx.drawImage(over.player, frame * 16, row * 16, 16, 16, x, y, 16, 16);
      return;
    }
    const bob = frame ? -1 : 0;
    ctx.drawImage(personSprite(opts.key || "player", opts.pal || PLAYER, dir, frame, opts.acc), x, y + bob);
  }

  // ---------- 木 ----------
  const TREE = [0, 1].map(v => makeCanvas(22, 22, g => {
    const blobs = [[11, 9, 8], [6, 12, 6], [16, 12, 6], [11, 5, 5]];
    const inside = (x, y) => blobs.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r);
    const pal = v ? ["#2a5a2a", "#3d7d3a", "#5aa84a", "#7fcf5e"] : ["#244d26", "#326b33", "#4a9142", "#6db85a"];
    for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      let col;
      if (edge) col = "#18301a";
      else {
        const l = (11 - x) * 0.6 + (8 - y) + ((hash(x, y + v * 50) % 5) - 2);
        col = l > 5 ? pal[3] : l > 0 ? pal[2] : l > -5 ? pal[1] : pal[0];
      }
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    if (v) [[7, 9], [14, 7], [12, 14], [5, 13]].forEach(([x, y]) => { g.fillStyle = "#e53935"; g.fillRect(x, y, 2, 2); g.fillStyle = "#ff8a80"; g.fillRect(x, y, 1, 1); });
  }));

  function tree(ctx, x, y, wx, wy) {
    px(ctx, OUT, x + 6, y + 8, 4, 7);
    px(ctx, "#6b4226", x + 7, y + 8, 2, 7);
    px(ctx, "#8d5a33", x + 7, y + 8, 1, 6);
    ctx.drawImage(TREE[hash(wx, wy) % 4 === 0 ? 1 : 0], x - 3, y - 9);
  }

  // ---------- 地面 ----------
  const isPathLike = t => t === "," || t === "G";
  const isWater = t => t === "~";

  function grass(ctx, x, y, wx, wy) {
    px(ctx, C.grass, x, y, 16, 16);
    for (let i = 0; i < 6; i++) {
      const v = hash(wx * 7 + i, wy * 13 + i * 3);
      px(ctx, i % 2 ? C.grassD : C.grassL, x + (v % 16), y + ((v >> 5) % 16));
    }
    const r = hash(wx, wy);
    if (r % 4 === 0) { const tx = x + (r >> 3) % 12 + 1, ty = y + (r >> 7) % 10 + 3;
      px(ctx, C.grassDD, tx, ty, 1, 2); px(ctx, C.grassDD, tx + 2, ty, 1, 2); px(ctx, C.grassD, tx + 1, ty + 1, 1, 1); }
  }

  function ground(ctx, t, x, y, wx, wy, tick, nb) {
    if (over.tiles) {
      const i = TILE_ORDER.indexOf(t);
      if (i >= 0) { ctx.drawImage(over.tiles, i * 16, 0, 16, 16, x, y, 16, 16); return; }
    }
    const r = hash(wx, wy);
    switch (t) {
      case ".": case "h": grass(ctx, x, y, wx, wy); break;
      case "T":
        grass(ctx, x, y, wx, wy);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(x + 1, y + 12, 14, 3); ctx.fillRect(x + 3, y + 11, 10, 5);
        break;
      case "f": {
        grass(ctx, x, y, wx, wy);
        const cols = ["#f06292", "#fff176", "#ffffff", "#ba68c8", "#ff8a65"];
        for (let i = 0; i < 3; i++) {
          const v = hash(wx + i * 17, wy - i * 5);
          const fx = x + 2 + v % 11, fy = y + 2 + (v >> 6) % 11;
          px(ctx, C.grassDD, fx + 1, fy + 2, 1, 2);
          px(ctx, cols[(v >> 9) % cols.length], fx, fy, 3, 1); px(ctx, cols[(v >> 9) % cols.length], fx + 1, fy - 1, 1, 3);
          px(ctx, "#ffeb3b", fx + 1, fy, 1, 1);
        }
        break;
      }
      case ",": {
        px(ctx, C.path, x, y, 16, 16);
        for (let i = 0; i < 5; i++) { const v = hash(wx * 3 + i, wy * 5 - i); px(ctx, i % 2 ? C.pathD : C.pathL, x + v % 15, y + (v >> 4) % 15, i % 3 ? 1 : 2, 1); }
        // 草との境目
        const sides = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        sides.forEach(([dx, dy], si) => {
          const n = nb(dx, dy);
          if (isPathLike(n) || n === "s" || n === "=") return;
          for (let i = 0; i < 16; i++) {
            const d = 1 + (hash(wx * 31 + i, wy * 17 + si) % 3);
            const [ax, ay, w, h] = si === 0 ? [i, 0, 1, d] : si === 1 ? [i, 16 - d, 1, d] : si === 2 ? [0, i, d, 1] : [16 - d, i, d, 1];
            px(ctx, C.grass, x + ax, y + ay, w, h);
            const [bx, by] = si === 0 ? [i, d] : si === 1 ? [i, 15 - d] : si === 2 ? [d, i] : [15 - d, i];
            px(ctx, C.pathD, x + bx, y + by);
          }
        });
        break;
      }
      case "s": {
        px(ctx, C.pave, x, y, 16, 16);
        const off = (wy % 2) ? 4 : 0;
        for (let row = 0; row < 2; row++) for (let col = -1; col < 2; col++) {
          const bx = x + col * 8 + off + (row ? 4 : 0), by = y + row * 8;
          const L = Math.max(bx, x), R = Math.min(bx + 8, x + 16);
          if (R <= L) continue;
          const shade = hash(wx * 4 + col, wy * 2 + row) % 3;
          px(ctx, shade === 0 ? C.paveL : shade === 1 ? C.pave : "#97928a", L, by, R - L, 8);
          px(ctx, C.paveD, L, by + 7, R - L, 1);
          if (bx + 7 < x + 16 && bx + 7 >= x) px(ctx, C.paveD, bx + 7, by, 1, 8);
          px(ctx, "#c9c4b9", L, by, Math.min(3, R - L), 1);
        }
        if (r % 7 === 0) px(ctx, "#6b8f3a", x + r % 14, y + 7, 2, 1);
        break;
      }
      case "~": {
        px(ctx, C.water, x, y, 16, 16);
        for (let i = 0; i < 3; i++) {
          const ph = (tick / 18 + wx * 1.7 + wy * 2.3 + i * 2.1);
          const ox = Math.floor((Math.sin(ph) + 1) * 5) + (i * 5) % 8;
          px(ctx, i === 0 ? C.waterL : C.waterM, x + ox, y + 3 + i * 5, 3 + (i % 2), 1);
        }
        const up = nb(0, -1);
        if (!isWater(up) && up !== "b") {
          const f = Math.floor((Math.sin(tick / 20 + wx) + 1) * 1.5);
          px(ctx, "#163a6b", x, y, 16, 2);
          px(ctx, C.foam, x, y + 1 + f, 16, 1);
          for (let i = 0; i < 16; i += 3) if (hash(wx + i, tick >> 5) % 2) px(ctx, C.waterL, x + i, y + 2 + f, 2, 1);
        }
        break;
      }
      case "b": {
        px(ctx, C.water, x, y, 16, 16);
        px(ctx, C.wood, x + 1, y, 14, 16);
        for (let i = 0; i < 4; i++) { px(ctx, C.woodD, x + 1, y + i * 4 + 3, 14, 1); px(ctx, C.woodL, x + 1, y + i * 4, 14, 1); }
        px(ctx, OUT, x, y, 1, 16); px(ctx, OUT, x + 15, y, 1, 16);
        px(ctx, "#cfd8dc", x + 3, y + 1, 1, 1); px(ctx, "#cfd8dc", x + 12, y + 1, 1, 1);
        if (!["b"].includes(nb(0, 1)) && isWater(nb(0, 1))) { px(ctx, C.woodD, x + 2, y + 13, 2, 3); px(ctx, C.woodD, x + 12, y + 13, 2, 3); }
        break;
      }
      case "X": {
        ground(ctx, "s", x, y, wx, wy, tick, nb);
        px(ctx, "rgba(0,0,0,0.3)", x + 2, y + 13, 14, 3);
        px(ctx, OUT, x + 1, y + 1, 14, 14);
        px(ctx, "#b5763a", x + 2, y + 2, 12, 12);
        px(ctx, "#8a5527", x + 2, y + 2, 12, 2); px(ctx, "#8a5527", x + 2, y + 12, 12, 2);
        for (let i = 0; i < 10; i++) px(ctx, "#8a5527", x + 3 + i, y + 3 + i, 2, 1);
        px(ctx, "#d4995a", x + 2, y + 4, 1, 8);
        break;
      }
      case "#": {
        const front = nb(0, 1) !== "#";
        px(ctx, C.stoneT, x, y, 16, 16);
        for (let row = 0; row < 2; row++) {
          const o = (wy + row) % 2 ? 0 : 5;
          px(ctx, C.stoneD, x, y + row * 8 + 7, 16, 1);
          for (let k = o; k < 16; k += 10) px(ctx, C.stoneD, x + k, y + row * 8, 1, 7);
          px(ctx, C.stoneL, x, y + row * 8, 16, 1);
        }
        if (r % 5 === 0) px(ctx, "#6a8f43", x + r % 12, y + 15, 3, 1);
        if (front) { px(ctx, C.stoneD, x, y + 12, 16, 4); px(ctx, OUT, x, y + 15, 16, 1); px(ctx, C.stone, x, y + 12, 16, 1); }
        break;
      }
      case "=": {
        px(ctx, C.lab, x, y, 16, 16);
        px(ctx, C.labL, x, y, 15, 1); px(ctx, C.labL, x, y, 1, 15);
        px(ctx, "#10141e", x + 15, y, 1, 16); px(ctx, "#10141e", x, y + 15, 16, 1);
        px(ctx, C.labLine, x + 2, y + 2, 1, 1); px(ctx, C.labLine, x + 13, y + 2, 1, 1);
        px(ctx, C.labLine, x + 2, y + 13, 1, 1); px(ctx, C.labLine, x + 13, y + 13, 1, 1);
        if (r % 4 === 0) {
          // 床を走る回路
          const horiz = r % 8 === 0;
          px(ctx, "#0f3b3a", x + (horiz ? 0 : 7), y + (horiz ? 7 : 0), horiz ? 16 : 2, horiz ? 2 : 16);
          const p = (tick + r) % 64;
          if (p < 16) px(ctx, C.accent, x + (horiz ? p : 7), y + (horiz ? 7 : p), 2, 2);
        }
        break;
      }
      case "W": {
        const front = nb(0, 1) !== "W";
        px(ctx, C.labWall, x, y, 16, 16);
        px(ctx, C.labWallT, x, y, 16, 2);
        px(ctx, C.labWallD, x, y + 8, 16, 1);
        px(ctx, "#36446a", x + 1, y + 3, 6, 4); px(ctx, "#36446a", x + 9, y + 3, 6, 4);
        px(ctx, "#36446a", x + 1, y + 10, 6, 4); px(ctx, "#36446a", x + 9, y + 10, 6, 4);
        if (wy % 3 === 0) px(ctx, (tick >> 4) % 2 && r % 3 === 0 ? "#ff5252" : C.cyan, x + 7, y + 6, 2, 1);
        if (front) { px(ctx, C.labWallD, x, y + 13, 16, 3); px(ctx, C.cyan, x, y + 13, 16, 1); }
        break;
      }
      default:
        px(ctx, "#000", x, y, 16, 16);
    }
  }

  // ---------- 大きな建物 ----------
  const HOUSE = ["#c0392b", "#2e6da4", "#6d8f2e"].map(roof => makeCanvas(48, 56, g => {
    const p = (c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
    // 壁
    p(OUT, 2, 26, 44, 30);
    p("#e8d8b0", 3, 27, 42, 28);
    p("#d4c08f", 3, 50, 42, 5);
    p("#7a4f2a", 3, 27, 2, 28); p("#7a4f2a", 43, 27, 2, 28); p("#7a4f2a", 3, 27, 42, 2); p("#7a4f2a", 22, 27, 2, 28);
    // 屋根
    for (let y = 0; y < 28; y++) {
      const left = Math.max(0, 14 - Math.floor(y / 2)), right = 48 - left;
      const band = Math.floor(y / 4);
      const base = y % 4 === 3 ? shade(roof, 0.6) : band % 2 ? shade(roof, 0.95) : roof;
      p(base, left, y, right - left, 1);
      if (y % 4 !== 3) for (let x = left + ((band % 2) * 3); x < right; x += 6) p(shade(roof, 0.75), x, y, 1, 1);
      p(OUT, left, y, 1, 1); p(OUT, right - 1, y, 1, 1);
    }
    p(OUT, 14, 0, 20, 1); p(shade(roof, 1.3), 15, 1, 18, 1);
    p(OUT, 0, 27, 48, 1); p("rgba(0,0,0,0.3)", 3, 28, 42, 2);
    // 煙突
    p(OUT, 34, 2, 7, 10); p("#8d6e63", 35, 3, 5, 9); p("#a1887f", 35, 3, 1, 9);
    // 窓
    p(OUT, 29, 33, 11, 10); p("#ffe082", 30, 34, 9, 8); p("#fff8e1", 30, 34, 4, 3);
    p("#7a4f2a", 34, 34, 1, 8); p("#7a4f2a", 30, 37, 9, 1);
    p("#6d4c41", 28, 43, 13, 2); p("#e57373", 30, 42, 2, 1); p("#fff176", 34, 42, 2, 1); p("#ba68c8", 37, 42, 2, 1);
    // 扉
    p(OUT, 8, 37, 12, 19); p("#8b5a2b", 9, 38, 10, 18); p("#a0672f", 9, 38, 10, 2);
    p("#5e3a1a", 13, 40, 1, 16); p("#ffd54f", 16, 47, 2, 2);
    p("#9e9e9e", 7, 55, 14, 1);
  }));

  const LIGHTHOUSE = makeCanvas(16, 46, g => {
    const p = (c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    // 屋根と灯室
    p(OUT, 5, 0, 6, 1); p(OUT, 4, 1, 8, 2); p("#b71c1c", 5, 1, 6, 2);
    p(OUT, 4, 3, 8, 7); p("#455a64", 5, 4, 6, 5);
    p(OUT, 2, 10, 12, 2); p("#37474f", 3, 10, 10, 1);
    // 塔(上ほど細い)
    for (let y = 12; y < 46; y++) {
      const half = 3 + Math.floor((y - 12) / 9);
      const L = 8 - half, R = 8 + half;
      const red = Math.floor((y - 12) / 6) % 2 === 1;
      p(OUT, L - 1, y, 1, 1); p(OUT, R, y, 1, 1);
      p(red ? "#c62828" : "#eeeeee", L, y, R - L, 1);
      p(red ? "#8e1b1b" : "#bdbdbd", R - 2, y, 2, 1);
      p(red ? "#e57373" : "#ffffff", L, y, 1, 1);
    }
    p(OUT, 6, 38, 4, 8); p("#5e3a1a", 7, 39, 2, 7);
    p(OUT, 2, 45, 12, 1);
  });

  // ---------- 置物・装置 ----------
  function object(ctx, o, x, y, tick, lights) {
    const done = o.done ? o.done() : false;
    switch (o.sprite) {
      case "npc": {
        const idle = Math.floor((tick + o.x * 13) / 40) % 6 === 0 ? 1 : 0;
        character(ctx, x, y - idle, o.dir || "down", 0, { pal: o.palette, key: o.name, acc: o.acc });
        break;
      }
      case "sign":
        shadow(ctx, x, y, 8);
        px(ctx, OUT, x + 6, y + 7, 4, 8); px(ctx, "#6b4226", x + 7, y + 7, 2, 8);
        px(ctx, OUT, x + 1, y + 1, 14, 9); px(ctx, "#b07a40", x + 2, y + 2, 12, 7);
        px(ctx, "#cf9a5a", x + 2, y + 2, 12, 1); px(ctx, "#8b5a2b", x + 2, y + 8, 12, 1);
        px(ctx, "#5e3a1a", x + 4, y + 4, 8, 1); px(ctx, "#5e3a1a", x + 4, y + 6, 5, 1);
        break;
      case "stone": {
        shadow(ctx, x, y, 12);
        px(ctx, OUT, x + 2, y, 12, 16); px(ctx, OUT, x + 3, y - 1, 10, 1);
        px(ctx, "#7a7d87", x + 3, y, 10, 15); px(ctx, "#9a9da7", x + 3, y, 3, 15); px(ctx, "#5b5e68", x + 11, y, 2, 15);
        px(ctx, "#6a8f43", x + 3, y + 12, 4, 3); px(ctx, "#84b04f", x + 4, y + 12, 2, 1);
        const glyph = done ? "#80deea" : "#43454c";
        [[5, 3, 6], [5, 6, 4], [8, 6, 2], [5, 9, 6]].forEach(([gx, gy, w]) => px(ctx, glyph, x + gx, y + gy, w, 1));
        if (done) lights.push({ x: x + 8, y: y + 6, r: 18, color: "128,222,234", a: 0.35 + 0.1 * Math.sin(tick / 15) });
        break;
      }
      case "terminal": {
        shadow(ctx, x, y, 14);
        px(ctx, OUT, x + 1, y + 1, 14, 11); px(ctx, "#4a4f5c", x + 2, y + 2, 12, 9); px(ctx, "#5d6373", x + 2, y + 2, 12, 1);
        px(ctx, done ? "#0d2a12" : "#061a0c", x + 3, y + 3, 10, 7);
        if (done) { px(ctx, "#7CFC9A", x + 5, y + 6, 1, 2); px(ctx, "#7CFC9A", x + 6, y + 7, 1, 2); px(ctx, "#7CFC9A", x + 7, y + 5, 1, 3); px(ctx, "#7CFC9A", x + 8, y + 4, 1, 2); }
        else for (let i = 0; i < 3; i++) { const w = 2 + hash(i + (tick >> 5), o.x) % 7; px(ctx, "#4caf50", x + 4, y + 4 + i * 2, w, 1); }
        if ((tick >> 5) % 2 === 0) px(ctx, "#b9f6ca", x + 4, y + 8, 2, 1);
        px(ctx, OUT, x + 5, y + 12, 6, 3); px(ctx, "#3b3f4a", x + 6, y + 12, 4, 2); px(ctx, "#2a2d36", x + 3, y + 14, 10, 1);
        lights.push({ x: x + 8, y: y + 6, r: 20, color: done ? "124,252,154" : "76,175,80", a: 0.3 });
        break;
      }
      case "chest": {
        shadow(ctx, x, y, 14);
        if (done) {
          px(ctx, OUT, x + 1, y + 1, 14, 6); px(ctx, "#5e3a1a", x + 2, y + 2, 12, 4);
          px(ctx, OUT, x + 1, y + 7, 14, 8); px(ctx, "#1a1020", x + 2, y + 7, 12, 2);
          px(ctx, "#8b5a2b", x + 2, y + 9, 12, 5); px(ctx, "#9aa0ab", x + 2, y + 9, 12, 1);
          break;
        }
        px(ctx, OUT, x + 1, y + 3, 14, 12);
        px(ctx, "#8b5a2b", x + 2, y + 4, 12, 10); px(ctx, "#a86f36", x + 2, y + 4, 12, 3);
        px(ctx, "#9aa0ab", x + 2, y + 7, 12, 1); px(ctx, "#9aa0ab", x + 4, y + 4, 1, 10); px(ctx, "#9aa0ab", x + 11, y + 4, 1, 10);
        px(ctx, OUT, x + 6, y + 6, 4, 5); px(ctx, "#ffd54f", x + 7, y + 7, 2, 3); px(ctx, OUT, x + 7, y + 8, 2, 1);
        break;
      }
      case "lighthouse":
        ctx.drawImage(LIGHTHOUSE, x, y - 30);
        px(ctx, done ? "#fff59d" : "#ffca28", x + 5, y - 26, 6, 4);
        lights.push({ x: x + 8, y: y - 24, r: 26, color: "255,236,140", a: 0.55, beam: true });
        break;
      case "house":
        ctx.drawImage(HOUSE[o.variant || 0], x, y - 40);
        lights.push({ x: x + 34, y: y - 2, r: 14, color: "255,224,130", a: 0.25 });
        break;
      case "well":
        shadow(ctx, x, y, 14);
        px(ctx, OUT, x + 1, y + 6, 14, 10); px(ctx, "#8a8f9e", x + 2, y + 7, 12, 8);
        px(ctx, "#6b7080", x + 2, y + 11, 12, 1); px(ctx, "#1f4e8c", x + 3, y + 7, 10, 3);
        px(ctx, OUT, x + 2, y - 4, 1, 10); px(ctx, OUT, x + 13, y - 4, 1, 10);
        px(ctx, OUT, x, y - 6, 16, 3); px(ctx, "#c0392b", x + 1, y - 6, 14, 2);
        px(ctx, "#6b4226", x + 7, y - 3, 2, 6);
        break;
      case "barrel":
        shadow(ctx, x, y, 12);
        px(ctx, OUT, x + 3, y + 2, 10, 13); px(ctx, OUT, x + 2, y + 4, 12, 9);
        px(ctx, "#9c6b30", x + 3, y + 4, 10, 9); px(ctx, "#b5813f", x + 4, y + 3, 8, 11);
        px(ctx, "#5e3a1a", x + 3, y + 5, 10, 1); px(ctx, "#5e3a1a", x + 3, y + 11, 10, 1);
        px(ctx, "#d4995a", x + 5, y + 4, 1, 9);
        break;
      case "lamp": {
        shadow(ctx, x, y, 6);
        px(ctx, OUT, x + 7, y - 6, 2, 21); px(ctx, "#37474f", x + 7, y - 6, 1, 21);
        px(ctx, OUT, x + 5, y - 11, 6, 6); px(ctx, "#ffe082", x + 6, y - 10, 4, 4);
        px(ctx, OUT, x + 5, y + 13, 6, 2);
        lights.push({ x: x + 8, y: y - 8, r: 30, color: "255,200,110", a: 0.45 + 0.05 * Math.sin(tick / 9 + o.x) });
        break;
      }
      case "boat": {
        const b = Math.round(Math.sin(tick / 25) * 1);
        const yy = y + b;
        px(ctx, OUT, x + 1, yy + 6, 30, 8); px(ctx, OUT, x + 3, yy + 14, 26, 1);
        px(ctx, "#8b5a2b", x + 2, yy + 7, 28, 6); px(ctx, "#a86f36", x + 2, yy + 7, 28, 2);
        px(ctx, "#eeeeee", x + 2, yy + 11, 28, 1);
        px(ctx, OUT, x + 15, yy - 14, 2, 21); px(ctx, "#6b4226", x + 15, yy - 14, 1, 21);
        for (let i = 0; i < 12; i++) px(ctx, "#f5f5f5", x + 17, yy - 13 + i, Math.max(1, 10 - Math.abs(i - 5)), 1);
        px(ctx, "rgba(232,244,255,0.6)", x, y + 14, 32, 1);
        break;
      }
      case "gate": {
        if (o.isOpen()) break;
        px(ctx, OUT, x, y, 16, 16);
        px(ctx, "#6b4226", x + 1, y + 1, 14, 14);
        for (let i = 0; i < 4; i++) px(ctx, "#8b5a2b", x + 1 + i * 4, y + 1, 3, 14);
        px(ctx, "#9aa0ab", x + 1, y + 3, 14, 2); px(ctx, "#9aa0ab", x + 1, y + 11, 14, 2);
        px(ctx, "#cfd8dc", x + 7, y + 7, 2, 2);
        break;
      }
      case "door": {
        const open = o.isOpen();
        px(ctx, OUT, x, y - 2, 16, 18);
        px(ctx, "#3d4a6b", x + 1, y - 2, 14, 2);
        if (open) {
          px(ctx, C.lab, x + 2, y, 12, 16); px(ctx, "#4a5578", x + 1, y, 1, 16); px(ctx, "#4a5578", x + 14, y, 1, 16);
          px(ctx, "#7CFC9A", x + 6, y - 1, 4, 1);
          lights.push({ x: x + 8, y: y - 1, r: 12, color: "124,252,154", a: 0.35 });
        } else {
          px(ctx, "#56638a", x + 1, y, 7, 16); px(ctx, "#4a5578", x + 8, y, 7, 16);
          px(ctx, "#6f7ca3", x + 1, y, 1, 16); px(ctx, OUT, x + 7, y, 2, 16);
          for (let i = 0; i < 3; i++) px(ctx, "#ffca28", x + 2, y + 4 + i * 4, 4, 1);
          const blink = (tick >> 4) % 2 ? "#ff5252" : "#b71c1c";
          px(ctx, blink, x + 6, y - 1, 4, 1);
          lights.push({ x: x + 8, y: y - 1, r: 12, color: "255,82,82", a: 0.35 });
        }
        break;
      }
      case "core": {
        const open = o.isOpen();
        const col = open ? "124,252,154" : "255,82,82";
        const bob = Math.round(Math.sin(tick / 20) * 1.5);
        px(ctx, OUT, x, y + 10, 16, 6); px(ctx, "#2b3550", x + 1, y + 11, 14, 4); px(ctx, C.cyan, x + 2, y + 11, 12, 1);
        const cy = y - 6 + bob;
        for (let i = 0; i < 12; i++) {
          const w = i < 6 ? 2 + i : 2 + (11 - i);
          px(ctx, OUT, x + 8 - w / 2 - 1, cy + i, w + 2, 1);
          px(ctx, open ? "#69f0ae" : "#ff5252", x + 8 - w / 2, cy + i, w, 1);
          px(ctx, open ? "#b9f6ca" : "#ff8a80", x + 8 - w / 2, cy + i, 1, 1);
        }
        lights.push({ x: x + 8, y: cy + 6, r: 34, color: col, a: 0.55 + 0.15 * Math.sin(tick / 12) });
        break;
      }
      case "tube": {
        px(ctx, OUT, x + 2, y - 10, 12, 26);
        px(ctx, "#2b3550", x + 3, y + 11, 10, 4); px(ctx, "#2b3550", x + 3, y - 9, 10, 3);
        px(ctx, "#0b3d3a", x + 3, y - 6, 10, 17);
        const liquid = o.color || "0,209,178";
        px(ctx, `rgba(${liquid},0.65)`, x + 3, y - 3, 10, 14);
        for (let i = 0; i < 3; i++) { const by = ((tick / 2 + i * 9 + o.x * 5) % 14); px(ctx, "rgba(255,255,255,0.7)", x + 5 + i * 2, y + 10 - by, 1, 1); }
        px(ctx, "rgba(255,255,255,0.35)", x + 4, y - 6, 1, 17);
        lights.push({ x: x + 8, y: y + 2, r: 22, color: liquid, a: 0.4 });
        break;
      }
      case "rack": {
        px(ctx, OUT, x + 1, y - 8, 14, 24);
        px(ctx, "#262c3a", x + 2, y - 7, 12, 22);
        for (let i = 0; i < 5; i++) {
          px(ctx, "#343c4f", x + 3, y - 6 + i * 4, 10, 3);
          for (let j = 0; j < 3; j++) {
            const on = hash(i * 7 + j + o.x, tick >> 3) % 3 !== 0;
            px(ctx, on ? (j === 2 ? "#ffca28" : "#69f0ae") : "#1b2130", x + 9 + j, y - 5 + i * 4, 1, 1);
          }
        }
        lights.push({ x: x + 10, y: y + 2, r: 14, color: "105,240,174", a: 0.2 });
        break;
      }
    }
  }

  // ---------- 空気感 ----------
  function atmosphere(ctx, w, h, camPX, tick, lights) {
    // 港は夕焼け、研究所は暗く
    const harborL = 20 * 16 - camPX, labL = 40 * 16 - camPX;
    if (labL > 0 && harborL < w) { ctx.fillStyle = "rgba(255,140,60,0.10)"; ctx.fillRect(Math.max(0, harborL), 0, Math.min(w, labL) - Math.max(0, harborL), h); }
    if (labL < w) { ctx.fillStyle = "rgba(4,6,20,0.45)"; ctx.fillRect(Math.max(0, labL), 0, w, h); }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const L of lights) {
      const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
      g.addColorStop(0, `rgba(${L.color},${L.a})`);
      g.addColorStop(1, `rgba(${L.color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
      if (L.beam) {
        const ang = tick / 60;
        const len = 140;
        for (const dir of [ang, ang + Math.PI]) {
          ctx.beginPath();
          ctx.moveTo(L.x, L.y);
          ctx.lineTo(L.x + Math.cos(dir - 0.12) * len, L.y + Math.sin(dir - 0.12) * len * 0.5);
          ctx.lineTo(L.x + Math.cos(dir + 0.12) * len, L.y + Math.sin(dir + 0.12) * len * 0.5);
          ctx.closePath();
          const bg = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, len);
          bg.addColorStop(0, "rgba(255,240,170,0.35)");
          bg.addColorStop(1, "rgba(255,240,170,0)");
          ctx.fillStyle = bg;
          ctx.fill();
        }
      }
    }
    ctx.restore();

    // 周辺減光
    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.85);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }

  return { ground, tree, object, character, atmosphere };
})();
