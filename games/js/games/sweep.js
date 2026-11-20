/* =========================================================================
   小游戏 · 菜园扫雷
   一块 10×8 的菜地里藏着 12 窝蜜蜂。翻开土，数字告诉你周围八格有几窝。
   第一锄一定安全（蜂窝在第一下之后才放，而且避开第一下周围）。
   右键 / 长按 / 插旗模式：插一面小旗提醒自己别碰。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var COLS = 10;
  var ROWS = 8;
  var BEES = 12;

  MG.register({
    id: 'sweep',
    name: '菜园扫雷',
    icon: '🐝',
    accent: '#a4925a',
    tagline: '菜地里藏着几窝蜜蜂。看数字，翻开安全的土，给蜂窝插上小旗。',
    tags: ['解谜', '推理'],
    duration: '约 3 分钟',
    howto: '点一下翻开一格土。数字表示周围八格里有几窝蜜蜂。右键、长按或打开插旗模式可以插旗。把所有没有蜜蜂的格子都翻开就赢了。',
    controls: [['点击', '翻开'], ['右键 / 长按', '插旗'], ['点数字', '周围旗数够了就一起翻开'], ['F', '切换插旗模式']],

    mount: function (stage, host) {
      stage.textContent = '';
      var board = MG.h('div', 'ms-board');
      var grid = MG.h('div', 'ms-grid');
      board.appendChild(grid);
      stage.appendChild(board);

      var flagBtn = MG.h('button', 'btn ghost ms-flagmode', '');
      flagBtn.type = 'button';
      stage.appendChild(flagBtn);

      var N = COLS * ROWS;
      var bee = new Array(N).fill(false);
      var near = new Array(N).fill(0);
      var open = new Array(N).fill(false);
      var flag = new Array(N).fill(false);
      var cells = [];
      var S = { running: false, done: false, planted: false, flagMode: false, opened: 0, t0: 0, pausedAt: 0, tick: 0 };

      for (var i = 0; i < N; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ms-cell';
        b.dataset.i = String(i);
        grid.appendChild(b);
        cells.push(b);
      }

      function around(i) {
        var r = Math.floor(i / COLS), c = i % COLS, out = [];
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            var rr = r + dr, cc = c + dc;
            if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) out.push(rr * COLS + cc);
          }
        }
        return out;
      }

      function plant(safe) {
        var banned = { };
        banned[safe] = 1;
        around(safe).forEach(function (k) { banned[k] = 1; });
        var pool = [];
        for (var k = 0; k < N; k++) if (!banned[k]) pool.push(k);
        for (var n = 0; n < BEES; n++) {
          var idx = MG.randInt(0, pool.length - 1);
          bee[pool.splice(idx, 1)[0]] = true;
        }
        for (var j = 0; j < N; j++) {
          near[j] = around(j).reduce(function (s, x) { return s + (bee[x] ? 1 : 0); }, 0);
        }
        S.planted = true;
      }

      function paintCell(i, reveal) {
        var c = cells[i];
        var cls = 'ms-cell';
        var txt = '';
        if (open[i]) {
          cls += ' open';
          if (bee[i]) { cls += ' bee hit'; txt = '🐝'; }
          else if (near[i]) { cls += ' n' + near[i]; txt = String(near[i]); }
        } else if (reveal && bee[i]) {
          cls += ' bee' + (flag[i] ? ' flagged' : '');
          txt = '🐝';
        } else if (flag[i]) {
          cls += ' flagged' + (reveal ? ' wrongflag' : '');
        }
        if (c.className !== cls) c.className = cls;
        if (c.textContent !== txt) c.textContent = txt;
      }
      function paint(reveal) {
        for (var i = 0; i < N; i++) paintCell(i, reveal);
        flagBtn.textContent = (S.flagMode ? '⚑ ' : '⚐ ') + MG.t(S.flagMode ? 'g.sweep.flagOn' : 'g.sweep.flagOff');
        flagBtn.classList.toggle('on', S.flagMode);
      }

      function flagsUsed() { var n = 0; for (var i = 0; i < N; i++) if (flag[i]) n++; return n; }
      function secs() { return S.t0 ? Math.max(0, Math.round((Date.now() - S.t0) / 1000)) : 0; }
      function winScore() { return Math.max(300, 2000 - secs() * 5); }

      function hud() {
        var m = {};
        m[MG.t('g.sweep.bees')] = Math.max(0, BEES - flagsUsed());
        m[MG.t('ui.elapsed')] = MG.fmtClock(secs() * 1000);
        host.meta(m);
      }

      function end(won) {
        if (!S.running) return;
        S.running = false;
        S.done = true;
        clearInterval(S.tick);
        paint(true);
        var sc = won ? winScore() : S.opened * 8;
        host.score(sc);
        MG.audio.play(won ? 'win' : 'over');
        host.finish({
          score: sc,
          note: won
            ? MG.t('g.sweep.win', { time: MG.fmtClock(secs() * 1000) })
            : MG.t('g.sweep.lose', { n: S.opened, total: N - BEES }),
          meta: { won: won, seconds: secs() }
        });
      }

      /* 翻开：空白格（周围 0）一圈圈往外摊开 */
      function reveal(i) {
        if (open[i] || flag[i]) return;
        if (!S.planted) plant(i);
        if (bee[i]) { open[i] = true; end(false); return; }
        var stack = [i];
        while (stack.length) {
          var k = stack.pop();
          if (open[k] || flag[k]) continue;
          open[k] = true;
          S.opened++;
          if (!near[k]) around(k).forEach(function (x) { if (!open[x] && !bee[x]) stack.push(x); });
        }
      }

      function act(i, wantFlag) {
        if (!S.running) return;
        if (open[i]) {
          /* 点数字：周围旗数刚好等于数字，就把其余的都翻开 */
          if (!near[i]) return;
          var nb = around(i);
          var flags = nb.filter(function (x) { return flag[x]; }).length;
          if (flags !== near[i]) return;
          nb.forEach(function (x) { if (S.running) reveal(x); });
        } else if (wantFlag) {
          flag[i] = !flag[i];
          MG.audio.play('click');
        } else {
          if (flag[i]) return;
          reveal(i);
          if (S.running) MG.audio.play('good');
        }
        if (!S.running) return;
        paint(false);
        hud();
        host.score(winScore());
        if (S.opened === N - BEES) end(true);
      }

      /* 长按插旗（触屏） */
      var press = null;
      var offDown = MG.on(grid, 'pointerdown', function (e) {
        var c = e.target && e.target.closest ? e.target.closest('.ms-cell') : null;
        if (!c || e.pointerType === 'mouse') return;
        var idx = Number(c.dataset.i);
        press = { i: idx, fired: false, timer: setTimeout(function () {
          if (!press) return;
          press.fired = true;
          act(idx, true);
        }, 420) };
      });
      function cancelPress() { if (press) { clearTimeout(press.timer); } }
      var offUp = MG.on(grid, 'pointerup', cancelPress);
      var offCancel = MG.on(grid, 'pointercancel', function () { cancelPress(); press = null; });

      var offClick = MG.on(grid, 'click', function (e) {
        var c = e.target && e.target.closest ? e.target.closest('.ms-cell') : null;
        if (!c) return;
        if (press && press.fired) { press = null; return; }
        press = null;
        act(Number(c.dataset.i), S.flagMode);
      });
      var offCtx = MG.on(grid, 'contextmenu', function (e) {
        var c = e.target && e.target.closest ? e.target.closest('.ms-cell') : null;
        if (!c) return;
        e.preventDefault();
        /* 触屏长按时浏览器也会发 contextmenu，已经由长按计时器处理过了 */
        if (press) return;
        act(Number(c.dataset.i), true);
      });
      var offFlagBtn = MG.on(flagBtn, 'click', function (e) {
        e.stopPropagation();
        S.flagMode = !S.flagMode;
        paint(false);
      });
      var offKey = MG.on(w, 'keydown', function (e) {
        if (!S.running) return;
        if (e.key === 'f' || e.key === 'F') { S.flagMode = !S.flagMode; paint(false); }
      });

      function fit() {
        var W = stage.clientWidth - 28, H = stage.clientHeight - 64;
        var cell = Math.floor(Math.min(W / COLS, H / ROWS));
        cell = Math.max(24, Math.min(cell, 64));
        grid.style.width = (cell * COLS) + 'px';
        grid.style.height = (cell * ROWS) + 'px';
        grid.style.fontSize = Math.round(cell * 0.46) + 'px';
      }
      var ro = w.ResizeObserver ? new w.ResizeObserver(fit) : null;
      if (ro) ro.observe(stage);
      var offResize = ro ? function () { ro.disconnect(); } : MG.on(w, 'resize', fit);

      function startTick() {
        clearInterval(S.tick);
        S.tick = setInterval(function () { if (S.running) hud(); }, 1000);
      }

      fit();
      paint(false);
      hud();
      host.score(0);

      return {
        start: function () {
          S.done = false;
          S.t0 = Date.now();
          S.running = true;
          paint(false);
          hud();
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
        },
        destroy: function () {
          S.running = false;
          clearInterval(S.tick);
          cancelPress();
          offDown(); offUp(); offCancel(); offClick(); offCtx(); offFlagBtn(); offKey(); offResize();
        }
      };
    }
  });
})(window);
