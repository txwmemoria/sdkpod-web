/* =========================================================================
   小游戏 · 午休一杆进洞
   午休半小时，三洞高尔夫。按住球往后拉，松手击球，躲开工位隔断把球推进洞里。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var FW = 1000;
  var FH = 625;
  var HOLES = 3;
  var PAR = 2;
  var R = 12;

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    v = (v || '').trim();
    return v || fallback;
  }

  MG.register({
    id: 'golf',
    name: '午休一杆进洞',
    icon: '⛳',
    accent: '#4f8f72',
    tagline: '午休半小时，三洞高尔夫。按住球往后拉，松手就是这一杆。',
    tags: ['拖拽', '3 洞'],
    duration: '约 1 分钟',
    howto: '从球往后拖（像弹弓），松手击球。躲开灰色隔断，把球推进洞里。三洞打完结算，杆数越少分越高。',
    controls: [
      ['按住拖动', '蓄力 · 瞄准'],
      ['松手', '击球'],
      ['空格 / 回车', '开始 · 继续'],
      ['P', '暂停']
    ],
    mount: function (stage, host) {
      var canvas = document.createElement('canvas');
      stage.appendChild(canvas);

      var view = null;
      var raf = 0;
      var fx = MG.effects();
      var scale = 1;
      var offX = 0;
      var offY = 0;

      var S = {
        running: false,
        hole: 0,
        strokes: 0,
        holeStrokes: 0,
        score: 0,
        ball: { x: FW / 2, y: FH - 90, vx: 0, vy: 0 },
        cup: { x: FW / 2, y: 140 },
        desks: [],
        aiming: false,
        aimX: 0,
        aimY: 0,
        sunk: 0,
        startedAt: 0,
        pausedAt: 0,
        last: 0,
        finished: false
      };

      function layout() {
        scale = Math.min(view.w / FW, view.h / FH);
        offX = (view.w - FW * scale) / 2;
        offY = (view.h - FH * scale) / 2;
      }

      function toVirtual(clientX, clientY) {
        var rect = canvas.getBoundingClientRect();
        var x = (clientX - rect.left) * (view.w / rect.width);
        var y = (clientY - rect.top) * (view.h / rect.height);
        return { x: (x - offX) / scale, y: (y - offY) / scale };
      }

      /* ---------- 球洞与工位隔断 ---------- */

      function buildCourse() {
        S.cup = {
          x: MG.rand(FW * 0.22, FW * 0.78),
          y: MG.rand(FH * 0.2, FH * 0.34)
        };
        S.desks = [];
        var count = 2 + (S.hole % 2);
        var yMin = S.cup.y + 100;
        var yMax = Math.max(yMin + 40, S.ball.y - 150);
        for (var i = 0; i < count; i++) {
          var dw = MG.rand(FW * 0.1, FW * 0.22);
          var dh = MG.rand(30, 46);
          var x = MG.rand(FW * 0.08, FW * 0.92 - dw);
          var y = MG.rand(yMin, yMax);
          /* 别正好压在洞口或发球点上，也别和已有的隔断叠在一起 */
          var hitCup = x < S.cup.x + 40 && x + dw > S.cup.x - 40 && y < S.cup.y + 50;
          if (hitCup) continue;
          var overlap = S.desks.some(function (d) {
            return x < d.x + d.w + 26 && x + dw + 26 > d.x && y < d.y + d.h + 20 && y + dh + 20 > d.y;
          });
          if (overlap) continue;
          S.desks.push({ x: x, y: y, w: dw, h: dh });
        }
      }

      function resetHole() {
        S.dirty = true;
        S.ball.x = FW / 2;
        S.ball.y = FH - 90;
        S.ball.vx = 0;
        S.ball.vy = 0;
        S.holeStrokes = 0;
        S.sunk = 0;
        S.aiming = false;
        buildCourse();
        hud();
      }

      function hud() {
        var elapsed = S.running ? (performance.now() - S.startedAt) / 1000 : 0;
        var m = {};
        m[MG.t('ui.hole')] = (S.hole + 1) + ' / ' + HOLES;
        m[MG.t('ui.strokes')] = S.strokes;
        m[MG.t('ui.elapsed')] = MG.fmtClock(elapsed * 1000);
        host.meta(m);
      }

      /* ---------- 击球 ---------- */

      function shoot() {
        var dx = S.ball.x - S.aimX;
        var dy = S.ball.y - S.aimY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 8) { S.aiming = false; return; }

        var power = Math.min(dist, 240) / 240;
        var speed = 260 + power * 1250;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        S.ball.vx = (dx / len) * speed;
        S.ball.vy = (dy / len) * speed;
        S.strokes++;
        S.holeStrokes++;
        S.aiming = false;
        MG.audio.play('good');
        fx.burst(S.ball.x, S.ball.y, 'rgba(255,255,255,.9)', 8, 170);
        hud();
      }

      /* ---------- 物理 ---------- */

      function bounceDesk(desk) {
        var closestX = MG.clamp(S.ball.x, desk.x, desk.x + desk.w);
        var closestY = MG.clamp(S.ball.y, desk.y, desk.y + desk.h);
        var dx = S.ball.x - closestX;
        var dy = S.ball.y - closestY;
        var d2 = dx * dx + dy * dy;
        if (d2 > R * R) return;

        var d = Math.sqrt(d2) || 0.001;
        var nx = dx / d;
        var ny = dy / d;
        var overlap = R - d;
        S.ball.x += nx * overlap;
        S.ball.y += ny * overlap;

        var vn = S.ball.vx * nx + S.ball.vy * ny;
        if (vn < 0) {
          S.ball.vx -= 1.7 * vn * nx;
          S.ball.vy -= 1.7 * vn * ny;
          MG.audio.play('click');
        }
      }

      function physics(dt) {
        var b = S.ball;
        var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        var steps = Math.min(8, Math.max(1, Math.ceil(sp * dt / (R * 0.5))));
        for (var s = 0; s < steps; s++) {
          physicsStep(dt / steps);
          if (S.sunk) return;
        }
      }

      function physicsStep(dt) {
        var b = S.ball;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        var damp = Math.pow(0.22, dt);
        b.vx *= damp;
        b.vy *= damp;

        if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx) * 0.7; }
        if (b.x > FW - R) { b.x = FW - R; b.vx = -Math.abs(b.vx) * 0.7; }
        if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy) * 0.7; }
        if (b.y > FH - R) { b.y = FH - R; b.vy = -Math.abs(b.vy) * 0.7; }

        for (var i = 0; i < S.desks.length; i++) bounceDesk(S.desks[i]);

        var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (speed < 26) { b.vx = 0; b.vy = 0; }

        /* 进洞判定：球心靠近洞口且速度足够慢 */
        var dx = b.x - S.cup.x;
        var dy = b.y - S.cup.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (!S.sunk && dist < 22 && speed < 330) {
          S.sunk = 0.001;
          S.ball.vx = 0;
          S.ball.vy = 0;
          MG.audio.play('perfect');
          fx.burst(S.cup.x, S.cup.y, '#d9ad62', 24, 340);
          fx.shake(7);
        }
      }

      function nextHole() {
        S.hole++;
        if (S.hole >= HOLES) {
          end();
          return;
        }
        resetHole();
        MG.toast(MG.t('g.golf.next', { n: S.hole + 1, par: PAR }));
      }

      function end() {
        if (!S.running) return;
        S.running = false;
        cancelAnimationFrame(raf);
        var secs = Math.round((performance.now() - S.startedAt) / 1000);
        var score = Math.max(0, 1500 - S.strokes * 120 - secs * 3);
        draw();
        MG.audio.play('win');
        host.finish({
          score: score,
          note: MG.t('g.golf.note', { strokes: S.strokes, holes: HOLES, secs: secs }),
          meta: { strokes: S.strokes, holes: HOLES, seconds: secs }
        });
      }

      /* ---------- 绘制 ---------- */

      function draw() {
        if (!view) return;
        var ctx = view.ctx;
        var accent = MG.theme.accent;
        var ink = MG.theme.ink;
        var muted = MG.theme.muted;

        ctx.clearRect(0, 0, view.w, view.h);
        var fxo = fx.offset();
        ctx.save();
        ctx.translate(offX + fxo.x, offY + fxo.y);
        ctx.scale(scale, scale);

        /* 地毯 */
        ctx.fillStyle = 'rgba(120,140,130,.10)';
        MG.roundRect(ctx, 0, 0, FW, FH, 26);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,140,130,.3)';
        ctx.lineWidth = 3;
        MG.roundRect(ctx, 1.5, 1.5, FW - 3, FH - 3, 26);
        ctx.stroke();

        ctx.save();
        ctx.strokeStyle = 'rgba(120,140,130,.08)';
        ctx.lineWidth = 1;
        for (var x = 0; x <= FW; x += 50) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FH); ctx.stroke();
        }
        for (var y = 0; y <= FH; y += 50) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FW, y); ctx.stroke();
        }
        ctx.restore();

        /* 工位隔断 */
        for (var i = 0; i < S.desks.length; i++) {
          var d = S.desks[i];
          ctx.save();
          ctx.fillStyle = 'rgba(30,38,48,.10)';
          MG.roundRect(ctx, d.x + 3, d.y + 5, d.w, d.h, 10);
          ctx.fill();
          ctx.fillStyle = 'rgba(112,140,118,.55)';
          MG.roundRect(ctx, d.x, d.y, d.w, d.h, 10);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.25)';
          ctx.lineWidth = 2;
          MG.roundRect(ctx, d.x + 3, d.y + 3, d.w - 6, d.h - 6, 8);
          ctx.stroke();
          ctx.restore();
        }

        /* 球洞 */
        ctx.save();
        ctx.fillStyle = 'rgba(20,26,34,.55)';
        ctx.beginPath();
        ctx.ellipse(S.cup.x, S.cup.y, 26, 18, 0, 0, 6.2832);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(S.cup.x, S.cup.y, 26, 18, 0, 0, 6.2832);
        ctx.stroke();

        /* 旗杆 */
        ctx.strokeStyle = ink;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(S.cup.x, S.cup.y);
        ctx.lineTo(S.cup.x, S.cup.y - 46);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.font = '24px "Segoe UI Emoji","Apple Color Emoji",system-ui';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚩', S.cup.x + 2, S.cup.y - 50);
        ctx.restore();

        /* 发球点 */
        ctx.save();
        ctx.strokeStyle = 'rgba(120,140,130,.35)';
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(FW / 2, FH - 90, 26, 0, 6.2832);
        ctx.stroke();
        ctx.restore();

        /* 瞄准线 */
        if (S.aiming) {
          var dx = S.ball.x - S.aimX;
          var dy = S.ball.y - S.aimY;
          var dist = Math.min(Math.sqrt(dx * dx + dy * dy), 240);
          var len = Math.sqrt(dx * dx + dy * dy) || 1;
          var ux = dx / len;
          var uy = dy / len;

          ctx.save();
          ctx.strokeStyle = MG.hexToRgba(accent, 0.85);
          ctx.lineWidth = 3;
          ctx.setLineDash([10, 10]);
          ctx.beginPath();
          ctx.moveTo(S.ball.x, S.ball.y);
          ctx.lineTo(S.ball.x + ux * (60 + dist * 0.9), S.ball.y + uy * (60 + dist * 0.9));
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = MG.hexToRgba(accent, 0.16);
          ctx.beginPath();
          ctx.arc(S.ball.x, S.ball.y, 18 + (dist / 240) * 26, 0, 6.2832);
          ctx.fill();
          ctx.restore();
        }

        /* 球 */
        var shrink = S.sunk ? Math.max(0.15, 1 - S.sunk * 1.6) : 1;
        ctx.save();
        ctx.shadowColor = 'rgba(16,20,28,.28)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#fdfdfb';
        ctx.beginPath();
        ctx.arc(S.ball.x, S.ball.y, R * shrink, 0, 6.2832);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(112,140,118,.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(S.ball.x, S.ball.y, R * shrink, 0, 6.2832);
        ctx.stroke();

        /* 提示 */
        ctx.save();
        ctx.fillStyle = muted;
        ctx.font = '600 13px -apple-system,"Segoe UI","Microsoft YaHei",system-ui';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.globalAlpha = 0.8;
        ctx.fillText(MG.t('g.golf.holeInfo', { n: S.hole + 1, par: PAR, strokes: S.holeStrokes }), 26, 22);
        if (!S.aiming && S.ball.vx === 0 && S.ball.vy === 0 && !S.sunk) {
          ctx.textAlign = 'center';
          ctx.globalAlpha = 0.55;
          ctx.fillText(MG.t('g.golf.hint'), FW / 2, FH - 52);
        }
        ctx.restore();

        /* 粒子在场地坐标系里，跟着 scale 一起缩放 */
        fx.draw(ctx);
        ctx.restore();
      }

      /* ---------- 主循环 ---------- */

      function frame(t) {
        if (!S.running) return;
        raf = requestAnimationFrame(frame);
        if (!S.last) S.last = t;
        var dt = Math.min(0.033, (t - S.last) / 1000);
        S.last = t;

        if (S.sunk) {
          S.sunk += dt;
          if (S.sunk > 0.45) nextHole();
        } else {
          physics(dt);
        }
        fx.update(dt);

        /* 性能：球停着、没在瞄准、没有粒子时不重画 */
        var b = S.ball;
        var active = !!(b.vx || b.vy || S.aiming || S.sunk || fx.count());
        if (active || S.dirty) {
          draw();
          S.dirty = active;
        }
        if (performance.now() - S.hudAt > 250) {
          S.hudAt = performance.now();
          hud();
        }
      }

      /* ---------- 输入 ---------- */

      var offKey = MG.on(window, 'keydown', function (e) {
        if (!S.running) return;
        if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
      });

      var offDown = MG.on(stage, 'pointerdown', function (e) {
        if (!S.running || S.sunk) return;
        if (S.ball.vx !== 0 || S.ball.vy !== 0) return;
        if (e.target && e.target.closest && e.target.closest('.overlay, button')) return;
        if (e.cancelable) e.preventDefault();
        var p = toVirtual(e.clientX, e.clientY);
        S.aiming = true;
        S.aimX = p.x;
        S.aimY = p.y;
      });

      var offMove = MG.on(stage, 'pointermove', function (e) {
        if (!S.aiming) return;
        var p = toVirtual(e.clientX, e.clientY);
        S.aimX = p.x;
        S.aimY = p.y;
      });

      var offUp = MG.on(window, 'pointerup', function () {
        if (!S.aiming) return;
        shoot();
      });

      var offCancel = MG.on(window, 'pointercancel', function () { S.aiming = false; });

      var offResize;
      if (w.ResizeObserver) {
        var ro = new w.ResizeObserver(function () {
          view = MG.fitCanvas(canvas);
          layout();
          draw();
          S.dirty = true;
        });
        ro.observe(canvas);
        offResize = function () { ro.disconnect(); };
      } else {
        offResize = MG.on(window, 'resize', function () {
          view = MG.fitCanvas(canvas);
          layout();
          draw();
        });
      }

      view = MG.fitCanvas(canvas);
      layout();
      S.hudAt = 0;
      hud();
      host.score(0);
      buildCourse();
      draw();

      return {
        start: function () {
          S.hole = 0;
          S.strokes = 0;
          S.score = 0;
          S.finished = false;
          S.startedAt = performance.now();
          S.running = true;
          S.last = 0;
          fx.clear();
          host.score(0);
          resetHole();
          draw();
          raf = requestAnimationFrame(frame);
        },
        pause: function () {
          if (!S.running) return;
          S.running = false;
          S.pausedAt = performance.now();
          cancelAnimationFrame(raf);
          S.aiming = false;
          draw();
        },
        resume: function () {
          if (S.running) return;
          S.startedAt += performance.now() - S.pausedAt;
          S.running = true;
          S.last = 0;
          raf = requestAnimationFrame(frame);
        },
        destroy: function () {
          S.running = false;
          cancelAnimationFrame(raf);
          offKey();
          offDown();
          offMove();
          offUp();
          offCancel();
          offResize();
        }
      };
    }
  });

})(window);
