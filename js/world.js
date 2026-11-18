// 世界とすべての謎
const World = (function () {
  const W = 60, H = 20;
  const E = Engine;

  // 答えはハッシュでのみ保存されている
  const ANS = {
    v1: "2f9ba107149905cd6d639b6f3bc87fa48fde17adda8be613fbbb2961bdc16cd3",
    v2: "044b9cba288fa369e4b7e4dad7f8559720f612f364fafd9e985b65ba74f0f243",
    v3: "a35d33c702d064836a66465521d3c5edcff2dd3254f72c8b75245fd6e50af4a2",
    h1: "0be64ae89ddd24e225434de95d501711339baeee18f009ba9b4369af27d30d60",
    h2: "bfeb4c6192985efa05e7fa0740ac45708a515e569e7edaec7fc060ff72b44a0c",
    h3: "3c80eef32f5752abb4b121c13d86d5bd8504d144093e988d9cbf77064321799a",
    h4: "7b433a9708d38066858f42fd255f2f2396a83b020fafa1bbc2f6f91e63b81ab9",
  };
  const PUZZLES = ["v1", "v2", "v3", "h1", "h2", "h3", "h4", "l1", "l2", "l3"];

  // 解いたあとに出る解説
  const LESSON = {
    v1: "【解説】Base64 は暗号ではなく「符号化」。誰でも元に戻せるので、秘密を守る役には立たない。",
    v2: "【解説】シーザー暗号は文字を一定数ずらすだけ。鍵の候補が25通りしかないので総当たりで破れる。",
    v3: "【解説】HTMLのコメントは画面に出ないだけで、誰でも読める。秘密をクライアントに置いてはいけない。",
    h1: "【解説】MD5 は高速すぎて、よくあるパスワードのハッシュは一覧表で即座に引ける。パスワード保存には bcrypt や Argon2 のような遅いハッシュとソルトを使う。",
    h2: "【解説】短時間に失敗が続いた直後の成功は、総当たり攻撃が成功した典型的な痕跡。ログ監視とアカウントロックが防御になる。",
    h3: "【解説】1バイトの鍵による XOR は、鍵が256通りしかない。鍵の長さが短い暗号は総当たりで破られる。",
    h4: "【解説】情報は一か所にあるとは限らない。別の経路(ここでは無線)から得た断片を組み合わせるのも調査の基本。",
    l1: "【解説】権限チェックをクライアント側だけで行うと、利用者が値を書き換えるだけで突破できる。判定はサーバー側で行う。",
    l2: "【解説】セーブデータの一部しか改ざん検知の対象になっていなかった。保護は「全部」にかけないと意味がない。",
    l3: "【解説】実行中に変えられない値でも、配布されたコードそのものは利用者の手元にある。利用者の端末で動くものはすべて改変されうる。",
  };

  function solve(id, extra) {
    E.setFlag(id);
    const pages = [].concat(extra || [], LESSON[id]);
    E.say("SYSTEM", pages);
  }

  // ---------- 地図 ----------
  let seed = 20261118;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

  const tiles = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      let t;
      if (x < 19) t = (x === 0 || y === 0 || y === H - 1) ? "T" : ".";
      else if (x === 19) t = "T";
      else if (x < 39) {
        if (y === 0) t = "#";
        else if (y >= 15) t = "~";
        else t = "s";
      } else if (x === 39) t = "#";
      else t = (x === W - 1 || y === 0 || y === H - 1 || x === 46 || x === 52) ? "W" : "=";
      row.push(t);
    }
    tiles.push(row);
  }
  // 村の道と木
  for (let x = 1; x < 19; x++) tiles[10][x] = ",";
  for (let y = 4; y < 17; y++) tiles[y][9] = ",";
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < 19; x++) {
    if (tiles[y][x] === "." && y !== 9 && y !== 11 && x !== 8 && x !== 10 && rnd() < 0.12) tiles[y][x] = "T";
    else if (tiles[y][x] === "." && rnd() < 0.08) tiles[y][x] = "f";
  }
  // 港:桟橋と木箱
  for (let y = 15; y < 19; y++) { tiles[y][28] = "b"; tiles[y][29] = "b"; }
  [[22, 3], [23, 3], [22, 4], [33, 13], [34, 13], [26, 2], [37, 7]].forEach(([x, y]) => tiles[y][x] = "X");
  // 研究所の左端は港側の壁沿い
  for (let y = 0; y < H; y++) tiles[y][39] = "#";

  // ---------- 住人・装置 ----------
  const objects = [];
  function add(o) {
    objects.push(o);
    // 物の周りは通れるようにしておく
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const t = tiles[o.y + dy] && tiles[o.y + dy][o.x + dx];
      if (t === "T" && o.x + dx > 0 && o.x + dx < 19) tiles[o.y + dy][o.x + dx] = ".";
    }
    if (tiles[o.y][o.x] === "T" || tiles[o.y][o.x] === "f") tiles[o.y][o.x] = ".";
    return o;
  }

  const ELDER = { H: "#dddddd", h: "#ffffff", S: "#e0ac69", C: "#5d4a8a", c: "#463870", P: "#3b2f5c", B: "#3a2a1a" };
  const GUARD = { H: "#555555", h: "#777777", S: "#e0ac69", C: "#6d7b8d", c: "#4f5a69", P: "#3b4252", B: "#222222" };
  const KID   = { H: "#c47a2c", h: "#e09a4c", S: "#f1c27d", C: "#4caf50", c: "#357a38", P: "#795548", B: "#3b2a1a" };
  const SAILOR= { H: "#1a237e", h: "#283593", S: "#c68642", C: "#eceff1", c: "#90a4ae", P: "#1a237e", B: "#222222" };
  const KEEPER= { H: "#8d6e63", h: "#a1887f", S: "#f1c27d", C: "#ffb300", c: "#c68400", P: "#4e342e", B: "#222222" };

  // --- 村 ---
  add({ x: 5, y: 6, sprite: "stone", done: () => E.has("v1"), interact() {
    E.say("石碑", ["古い石碑に文字が刻まれている。", "T1BFTlNFU0FNRQ=="], () => {
      if (E.has("v1")) return;
      E.ask("石碑", "石碑の言葉を唱えますか?", a => {
        if (E.check(a, ANS.v1)) solve("v1", "石碑が淡く光った。");
        else E.say("石碑", "何も起こらない。");
      });
    });
  }});

  add({ x: 12, y: 14, sprite: "npc", name: "elder", palette: ELDER, acc: "beard", interact() {
    if (E.has("v2")) return E.say("長老", "その言葉、忘れるでないぞ。");
    E.say("長老", ["わしが若い頃、友から届いた手紙じゃ。", "WUXVWQRRQH", "友は何と言っておったのかのう。"], () => {
      E.ask("長老", "手紙の言葉は?", a => {
        if (E.check(a, ANS.v2)) solve("v2", "長老「……そうじゃった。あやつは、そう言っておった。」");
        else E.say("長老", "違う気がするのう。");
      });
    });
  }});

  add({ x: 6, y: 12, sprite: "npc", name: "kid", palette: KID, interact() {
    E.say("村の子", ["この世界の向こうには港があるんだって。", "でも門番さんは、村の試練を終えた人しか通してくれないよ。"]);
  }});

  add({ x: 17, y: 9, sprite: "npc", name: "guard", palette: GUARD, acc: "helmet", interact() {
    if (E.has("v3")) return E.say("門番", "通るがいい。");
    if (!E.has("v1") || !E.has("v2")) return E.say("門番", "村の試練を終えていない者は通せん。");
    E.ask("門番", "合言葉を言え。", a => {
      if (E.check(a, ANS.v3)) solve("v3", "門番「……よかろう。」門が開いた。");
      else E.say("門番", "違う。");
    });
  }});

  add({ x: 19, y: 10, sprite: "gate", floor: ",", isOpen: () => E.has("v3"),
    solid() { return !this.isOpen(); },
    interact() { if (!this.isOpen()) E.say("", "門は固く閉ざされている。"); } });
  tiles[10][19] = ",";

  // --- 港 ---
  add({ x: 24, y: 6, sprite: "terminal", done: () => E.has("h1"), interact() {
    if (E.has("h1")) return E.say("倉庫端末", "ログイン済み: dockmaster");
    E.say("倉庫端末", ["== 倉庫管理システム ==", "USER: dockmaster\nHASH(MD5): 5f4dcc3b5aa765d61d8327deb882cf99"], () => {
      E.ask("倉庫端末", "dockmaster のパスワード:", a => {
        if (E.check(a, ANS.h1)) solve("h1", "認証成功。倉庫の記録が読めるようになった。");
        else E.say("倉庫端末", "認証失敗。");
      });
    });
  }});

  add({ x: 31, y: 5, sprite: "terminal", done: () => E.has("h2"), interact() {
    const log = [
      "== auth.log ==\n02:58:10 LOGIN OK    user=kaito  from=192.0.2.10\n03:14:51 LOGIN FAIL  user=admin  from=198.51.100.23\n03:14:52 LOGIN FAIL  user=admin  from=198.51.100.23",
      "03:14:52 LOGIN FAIL  user=root   from=203.0.113.77\n03:14:53 LOGIN FAIL  user=admin  from=198.51.100.23\n03:14:54 LOGIN FAIL  user=admin  from=198.51.100.23\n03:14:58 LOGIN OK    user=admin  from=198.51.100.23",
      "03:20:02 LOGIN FAIL  user=guest  from=203.0.113.77\n08:30:44 LOGIN OK    user=kaito  from=192.0.2.10",
    ];
    if (E.has("h2")) return E.say("管理室端末", log);
    E.say("管理室端末", ["昨夜、港の管理システムに何者かが入り込んだらしい。"].concat(log), () => {
      E.ask("管理室端末", "侵入者の接続元を報告せよ:", a => {
        if (E.check(a, ANS.h2)) solve("h2", "報告を受理。接続元を遮断した。");
        else E.say("管理室端末", "その接続元は該当しない。");
      });
    });
  }});

  add({ x: 35, y: 9, sprite: "chest", done: () => E.has("h3"), interact() {
    if (E.has("h3")) return E.say("鉄の箱", "箱は開いている。中は空だ。");
    E.say("鉄の箱", ["頑丈な箱だ。銘板に「XOR-LOCK MODEL 8」とある。", "蓋に刻印: 6b 64 69 62 65 78"], () => {
      E.ask("鉄の箱", "開錠の言葉:", a => {
        if (E.check(a, ANS.h3)) solve("h3", "カチリ、と音がして箱が開いた。");
        else E.say("鉄の箱", "びくともしない。");
      });
    });
  }});

  add({ x: 27, y: 11, sprite: "sign", interact() {
    E.say("掲示板", ["【港ラジオ 104.7MHz】", "灯台の自動発信を中継しています。\n受信機は港の別館にあります(radio.html)。"]);
  }});

  add({ x: 23, y: 12, sprite: "npc", name: "sailor", palette: SAILOR, acc: "cap", interact() {
    E.say("船乗り", ["灯台守が言ってたよ。灯台はいつも同じ言葉を海に送ってるってな。", "東の研究所? あそこは港の仕事を全部片付けた者しか入れねえ。"]);
  }});

  add({ x: 36, y: 3, sprite: "lighthouse", done: () => E.has("h4"), interact() {
    if (E.has("h4")) return E.say("灯台", "灯台の光が規則正しく回っている。");
    E.say("灯台", "灯台の扉に符号入力パネルがある。", () => {
      E.ask("灯台", "符号:", a => {
        if (E.check(a, ANS.h4)) solve("h4", "パネルが緑に光った。");
        else E.say("灯台", "ブザーが鳴った。");
      });
    });
  }});

  add({ x: 37, y: 10, sprite: "npc", name: "keeper", palette: KEEPER, interact() {
    const done = ["h1", "h2", "h3", "h4"].filter(f => E.has(f)).length;
    if (done < 4) return E.say("番人", `港の仕事はまだ残っている。(${done}/4)`);
    E.say("番人", "研究所への扉は開いている。気をつけてな。");
  }});

  add({ x: 39, y: 10, sprite: "gate", floor: "=", isOpen: () => ["h1", "h2", "h3", "h4"].every(f => E.has(f)),
    solid() { return !this.isOpen(); },
    interact() { if (!this.isOpen()) E.say("", "鋼鉄の扉。開きそうにない。"); } });
  tiles[10][39] = "=";


  // --- 装飾 ---
  function building(x, y, variant) {
    // (x, y) は左下。3x3 マスを占める
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) tiles[y - dy][x + dx] = "h";
    for (let dx = -1; dx <= 3; dx++) if (tiles[y + 1] && tiles[y + 1][x + dx] === "T") tiles[y + 1][x + dx] = ".";
    objects.push({ x, y, sprite: "house", variant, solid: true });
  }
  building(2, 4, 0);
  building(13, 4, 1);
  building(14, 17, 2);
  add({ x: 3, y: 15, sprite: "well", solid: true, interact() { E.say("", "深い井戸だ。底は見えない。"); } });
  [[25, 9], [33, 11], [21, 14], [38, 14]].forEach(([x, y]) => add({ x, y, sprite: "lamp", solid: true }));
  [[30, 13], [31, 13], [21, 8]].forEach(([x, y]) => add({ x, y, sprite: "barrel", solid: true }));
  objects.push({ x: 31, y: 17, sprite: "boat", solid: true });
  [[41, 15], [43, 15], [48, 15, "124,252,154"], [50, 15, "186,104,200"], [54, 4], [58, 4, "255,202,40"]].forEach(([x, y, color]) =>
    add({ x, y, sprite: "tube", solid: true, color }));
  [[43, 2], [44, 2], [48, 2], [54, 16], [55, 16], [57, 16]].forEach(([x, y]) => add({ x, y, sprite: "rack", solid: true }));

  // --- 研究所 ---
  add({ x: 42, y: 5, sprite: "terminal", done: () => false, interact() {
    E.say("案内端末", ["ようこそ、研究所へ。", "ここから先は、規則そのものを疑え。"]);
  }});

  add({ x: 46, y: 10, sprite: "door", isOpen: () => E.has("l1"),
    solid() { return !this.isOpen(); },
    interact() {
      if (this.isOpen()) return;
      const lv = game.player.clearance;
      if (lv >= 5) return solve("l1", `認証レベル ${lv} を確認。扉が開いた。`);
      E.say("セキュリティ扉", `認証レベル: ${lv}\n必要レベル: 5\nアクセス拒否。`);
    } });

  add({ x: 49, y: 6, sprite: "terminal", done: () => E.has("l2"), interact() {
    const role = E.getRole();
    if (E.has("l2")) return E.say("管理者端末", `ROLE: ${role}\n第二扉: 解錠済み`);
    if (role === "admin") return solve("l2", "ROLE: admin を確認。第二扉を解錠した。");
    E.say("管理者端末", [`ROLE: ${role}`, "第二扉の解錠は admin のみ可能です。"]);
  }});

  add({ x: 52, y: 10, sprite: "door", isOpen: () => E.has("l2"),
    solid() { return !this.isOpen(); },
    interact() { if (!this.isOpen()) E.say("第二扉", "管理者によってロックされている。"); } });

  add({ x: 56, y: 10, sprite: "core", isOpen: () => !LabSystems.isCoreLocked(), interact() {
    if (LabSystems.isCoreLocked()) {
      return E.say(`コア ${LabSystems.coreName()}`, ["封印状態: LOCKED", "この封印は実行中には変更できない。"]);
    }
    const flag = "FLAG{" + sha256("AEGIS-OPENED").slice(0, 12) + "}";
    const rest = PUZZLES.slice(0, 9).filter(f => !E.has(f));
    if (!E.has("l3")) E.setFlag("l3");
    E.say(`コア ${LabSystems.coreName()}`, [
      "封印が解かれた。",
      LESSON.l3,
      rest.length ? `……だが、まだ解いていない謎が ${rest.length} 個あるようだ。` : "すべての謎を解いた。",
      `${flag}\n\nおめでとう。あなたは規則を読み、疑い、書き換えた。`,
      "— 第1章 完 —",
    ]);
  }});

  function areaName(x) { return x < 20 ? "はじまりの村" : x < 40 ? "港町" : "研究所"; }

  return {
    w: W, h: H, tiles, objects,
    totalPuzzles: PUZZLES.length,
    solvedCount: () => PUZZLES.filter(f => E.has(f)).length,
    isSolidTile: t => t === "T" || t === "#" || t === "~" || t === "X" || t === "W" || t === "h",
    areaName,
    intro() {
      E.say("", ["……目を覚ますと、見知らぬ村にいた。", "この世界の扉は、知識でしか開かない。", "矢印キー/WASDで移動、スペースで調べる。"]);
    },
  };
})();

Engine.start(World);
