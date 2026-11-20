/* =========================================================================
   小游戏 · 工位叠方块
   文件柜、显示器、快递箱从天花板掉下来，横着码满一行就能塞进档案室。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var COLS = 10;
  var ROWS = 20;

  var SHAPES = [
    { name: 'I', color: '#5aa3c4', cells: [[1, 1, 1, 1]] },
    { name: 'O', color: '#cfa956', cells: [[1, 1], [1, 1]] },
    { name: 'T', color: '#9483c4', cells: [[0, 1, 0], [1, 1, 1]] },
    { name: 'S', color: '#58a383', cells: [[0, 1, 1], [1, 1, 0]] },
    { name: 'Z', color: '#c87470', cells: [[1, 1, 0], [0, 1, 1]] },
    { name: 'J', color: '#6286c0', cells: [[1, 0, 0], [1, 1, 1]] },
    { name: 'L', color: '#c8915a', cells: [[0, 0, 1], [1, 1, 1]] }
  ];

  function rotateCW(cells) {
    var rows = cells.length;
    var cols = cells[0].length;
    var out = [];
    for (var c = 0; c < cols; c++) {
      var line = [];
      for (var r = rows - 1; r >= 0; r--) line.push(cells[r][c]);
      out.push(line);
    }
    return out;
  }

  function rotateCCW(cells) {
    return rotateCW(rotateCW(rotateCW(cells)));
  }

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    v = (v || '').trim();
    return v || fallback;
  }

  MG.register({
    id: 'tetris',
    name: '工位叠方块',
    icon: '🧱',
    accent: '#5a7fb8',
    tagline: '文件柜和显示器从天花板掉下来，横着码满一行才能塞进档案室。',
    tags: ['键盘', '无尽'],
    duration: '无尽',
    howto: '方向键移动，↑ 或 X 旋转，空格直接落底。横着填满一行就会消除，越快越难。',
    controls: [
      ['← →', '左右移动'],
      ['↑ / X / Z', '旋转'],
      ['↓', '加速下落'],
      ['空格', '直接落底 · 开始'],
      ['手机', '右下方向键']
    ],
    mount: function (stage, host) {
      var canvas = document.createElement('canvas');
      stage.appendChild(canvas);
      var pad = MG.h('div', 'dpad dpad-5');
      stage.appendChild(pad);

      var view = null;
      var raf = 0;
      var fx = MG.effects();
      var board = [];
      var S = {
        piece: null,
        next: null,
        score: 0,
        lines: 0,
        level: 1,
        dropMs: 800,
        acc: 0,
        last: 0,
        running: false,
        over: false
      };

      function emptyBoard() {
        board = [];
        for (var r = 0; r < ROWS; r++) {
          var row = [];
          for (var c = 0; c < COLS; c++) row.push(null);
          board.push(row);
        }
      }

      function newPiece() {
        var def = MG.pick(SHAPES);
        var cells = def.cells.map(function (row) { return row.slice(); });
        return {
          cells: cells,
          color: def.color,
          name: def.name,
          x: Math.floor((COLS - cells[0].length) / 2),
          y: 0
        };
      }

      function collides(piece, dx, dy, cells) {
        var shape = cells || piece.cells;
        for (var r = 0; r < shape.length; r++) {
          for (var c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            var x = piece.x + c + dx;
            var y = piece.y + r + dy;
            if (x < 0 || x >= COLS || y >= ROWS) return true;
            if (y >= 0 && board[y][x]) return true;
          }
        }
        return false;
      }

      function merge() {
        var p = S.piece;
        for (var r = 0; r < p.cells.length; r++) {
          for (var c = 0; c < p.cells[r].length; c++) {
            if (!p.cells[r][c]) continue;
            var y = p.y + r;
            var x = p.x + c;
            if (y >= 0) board[y][x] = p.color;
          }
        }
      }

      function clearLines() {
        var cleared = 0;
        var gg = geometry();
        for (var r = ROWS - 1; r >= 0; r--) {
          var full = true;
          for (var c = 0; c < COLS; c++) if (!board[r][c]) { full = false; break; }
          if (!full) continue;

          /* 消除时沿着这一行炸开一排碎块 */
          fx.burst(
            gg.bx + gg.bw / 2,
            gg.by + r * gg.cell + gg.cell / 2,
            cleared % 2 ? '#d9ad62' : MG.theme.accent,
            16,
            280
          );

          board.splice(r, 1);
          var row = [];
          for (var k = 0; k < COLS; k++) row.push(null);
          board.unshift(row);
          cleared++;
          r++;
        }
        if (!cleared) return;
        if (cleared >= 3) fx.shake(7);
        else if (cleared === 2) fx.shake(4);
        S.lines += cleared;
        S.score += [0, 100, 300, 500, 800][cleared] * S.level;
        var nextLevel = 1 + Math.floor(S.lines / 10);
        if (nextLevel > S.level) {
          S.level = nextLevel;
          S.dropMs = Math.max(110, 800 - (S.level - 1) * 70);
          MG.audio.play('win');
        } else {
          MG.audio.play('good');
        }
        host.score(S.score);
        hud();
      }

      function spawn() {
        S.piece = S.next || newPiece();
        S.next = newPiece();
        S.acc = 0;
        if (collides(S.piece, 0, 0)) {
          S.running = false;
          S.over = true;
          draw();
          MG.audio.play('over');
          host.finish({
            score: S.score,
            note: MG.t('g.tetris.note', { lines: S.lines, level: S.level }),
            meta: { lines: S.lines, level: S.level }
          });
        }
      }

      function lock() {
        merge();
        clearLines();
        spawn();
      }

      function move(dx) {
        if (!S.running) return;
        if (!collides(S.piece, dx, 0)) S.piece.x += dx;
      }

      function rotate(dir) {
        if (!S.running) return;
        var cells = dir > 0 ? rotateCW(S.piece.cells) : rotateCCW(S.piece.cells);
        var kicks = [0, -1, 1, -2, 2];
        for (var i = 0; i < kicks.length; i++) {
          if (!collides(S.piece, kicks[i], 0, cells)) {
            S.piece.cells = cells;
            S.piece.x += kicks[i];
            MG.audio.play('click');
            return;
          }
        }
      }

      function stepDown(soft) {
        if (!S.running) return;
        if (!collides(S.piece, 0, 1)) {
          S.piece.y++;
          if (soft) { S.score++; host.score(S.score); }
          S.acc = 0;
        } else {
          lock();
        }
      }

      function hardDrop() {
        if (!S.running) return;
        var n = 0;
        while (!collides(S.piece, 0, 1)) { S.piece.y++; n++; }
        S.score += n * 2;
        host.score(S.score);
        MG.audio.play('click');
        lock();
      }

      function hud() {
        var m = {};
        m[MG.t('ui.lines')] = S.lines;
        m[MG.t('ui.level')] = S.level;
        host.meta(m);
      }

      /* ---------- 绘制 ---------- */

      function geometry() {
        var cell = Math.min((view.w * 0.56) / COLS, (view.h * 0.94) / ROWS);
        var bw = cell * COLS;
        var bh = cell * ROWS;
        return {
          cell: cell,
          bw: bw,
          bh: bh,
          bx: view.w * 0.4 - bw / 2,
          by: (view.h - bh) / 2
        };
      }

      function block(ctx, x, y, size, color, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha === undefined ? 1 : alpha;
        ctx.fillStyle = color;
        MG.roundRect(ctx, x + 1.5, y + 1.5, size - 3, size - 3, size * 0.22);
        ctx.fill();
        ctx.globalAlpha = (alpha === undefined ? 1 : alpha) * 0.55;
        ctx.strokeStyle = 'rgba(255,255,255,.55)';
        ctx.lineWidth = 1.4;
        MG.roundRect(ctx, x + 3, y + 3, size - 6, size - 6, size * 0.18);
        ctx.stroke();
        ctx.restore();
      }

      function draw() {
        if (!view) return;
        var ctx = view.ctx;
        var g = geometry();
        var accent = MG.theme.ink;

        ctx.clearRect(0, 0, view.w, view.h);

        var fxo = fx.offset();
        ctx.save();
        ctx.translate(fxo.x, fxo.y);

        /* 棋盘底 */
        ctx.save();
        ctx.fillStyle = 'rgba(112,140,118,.08)';
        MG.roundRect(ctx, g.bx - 8, g.by - 8, g.bw + 16, g.bh + 16, 18);
        ctx.fill();

        ctx.strokeStyle = 'rgba(112,140,118,.16)';
        ctx.lineWidth = 1;
        for (var c = 0; c <= COLS; c++) {
          ctx.beginPath();
          ctx.moveTo(g.bx + c * g.cell, g.by);
          ctx.lineTo(g.bx + c * g.cell, g.by + g.bh);
          ctx.stroke();
        }
        for (var r = 0; r <= ROWS; r++) {
          ctx.beginPath();
          ctx.moveTo(g.bx, g.by + r * g.cell);
          ctx.lineTo(g.bx + g.bw, g.by + r * g.cell);
          ctx.stroke();
        }
        ctx.restore();

        /* 已固定的方块 */
        for (var y = 0; y < ROWS; y++) {
          for (var x = 0; x < COLS; x++) {
            if (!board[y][x]) continue;
            block(ctx, g.bx + x * g.cell, g.by + y * g.cell, g.cell, board[y][x]);
          }
        }

        /* 幽灵落点 */
        var p = S.piece;
        if (p) {
          var gy = 0;
          while (!collides(p, 0, gy + 1)) gy++;
          for (var gr = 0; gr < p.cells.length; gr++) {
            for (var gc = 0; gc < p.cells[gr].length; gc++) {
              if (!p.cells[gr][gc]) continue;
              var yy = p.y + gr + gy;
              if (yy < 0) continue;
              block(ctx, g.bx + (p.x + gc) * g.cell, g.by + yy * g.cell, g.cell, p.color, 0.16);
            }
          }

          /* 当前方块 */
          for (var pr = 0; pr < p.cells.length; pr++) {
            for (var pc = 0; pc < p.cells[pr].length; pc++) {
              if (!p.cells[pr][pc]) continue;
              var py = p.y + pr;
              if (py < 0) continue;
              block(ctx, g.bx + (p.x + pc) * g.cell, g.by + py * g.cell, g.cell, p.color);
            }
          }
        }

        /* 右侧信息栏 */
        var panelX = g.bx + g.bw + Math.max(28, view.w * 0.05);
        var panelY = g.by + 4;
        var small = Math.max(9, g.cell * 0.34);

        ctx.save();
        ctx.fillStyle = 'rgba(112,140,118,.07)';
        MG.roundRect(ctx, panelX - 14, panelY - 12, g.cell * 3.6, g.cell * 6.6, 16);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.55;
        ctx.font = '600 ' + small + 'px -apple-system,"Segoe UI","Microsoft YaHei",system-ui';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(MG.t('g.tetris.next'), panelX, panelY);
        ctx.globalAlpha = 1;

        var nb = S.next;
        if (nb) {
          var previewCell = g.cell * 0.72;
          var offsetX = panelX + (g.cell * 2 - nb.cells[0].length * previewCell) / 2;
          for (var nr = 0; nr < nb.cells.length; nr++) {
            for (var nc = 0; nc < nb.cells[nr].length; nc++) {
              if (!nb.cells[nr][nc]) continue;
              block(ctx, offsetX + nc * previewCell, panelY + small + 14 + nr * previewCell, previewCell, nb.color);
            }
          }
        }

        var statsY = panelY + small + 14 + g.cell * 3.4;
        ctx.globalAlpha = 0.55;
        ctx.font = '600 ' + small + 'px -apple-system,"Segoe UI","Microsoft YaHei",system-ui';
        ctx.fillText(MG.t('ui.level'), panelX, statsY);
        ctx.fillText(MG.t('ui.lines'), panelX, statsY + small * 3.2);
        ctx.globalAlpha = 1;
        ctx.font = '700 ' + Math.round(small * 1.5) + 'px -apple-system,"Segoe UI",system-ui';
        ctx.fillText(String(S.level), panelX, statsY + small * 1.35);
        ctx.fillText(String(S.lines), panelX, statsY + small * 4.55);
        ctx.restore();

        fx.draw(ctx);
        ctx.restore();
      }

      /* ---------- 主循环 ---------- */

      function frame(t) {
        if (!S.running) return;
        raf = requestAnimationFrame(frame);
        if (!S.last) S.last = t;
        var dt = Math.min(120, t - S.last);
        S.last = t;
        fx.update(dt / 1000);
        S.acc += dt;
        if (S.acc >= S.dropMs) {
          S.acc = 0;
          stepDown(false);
          S.dirty = true;
        }
        /* 性能：画面没变就不重画（方块大部分时间是静止的） */
        var busy = fx.count() > 0;
        if (S.dirty || busy) {
          draw();
          S.dirty = busy;
        }
      }

      /* ---------- 输入 ---------- */

      function onKey(e) {
        if (!S.running) return;
        var handled = true;
        switch (e.key) {
          case 'ArrowLeft': case 'a': case 'A': move(-1); break;
          case 'ArrowRight': case 'd': case 'D': move(1); break;
          case 'ArrowDown': case 's': case 'S': stepDown(true); break;
          case 'ArrowUp': case 'x': case 'X': case 'w': case 'W': rotate(1); break;
          case 'z': case 'Z': rotate(-1); break;
          case ' ': hardDrop(); break;
          default: handled = false;
        }
        if (handled) { e.preventDefault(); S.dirty = true; }
      }

      var offKey = MG.on(window, 'keydown', onKey);

      /* 触屏方向键 */
      [
        { text: '⟳', col: 2, row: 1, fn: function () { rotate(1); } },
        { text: '◀', col: 1, row: 2, fn: function () { move(-1); } },
        { text: '▼', col: 2, row: 2, fn: function () { stepDown(true); } },
        { text: '▶', col: 3, row: 2, fn: function () { move(1); } },
        { text: '⤓', col: 2, row: 3, fn: hardDrop }
      ].forEach(function (spec) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = spec.text;
        b.style.gridColumn = String(spec.col);
        b.style.gridRow = String(spec.row);
        b.addEventListener('click', function (e) { e.preventDefault(); spec.fn(); S.dirty = true; });
        pad.appendChild(b);
      });

      var offResize;
      if (w.ResizeObserver) {
        var ro = new w.ResizeObserver(function () { view = MG.fitCanvas(canvas); draw(); S.dirty = true; });
        ro.observe(canvas);
        offResize = function () { ro.disconnect(); };
      } else {
        offResize = MG.on(window, 'resize', function () { view = MG.fitCanvas(canvas); draw(); });
      }

      view = MG.fitCanvas(canvas);
      emptyBoard();
      S.next = newPiece();
      hud();
      host.score(0);
      draw();

      return {
        start: function () {
          emptyBoard();
          S.score = 0;
          S.lines = 0;
          S.level = 1;
          S.dropMs = 800;
          S.acc = 0;
          S.last = 0;
          S.over = false;
          S.next = newPiece();
          S.running = true;
          fx.clear();
          host.score(0);
          hud();
          spawn();
          draw();
          raf = requestAnimationFrame(frame);
        },
        pause: function () {
          if (!S.running) return;
          S.running = false;
          cancelAnimationFrame(raf);
          draw();
        },
        resume: function () {
          if (S.running || S.over) return;
          S.running = true;
          S.last = 0;
          raf = requestAnimationFrame(frame);
        },
        destroy: function () {
          S.running = false;
          cancelAnimationFrame(raf);
          offKey();
          offResize();
        }
      };
    }
  });

})(window);
