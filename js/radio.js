// 港ラジオ:周波数を合わせると灯台の信号が受信できる
(function () {
  const TARGET = 1047;
  // 灯台が送り続けている信号(1 = 短点, 3 = 長点)
  const SIGNAL = [[3,1,1,1],[1],[1,3],[3,1,3,1],[3,3,3],[3,1]];
  const UNIT = 220; // ms

  const dial = document.getElementById("dial");
  const freq = document.getElementById("freq");
  const lamp = document.getElementById("lamp");
  const status = document.getElementById("status");
  const scope = document.getElementById("scope");
  const ctx = scope.getContext("2d");

  // 信号を「点灯/消灯」の時間列に変換
  const timeline = [];
  SIGNAL.forEach((letter, li) => {
    letter.forEach((len, i) => {
      timeline.push([true, len]);
      if (i < letter.length - 1) timeline.push([false, 1]);
    });
    timeline.push([false, li === SIGNAL.length - 1 ? 7 : 3]);
  });
  const total = timeline.reduce((s, [, n]) => s + n, 0);

  function lampOn(t) {
    let u = Math.floor(t / UNIT) % total;
    for (const [on, n] of timeline) { if (u < n) return on; u -= n; }
    return false;
  }

  function render(now) {
    const f = Number(dial.value);
    freq.textContent = (f / 10).toFixed(1);
    const dist = Math.abs(f - TARGET);
    const locked = dist === 0;
    const on = locked && lampOn(now);
    lamp.classList.toggle("on", on);
    status.textContent = locked ? "受信中" : dist < 6 ? "かすかに何か聞こえる" : "ノイズ";

    ctx.fillStyle = "#050607";
    ctx.fillRect(0, 0, scope.width, scope.height);
    ctx.fillStyle = "#7CFC9A";
    const noise = locked ? 0.05 : Math.min(1, dist / 6);
    for (let x = 0; x < scope.width; x++) {
      const base = locked ? (on ? 8 : 22) : 15 + Math.sin((x + now / 30) / 4) * (6 - Math.min(dist, 6));
      const y = base + (Math.random() - 0.5) * 28 * noise;
      ctx.fillRect(x, Math.max(0, Math.min(scope.height - 1, Math.round(y))), 1, 1);
    }
    requestAnimationFrame(render);
  }

  window.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") dial.value = Number(dial.value) - 1;
    if (e.key === "ArrowRight") dial.value = Number(dial.value) + 1;
  });
  requestAnimationFrame(render);
})();
