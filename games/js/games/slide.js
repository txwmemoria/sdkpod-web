/* =========================================================================
   小游戏 · 整理文件柜
   3×3 的文件柜少了一格。挨着空格的文件夹可以滑过去，把 1–8 按顺序归位。
   开局从排好的状态随机滑若干步得到，所以一定能还原。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var N = 3;
  var TAB = ['#d98f86', '#e2b56f', '#c8c46f', '#7fae94', '#6fb0b0', '#86a2cc', '#a291c8', '#c98fb4'];

  MG.register({
    id: 'slide',
    name: '整理文件柜',
    icon: '🗂️',
    accent: '#7f93b8',
    tagline: '文件柜被翻乱了，空出一格。把文件夹滑回 1 到 8 的顺序。',
    tags: ['解谜', '点击 · 方向键'],
    duration: '约 2 分钟',
    howto: '点一下挨着空格的文件夹，它就滑进空格。也可以用方向键。把 1–8 按从左到右、从上到下排好就完成了。',
    controls: [['鼠标 / 触屏', '点文件夹'], ['方向键', '朝空格滑动'], ['空格 / 回车', '开始 · 继续']],

    mount: function (stage, host) {
      stage.textContent = '';
      var board = MG.h('div', 'sl-board');
      var grid = MG.h('div', 'sl-grid');
      board.appendChild(grid);
      stage.appendChild(board);

      var cells = [];  /* cells[pos] = 文件号 1..8，0 是空格 */
      var tiles = {};
      var size = 0;
      var S = { running: false, done: false, moves: 0, t0: 0, pausedAt: 0, tick: 0 };

      function blank() { return cells.indexOf(0); }
      function neighbors(p) {
        var r = Math.floor(p / N);
        var c = p % N;
        var out = [];
        if (r > 0) out.push(p - N);
        if (r < N - 1) out.push(p + N);
        if (c > 0) out.push(p - 1);
        if (c < N - 1) out.push(p + 1);
        return out;
      }
      function solved() {
        for (var i = 0; i < N * N - 1; i++) if (cells[i] !== i + 1) return false;
        return true;
      }
      function wrongCount() {
        var n = 0;
        for (var i = 0; i < N * N - 1; i++) if (cells[i] !== i + 1) n++;
        return n;
      }

      function deal() {
        do {
          cells = [];
          for (var i = 1; i < N * N; i++) cells.push(i);
          cells.push(0);
          var prev = -1;
          var steps = MG.randInt(60, 90);
          for (var s = 0; s < steps; s++) {
            var b = blank();
            var opts = neighbors(b).filter(function (p) { return p !== prev; });
            var pick = opts[MG.randInt(0, opts.length - 1)];
            cells[b] = cells[pick];
            cells[pick] = 0;
            prev = b;
          }
        } while (wrongCount() < 6);
      }

      function build() {
        grid.textContent = '';
        tiles = {};
        for (var n = 1; n < N * N; n++) {
          var t = MG.h('button', 'sl-tile', String(n));
          t.type = 'button';
          t.dataset.n = String(n);
          t.style.setProperty('--tc', TAB[n - 1]);
          grid.appendChild(t);
          tiles[n] = t;
        }
        layout();
      }

      function layout() {
        var pad = Math.max(6, size * 0.025);
        var gap = Math.max(6, size * 0.025);
        var cell = (size - pad * 2 - gap * (N - 1)) / N;
        for (var p = 0; p < cells.length; p++) {
          var n = cells[p];
          if (!n) continue;
          var t = tiles[n];
          t.style.left = (pad + (p % N) * (cell + gap)) + 'px';
          t.style.top = (pad + Math.floor(p / N) * (cell + gap)) + 'px';
          t.style.width = cell + 'px';
          t.style.height = cell + 'px';
          t.style.fontSize = Math.round(cell * 0.34) + 'px';
          t.classList.toggle('home', n === p + 1);
        }
      }

      function fit() {
        size = Math.max(200, Math.min(stage.clientWidth - 32, stage.clientHeight - 32));
        grid.style.width = size + 'px';
        grid.style.height = size + 'px';
        layout();
      }

      function secs() { return S.t0 ? Math.max(0, Math.round((Date.now() - S.t0) / 1000)) : 0; }
      function score() { return Math.max(100, 1300 - S.moves * 7 - secs() * 3); }

      function hud() {
        var m = {};
        m[MG.t('ui.moves')] = S.moves;
        m[MG.t('g.slide.home')] = (N * N - 1 - wrongCount()) + ' / ' + (N * N - 1);
        m[MG.t('ui.elapsed')] = MG.fmtClock(secs() * 1000);
        host.meta(m);
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
          note: MG.t('g.slide.note', { moves: S.moves, secs: secs() }),
          meta: { moves: S.moves, seconds: secs() }
        });
      }

      function slideFrom(p) {
        if (!S.running) return;
        var b = blank();
        if (neighbors(b).indexOf(p) < 0) return;
        cells[b] = cells[p];
        cells[p] = 0;
        S.moves++;
        layout();
        MG.audio.play('click');
        hud();
        host.score(score());
        if (solved()) setTimeout(finish, 260);
      }

      var offClick = MG.on(grid, 'click', function (e) {
        var t = e.target && e.target.closest ? e.target.closest('.sl-tile') : null;
        if (t) slideFrom(cells.indexOf(Number(t.dataset.n)));
      });

      /* 方向键：把空格对面的那块推进来（按 ← 就是右边那块往左滑） */
      var offKey = MG.on(w, 'keydown', function (e) {
        if (!S.running) return;
        var b = blank();
        var r = Math.floor(b / N);
        var c = b % N;
        var p = -1;
        if (e.key === 'ArrowLeft' && c < N - 1) p = b + 1;
        else if (e.key === 'ArrowRight' && c > 0) p = b - 1;
        else if (e.key === 'ArrowUp' && r < N - 1) p = b + N;
        else if (e.key === 'ArrowDown' && r > 0) p = b - N;
        else if (e.key.indexOf('Arrow') !== 0) return;
        e.preventDefault();
        if (p >= 0) slideFrom(p);
      });

      var ro = w.ResizeObserver ? new w.ResizeObserver(fit) : null;
      if (ro) ro.observe(stage);
      var offResize = ro ? function () { ro.disconnect(); } : MG.on(w, 'resize', fit);

      function startTick() {
        clearInterval(S.tick);
        S.tick = setInterval(function () { if (S.running) hud(); }, 1000);
      }

      deal();
      build();
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
          if (solved()) finish();
        },
        destroy: function () {
          S.running = false;
          clearInterval(S.tick);
          offClick();
          offKey();
          offResize();
        }
      };
    }
  });
})(window);
