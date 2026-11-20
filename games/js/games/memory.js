/* =========================================================================
   小游戏 · 工位配对
   把同事桌上的东西两两配对。步数和用时越少，得分越高。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var SYMBOLS = ['☕', '🐟', '📎', '📊', '🍪', '🧾', '✏️', '🪴'];
  var FULL_SCORE = 1200;

  MG.register({
    id: 'memory',
    name: '工位配对',
    icon: '🧾',
    accent: '#7f78b8',
    tagline: '把同事桌上的东西两两配对。顺便记住谁爱喝什么。',
    tags: ['记忆', '点击'],
    duration: '约 1 分钟',
    howto: '翻开两张相同的卡片就能配对。步数和用时越少，得分越高——拖越久，分数掉越快。',
    controls: [
      ['鼠标 / 触屏', '翻牌'],
      ['空格 / 回车', '开始 · 继续'],
      ['P', '暂停']
    ],
    mount: function (stage, host) {
      stage.textContent = '';

      var board = MG.h('div', 'mem-board');
      var grid = MG.h('div', 'mem-grid');
      board.appendChild(grid);
      stage.appendChild(board);

      var cards = [];
      var S = {
        open: [],
        matched: 0,
        moves: 0,
        t0: 0,
        pausedAt: 0,
        running: false,
        locked: false,
        flipTimer: 0,
        tickTimer: 0
      };

      function shuffle(list) {
        for (var i = list.length - 1; i > 0; i--) {
          var j = MG.randInt(0, i);
          var t = list[i];
          list[i] = list[j];
          list[j] = t;
        }
        return list;
      }

      function buildDeck() {
        grid.textContent = '';
        cards = [];
        var deck = [];
        SYMBOLS.forEach(function (s) { deck.push(s); deck.push(s); });
        shuffle(deck);

        deck.forEach(function (sym, idx) {
          var card = document.createElement('button');
          card.type = 'button';
          card.className = 'mem-card';
          card.dataset.symbol = sym;
          card.setAttribute('aria-label', '卡片 ' + (idx + 1));

          var inner = MG.h('div', 'inner');
          inner.appendChild(MG.h('div', 'face back', '🐟'));
          inner.appendChild(MG.h('div', 'face front', sym));
          card.appendChild(inner);

          grid.appendChild(card);
          cards.push(card);
        });
      }

      /* 牌桌保持正方形并居中：宽屏时不会变成扁长条 */
      function fit() {
        var side = Math.max(180, Math.min(stage.clientWidth - 24, stage.clientHeight - 24));
        grid.style.width = side + 'px';
        grid.style.height = side + 'px';
      }

      var offResize;
      if (w.ResizeObserver) {
        var ro = new w.ResizeObserver(fit);
        ro.observe(stage);
        offResize = function () { ro.disconnect(); };
      } else {
        offResize = MG.on(window, 'resize', fit);
      }

      function elapsedSec() {
        if (!S.t0) return 0;
        return Math.max(0, Math.round((Date.now() - S.t0) / 1000));
      }

      function potential() {
        return Math.max(0, FULL_SCORE - S.moves * 16 - elapsedSec() * 5);
      }

      function hud() {
        var m = {};
        m[MG.t('ui.moves')] = S.moves;
        m[MG.t('ui.pairs')] = S.matched + ' / ' + SYMBOLS.length;
        m[MG.t('ui.elapsed')] = MG.fmtClock(elapsedSec() * 1000);
        host.meta(m);
        host.score(potential());
      }

      function finish() {
        if (!S.running) return;
        S.running = false;
        clearInterval(S.tickTimer);
        clearTimeout(S.flipTimer);
        var secs = Math.max(1, elapsedSec());
        var score = Math.max(60, FULL_SCORE - S.moves * 16 - secs * 5);
        host.score(score);
        MG.audio.play('win');
        host.finish({
          score: score,
          note: MG.t('g.memory.note', { moves: S.moves, secs: secs }),
          meta: { moves: S.moves, seconds: secs }
        });
      }

      function onBoardClick(e) {
        var card = e.target && e.target.closest ? e.target.closest('.mem-card') : null;
        if (!card || !S.running || S.locked) return;
        if (card.classList.contains('matched') || card.classList.contains('flipped')) return;

        card.classList.add('flipped');
        S.open.push(card);
        MG.audio.play('click');

        if (S.open.length < 2) return;

        S.moves++;
        var a = S.open[0];
        var b = S.open[1];

        if (a.dataset.symbol === b.dataset.symbol) {
          a.classList.add('matched');
          b.classList.add('matched');
          S.open = [];
          S.matched++;
          MG.audio.play('good');
          hud();
          if (S.matched === SYMBOLS.length) {
            S.flipTimer = setTimeout(finish, 340);
          }
          return;
        }

        S.locked = true;
        MG.audio.play('bad');
        hud();
        S.flipTimer = setTimeout(function () {
          a.classList.remove('flipped');
          b.classList.remove('flipped');
          S.open = [];
          S.locked = false;
        }, 620);
      }

      var offClick = MG.on(board, 'click', onBoardClick);

      buildDeck();
      fit();
      hud();
      host.score(0);

      return {
        start: function () {
          S.open = [];
          S.matched = 0;
          S.moves = 0;
          S.locked = false;
          S.t0 = Date.now();
          S.running = true;
          clearTimeout(S.flipTimer);

          for (var i = 0; i < cards.length; i++) {
            cards[i].classList.remove('flipped', 'matched');
          }

          host.score(FULL_SCORE);
          hud();
          clearInterval(S.tickTimer);
          S.tickTimer = setInterval(function () {
            if (!S.running) return;
            hud();
          }, 500);
        },
        pause: function () {
          if (!S.running) return;
          S.running = false;
          S.pausedAt = Date.now();
          clearInterval(S.tickTimer);
        },
        resume: function () {
          if (S.running) return;
          S.t0 += Date.now() - S.pausedAt;
          S.running = true;
          clearInterval(S.tickTimer);
          S.tickTimer = setInterval(function () {
            if (!S.running) return;
            hud();
          }, 500);
          hud();
          if (S.matched === SYMBOLS.length) finish();
        },
        destroy: function () {
          S.running = false;
          clearInterval(S.tickTimer);
          clearTimeout(S.flipTimer);
          offClick();
          offResize();
        }
      };
    }
  });

})(window);
