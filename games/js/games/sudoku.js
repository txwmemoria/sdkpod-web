/* =========================================================================
   小游戏 · 午后数独
   9×9 数独。题目用种子随机生成：先填满一盘，再一格一格挖空，
   每挖一格都用求解器确认「仍然只有唯一解」。难度偏轻松，约 38 个提示数。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var GIVENS = 38;

  /* ---------- 求解与生成（位运算候选数） ---------- */

  function boxOf(i) { return Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3); }

  function masks(grid) {
    var row = new Array(9).fill(0), col = new Array(9).fill(0), box = new Array(9).fill(0);
    for (var i = 0; i < 81; i++) {
      var v = grid[i];
      if (!v) continue;
      var bit = 1 << v;
      row[Math.floor(i / 9)] |= bit;
      col[i % 9] |= bit;
      box[boxOf(i)] |= bit;
    }
    return { row: row, col: col, box: box };
  }

  function bitCount(x) { var n = 0; while (x) { x &= x - 1; n++; } return n; }

  /* 数解的个数，数到 limit 就停 */
  function countSolutions(grid, limit) {
    var g = grid.slice();
    var m = masks(g);
    var count = 0;
    (function solve() {
      if (count >= limit) return;
      var best = -1, bestFree = 0, bestN = 10;
      for (var i = 0; i < 81; i++) {
        if (g[i]) continue;
        var used = m.row[Math.floor(i / 9)] | m.col[i % 9] | m.box[boxOf(i)];
        var free = ~used & 0x3FE;
        var n = bitCount(free);
        if (n < bestN) { bestN = n; best = i; bestFree = free; if (n <= 1) break; }
      }
      if (best < 0) { count++; return; }
      if (!bestN) return;
      var r = Math.floor(best / 9), c = best % 9, b = boxOf(best);
      for (var v = 1; v <= 9; v++) {
        var bit = 1 << v;
        if (!(bestFree & bit)) continue;
        g[best] = v; m.row[r] |= bit; m.col[c] |= bit; m.box[b] |= bit;
        solve();
        g[best] = 0; m.row[r] &= ~bit; m.col[c] &= ~bit; m.box[b] &= ~bit;
        if (count >= limit) return;
      }
    })();
    return count;
  }

  function shuffled(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = MG.randInt(0, i);
      var t = list[i]; list[i] = list[j]; list[j] = t;
    }
    return list;
  }

  function fullGrid() {
    var g = new Array(81).fill(0);
    var m = masks(g);
    (function fill(i) {
      if (i === 81) return true;
      var r = Math.floor(i / 9), c = i % 9, b = boxOf(i);
      var used = m.row[r] | m.col[c] | m.box[b];
      var digits = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (var k = 0; k < 9; k++) {
        var v = digits[k], bit = 1 << v;
        if (used & bit) continue;
        g[i] = v; m.row[r] |= bit; m.col[c] |= bit; m.box[b] |= bit;
        if (fill(i + 1)) return true;
        g[i] = 0; m.row[r] &= ~bit; m.col[c] &= ~bit; m.box[b] &= ~bit;
      }
      return false;
    })(0);
    return g;
  }

  function makePuzzle() {
    var solution = fullGrid();
    var puzzle = solution.slice();
    var order = shuffled(Array.from({ length: 81 }, function (_, i) { return i; }));
    var filled = 81;
    for (var k = 0; k < order.length && filled > GIVENS; k++) {
      var i = order[k];
      var keep = puzzle[i];
      puzzle[i] = 0;
      if (countSolutions(puzzle, 2) !== 1) puzzle[i] = keep;
      else filled--;
    }
    return { puzzle: puzzle, solution: solution };
  }

  MG.register({
    id: 'sudoku',
    name: '午后数独',
    icon: '🔢',
    accent: '#8a9a6a',
    tagline: '一杯茶的时间，填满九宫格。',
    tags: ['解谜', '数字'],
    duration: '约 8 分钟',
    howto: '每行、每列、每个 3×3 宫里，1–9 各出现一次。点格子再点数字填入；铅笔模式可以记候选数。',
    controls: [['点格子 · 方向键', '选格'], ['1–9', '填数'], ['N', '铅笔模式'], ['Delete / 0', '擦除']],

    mount: function (stage, host) {
      stage.textContent = '';
      var wrap = MG.h('div', 'su-wrap');
      var grid = MG.h('div', 'su-grid');
      var pad = MG.h('div', 'su-pad');
      wrap.appendChild(grid);
      wrap.appendChild(pad);
      stage.appendChild(wrap);

      var game = makePuzzle();
      var given = game.puzzle.map(function (v) { return v > 0; });
      var value = game.puzzle.slice();
      var notes = new Array(81).fill(0);
      var cells = [];
      var S = { running: false, done: false, sel: -1, pencil: false, mistakes: 0, t0: 0, pausedAt: 0, tick: 0 };

      for (var i = 0; i < 81; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'su-cell' +
          ((i % 9) % 3 === 2 && i % 9 !== 8 ? ' br' : '') +
          (Math.floor(i / 9) % 3 === 2 && i < 72 ? ' bb' : '');
        b.dataset.i = String(i);
        grid.appendChild(b);
        cells.push(b);
      }

      var padBtns = {};
      for (var d = 1; d <= 9; d++) {
        var pb = MG.h('button', 'su-key', String(d));
        pb.type = 'button';
        pb.dataset.d = String(d);
        pad.appendChild(pb);
        padBtns[d] = pb;
      }
      var eraseBtn = MG.h('button', 'su-key su-tool', '⌫');
      eraseBtn.type = 'button';
      eraseBtn.dataset.d = '0';
      var pencilBtn = MG.h('button', 'su-key su-tool', '✎');
      pencilBtn.type = 'button';
      pencilBtn.dataset.tool = 'pencil';
      pad.appendChild(pencilBtn);
      pad.appendChild(eraseBtn);

      function paint() {
        var selV = S.sel >= 0 ? value[S.sel] : 0;
        var sr = Math.floor(S.sel / 9), sc = S.sel % 9, sb = S.sel >= 0 ? boxOf(S.sel) : -1;
        for (var i = 0; i < 81; i++) {
          var c = cells[i];
          var v = value[i];
          var r = Math.floor(i / 9), cc = i % 9;
          var peer = S.sel >= 0 && (r === sr || cc === sc || boxOf(i) === sb);
          c.classList.toggle('given', given[i]);
          c.classList.toggle('sel', i === S.sel);
          c.classList.toggle('peer', peer && i !== S.sel);
          c.classList.toggle('same', !!selV && v === selV && i !== S.sel);
          c.classList.toggle('wrong', !given[i] && !!v && v !== game.solution[i]);
          if (v) {
            if (c.firstChild && c.firstChild.nodeType === 1) c.textContent = '';
            if (c.textContent !== String(v)) c.textContent = String(v);
          } else if (notes[i]) {
            var html = '<span class="su-notes">';
            for (var n = 1; n <= 9; n++) html += '<i>' + (notes[i] & (1 << n) ? n : '') + '</i>';
            c.innerHTML = html + '</span>';
          } else if (c.textContent || c.firstChild) {
            c.textContent = '';
          }
        }
        /* 已经填满 9 个的数字淡掉 */
        var counts = new Array(10).fill(0);
        for (var k = 0; k < 81; k++) if (value[k] && value[k] === game.solution[k]) counts[value[k]]++;
        for (var dd = 1; dd <= 9; dd++) padBtns[dd].classList.toggle('used', counts[dd] >= 9);
        pencilBtn.classList.toggle('on', S.pencil);
      }

      function secs() { return S.t0 ? Math.max(0, Math.round((Date.now() - S.t0) / 1000)) : 0; }
      function score() { return Math.max(200, 2400 - secs() * 2 - S.mistakes * 60); }
      function left() { var n = 0; for (var i = 0; i < 81; i++) if (value[i] !== game.solution[i]) n++; return n; }

      function hud() {
        var m = {};
        m[MG.t('g.sudoku.left')] = left();
        m[MG.t('g.sudoku.mistakes')] = S.mistakes;
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
          note: MG.t('g.sudoku.note', { mistakes: S.mistakes, time: MG.fmtClock(secs() * 1000) }),
          meta: { mistakes: S.mistakes, seconds: secs() }
        });
      }

      function enter(d) {
        if (!S.running || S.sel < 0 || given[S.sel]) return;
        var i = S.sel;
        if (d === 0) { value[i] = 0; notes[i] = 0; paint(); hud(); return; }
        if (S.pencil && !value[i]) {
          notes[i] ^= (1 << d);
          paint();
          return;
        }
        if (value[i] === d) return;
        value[i] = d;
        notes[i] = 0;
        if (d !== game.solution[i]) {
          S.mistakes++;
          MG.audio.play('bad');
        } else {
          MG.audio.play('good');
          /* 同行同列同宫里这个数字的铅笔记号自动清掉 */
          var r = Math.floor(i / 9), c = i % 9, b = boxOf(i);
          for (var k = 0; k < 81; k++) {
            if (Math.floor(k / 9) === r || k % 9 === c || boxOf(k) === b) notes[k] &= ~(1 << d);
          }
        }
        paint();
        hud();
        host.score(score());
        if (!left()) setTimeout(finish, 300);
      }

      function select(i) {
        S.sel = i;
        paint();
      }

      var offGrid = MG.on(grid, 'click', function (e) {
        var c = e.target && e.target.closest ? e.target.closest('.su-cell') : null;
        if (c && S.running) select(Number(c.dataset.i));
      });
      var offPad = MG.on(pad, 'click', function (e) {
        var k = e.target && e.target.closest ? e.target.closest('.su-key') : null;
        if (!k || !S.running) return;
        if (k.dataset.tool === 'pencil') { S.pencil = !S.pencil; paint(); return; }
        enter(Number(k.dataset.d));
      });
      var offKey = MG.on(w, 'keydown', function (e) {
        if (!S.running) return;
        var k = e.key;
        if (k >= '1' && k <= '9') { e.preventDefault(); enter(Number(k)); return; }
        if (k === '0' || k === 'Backspace' || k === 'Delete') { e.preventDefault(); enter(0); return; }
        if (k === 'n' || k === 'N') { S.pencil = !S.pencil; paint(); return; }
        var dir = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[k];
        if (dir) {
          e.preventDefault();
          var cur = S.sel < 0 ? 40 : S.sel;
          var nx = cur + dir;
          if (dir === -1 && cur % 9 === 0) nx = cur + 8;
          if (dir === 1 && cur % 9 === 8) nx = cur - 8;
          select((nx + 81) % 81);
        }
      });

      function fit() {
        var W = stage.clientWidth, H = stage.clientHeight;
        var wide = W / H > 1.2;
        wrap.classList.toggle('wide', wide);
        var side = wide ? Math.min(H - 36, W - 230) : Math.min(W - 28, H - 120);
        side = Math.max(220, Math.floor(side / 9) * 9);
        grid.style.width = side + 'px';
        grid.style.height = side + 'px';
        grid.style.fontSize = Math.round(side / 9 * 0.52) + 'px';
      }
      var ro = w.ResizeObserver ? new w.ResizeObserver(fit) : null;
      if (ro) ro.observe(stage);
      var offResize = ro ? function () { ro.disconnect(); } : MG.on(w, 'resize', fit);

      function startTick() {
        clearInterval(S.tick);
        S.tick = setInterval(function () { if (S.running) hud(); }, 1000);
      }

      fit();
      paint();
      hud();
      host.score(0);

      return {
        start: function () {
          S.mistakes = 0;
          S.done = false;
          S.t0 = Date.now();
          S.running = true;
          select(40);
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
          if (!left()) finish();
        },
        destroy: function () {
          S.running = false;
          clearInterval(S.tick);
          offGrid();
          offPad();
          offKey();
          offResize();
        }
      };
    }
  });
})(window);
