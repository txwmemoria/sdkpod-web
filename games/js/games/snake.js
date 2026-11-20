/* =========================================================================
   小游戏 · 工位贪吃蛇
   在开放式工位之间穿行，吃掉同事桌上的零食。撞到自己就下班。
   屏幕边缘是通的（走廊绕回来），所以只有自己会杀死自己。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var COLS = 24;
  var ROWS = 15;

  var FOODS = [
    { icon: '🐟', pts: 10 },
    { icon: '🍪', pts: 12 },
    { icon: '☕', pts: 15, fast: true },
    { icon: '🥤', pts: 15, fast: true }
  ];

  var DIRS = {
    ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
    W: { x: 0, y: -1 }, S: { x: 0, y: 1 }, A: { x: -1, y: 0 }, D: { x: 1, y: 0 }
  };

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    v = (v || '').trim();
    return v || fallback;
  }

  MG.register({
    id: 'snake',
    name: '工位贪吃蛇',
    icon: '🐍',
    accent: '#5a9a6e',
    tagline: '穿过开放式工位，把同事的零食全吃了。撞到自己就下班。',
    tags: ['键盘', '无尽'],
    duration: '无尽',
    howto: '吃掉零食变长，撞到自己就结束。屏幕边缘是通的，从另一边钻回来。',
    controls: [
      ['方向键 / WASD', '转向'],
      ['空格 / 回车', '开始 · 继续'],
      ['手机', '滑动或点右下方向键']
    ],
    mount: function (stage, host) {
      var canvas = document.createElement('canvas');
      stage.appendChild(canvas);

      var view = null;
      var raf = 0;
      var touchStart = null;
      var bg = null;
      var fx = MG.effects();

      var S = {
        snake: [],
        dir: { x: 1, y: 0 },
        queue: [],
        food: null,
        score: 0,
        foods: 0,
        stepMs: 170,
        acc: 0,
        last: 0,
        running: false,
        dead: false
      };

      /* ---------- 布局 ---------- */

      function geometry() {
        var pad = Math.max(6, Math.min(view.w, view.h) * 0.022);
        var csx = (view.w - pad * 2) / COLS;
        var csy = (view.h - pad * 2) / ROWS;
        /* 竖屏时别把格子拉成长条：形状差太多就退回正方形并居中 */
        if (csx / csy > 1.3 || csx / csy < 0.77) {
          csx = Math.min(csx, csy);
          csy = csx;
        }
        return {
          x: (view.w - COLS * csx) / 2,
          y: (view.h - ROWS * csy) / 2,
          csx: csx,
          csy: csy,
          cs: Math.min(csx, csy),
          w: COLS * csx,
          h: ROWS * csy
        };
      }

      /* ---------- 逻辑 ---------- */

      function placeFood() {
        var free = [];
        for (var y = 0; y < ROWS; y++) {
          for (var x = 0; x < COLS; x++) {
            var taken = false;
            for (var i = 0; i < S.snake.length; i++) {
              if (S.snake[i].x === x && S.snake[i].y === y) { taken = true; break; }
            }
            if (!taken) free.push({ x: x, y: y });
          }
        }
        if (!free.length) return;
        var spot = MG.pick(free);
        var f = MG.pick(FOODS);
        S.food = { x: spot.x, y: spot.y, icon: f.icon, pts: f.pts, fast: !!f.fast };
      }

      /* 静态背景缓存：网格线只在尺寸变化时画一次 */
      function buildBg() {
        if (!view) return;
        var dpr = Math.min(w.devicePixelRatio || 1, 2);
        bg = document.createElement('canvas');
        bg.width = Math.round(view.w * dpr);
        bg.height = Math.round(view.h * dpr);
        var c = bg.getContext('2d');
        c.setTransform(dpr, 0, 0, dpr, 0, 0);

        var g = geometry();
        c.fillStyle = 'rgba(120,133,148,.045)';
        MG.roundRect(c, g.x - 2, g.y - 2, g.w + 4, g.h + 4, 18);
        c.fill();

        c.strokeStyle = 'rgba(120,133,148,.14)';
        c.lineWidth = 1;
        for (var gx = 0; gx <= COLS; gx++) {
          c.beginPath();
          c.moveTo(g.x + gx * g.csx, g.y);
          c.lineTo(g.x + gx * g.csx, g.y + g.h);
          c.stroke();
        }
        for (var gy = 0; gy <= ROWS; gy++) {
          c.beginPath();
          c.moveTo(g.x, g.y + gy * g.csy);
          c.lineTo(g.x + g.w, g.y + gy * g.csy);
          c.stroke();
        }

        c.strokeStyle = 'rgba(120,133,148,.25)';
        c.lineWidth = 2;
        MG.roundRect(c, g.x - 2, g.y - 2, g.w + 4, g.h + 4, 18);
        c.stroke();
      }

      function reset() {
        S.snake = [{ x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 }];
        S.dir = { x: 1, y: 0 };
        S.queue = [];
        S.score = 0;
        S.foods = 0;
        S.stepMs = 170;
        S.acc = 0;
        S.last = 0;
        S.dead = false;
        placeFood();
        host.score(0);
        hud();
      }

      function hud() {
        var m = {};
        m[MG.t('ui.length')] = S.snake.length;
        m[MG.t('ui.snacks')] = S.foods;
        host.meta(m);
      }

      function die() {
        S.dead = true;
        S.running = false;
        cancelAnimationFrame(raf);
        draw();
        MG.audio.play('over');
        host.finish({
          score: S.score,
          note: MG.t('g.snake.note', { foods: S.foods, len: S.snake.length }),
          meta: { foods: S.foods, length: S.snake.length }
        });
      }

      function step() {
        if (S.queue.length) {
          var next = S.queue.shift();
          if (next.x !== -S.dir.x || next.y !== -S.dir.y) S.dir = next;
        }

        var head = S.snake[0];
        var nx = (head.x + S.dir.x + COLS) % COLS;
        var ny = (head.y + S.dir.y + ROWS) % ROWS;
        var eating = S.food && S.food.x === nx && S.food.y === ny;
        var limit = S.snake.length - (eating ? 0 : 1);

        for (var i = 0; i < limit; i++) {
          if (S.snake[i].x === nx && S.snake[i].y === ny) { die(); return; }
        }

        S.snake.unshift({ x: nx, y: ny });

        if (eating) {
          S.score += S.food.pts;
          S.foods++;
          S.stepMs = Math.max(105, S.stepMs - (S.food.fast ? 4 : 2));
          host.score(S.score);
          MG.audio.play(S.food.fast ? 'perfect' : 'good');
          var g2 = geometry();
          fx.burst(
            g2.x + (nx + 0.5) * g2.csx,
            g2.y + (ny + 0.5) * g2.csy,
            S.food.fast ? '#e0b03f' : MG.theme.accent,
            S.food.fast ? 16 : 11,
            S.food.fast ? 260 : 190
          );
          if (S.food.fast) fx.shake(3.5);
          placeFood();
          hud();
        } else {
          S.snake.pop();
        }
      }

      /* ---------- 绘制 ---------- */

      function draw() {
        if (!view) return;
        var ctx = view.ctx;
        var g = geometry();

        var accent = MG.theme.accent;
        var accent2 = MG.theme.accent2;

        ctx.clearRect(0, 0, view.w, view.h);

        var off = fx.offset();
        ctx.save();
        ctx.translate(off.x, off.y);

        /* 地毯网格是缓存的位图，每帧只画一张图 */
        if (bg) ctx.drawImage(bg, 0, 0, view.w, view.h);

        /* 零食 */
        if (S.food) {
          var pulse = 1 + Math.sin(performance.now() / 240) * 0.07;
          ctx.save();
          ctx.font = Math.round(g.cs * 0.8 * pulse) + 'px "Segoe UI Emoji","Apple Color Emoji",system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(S.food.icon,
            g.x + (S.food.x + 0.5) * g.csx,
            g.y + (S.food.y + 0.55) * g.csy);
          ctx.restore();
        }

        /* 蛇身 */
        var n = S.snake.length;
        var segPad = g.cs * 0.09;
        var radius = g.cs * 0.3;
        for (var i = n - 1; i >= 0; i--) {
          var seg = S.snake[i];
          var t = n > 1 ? 1 - i / (n - 1) : 1;
          ctx.globalAlpha = i === 0 ? 1 : MG.lerp(0.4, 0.95, t);
          ctx.fillStyle = i === 0 ? accent2 : accent;
          MG.roundRect(
            ctx,
            g.x + seg.x * g.csx + segPad,
            g.y + seg.y * g.csy + segPad,
            g.csx - segPad * 2,
            g.csy - segPad * 2,
            radius
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        /* 眼睛 */
        var head = S.snake[0];
        if (head) {
          var hx = g.x + (head.x + 0.5) * g.csx;
          var hy = g.y + (head.y + 0.5) * g.csy;
          var dx = S.dir.x;
          var dy = S.dir.y;
          var px = -dy;
          var py = dx;
          var r = Math.max(1.5, g.cs * 0.07);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(hx + dx * g.cs * 0.14 + px * g.cs * 0.17, hy + dy * g.cs * 0.14 + py * g.cs * 0.17, r, 0, 6.2832);
          ctx.arc(hx + dx * g.cs * 0.14 - px * g.cs * 0.17, hy + dy * g.cs * 0.14 - py * g.cs * 0.17, r, 0, 6.2832);
          ctx.fill();
        }

        fx.draw(ctx);
        ctx.restore();
      }

      /* ---------- 主循环 ---------- */

      function frame(t) {
        if (!S.running) return;
        raf = requestAnimationFrame(frame);

        if (!S.last) S.last = t;
        var dt = Math.min(200, t - S.last);
        S.last = t;
        S.acc += dt;
        fx.update(dt / 1000);

        var guard = 0;
        while (S.acc >= S.stepMs && S.running && guard++ < 6) {
          S.acc -= S.stepMs;
          step();
        }
        draw();
      }

      function resize() {
        view = MG.fitCanvas(canvas);
        buildBg();
        draw();
      }

      function pushDir(d) {
        var last = S.queue.length ? S.queue[S.queue.length - 1] : S.dir;
        if (d.x === -last.x && d.y === -last.y) return;
        if (d.x === last.x && d.y === last.y) return;
        if (S.queue.length < 2) S.queue.push(d);
      }

      /* ---------- 输入 ---------- */

      var offKey = MG.on(window, 'keydown', function (e) {
        if (!S.running) return;
        var d = DIRS[e.key];
        if (!d) return;
        e.preventDefault();
        pushDir(d);
      });

      var offTouchStart = MG.on(stage, 'touchstart', function (e) {
        var t = e.touches && e.touches[0];
        if (t) touchStart = { x: t.clientX, y: t.clientY };
      }, { passive: true });

      var offTouchEnd = MG.on(stage, 'touchend', function (e) {
        var t = e.changedTouches && e.changedTouches[0];
        var start = touchStart;
        touchStart = null;
        if (!t || !start) return;
        var dx = t.clientX - start.x;
        var dy = t.clientY - start.y;
        if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
        if (Math.abs(dx) > Math.abs(dy)) pushDir({ x: dx > 0 ? 1 : -1, y: 0 });
        else pushDir({ x: 0, y: dy > 0 ? 1 : -1 });
      }, { passive: true });

      /* ---------- 触屏方向键 ---------- */

      var pad = MG.h('div', 'dpad');
      [
        { text: '▲', col: 2, row: 1, dir: { x: 0, y: -1 } },
        { text: '◀', col: 1, row: 2, dir: { x: -1, y: 0 } },
        { text: '▶', col: 3, row: 2, dir: { x: 1, y: 0 } },
        { text: '▼', col: 2, row: 3, dir: { x: 0, y: 1 } }
      ].forEach(function (spec) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = spec.text;
        b.style.gridColumn = String(spec.col);
        b.style.gridRow = String(spec.row);
        b.addEventListener('click', function (e) {
          e.preventDefault();
          if (S.running) pushDir(spec.dir);
        });
        pad.appendChild(b);
      });
      stage.appendChild(pad);

      /* ---------- 初始化 ---------- */

      var offResize;
      if (w.ResizeObserver) {
        var ro = new w.ResizeObserver(function () { resize(); });
        ro.observe(canvas);
        offResize = function () { ro.disconnect(); };
      } else {
        offResize = MG.on(window, 'resize', resize);
      }

      resize();
      reset();
      draw();

      return {
        start: function () {
          reset();
          S.running = true;
          S.last = 0;
          raf = requestAnimationFrame(frame);
        },
        pause: function () {
          if (!S.running) return;
          S.running = false;
          cancelAnimationFrame(raf);
          draw();
        },
        resume: function () {
          if (S.running || S.dead) return;
          S.running = true;
          S.last = 0;
          raf = requestAnimationFrame(frame);
        },
        destroy: function () {
          S.running = false;
          cancelAnimationFrame(raf);
          offKey();
          offTouchStart();
          offTouchEnd();
          offResize();
        }
      };
    }
  });

})(window);
