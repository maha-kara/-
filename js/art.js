// ドット絵の描画
const Art = (function () {
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; }
  function px(ctx, c, x, y, w = 1, h = 1) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

  function tile(ctx, t, x, y, wx, wy, tick) {
    const r = hash(wx, wy);
    switch (t) {
      case ".": // 草
        px(ctx, "#3f8f3a", x, y, 16, 16);
        for (let i = 0; i < 4; i++) { const v = hash(wx * 7 + i, wy * 3 + i); px(ctx, "#2f7a2e", x + (v % 15), y + ((v >> 4) % 15), 1, 2); }
        if (r % 9 === 0) { px(ctx, "#f2d24b", x + 6, y + 7); px(ctx, "#f2d24b", x + 11, y + 3); }
        break;
      case "T": // 木
        tile(ctx, ".", x, y, wx, wy, tick);
        px(ctx, "#6b4226", x + 7, y + 10, 2, 5);
        px(ctx, "#1f5c24", x + 2, y + 2, 12, 9);
        px(ctx, "#1f5c24", x + 4, y + 1, 8, 11);
        px(ctx, "#2e7d32", x + 4, y + 3, 5, 3);
        break;
      case ",": // 土の道
        px(ctx, "#c9a66b", x, y, 16, 16);
        if (r % 3 === 0) px(ctx, "#b08d55", x + (r % 13), y + ((r >> 5) % 13), 2, 1);
        break;
      case "s": // 港の石畳
        px(ctx, "#9a9488", x, y, 16, 16);
        px(ctx, "#7d776c", x, y + 7, 16, 1); px(ctx, "#7d776c", x, y + 15, 16, 1);
        px(ctx, "#7d776c", x + ((wy % 2) ? 4 : 11), y, 1, 7); px(ctx, "#7d776c", x + ((wy % 2) ? 11 : 4), y + 8, 1, 7);
        break;
      case "~": { // 水
        px(ctx, "#1d4e89", x, y, 16, 16);
        const o = ((tick >> 4) + wx * 3 + wy) % 16;
        px(ctx, "#4f86c6", x + o, y + 4, 4, 1); px(ctx, "#4f86c6", x + ((o + 8) % 16), y + 11, 3, 1);
        break;
      }
      case "b": // 桟橋
        px(ctx, "#8b5a2b", x, y, 16, 16);
        for (let i = 0; i < 4; i++) px(ctx, "#5e3a1a", x, y + i * 4 + 3, 16, 1);
        break;
      case "X": // 木箱
        tile(ctx, "s", x, y, wx, wy, tick);
        px(ctx, "#a0672f", x + 1, y + 2, 14, 13);
        px(ctx, "#6e4420", x + 1, y + 2, 14, 1); px(ctx, "#6e4420", x + 1, y + 8, 14, 1);
        px(ctx, "#6e4420", x + 1, y + 14, 14, 1); px(ctx, "#6e4420", x + 7, y + 2, 1, 13);
        break;
      case "#": // 石壁
        px(ctx, "#4a4e5a", x, y, 16, 16);
        px(ctx, "#2f323b", x, y + 7, 16, 1); px(ctx, "#2f323b", x, y + 15, 16, 1);
        px(ctx, "#2f323b", x + 7, y, 1, 7); px(ctx, "#2f323b", x + 3, y + 8, 1, 7); px(ctx, "#2f323b", x + 12, y + 8, 1, 7);
        px(ctx, "#5c6170", x + 1, y + 1, 5, 1);
        break;
      case "=": // 研究所の床
        px(ctx, "#1e2430", x, y, 16, 16);
        px(ctx, "#2a3242", x, y, 16, 1); px(ctx, "#2a3242", x, y, 1, 16);
        if ((wx + wy) % 5 === 0) px(ctx, "#00d1b2", x + 7, y + 7, 2, 2);
        break;
      case "W": // 研究所の壁
        px(ctx, "#2b3550", x, y, 16, 16);
        px(ctx, "#3d4a6b", x, y, 16, 3);
        px(ctx, "#1a2033", x, y + 15, 16, 1);
        if (wx % 3 === 0) px(ctx, "#5ef2ff", x + 6, y + 6, 4, 1);
        break;
      default:
        px(ctx, "#000", x, y, 16, 16);
    }
  }

  // 12x14 の人物スプライト
  const PERSON = [
    "....HHHH....",
    "...HHHHHH...",
    "...HSSSSH...",
    "...SESSES...",
    "...SSSSSS...",
    "....SSSS....",
    "..CCCCCCCC..",
    ".SCCCCCCCCS.",
    ".SCCCCCCCCS.",
    "..CCCCCCCC..",
    "...PPPPPP...",
    "...PP..PP...",
    "...PP..PP...",
    "...BB..BB...",
  ];
  const PLAYER = { H: "#2b1d14", S: "#f1c27d", E: "#111", C: "#d1495b", P: "#2e4057", B: "#111" };

  function person(ctx, x, y, pal, dir) {
    for (let r = 0; r < PERSON.length; r++) {
      for (let c = 0; c < 12; c++) {
        let ch = PERSON[r][c];
        if (ch === ".") continue;
        if (dir === "up" && ch === "E") ch = "H";
        if (dir === "up" && r === 2 && ch === "S") ch = "H";
        px(ctx, pal[ch] || "#f0f", x + 2 + c, y + 1 + r);
      }
    }
    px(ctx, "rgba(0,0,0,0.25)", x + 4, y + 15, 8, 1);
  }

  function object(ctx, o, x, y, tick) {
    switch (o.sprite) {
      case "npc": person(ctx, x, y, o.palette, "down"); break;
      case "sign":
        px(ctx, "#6b4226", x + 7, y + 8, 2, 8);
        px(ctx, "#a0672f", x + 2, y + 2, 12, 7);
        px(ctx, "#5e3a1a", x + 4, y + 4, 8, 1); px(ctx, "#5e3a1a", x + 4, y + 6, 6, 1);
        break;
      case "stone":
        px(ctx, "#6d6f78", x + 3, y + 1, 10, 14);
        px(ctx, "#8a8d97", x + 4, y + 2, 8, 2);
        px(ctx, "#43454c", x + 5, y + 6, 6, 1); px(ctx, "#43454c", x + 5, y + 9, 6, 1); px(ctx, "#43454c", x + 5, y + 12, 4, 1);
        break;
      case "terminal": {
        px(ctx, "#3b3f4a", x + 1, y + 2, 14, 11);
        const on = o.lit ? o.lit() : false;
        px(ctx, on ? "#1b5e20" : "#062a12", x + 3, y + 4, 10, 7);
        if ((tick >> 5) % 2 === 0) px(ctx, "#7CFC9A", x + 4, y + 9, 3, 1);
        px(ctx, "#7CFC9A", x + 4, y + 5, 6, 1); px(ctx, "#7CFC9A", x + 4, y + 7, 4, 1);
        px(ctx, "#22252d", x + 5, y + 13, 6, 2);
        break;
      }
      case "chest":
        px(ctx, "#7a4a1f", x + 2, y + 5, 12, 10);
        px(ctx, "#9c6b30", x + 2, y + 5, 12, 3);
        px(ctx, "#d4af37", x + 7, y + 8, 2, 3);
        px(ctx, "#d4af37", x + 2, y + 5, 1, 10); px(ctx, "#d4af37", x + 13, y + 5, 1, 10);
        break;
      case "lighthouse":
        px(ctx, "#eeeeee", x + 4, y + 2, 8, 14);
        px(ctx, "#c62828", x + 4, y + 6, 8, 3); px(ctx, "#c62828", x + 4, y + 12, 8, 3);
        px(ctx, (tick >> 4) % 2 ? "#fff176" : "#f9a825", x + 5, y, 6, 3);
        break;
      case "gate": {
        const open = o.isOpen();
        if (open) { tile(ctx, o.floor || ",", x, y, o.x, o.y, tick); break; }
        px(ctx, "#2f323b", x, y, 16, 16);
        for (let i = 0; i < 4; i++) px(ctx, "#9aa0ab", x + 1 + i * 4, y, 2, 16);
        px(ctx, "#9aa0ab", x, y + 3, 16, 2); px(ctx, "#9aa0ab", x, y + 11, 16, 2);
        break;
      }
      case "door": {
        const open = o.isOpen();
        if (open) { tile(ctx, "=", x, y, o.x, o.y, tick); px(ctx, "#00d1b2", x, y, 16, 1); break; }
        px(ctx, "#4a5578", x, y, 16, 16);
        px(ctx, "#2b3550", x + 7, y, 2, 16);
        px(ctx, "#ff5252", x + 12, y + 7, 2, 2);
        break;
      }
      case "core": {
        const glow = 4 + Math.abs(((tick >> 2) % 16) - 8) / 2;
        px(ctx, "#1a2033", x + 1, y + 1, 14, 14);
        px(ctx, o.isOpen() ? "#7CFC9A" : "#ff5252", x + 8 - glow / 2, y + 8 - glow / 2, glow, glow);
        px(ctx, "#5ef2ff", x + 1, y + 1, 14, 1); px(ctx, "#5ef2ff", x + 1, y + 14, 14, 1);
        break;
      }
    }
  }

  return { tile, object, person, PLAYER };
})();
