/* =========================================================================
   小游戏 · 报销单消消乐
   把发票、打车票、咖啡、回形针、便签和外卖排成三个一排。
   点两张相邻的票交换位置，凑成 3 个以上就连锁消除，连锁越深分越高。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var COLS = 7;
  var ROWS = 7;
  var DURATION = 60000;

  var TYPES = [
    { icon: '🧾', color: '#7d9cc4', name: '发票' },
    { icon: '🚕', color: '#d9ad62', name: '打车' },
    { icon: '☕', color: '#b08a66', name: '咖啡' },
    { icon: '🍩', color: '#d98f7a', name: '下午茶' },
    { icon: '🥤', color: '#7fae94', name: '奶茶' },
    { icon: '🍱', color: '#a291c8', name: '便当' }
  ];

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    v = (v || '').trim();
    return v || fallback;
  }

  function freshAnim() { return { ox: 0, oy: 0, scale: 1, dying: 0 }; }

  MG.register({
    id: 'receipt',
    name: '报销单消消乐',
    icon: '🧾',
    accent: '#3f8f86',
    tagline: '发票、打车票、咖啡和外卖排成三个一排就能报销，连锁越深赚得越多。',
    tags: ['三消', '鼠标', '60 秒'],
    duration: '60 秒',
    howto: '点一张票再点相邻的一张交换位置。三张以上同款连成线就会消除，连锁消除有额外倍数。',
    controls: [
      ['点击 / 触屏', '选票 · 交换'],
      ['空格 / 回车', '开始 · 继续'],
      ['P', '暂停']
    ],
    mount: function (stage, host) {
      var canvas = document.createElement('canvas');
      stage.appendChild(canvas);

      var view = null;
      var raf = 0;
      var fx = MG.effects();
      var sprites = [];
      var spriteCs = 0;

      var board = [];
      var anim = [];
      var row;
      var col;

      var S = {
        running: false,
        busy: false,
        selected: null,
        score: 0,
        cleared: 0,
        maxCascade: 0,
        startAt: 0,
        pausedAt: 0,
        last: 0,
        lastHud: 0,
        timers: [],
        popups: [],
        banner: null
      };

      for (row = 0; row < ROWS; row++) {
        board.push([]);
        anim.push([]);
        for (col = 0; col < COLS; col++) {
          board[row].push(-1);
          anim[row].push(freshAnim());
        }
      }

      function later(fn, ms) {
        var id = setTimeout(fn, ms);
        S.timers.push(id);
        return id;
      }

      function clearTimers() {
        for (var i = 0; i < S.timers.length; i++) clearTimeout(S.timers[i]);
        S.timers = [];
      }

      function randType() { return MG.randInt(0, TYPES.length - 1); }

      function hud() {
        var left = Math.max(0, DURATION - (S.running ? performance.now() - S.startAt : 0));
        var m = {};
        m[MG.t('ui.left')] = MG.fmtClock(left);
        m[MG.t('ui.cleared')] = S.cleared;
        m[MG.t('ui.chain')] = S.maxCascade > 1 ? '×' + S.maxCascade : '—';
        host.meta(m);
      }

      /* ---------- 棋盘 ---------- */

      function newBoard() {
        for (var r = 0; r < ROWS; r++) {
          for (var c = 0; c < COLS; c++) {
            var tries = 0;
            var t = randType();
            /* 避免一开局就三连 */
            while (tries++ < 30) {
              var bad = false;
              if (c >= 2 && board[r][c - 1] === t && board[r][c - 2] === t) bad = true;
              if (r >= 2 && board[r - 1][c] === t && board[r - 2][c] === t) bad = true;
              if (!bad) break;
              t = randType();
            }
            board[r][c] = t;
            anim[r][c] = freshAnim();
          }
        }
      }

      /* 开局 / 洗牌都要保证至少有一步能走 */
      function playableBoard() {
        for (var i = 0; i < 40; i++) {
          newBoard();
          if (hasMove()) return;
        }
      }

      function findMatches() {
        var out = [];
        var seen = {};
        function mark(r, c) {
          var key = r + ':' + c;
          if (!seen[key]) { seen[key] = 1; out.push({ r: r, c: c }); }
        }

        for (var r = 0; r < ROWS; r++) {
          var run = 1;
          for (var c = 1; c <= COLS; c++) {
            var same = c < COLS && board[r][c] >= 0 && board[r][c] === board[r][c - 1];
            if (same) { run++; continue; }
            if (run >= 3) for (var k = c - run; k < c; k++) mark(r, k);
            run = 1;
          }
        }

        for (var c2 = 0; c2 < COLS; c2++) {
          var run2 = 1;
          for (var r2 = 1; r2 <= ROWS; r2++) {
            var same2 = r2 < ROWS && board[r2][c2] >= 0 && board[r2][c2] === board[r2 - 1][c2];
            if (same2) { run2++; continue; }
            if (run2 >= 3) for (var k2 = r2 - run2; k2 < r2; k2++) mark(k2, c2);
            run2 = 1;
          }
        }
        return out;
      }

      function swapTypes(a, b) {
        var t = board[a.r][a.c];
        board[a.r][a.c] = board[b.r][b.c];
        board[b.r][b.c] = t;
      }

      function hasMove() {
        for (var r = 0; r < ROWS; r++) {
          for (var c = 0; c < COLS; c++) {
            if (c + 1 < COLS) {
              swapTypes({ r: r, c: c }, { r: r, c: c + 1 });
              var okH = findMatches().length > 0;
              swapTypes({ r: r, c: c }, { r: r, c: c + 1 });
              if (okH) return true;
            }
            if (r + 1 < ROWS) {
              swapTypes({ r: r, c: c }, { r: r + 1, c: c });
              var okV = findMatches().length > 0;
              swapTypes({ r: r, c: c }, { r: r + 1, c: c });
              if (okV) return true;
            }
          }
        }
        return false;
      }

      function collapse() {
        var cs = geometry().cs;
        for (var c = 0; c < COLS; c++) {
          var write = ROWS - 1;
          for (var r = ROWS - 1; r >= 0; r--) {
            if (board[r][c] < 0) continue;
            if (write !== r) {
              board[write][c] = board[r][c];
              board[r][c] = -1;
              anim[write][c] = anim[r][c];
              anim[r][c] = freshAnim();
              anim[write][c].oy = (r - write) * cs;
            }
            write--;
          }
          for (var k = write; k >= 0; k--) {
            board[k][c] = randType();
            anim[k][c] = freshAnim();
            anim[k][c].oy = -(k + 1) * cs;
          }
        }
      }

      function resolve(level) {
        var matches = findMatches();
        if (!matches.length) {
          S.busy = false;
          S.maxCascade = Math.max(S.maxCascade, level - 1);
          if (!hasMove()) {
            MG.toast(MG.t('g.receipt.shuffle'));
            playableBoard();
          }
          hud();
          return;
        }

        S.busy = true;
        if (level > S.maxCascade) S.maxCascade = level;
        var gain = 0;
        for (var i = 0; i < matches.length; i++) {
          var p = matches[i];
          anim[p.r][p.c].dying = 1;
          anim[p.r][p.c].scale = 0.5;
          gain += 40 * level;
        }

        var gg = geometry();
        var first = matches[0];
        var firstType = board[first.r][first.c];
        fx.burst(
          gg.x + (first.c + 0.5) * gg.cs,
          gg.y + (first.r + 0.5) * gg.cs,
          TYPES[firstType] ? TYPES[firstType].color : MG.theme.accent,
          Math.min(24, 8 + matches.length * 2),
          level > 1 ? 300 : 210
        );
        if (level > 1) {
          fx.shake(4);
          S.banner = { text: MG.t('g.receipt.chain', { n: level }), t: performance.now() };
        }

        S.cleared += matches.length;
        S.score += gain;
        host.score(S.score);
        hud();
        MG.audio.play(level > 1 ? 'perfect' : 'good');
        S.popups.push({ text: '+' + gain, r: matches[0].r, c: matches[0].c, t: performance.now() });

        later(function () {
          for (var j = 0; j < matches.length; j++) {
            var q = matches[j];
            board[q.r][q.c] = -1;
            anim[q.r][q.c] = freshAnim();
          }
          collapse();
          later(function () { resolve(level + 1); }, 210);
        }, 150);
      }

      /* ---------- 交互 ---------- */

      function geometry() {
        var pad = Math.max(10, Math.min(view.w, view.h) * 0.05);
        var cs = Math.min((view.w - pad * 2) / COLS, (view.h - pad * 2) / ROWS);
        return {
          cs: cs,
          x: (view.w - cs * COLS) / 2,
          y: (view.h - cs * ROWS) / 2
        };
      }

      function cellAt(clientX, clientY) {
        var rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        var g = geometry();
        var px = (clientX - rect.left) * (view.w / rect.width);
        var py = (clientY - rect.top) * (view.h / rect.height);
        var c = Math.floor((px - g.x) / g.cs);
        var r = Math.floor((py - g.y) / g.cs);
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
        return { r: r, c: c };
      }

      function adjacent(a, b) {
        return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
      }

      function select(cell) {
        S.selected = cell;
        MG.audio.play('click');
      }

      function trySwap(a, b) {
        S.busy = true;
        S.selected = null;
        var g = geometry();
        swapTypes(a, b);
        anim[a.r][a.c].ox = (b.c - a.c) * g.cs;
        anim[a.r][a.c].oy = (b.r - a.r) * g.cs;
        anim[b.r][b.c].ox = (a.c - b.c) * g.cs;
        anim[b.r][b.c].oy = (a.r - b.r) * g.cs;
        MG.audio.play('click');

        later(function () {
          if (findMatches().length) {
            resolve(1);
            return;
          }
          swapTypes(a, b);
          anim[a.r][a.c].ox = (b.c - a.c) * g.cs;
          anim[a.r][a.c].oy = (b.r - a.r) * g.cs;
          anim[b.r][b.c].ox = (a.c - b.c) * g.cs;
          anim[b.r][b.c].oy = (a.r - b.r) * g.cs;
          MG.audio.play('bad');
          S.busy = false;
        }, 150);
      }

      var offPointer = MG.on(stage, 'pointerdown', function (e) {
        if (!S.running || S.busy) return;
        if (e.target && e.target.closest && e.target.closest('.overlay, button')) return;
        var cell = cellAt(e.clientX, e.clientY);
        if (!cell) return;
        S.dirty = true;

        if (!S.selected) { select(cell); return; }
        if (S.selected.r === cell.r && S.selected.c === cell.c) { S.selected = null; return; }
        if (adjacent(S.selected, cell)) { trySwap(S.selected, cell); return; }
        select(cell);
      });

      /* ---------- 绘制 ---------- */

      function buildSprites() {
        var cs = geometry().cs;
        if (Math.abs(cs - spriteCs) < 0.5 && sprites.length) return;
        spriteCs = cs;
        var dpr = Math.min(w.devicePixelRatio || 1, 2);

        sprites = TYPES.map(function (meta) {
          var cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(cs * dpr));
          cv.height = Math.max(1, Math.round(cs * dpr));
          var c = cv.getContext('2d');
          c.setTransform(dpr, 0, 0, dpr, 0, 0);

          var pad = cs * 0.07;
          var size = cs - pad * 2;
          var grad = c.createLinearGradient(0, pad, 0, cs - pad);
          grad.addColorStop(0, MG.hexToRgba(meta.color, 0.24));
          grad.addColorStop(1, MG.hexToRgba(meta.color, 0.12));

          c.fillStyle = grad;
          MG.roundRect(c, pad, pad, size, size, cs * 0.24);
          c.fill();
          c.strokeStyle = MG.hexToRgba(meta.color, 0.32);
          c.lineWidth = 1.5;
          MG.roundRect(c, pad, pad, size, size, cs * 0.24);
          c.stroke();

          c.font = Math.round(cs * 0.58) + 'px "Segoe UI Emoji","Apple Color Emoji",system-ui';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(meta.icon, cs / 2, cs / 2 + 1);
          return cv;
        });
      }

      function draw() {
        if (!view) return;
        var ctx = view.ctx;
        var g = geometry();
        var cs = g.cs;
        var base = MG.theme.accent;
        var ink = MG.theme.ink;

        ctx.clearRect(0, 0, view.w, view.h);
        buildSprites();

        var off = fx.offset();
        ctx.save();
        ctx.translate(off.x, off.y);

        ctx.save();
        ctx.fillStyle = 'rgba(112,140,118,.06)';
        MG.roundRect(ctx, g.x - 8, g.y - 8, cs * COLS + 16, cs * ROWS + 16, 18);
        ctx.fill();
        ctx.restore();

        for (var r = 0; r < ROWS; r++) {
          for (var c = 0; c < COLS; c++) {
            var cell = anim[r][c];
            var type = board[r][c];
            var x = g.x + c * cs + cell.ox;
            var y = g.y + r * cs + cell.oy;

            if (type >= 0 && sprites[type]) {
              var scale = cell.scale;
              ctx.save();
              ctx.globalAlpha = cell.dying ? Math.max(0.15, 1 - cell.dying * 0.8) : 1;
              if (scale !== 1) {
                ctx.translate(x + cs / 2, y + cs / 2);
                ctx.scale(scale, scale);
                ctx.translate(-(x + cs / 2), -(y + cs / 2));
              }
              /* 预渲染的整块贴图：6 张 sprite 摊掉 49 次渐变 + 阴影 */
              ctx.drawImage(sprites[type], x, y, cs, cs);
              ctx.restore();
            }
          }
        }

        /* 选中高亮 */
        if (S.selected) {
          var sel = S.selected;
          ctx.save();
          ctx.strokeStyle = base;
          ctx.lineWidth = 3;
          ctx.shadowColor = MG.hexToRgba(base, 0.5);
          ctx.shadowBlur = 12;
          var sx = g.x + sel.c * cs + cs * 0.07;
          var sy = g.y + sel.r * cs + cs * 0.07;
          MG.roundRect(ctx, sx, sy, cs * 0.86, cs * 0.86, cs * 0.24);
          ctx.stroke();
          ctx.restore();
        }

        /* 加分飘字 */
        var now = performance.now();
        var alive = [];
        for (var i = 0; i < S.popups.length; i++) {
          var pp = S.popups[i];
          var age = (now - pp.t) / 700;
          if (age >= 1) continue;
          alive.push(pp);
          ctx.save();
          ctx.globalAlpha = 1 - age;
          ctx.fillStyle = ink;
          ctx.font = '700 15px -apple-system,"Segoe UI",system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(pp.text, g.x + (pp.c + 0.5) * cs, g.y + (pp.r + 0.5) * cs - age * 34);
          ctx.restore();
        }
        S.popups = alive;

        /* 连锁提示 */
        if (S.banner) {
          var bAge = (now - S.banner.t) / 900;
          if (bAge >= 1) {
            S.banner = null;
          } else {
            ctx.save();
            ctx.globalAlpha = 1 - bAge;
            ctx.translate(view.w / 2, g.y + cs * 2.2 - bAge * 26);
            var pop = 1 + Math.sin(Math.min(1, bAge * 3) * Math.PI) * 0.12;
            ctx.scale(pop, pop);
            ctx.fillStyle = base;
            ctx.font = '800 30px -apple-system,"Segoe UI","Microsoft YaHei",system-ui';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(S.banner.text, 0, 0);
            ctx.restore();
          }
        }

        fx.draw(ctx);
        ctx.restore();
      }

      /* ---------- 主循环 ---------- */

      function frame(t) {
        if (!S.running && !S.busy) { raf = 0; return; }
        raf = requestAnimationFrame(frame);

        if (!S.last) S.last = t;
        var dt = Math.min(64, t - S.last) / 1000;
        S.last = t;
        fx.update(dt);
        var k = Math.min(1, dt * 16);
        var moving = false;

        for (var r = 0; r < ROWS; r++) {
          for (var c = 0; c < COLS; c++) {
            var a = anim[r][c];
            if (a.ox || a.oy || a.dying) moving = true;
            a.ox += (0 - a.ox) * k;
            a.oy += (0 - a.oy) * k;
            if (Math.abs(a.ox) < 0.4) a.ox = 0;
            if (Math.abs(a.oy) < 0.4) a.oy = 0;
            if (a.dying) a.scale += (0 - a.scale) * k;
          }
        }

        /* 性能：没有动画、粒子、飘字时跳过这一帧 */
        if (moving || S.dirty || S.busy || fx.count() || S.popups.length || S.banner) {
          draw();
          S.dirty = moving;
        }

        var now = performance.now();
        if (now - S.lastHud > 150) {
          S.lastHud = now;
          if (S.running) hud();
        }
        if (S.running && now - S.startAt >= DURATION) end();
      }

      function end() {
        if (!S.running) return;
        S.running = false;
        S.busy = false;
        clearTimers();
        cancelAnimationFrame(raf);
        draw();
        MG.audio.play('over');
        host.finish({
          score: S.score,
          note: MG.t('g.receipt.note', { cleared: S.cleared, cascade: Math.max(1, S.maxCascade) }),
          meta: { cleared: S.cleared, cascade: S.maxCascade }
        });
      }

      var offResize;
      if (w.ResizeObserver) {
        var ro = new w.ResizeObserver(function () {
          view = MG.fitCanvas(canvas);
          draw();
          S.dirty = true;
        });
        ro.observe(canvas);
        offResize = function () { ro.disconnect(); };
      } else {
        offResize = MG.on(window, 'resize', function () {
          view = MG.fitCanvas(canvas);
          draw();
        });
      }

      view = MG.fitCanvas(canvas);
      playableBoard();
      hud();
      host.score(0);
      draw();

      return {
        start: function () {
          clearTimers();
          playableBoard();
          S.score = 0;
          S.cleared = 0;
          S.maxCascade = 1;
          S.selected = null;
          S.busy = false;
          S.popups = [];
          S.startAt = performance.now();
          S.running = true;
          S.last = 0;
          S.lastHud = 0;
          host.score(0);
          hud();
          if (!raf) raf = requestAnimationFrame(frame);
        },
        pause: function () {
          if (!S.running) return;
          S.running = false;
          S.pausedAt = performance.now();
          if (raf) { cancelAnimationFrame(raf); raf = 0; }
          draw();
        },
        resume: function () {
          if (S.running) return;
          S.startAt += performance.now() - S.pausedAt;
          S.running = true;
          S.last = 0;
          if (!raf) raf = requestAnimationFrame(frame);
          hud();
        },
        destroy: function () {
          S.running = false;
          S.busy = false;
          clearTimers();
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          offPointer();
          offResize();
        }
      };
    }
  });

})(window);
