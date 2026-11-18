// 外部で描いたドット絵に差し替えるための設定。
// null のままなら、コードで描いたドット絵が使われる。
//
// tiles:  横一列に 16x16 のタイルを並べた PNG。並び順は
//         草 / 木の根元 / 道 / 石畳 / 水 / 桟橋 / 木箱 / 石壁 / 研究所の床 / 研究所の壁 / 花 / 家の敷地
// player: 48x64 の PNG。横に「立ち・歩き1・歩き2」、縦に「下・左・右・上」向きの 16x16 を並べる。
const ASSET_OVERRIDES = {
  tiles: null,   // 例: "assets/tiles.png"
  player: null,  // 例: "assets/player.png"
};
