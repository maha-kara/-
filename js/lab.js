// 研究所の制御システム
// この設定はゲーム実行中に変更できないよう凍結されている。
const LabSystems = Object.freeze((function () {
  const CONFIG = Object.freeze({
    coreLocked: true,
    coreName: "AEGIS",
  });

  return {
    isCoreLocked() {
      return CONFIG.coreLocked;
    },
    coreName() {
      return CONFIG.coreName;
    },
  };
})());
