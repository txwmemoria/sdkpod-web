/* =========================================================================
   小游戏 · 茶水间收杯子
   六格杯架，四种颜色的杯子各四只。每次只能拿最上面一只，放到空格，
   或者放到顶上同色、还有空位的格子。每格只剩一种颜色就收好了。
   开局由「收好的状态」倒着打乱得到（每一步都能原路走回去），保证有解。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var CAP = 4;
  var COLORS = ['#d98f86', '#e2b56f', '#7fae94', '#86a2cc'];
  var STACKS = COLORS.length + 2;

  MG.register({
    id: 'cups',
    name: '茶水间收杯子',
    icon: '☕',
    accent: '#b9866a',
    tagline: '大家的杯子堆成一团。按颜色收回杯架，每格一种颜色。',
    tags: ['解谜', '点击'],
    duration: '约 2 分钟',
    howto: '先点一格拿起最上面的杯子，再点另一格放下：只能放进空格，或者放在同色杯子上面。每格最多四只。所有格子都只剩一种颜色就完成了。',
    controls: [['点一格 → 再点一格', '挪一只杯子'], ['U / 撤销', '退回上一步'], ['空格 / 回车', '开始 · 继续']],

    mount: function (stage, host) {
      stage.textContent = '';
      var board = MG.h('div', 'cup-board');
      stage.appendChild(board);

      var undoBtn = MG.h('button', 'btn ghost cup-undo', MG.t('g.cups.undo'));
      undoBtn.type = 'button';
      undoBtn.style.cssText = 'position:absolute;left:12px;top:12px;height:32px;padding:0 12px;font-size:12.5px;z-index:3';
      stage.appendChild(undoBtn);

      var stacks = [];
      var cols = [];
      var history = [];
      var S = { running: false, done: false, sel: -1, moves: 0, undos: 0, t0: 0, pausedAt: 0, tick: 0 };

      function top(st) { return st.length ? st[st.length - 1] : -1; }
      function canPlace(from, to) {
        if (from === to) return false;
        var a = stacks[from];
        var b = stacks[to];
        if (!a.length || b.length >= CAP) return false;
        return !b.length || top(b) === top(a);
      }
      function solved() {
        for (var i = 0; i < stacks.length; i++) {
          var st = stacks[i];
          if (!st.length) continue;
          if (st.length !== CAP) return false;
          for (var j = 1; j < st.length; j++) if (st[j] !== st[0]) return false;
        }
        return true;
      }
      function mixed() {
        var breaks = 0;
        for (var i = 0; i < stacks.length; i++) {
          for (var j = 1; j < stacks[i].length; j++) if (stacks[i][j] !== stacks[i][j - 1]) breaks++;
        }
        return breaks;
      }

      /* 倒着打乱：只挪「下面是同色或没东西」的顶杯，这样正着走总能挪回去 */
      function deal() {
        for (var attempt = 0; attempt < 30; attempt++) {
          stacks = [];
          for (var c = 0; c < STACKS; c++) {
            var st = [];
            if (c < COLORS.length) for (var k = 0; k < CAP; k++) st.push(c);
            stacks.push(st);
          }
          var last = null;
          for (var step = 0; step < 260; step++) {
            var opts = [];
            for (var a = 0; a < STACKS; a++) {
              var sa = stacks[a];
              if (!sa.length) continue;
              var x = sa[sa.length - 1];
              if (sa.length > 1 && sa[sa.length - 2] !== x) continue;
              for (var b = 0; b < STACKS; b++) {
                if (b === a || stacks[b].length >= CAP) continue;
                if (last && last[0] === b && last[1] === a) continue;
                opts.push([a, b]);
              }
            }
            if (!opts.length) break;
            var mv = opts[MG.randInt(0, opts.length - 1)];
            stacks[mv[1]].push(stacks[mv[0]].pop());
            last = mv;
          }
          if (mixed() >= 9 && !solved()) return;
        }
      }

      function build() {
        board.textContent = '';
        cols = [];
        for (var i = 0; i < STACKS; i++) {
          var col = MG.h('button', 'cup-col');
          col.type = 'button';
          col.dataset.i = String(i);
          board.appendChild(col);
          cols.push(col);
        }
        paint();
      }

      function paint() {
        for (var i = 0; i < cols.length; i++) {
          var col = cols[i];
          var st = stacks[i];
          while (col.children.length > st.length) col.removeChild(col.lastChild);
          while (col.children.length < st.length) col.appendChild(MG.h('i', 'cup'));
          for (var j = 0; j < st.length; j++) col.children[j].style.setProperty('--c', COLORS[st[j]]);
          var full = st.length === CAP && st.every(function (v) { return v === st[0]; });
          col.classList.toggle('done', full);
          col.classList.toggle('sel', i === S.sel);
          col.setAttribute('aria-label', MG.t('g.cups.shelf', { n: i + 1, k: st.length }));
        }
        undoBtn.disabled = !history.length || !S.running;
        undoBtn.style.opacity = undoBtn.disabled ? '.45' : '1';
      }

      function secs() { return S.t0 ? Math.max(0, Math.round((Date.now() - S.t0) / 1000)) : 0; }
      function score() { return Math.max(100, 1400 - S.moves * 9 - S.undos * 15 - secs() * 3); }

      function hud() {
        var m = {};
        m[MG.t('ui.moves')] = S.moves;
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
          note: MG.t('g.cups.note', { moves: S.moves, undos: S.undos, secs: secs() }),
          meta: { moves: S.moves, undos: S.undos, seconds: secs() }
        });
      }

      function choose(i) {
        if (!S.running) return;
        if (S.sel < 0) {
          if (!stacks[i].length) return;
          S.sel = i;
          MG.audio.play('click');
          paint();
          return;
        }
        if (S.sel === i) { S.sel = -1; paint(); return; }
        if (canPlace(S.sel, i)) {
          stacks[i].push(stacks[S.sel].pop());
          history.push([S.sel, i]);
          S.moves++;
          S.sel = -1;
          MG.audio.play('good');
          paint();
          hud();
          host.score(score());
          if (solved()) setTimeout(finish, 320);
          return;
        }
        /* 放不下：如果点的是另一格有杯子的，就改为拿起那一格 */
        S.sel = stacks[i].length ? i : -1;
        MG.audio.play('bad');
        paint();
      }

      function undo() {
        if (!S.running || !history.length) return;
        var mv = history.pop();
        stacks[mv[0]].push(stacks[mv[1]].pop());
        S.undos++;
        S.sel = -1;
        paint();
        hud();
        host.score(score());
      }

      var offClick = MG.on(board, 'click', function (e) {
        var col = e.target && e.target.closest ? e.target.closest('.cup-col') : null;
        if (col) choose(Number(col.dataset.i));
      });
      var offUndo = MG.on(undoBtn, 'click', function (e) { e.stopPropagation(); undo(); });
      var offKey = MG.on(w, 'keydown', function (e) {
        if (!S.running) return;
        if (e.key === 'u' || e.key === 'U' || ((e.metaKey || e.ctrlKey) && e.key === 'z')) { e.preventDefault(); undo(); return; }
        var n = parseInt(e.key, 10);
        if (n >= 1 && n <= STACKS) { e.preventDefault(); choose(n - 1); }
      });

      function startTick() {
        clearInterval(S.tick);
        S.tick = setInterval(function () { if (S.running) hud(); }, 1000);
      }

      deal();
      build();
      hud();
      host.score(0);

      return {
        start: function () {
          S.moves = 0;
          S.undos = 0;
          S.sel = -1;
          S.done = false;
          history = [];
          S.t0 = Date.now();
          S.running = true;
          paint();
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
          paint();
          hud();
          if (solved()) finish();
        },
        destroy: function () {
          S.running = false;
          clearInterval(S.tick);
          offClick();
          offUndo();
          offKey();
        }
      };
    }
  });
})(window);
