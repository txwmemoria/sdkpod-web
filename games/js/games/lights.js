/* =========================================================================
   小游戏 · 关灯下班
   5×5 的工位台灯。点一张桌子，它和上下左右的灯都会切换。把灯全关了就能下班。
   开局是从「全关」状态随机按若干下得到的，所以一定有解，最少步数就是 par。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var N = 5;

  MG.register({
    id: 'lights',
    name: '关灯下班',
    icon: '💡',
    accent: '#c99a5b',
    tagline: '最后一个走的人负责关灯。点一下，这盏和旁边四盏一起切换。',
    tags: ['解谜', '点击'],
    duration: '约 2 分钟',
    howto: '点一张桌子，它和上下左右的台灯都会切换开关。把 25 盏灯全部关掉就能下班。步数越少分越高。',
    controls: [['鼠标 / 触屏', '点桌子'], ['空格 / 回车', '开始 · 继续'], ['P', '暂停']],

    mount: function (stage, host) {
      stage.textContent = '';
      var board = MG.h('div', 'lo-board');
      var grid = MG.h('div', 'lo-grid');
      board.appendChild(grid);
      stage.appendChild(board);

      var cells = [];
      var lit = [];
      var S = { running: false, moves: 0, par: 0, t0: 0, pausedAt: 0, tick: 0, done: false };

      for (var i = 0; i < N * N; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'lo-cell';
        b.dataset.i = String(i);
        b.setAttribute('aria-label', MG.t('g.lights.desk', { n: i + 1 }));
        grid.appendChild(b);
        cells.push(b);
        lit.push(false);
      }

      function toggleAt(i) {
        var r = Math.floor(i / N);
        var c = i % N;
        flip(r, c); flip(r - 1, c); flip(r + 1, c); flip(r, c - 1); flip(r, c + 1);
      }
      function flip(r, c) {
        if (r < 0 || r >= N || c < 0 || c >= N) return;
        var k = r * N + c;
        lit[k] = !lit[k];
      }
      function paint() {
        for (var k = 0; k < cells.length; k++) cells[k].classList.toggle('on', lit[k]);
      }
      function litCount() {
        var n = 0;
        for (var k = 0; k < lit.length; k++) if (lit[k]) n++;
        return n;
      }

      /* 从全关开始随机按 par 个不同位置：按两次等于没按，所以挑不重复的格子 */
      function deal() {
        for (var tries = 0; tries < 20; tries++) {
          for (var k = 0; k < lit.length; k++) lit[k] = false;
          var pool = [];
          for (var p = 0; p < N * N; p++) pool.push(p);
          var presses = MG.randInt(6, 9);
          for (var j = 0; j < presses; j++) {
            var idx = MG.randInt(0, pool.length - 1);
            toggleAt(pool.splice(idx, 1)[0]);
          }
          S.par = presses;
          if (litCount() >= 6) break;
        }
        paint();
      }

      function secs() { return S.t0 ? Math.max(0, Math.round((Date.now() - S.t0) / 1000)) : 0; }

      function hud() {
        var m = {};
        m[MG.t('ui.moves')] = S.moves;
        m[MG.t('g.lights.on')] = litCount();
        m[MG.t('ui.elapsed')] = MG.fmtClock(secs() * 1000);
        host.meta(m);
      }

      function score() {
        var over = Math.max(0, S.moves - S.par);
        return Math.max(100, 1200 - over * 35 - secs() * 3);
      }

      function finish() {
        if (!S.running) return;
        S.running = false;
        S.done = true;
        clearInterval(S.tick);
        var sc = score();
        host.score(sc);
        MG.audio.play('win');
        host.finish({
          score: sc,
          note: MG.t('g.lights.note', { moves: S.moves, par: S.par, secs: secs() }),
          meta: { moves: S.moves, par: S.par, seconds: secs() }
        });
      }

      var offClick = MG.on(grid, 'click', function (e) {
        var cell = e.target && e.target.closest ? e.target.closest('.lo-cell') : null;
        if (!cell || !S.running) return;
        toggleAt(Number(cell.dataset.i));
        S.moves++;
        paint();
        MG.audio.play('click');
        hud();
        host.score(score());
        if (litCount() === 0) setTimeout(finish, 280);
      });

      function fit() {
        var side = Math.max(200, Math.min(stage.clientWidth - 28, stage.clientHeight - 28));
        grid.style.width = side + 'px';
        grid.style.height = side + 'px';
      }
      var ro = w.ResizeObserver ? new w.ResizeObserver(fit) : null;
      if (ro) ro.observe(stage);
      var offResize = ro ? function () { ro.disconnect(); } : MG.on(w, 'resize', fit);

      function startTick() {
        clearInterval(S.tick);
        S.tick = setInterval(function () { if (S.running) hud(); }, 1000);
      }

      deal();
      fit();
      hud();
      host.score(0);

      return {
        start: function () {
          S.moves = 0;
          S.done = false;
          S.t0 = Date.now();
          S.running = true;
          hud();
          host.score(score());
          startTick();
        },
        pause: function () {
          if (!S.running) return;
          S.running = false;
          S.pausedAt = Date.now();
          clearInterval(S.tick);
        },
        resume: function () {
          if (S.running || S.done) return;
          S.t0 += Date.now() - S.pausedAt;
          S.running = true;
          startTick();
          hud();
          if (litCount() === 0) finish();
        },
        destroy: function () {
          S.running = false;
          clearInterval(S.tick);
          offClick();
          offResize();
        }
      };
    }
  });
})(window);
