/* =========================================================================
   摸鱼司 · 应用外壳
   大厅渲染 / 对局状态机 / 假装工作（Boss Key）/ 摸鱼时长统计
   ========================================================================= */
(function (w) {
  'use strict';

  var MG = w.MG;
  var store = MG.store;

  var view = document.getElementById('view');
  var els = {
    workTime: document.getElementById('workTime'),
    btnSound: document.getElementById('btnSound'),
    btnTheme: document.getElementById('btnTheme'),
    btnFake: document.getElementById('btnFake'),
    btnLang: document.getElementById('btnLang'),
    fake: document.getElementById('fakescreen')
  };

  var play = null;
  var fakeOn = false;
  var dailyRun = null;

  /* 演示模式：?auto=1 打开后直接开玩；?fake=1 一进来就是报表；?theme=dark 固定夜间。 */
  var AUTO_START = /(^|[?&])auto=1(&|$)/.test(location.search);
  var FAKE_FIRST = /(^|[?&])fake=1(&|$)/.test(location.search);
  var THEME_OVERRIDE = /(^|[?&])theme=(dark|light)(&|$)/.exec(location.search);

  /* ------------------------------------------------------------ 顶栏与偏好 */

  function applyTheme() {
    document.documentElement.dataset.theme = store.data.theme;
    els.btnTheme.innerHTML = MG.icons[store.data.theme === 'dark' ? 'sun' : 'moon'];
    els.btnTheme.setAttribute('title', MG.t(store.data.theme === 'dark' ? 'app.themeLight' : 'app.themeDark'));
    if (MG.refreshTheme) MG.refreshTheme();
  }

  function applySound() {
    els.btnSound.innerHTML = MG.icons[store.data.sound ? 'soundOn' : 'soundOff'];
    els.btnSound.setAttribute('title', MG.t(store.data.sound ? 'app.soundOn' : 'app.soundOff'));
  }

  function refreshWorkTime() {
    if (els.workTime) els.workTime.textContent = MG.durationText(store.data.workMs);
  }

  function applyLangButton() {
    if (!els.btnLang) return;
    els.btnLang.textContent = MG.i18n.lang === 'zh' ? 'EN' : '中文';
    els.btnLang.setAttribute('title', MG.t('app.langTitle'));
  }

  els.btnTheme.addEventListener('click', function () {
    store.data.theme = store.data.theme === 'dark' ? 'light' : 'dark';
    store.save();
    try { w.localStorage.setItem('theme', store.data.theme); } catch (err) {}
    applyTheme();
  });

  els.btnSound.addEventListener('click', function () {
    MG.audio.setOn(!store.data.sound);
    applySound();
    MG.audio.play('click');
    MG.toast(MG.t(store.data.sound ? 'app.toastSound' : 'app.toastMuted'));
  });

  els.btnFake.addEventListener('click', function () { toggleFake(true); });

  if (els.btnLang) {
    els.btnLang.addEventListener('click', function () {
      MG.i18n.toggle();
    });
  }

  /* -------------------------------------------------------------- 假装工作 */

  function toggleFake(force) {
    var on = (typeof force === 'boolean') ? force : !fakeOn;
    if (on === fakeOn) return;
    fakeOn = on;
    if (on && play && play.state === 'running') pauseGame();
    els.fake.hidden = !on;
    document.body.classList.toggle('faking', on);
  }

  /* ------------------------------------------------------------ 摸鱼计时 */

  function settle() {
    if (!play || play.state !== 'running' || !play.mark) return;
    var now = Date.now();
    var delta = now - play.mark;
    if (!(delta > 0)) return;
    play.mark = now;
    play.playedMs += delta;
    store.addWork(delta);
    store.save();
    refreshWorkTime();
  }

  setInterval(settle, 10000);
  w.addEventListener('beforeunload', function () { settle(); store.save(); });

  /* ---------------------------------------------------------------- 路由 */

  function routeId() {
    var m = /^#\/g\/([A-Za-z0-9_-]+)$/.exec(location.hash || '');
    return m ? m[1] : null;
  }

  function sync() {
    var id = routeId();
    if (id && MG.gameById(id)) openGame(id);
    else renderHub();
  }

  w.addEventListener('hashchange', sync);

  /* ---------------------------------------------------------------- 大厅 */

  function playRandom() {
    var pool = MG.games.filter(function (g) { return g.id !== store.data.lastGame; });
    if (!pool.length) pool = MG.games;
    var pick = MG.pick(pool);
    location.hash = '#/g/' + pick.id;
  }

  function renderHub() {
    teardownPlay();
    view.textContent = '';

    view.appendChild(buildHero());
    view.appendChild(buildShelf());
    view.appendChild(buildBadges());
  }

  /* ===================================================== v5 大厅（场景化） */

  /* 主视觉：窗外的远山与天光，桌角一杯茶。颜色全部走 CSS 变量，夜间自动换成月夜。 */
  var SCENE = [
    '<svg class="scene" viewBox="0 0 1200 380" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">',
    '<defs>',
    '<linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="var(--sky-1)"/><stop offset="1" stop-color="var(--sky-2)"/>',
    '</linearGradient>',
    '<radialGradient id="sc-sun" cx=".5" cy=".5" r=".5">',
    '<stop offset="0" stop-color="var(--sun)" stop-opacity=".95"/><stop offset=".55" stop-color="var(--sun)" stop-opacity=".35"/>',
    '<stop offset="1" stop-color="var(--sun)" stop-opacity="0"/>',
    '</radialGradient>',
    '</defs>',
    '<rect width="1200" height="380" fill="url(#sc-sky)"/>',
    '<circle cx="900" cy="150" r="120" fill="url(#sc-sun)"/>',
    '<circle cx="900" cy="150" r="34" fill="var(--sun-core)"/>',
    '<g fill="var(--cloud)">',
    '<ellipse cx="300" cy="96" rx="92" ry="13"/><ellipse cx="360" cy="84" rx="54" ry="12"/>',
    '<ellipse cx="700" cy="70" rx="70" ry="9"/><ellipse cx="1080" cy="110" rx="64" ry="9"/>',
    '</g>',
    '<path d="M0 250 C120 205 220 215 330 232 S540 200 650 214 S860 190 980 212 S1130 226 1200 214 V380 H0Z" fill="var(--hill-3)"/>',
    '<path d="M0 290 C140 252 260 262 380 280 S600 250 740 266 S960 248 1080 268 S1170 276 1200 270 V380 H0Z" fill="var(--hill-2)"/>',
    '<path d="M0 330 C160 300 300 312 470 324 S760 300 920 318 S1120 326 1200 318 V380 H0Z" fill="var(--hill-1)"/>',
    /* 桌角：茶杯 + 小盆栽 */
    '<rect x="0" y="352" width="1200" height="28" fill="var(--desk)"/>',
    '<g class="scene-desk" transform="translate(-110 0)">',
    '<path d="M1010 318 h44 l-4 30 a8 8 0 0 1 -8 6 h-20 a8 8 0 0 1 -8 -6z" fill="var(--cup)"/>',
    '<path d="M1054 324 h7 a9 9 0 0 1 0 18 h-6" fill="none" stroke="var(--cup)" stroke-width="5"/>',
    '<path class="steam" d="M1024 308 c-6 -10 6 -14 0 -26 M1040 308 c-6 -10 6 -14 0 -26" fill="none" stroke="var(--steam)" stroke-width="3" stroke-linecap="round"/>',
    '<path d="M1110 326 h40 l-5 28 h-30z" fill="var(--pot)"/>',
    '<path d="M1130 326 c-2 -22 -18 -30 -28 -34 c14 0 26 10 28 22 c2 -16 14 -30 30 -32 c-14 8 -24 22 -30 44z" fill="var(--leaf)"/>',
    '</g>',
    '</svg>'
  ].join('');

  /* 每款游戏一张封面小画：画的就是这款游戏本身 */
  var COVERS = {
    snake: [
      '<g fill="var(--cv-dot)">', dots(320, 180, 20), '</g>',
      '<path d="M60 130 H140 V70 H220 V110" fill="none" stroke="var(--ga)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>',
      '<circle cx="220" cy="110" r="11" fill="var(--ga-deep)"/>',
      '<circle cx="216" cy="114" r="2.2" fill="#fff"/><circle cx="224" cy="114" r="2.2" fill="#fff"/>',
      '<circle cx="262" cy="70" r="9" fill="var(--cv-warm)"/>'
    ].join(''),
    memory: (function () {
      var out = '';
      for (var r = 0; r < 2; r++) {
        for (var c = 0; c < 4; c++) {
          var x = 46 + c * 60;
          var y = 34 + r * 62;
          var up = (r === 0 && c === 1) || (r === 1 && c === 2);
          out += '<rect x="' + x + '" y="' + y + '" width="48" height="52" rx="9" fill="' + (up ? 'var(--cv-paper)' : 'var(--ga)') + '" opacity="' + (up ? 1 : 0.32 + ((r + c) % 2) * 0.12) + '"/>';
          if (up) out += '<circle cx="' + (x + 24) + '" cy="' + (y + 26) + '" r="10" fill="var(--cv-warm)"/>';
        }
      }
      return out;
    })(),
    receipt: (function () {
      var palette = ['var(--ga)', 'var(--cv-warm)', 'var(--cv-cool)', 'var(--cv-rose)'];
      var grid = [[0, 1, 2, 3, 1], [2, 3, 3, 3, 0], [1, 0, 2, 1, 2]];
      var out = '';
      for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 5; c++) {
          var hot = r === 1 && c >= 1 && c <= 3;
          out += '<rect x="' + (52 + c * 46) + '" y="' + (30 + r * 42) + '" width="38" height="36" rx="9" fill="' + palette[grid[r][c]] + '" opacity="' + (hot ? 0.95 : 0.42) + '"/>';
        }
      }
      out += '<rect x="94" y="68" width="142" height="44" rx="12" fill="none" stroke="var(--cv-ink)" stroke-opacity=".35" stroke-width="2" stroke-dasharray="5 5"/>';
      return out;
    })(),
    tetris: (function () {
      var cells = [
        [0, 5], [1, 5], [2, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5],
        [0, 4], [1, 4], [3, 4], [4, 4], [6, 4], [7, 4], [8, 4],
        [0, 3], [5, 3], [6, 3]
      ];
      var out = '<rect x="84" y="14" width="152" height="152" rx="10" fill="var(--cv-paper)" opacity=".55"/>';
      cells.forEach(function (p, i) {
        out += '<rect x="' + (90 + p[0] * 16) + '" y="' + (70 + p[1] * 16) + '" width="14" height="14" rx="3.5" fill="' + (i % 3 === 0 ? 'var(--cv-cool)' : 'var(--ga)') + '" opacity="' + (0.5 + (i % 4) * 0.12) + '"/>';
      });
      /* 正在下落的一块 */
      [[3, 0], [4, 0], [5, 0], [4, 1]].forEach(function (p) {
        out += '<rect x="' + (90 + p[0] * 16) + '" y="' + (26 + p[1] * 16) + '" width="14" height="14" rx="3.5" fill="var(--cv-warm)"/>';
      });
      return out;
    })(),
    lights: (function () {
      var on = { 1: 1, 5: 1, 6: 1, 7: 1, 11: 1, 13: 1, 17: 1 };
      var out = '';
      for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 6; c++) {
          var i = r * 6 + c;
          var x = 50 + c * 38;
          var y = 30 + r * 42;
          if (on[i]) out += '<circle cx="' + (x + 15) + '" cy="' + (y + 16) + '" r="20" fill="var(--cv-warm)" opacity=".28"/>';
          out += '<rect x="' + x + '" y="' + y + '" width="30" height="34" rx="7" fill="var(--cv-paper)" opacity="' + (on[i] ? 1 : 0.6) + '"/>';
          out += '<path d="M' + (x + 8) + ' ' + (y + 17) + ' q7 -10 14 0z" fill="' + (on[i] ? 'var(--cv-warm)' : 'var(--cv-ink)') + '" opacity="' + (on[i] ? 1 : 0.18) + '"/>';
        }
      }
      return out;
    })(),
    cups: (function () {
      var cols = [['--cv-rose', '--cv-warm', '--ga'], ['--cv-cool', '--cv-cool'], ['--ga', '--cv-rose', '--cv-warm', '--cv-cool'], ['--cv-warm'], [], ['--ga', '--ga', '--cv-rose']];
      var out = '';
      cols.forEach(function (col, i) {
        var x = 34 + i * 44;
        out += '<rect x="' + x + '" y="34" width="36" height="120" rx="8" fill="var(--cv-paper)" opacity=".55"/>';
        col.forEach(function (v, j) {
          var y = 128 - j * 27;
          out += '<rect x="' + (x + 6) + '" y="' + y + '" width="20" height="21" rx="4" fill="var(' + v + ')"/>';
          out += '<path d="M' + (x + 26) + ' ' + (y + 5) + ' h3 a5 5 0 0 1 0 10 h-3" fill="none" stroke="var(' + v + ')" stroke-width="2.5"/>';
        });
      });
      return out;
    })(),
    slide: (function () {
      var order = [1, 2, 3, 4, 6, 0, 7, 5, 8];
      var tabs = ['', '--cv-rose', '--cv-warm', '--cv-warm', '--ga', '--ga', '--cv-cool', '--cv-cool', '--cv-rose'];
      var out = '<rect x="96" y="12" width="128" height="156" rx="12" fill="var(--cv-paper)" opacity=".5"/>';
      order.forEach(function (n, p) {
        if (!n) return;
        var x = 104 + (p % 3) * 40;
        var y = 22 + Math.floor(p / 3) * 48;
        out += '<rect x="' + x + '" y="' + y + '" width="34" height="42" rx="7" fill="var(--cv-paper)"/>';
        out += '<rect x="' + (x + 5) + '" y="' + (y + 5) + '" width="12" height="4" rx="2" fill="var(' + tabs[n] + ')"/>';
        out += '<text x="' + (x + 17) + '" y="' + (y + 30) + '" text-anchor="middle" font-size="14" font-family="Georgia,serif" fill="var(--cv-ink)" opacity=".7">' + n + '</text>';
      });
      return out;
    })(),
    golf: [
      '<rect x="30" y="22" width="260" height="136" rx="22" fill="var(--ga)" opacity=".3"/>',
      '<rect x="120" y="86" width="84" height="16" rx="6" fill="var(--cv-ink)" opacity=".22"/>',
      '<ellipse cx="226" cy="58" rx="13" ry="6" fill="var(--cv-ink)" opacity=".55"/>',
      '<path d="M226 58 V24" stroke="var(--cv-ink)" stroke-opacity=".6" stroke-width="2.5"/>',
      '<path d="M226 25 l20 7 -20 7z" fill="var(--cv-rose)"/>',
      '<path d="M96 132 Q110 70 220 60" fill="none" stroke="var(--cv-paper)" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>',
      '<circle cx="96" cy="134" r="8" fill="var(--cv-paper)"/>'
    ].join('')
  };

  function dots(wid, hei, step) {
    var s = '';
    for (var y = step; y < hei; y += step) {
      for (var x = step; x < wid; x += step) s += '<circle cx="' + x + '" cy="' + y + '" r="1.4"/>';
    }
    return s;
  }

  function coverSvg(id) {
    return '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + (COVERS[id] || '') + '</svg>';
  }

  /* 简单的线条图标，替换顶栏里的 emoji */
  var ICONS = {
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
    sheet: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M9.5 9.5v10"/></svg>'
  };
  MG.icons = ICONS;

  function buildHero() {
    var sec = MG.h('section', 'hub-hero');
    var art = MG.h('div', 'hub-scene');
    art.innerHTML = SCENE;
    sec.appendChild(art);

    var copy = MG.h('div', 'hub-copy');
    copy.appendChild(MG.h('p', 'hub-kicker', MG.t('hub.kicker')));
    copy.appendChild(MG.h('h1', null, MG.t('hub.h1')));
    copy.appendChild(MG.h('p', 'hub-lede', MG.t('hub.lede')));

    var row = MG.h('div', 'hub-actions');
    var go = button(MG.t('hub.random'), 'primary', playRandom);
    go.setAttribute('title', MG.t('hub.randomHint'));
    row.appendChild(go);

    var def = MG.dailyGame();
    if (def) {
      var d = store.syncDaily(def.id);
      var daily = button(MG.t('hub.dailyChip', { name: MG.gtext(def).name }), 'ghost', function () { startDaily(def.id); });
      daily.classList.add('daily-btn');
      row.appendChild(daily);
      copy.appendChild(row);
      copy.appendChild(MG.h('p', 'hub-meta',
        (d.best ? MG.t('daily.best', { n: MG.fmtScore(d.best) }) : MG.t('daily.none')) +
        ' · ' + MG.t('daily.streak', { n: d.streak || 0 }) +
        ' · ' + MG.t('hub.slacked', { t: MG.durationText(store.data.workMs) })));
    } else {
      copy.appendChild(row);
    }

    if (!store.data.seen) copy.appendChild(MG.h('p', 'hub-hint', MG.t('hub.hintFirst')));
    sec.appendChild(copy);
    return sec;
  }

  function buildGameCard(def, index) {
    var best = store.bestOf(def.id);
    var T = MG.gtext(def);
    var accent = def.accent || '#4f8a6f';

    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'gcard';
    card.dataset.id = def.id;
    card.style.setProperty('--ga', accent);
    card.style.setProperty('--ga-soft', MG.hexToRgba(accent, 0.16));
    card.style.animationDelay = (index * 50) + 'ms';

    var cover = MG.h('div', 'gcard-cover');
    cover.innerHTML = coverSvg(def.id);
    card.appendChild(cover);

    var body = MG.h('div', 'gcard-body');
    var title = MG.h('div', 'gcard-title');
    title.appendChild(MG.h('h3', null, T.name));
    if (T.duration) title.appendChild(MG.h('span', 'gcard-time', T.duration));
    body.appendChild(title);
    body.appendChild(MG.h('p', null, T.tagline || ''));
    body.appendChild(MG.h('span', 'gcard-best' + (best > 0 ? ' has' : ''),
      best > 0 ? MG.t('hub.best', { n: MG.fmtScore(best) }) : MG.t('hub.noBest')));
    card.appendChild(body);

    card.addEventListener('click', function () { location.hash = '#/g/' + def.id; });
    return card;
  }

  function buildShelf() {
    var wrap = MG.h('section', 'shelf');
    var head = MG.h('div', 'shelf-head');
    head.appendChild(MG.h('h2', null, MG.t('hub.games')));
    head.appendChild(MG.h('span', null, MG.t('hub.gamesHint')));
    wrap.appendChild(head);

    var grid = MG.h('div', 'shelf-grid');
    MG.games.forEach(function (def, i) { grid.appendChild(buildGameCard(def, i)); });
    var soon = MG.h('div', 'gcard gcard-soon');
    soon.appendChild(MG.h('div', 'gcard-cover', ''));
    var sb = MG.h('div', 'gcard-body');
    sb.appendChild(MG.h('h3', null, MG.t('hub.placeholderTitle')));
    sb.appendChild(MG.h('p', null, MG.t('hub.placeholderText')));
    soon.appendChild(sb);
    grid.appendChild(soon);
    wrap.appendChild(grid);
    return wrap;
  }

  function buildBadges() {
    var wrap = MG.h('section', 'badges');
    var head = MG.h('div', 'shelf-head');
    head.appendChild(MG.h('h2', null, MG.t('hub.ach')));
    head.appendChild(MG.h('span', null, store.achCount() + ' / ' + MG.achievements.length));
    wrap.appendChild(head);

    var list = MG.h('div', 'badge-list');
    MG.achievements.forEach(function (a) {
      var on = store.hasAch(a.id);
      var txt = MG.achText(a);
      var item = MG.h('div', 'badge' + (on ? ' on' : ''));
      item.appendChild(MG.h('span', 'badge-icon', a.icon));
      var t = MG.h('div', 'badge-text');
      t.appendChild(MG.h('b', null, txt.name));
      t.appendChild(MG.h('span', null, txt.desc));
      item.appendChild(t);
      list.appendChild(item);
    });
    wrap.appendChild(list);
    wrap.appendChild(MG.h('p', 'hub-note', MG.t('hub.note')));
    return wrap;
  }

  /* ------------------------------------------------------------ 今日挑战 */

  function startDaily(id) {
    if (!MG.gameById(id)) return;
    MG.setSeed(MG.dailySeed());
    dailyRun = { gameId: id };
    if (play && play.def.id === id) {
      teardownPlay();
      dailyRun = { gameId: id };
      MG.setSeed(MG.dailySeed());
      openGame(id);
      return;
    }
    if (location.hash === '#/g/' + id) openGame(id);
    else location.hash = '#/g/' + id;
  }

  function evaluateAchievements(run) {
    var unlocked = [];
    function grant(id) { if (store.unlockAch(id)) unlocked.push(id); }

    if (store.totalPlays() >= 1) grant('first');
    if (Object.keys(store.data.plays).length >= MG.games.length) grant('six');

    var m = run.meta || {};
    if (run.gameId === 'memory' && m.moves && m.moves <= 20) grant('memory20');
    if (run.daily) grant('daily');
    if ((store.data.daily.streak || 0) >= 3) grant('streak3');
    if (run.gameId === 'receipt' && run.score >= 3000) grant('receipt3000');
    if (run.gameId === 'golf' && (m.strokes || 99) <= 5) grant('golf5');
    if (run.gameId === 'tetris' && (m.lines || 0) >= 10) grant('tetris10');
    if (run.gameId === 'lights' && m.moves && m.moves <= m.par) grant('lightsPar');
    if (run.gameId === 'cups' && m.moves && m.undos === 0) grant('cupsClean');
    if (run.gameId === 'slide' && m.moves && m.moves <= 40) grant('slide40');

    if (unlocked.length) {
      var last = MG.achById(unlocked[unlocked.length - 1]);
      var txt = MG.achText(last);
      MG.toast(MG.t('panel.achievement', { name: txt.name }), 2400);
      MG.audio.play('win');
    }
    return unlocked;
  }

  /* ---------------------------------------------------------------- 对局 */

  function openGame(id) {
    if (play && play.def.id === id) return;

    var dailyIntent = !!(dailyRun && dailyRun.gameId === id);
    teardownPlay();

    var def = MG.gameById(id);
    if (!def) { renderHub(); return; }

    if (dailyIntent) MG.setSeed(MG.dailySeed());

    play = {
      def: def,
      state: 'idle',
      score: 0,
      best: store.bestOf(id),
      meta: {},
      mark: 0,
      playedMs: 0,
      pausedAt: 0,
      daily: dailyIntent,
      stage: null,
      overlay: null,
      inst: null,
      els: {}
    };

    buildPlayView(def);

    store.data.lastGame = id;
    store.data.seen = true;
    store.save();

    mountGame(AUTO_START);
  }

  function button(label, cls, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + (cls ? ' ' + cls : '');
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function controlRow(keyText, desc) {
    var span = MG.h('span');
    span.appendChild(MG.h('kbd', null, keyText));
    span.appendChild(document.createTextNode(desc));
    return span;
  }

  function buildPlayView(def) {
    view.textContent = '';

    var wrap = MG.h('section', 'play');
    var accent = def.accent || '#0f8b74';
    wrap.style.setProperty('--ga', accent);
    wrap.style.setProperty('--ga-soft', MG.hexToRgba(accent, 0.14));
    wrap.style.setProperty('--ga-line', MG.hexToRgba(accent, 0.4));

    var T = MG.gtext(def);

    var head = MG.h('div', 'play-head');

    var back = document.createElement('button');
    back.type = 'button';
    back.className = 'icon-btn';
    back.textContent = '←';
    back.title = MG.t('play.back');
    back.addEventListener('click', function () { location.hash = ''; });

    var title = MG.h('div', 'play-title');
    title.appendChild(MG.h('span', 'card-icon', def.icon || '🎮'));
    title.appendChild(MG.h('h2', null, T.name));

    var scoreBox = MG.h('div', 'play-score');
    var scoreLabel = MG.h('span', 'k', MG.t('play.score'));
    var scoreVal = MG.h('b');
    scoreVal.id = 'scoreVal';
    scoreVal.textContent = '0';
    var bestLabel = MG.h('span', 'k', MG.t('play.best'));
    var bestVal = MG.h('b');
    bestVal.id = 'bestVal';
    bestVal.textContent = '—';
    scoreBox.appendChild(scoreLabel);
    scoreBox.appendChild(scoreVal);
    scoreBox.appendChild(MG.h('span', 'sep'));
    scoreBox.appendChild(bestLabel);
    scoreBox.appendChild(bestVal);

    var actions = MG.h('div', 'play-actions');
    var meta = document.createElement('div');
    meta.id = 'meta';
    var pauseBtn = button(MG.t('play.pause'), '', function () { togglePause(); });
    actions.appendChild(meta);
    actions.appendChild(pauseBtn);

    head.appendChild(back);
    head.appendChild(title);
    head.appendChild(scoreBox);
    head.appendChild(actions);

    var stage = MG.h('div', 'stage');

    var hint = MG.h('div', 'play-hint');
    (T.controls || []).forEach(function (c) {
      if (Object.prototype.toString.call(c) === '[object Array]') hint.appendChild(controlRow(c[0], c[1]));
      else {
        var span = MG.h('span');
        span.textContent = c;
        hint.appendChild(span);
      }
    });
    hint.appendChild(controlRow('Esc', MG.t('app.bossKey')));

    wrap.appendChild(head);
    wrap.appendChild(stage);
    wrap.appendChild(hint);
    view.appendChild(wrap);

    play.stage = stage;
    play.els = {
      score: scoreVal,
      best: bestVal,
      scoreLabel: scoreLabel,
      bestLabel: bestLabel,
      back: back,
      meta: meta,
      pause: pauseBtn
    };
  }

  function refreshPlayChrome() {
    if (!play || !play.els) return;
    var paused = play.state === 'paused';
    play.els.pause.textContent = MG.t(paused ? 'play.resume' : 'play.pause');
    play.els.scoreLabel.textContent = MG.t('play.score');
    play.els.bestLabel.textContent = MG.t('play.best');
    play.els.back.title = MG.t('play.back');
  }

  function makeHost() {
    return {
      stage: play.stage,
      score: function (n) {
        if (!play) return;
        var next = Math.max(0, Math.round(Number(n) || 0));
        var changed = next !== play.score;
        play.score = next;
        play.els.score.textContent = MG.fmtScore(next);
        if (changed) {
          play.els.score.classList.remove('bump');
          void play.els.score.offsetWidth;
          play.els.score.classList.add('bump');
        }
      },
      meta: function (obj) {
        if (!play || !obj) return;
        play.meta = {};
        for (var k in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, k)) play.meta[k] = obj[k];
        }
        renderMeta();
      },
      finish: function (payload) { finishGame(payload || {}); },
      sound: function (name) { MG.audio.play(name); },
      toast: MG.toast,
      store: store
    };
  }

  function renderMeta() {
    if (!play) return;
    var box = play.els.meta;

    var data = {};
    if (play.daily) data[MG.t('play.dailyChip')] = MG.t('play.dailyRunning');
    for (var k in play.meta) {
      if (Object.prototype.hasOwnProperty.call(play.meta, k)) data[k] = play.meta[k];
    }

    var seen = {};
    for (var key in data) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      var v = data[key];
      if (v === null || v === undefined || v === '') continue;
      seen[key] = true;

      var chip = null;
      for (var i = 0; i < box.children.length; i++) {
        if (box.children[i].getAttribute('data-k') === key) { chip = box.children[i]; break; }
      }
      if (!chip) {
        chip = MG.h('span', 'chip');
        chip.setAttribute('data-k', key);
        chip.appendChild(MG.h('span', 'chip-k', key));
        chip.appendChild(MG.h('b', 'chip-v', ''));
        box.appendChild(chip);
      }
      var value = chip.lastChild;
      if (value.textContent !== String(v)) value.textContent = String(v);
    }

    for (var j = box.children.length - 1; j >= 0; j--) {
      var el = box.children[j];
      if (!seen[el.getAttribute('data-k')]) el.remove();
    }
  }

  function mountGame(autoStart) {
    var p = play;
    p.state = 'idle';
    p.score = 0;
    p.meta = {};
    p.playedMs = 0;
    p.mark = 0;
    p.best = store.bestOf(p.def.id);

    p.stage.textContent = '';
    p.els.score.textContent = '0';
    p.els.best.textContent = p.best > 0 ? MG.fmtScore(p.best) : '—';
    p.els.pause.textContent = MG.t('play.pause');
    renderMeta();

    p.inst = p.def.mount(p.stage, makeHost()) || {};
    p.stage.dataset.game = p.def.id;

    if (autoStart) startGame();
    else showStart();
  }

  /* ------------------------------------------------------------ 遮罩与面板 */

  function clearOverlay() {
    if (play && play.overlay) {
      play.overlay.remove();
      play.overlay = null;
    }
    if (play) play.overlayKind = null;
  }

  function showOverlay(panel, kind) {
    clearOverlay();
    var ov = MG.h('div', 'overlay');
    ov.appendChild(panel);
    play.stage.appendChild(ov);
    play.overlay = ov;
    play.overlayKind = kind || null;
  }

  function showStart() {
    var T = MG.gtext(play.def);
    var panel = MG.h('div', 'panel panel-start');
    panel.appendChild(MG.h('div', 'panel-head', play.def.icon || '🎮'));
    panel.appendChild(MG.h('h3', null, MG.t('panel.ready')));
    panel.appendChild(MG.h('p', null, T.howto || ''));

    var keys = MG.h('div', 'keys');
    (T.controls || []).forEach(function (c) {
      if (Object.prototype.toString.call(c) === '[object Array]') keys.appendChild(controlRow(c[0], c[1]));
      else {
        var span = MG.h('span');
        span.textContent = c;
        keys.appendChild(span);
      }
    });
    panel.appendChild(keys);

    var actions = MG.h('div', 'actions');
    actions.appendChild(button(MG.t('panel.start'), 'primary', startGame));
    actions.appendChild(button(MG.t('panel.back'), '', function () { location.hash = ''; }));
    panel.appendChild(actions);

    showOverlay(panel, 'start');
  }

  function showPaused() {
    var panel = MG.h('div', 'panel panel-paused');
    panel.appendChild(MG.h('div', 'panel-head', '⏸'));
    panel.appendChild(MG.h('h3', null, MG.t('panel.paused')));
    panel.appendChild(MG.h('p', null, MG.t('panel.pausedText')));

    var actions = MG.h('div', 'actions');
    actions.appendChild(button(MG.t('panel.resume'), 'primary', resumeGame));
    actions.appendChild(button(MG.t('panel.back'), '', function () { location.hash = ''; }));
    panel.appendChild(actions);

    showOverlay(panel, 'paused');
  }

  function showOver(result, silent) {
    var panel = MG.h('div', 'panel panel-over');
    panel.appendChild(MG.h('div', 'panel-head', result.record ? '🎉' : '🐟'));
    if (result.record) panel.appendChild(MG.h('span', 'record-ribbon', 'NEW BEST'));
    panel.appendChild(MG.h('h3', null, MG.t(result.record ? 'panel.record' : 'panel.over')));

    panel.appendChild(MG.h('div', 'big-label', MG.t('panel.gained')));
    var bigEl = MG.h('div', 'big');
    panel.appendChild(bigEl);
    panel.appendChild(MG.h('div', 'sub',
      result.daily
        ? MG.t('panel.bestDaily', { n: MG.fmtScore(result.best) })
        : (result.best > 0 ? MG.t('panel.bestAll', { n: MG.fmtScore(result.best) }) : MG.t('panel.bestNone'))));

    if (result.note) panel.appendChild(MG.h('p', 'over-note', result.note));

    var actions = MG.h('div', 'actions');
    actions.appendChild(button(MG.t('panel.again'), 'primary', restartGame));
    actions.appendChild(button(MG.t('panel.back'), '', function () { location.hash = ''; }));
    panel.appendChild(actions);

    showOverlay(panel, 'over');
    play.lastResult = result;

    if (!silent) {
      MG.countUp(bigEl, result.score, 680);
      if (result.record && result.score > 0) MG.confetti(play.stage, 30);
    } else {
      bigEl.textContent = MG.fmtScore(result.score);
    }
  }

  /* ------------------------------------------------------------ 状态切换 */

  function startGame() {
    if (!play || play.state !== 'idle') return;
    clearOverlay();
    blurFocus();
    play.state = 'running';
    play.mark = Date.now();
    play.els.pause.textContent = MG.t('play.pause');
    if (play.inst && play.inst.start) play.inst.start();
    refreshWorkTime();
  }

  function blurFocus() {
    var a = document.activeElement;
    if (a && a !== document.body && a.blur) a.blur();
  }

  function pauseGame() {
    if (!play || play.state !== 'running') return;
    settle();
    play.state = 'paused';
    play.pausedAt = Date.now();
    if (play.inst && play.inst.pause) play.inst.pause();
    play.els.pause.textContent = MG.t('play.resume');
    showPaused();
  }

  function resumeGame() {
    if (!play || play.state !== 'paused') return;
    clearOverlay();
    blurFocus();
    play.state = 'running';
    play.mark = Date.now();
    play.els.pause.textContent = MG.t('play.pause');
    if (play.inst && play.inst.resume) play.inst.resume();
  }

  function togglePause() {
    if (!play) return;
    if (play.state === 'running') pauseGame();
    else if (play.state === 'paused') resumeGame();
  }

  function finishGame(payload) {
    if (!play || play.state === 'over') return;
    settle();

    var score = Math.max(0, Math.round(Number(payload.score) || 0));
    play.state = 'over';
    play.score = score;
    play.els.score.textContent = MG.fmtScore(score);
    play.els.pause.textContent = MG.t('play.pause');

    var res;
    if (play.daily) {
      res = store.setDaily(play.def.id, score);
    } else {
      res = store.setBest(play.def.id, score);
    }
    store.notePlay(play.def.id);

    var bestAll = store.bestOf(play.def.id);
    play.els.best.textContent = bestAll > 0 ? MG.fmtScore(bestAll) : '—';

    if (play.inst && play.inst.pause) play.inst.pause();

    evaluateAchievements({
      gameId: play.def.id,
      score: score,
      meta: payload.meta || {},
      daily: !!play.daily
    });

    showOver({
      score: score,
      best: res.best,
      record: res.record && score > 0,
      note: payload.note || '',
      daily: !!play.daily
    });
  }

  function restartGame() {
    if (!play) return;
    if (play.inst && play.inst.destroy) play.inst.destroy();
    play.inst = null;
    if (play.daily) MG.setSeed(MG.dailySeed());
    mountGame(true);
  }

  function teardownPlay() {
    MG.resetSeed();
    dailyRun = null;
    if (!play) return;
    settle();
    clearOverlay();
    if (play.inst && play.inst.destroy) play.inst.destroy();
    play.inst = null;
    play = null;
    store.save();
    refreshWorkTime();
  }

  /* ---------------------------------------------------------------- 键盘 */

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      toggleFake();
      return;
    }

    if (fakeOn) { e.stopPropagation(); return; }
    if (!play) return;
    /* 焦点在按钮上时，回车 / 空格交给按钮自己 */
    if (e.target && e.target.closest && e.target.closest('button, a, input')) {
      if (e.key === 'Enter' || e.key === ' ') return;
    }

    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
      var consumed = true;
      if (play.state === 'idle') startGame();
      else if (play.state === 'paused') resumeGame();
      else if (play.state === 'over') restartGame();
      else consumed = false;
      if (consumed) { e.preventDefault(); e.stopPropagation(); }
      return;
    }

    if (e.key === 'p' || e.key === 'P') {
      if (play.state === 'running') pauseGame();
      else if (play.state === 'paused') resumeGame();
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && play && play.state === 'running') pauseGame();
  });

  w.addEventListener('blur', function () {
    if (play && play.state === 'running') pauseGame();
  });

  /* ---------------------------------------------------------------- 启动 */

  /* 语言初始化：先静默设置，再挂切换回调（避免首屏重复渲染） */
  var LANG_OVERRIDE = /(^|[?&])lang=(zh|en)(&|$)/.exec(location.search);
  MG.i18n.set(LANG_OVERRIDE ? LANG_OVERRIDE[2] : (store.data.lang === 'en' ? 'en' : 'zh'), true);
  applyLangButton();

  MG.i18n.onChange = function () {
    applyLangButton();
    applyTheme();
    applySound();
    refreshWorkTime();

    if (play) {
      refreshPlayChrome();
      if (play.overlayKind === 'start') showStart();
      else if (play.overlayKind === 'paused') showPaused();
      else if (play.overlayKind === 'over' && play.lastResult) showOver(play.lastResult, true);
    } else {
      renderHub();
    }
  };

  /* ?fps=1：右上角挂一个帧率探针，方便验收性能 */
  function initFps() {
    var box = MG.h('div', 'fps-meter', '采样中…');
    document.body.appendChild(box);
    var frames = 0;
    var t0 = performance.now();
    var last = t0;
    var worst = 0;

    (function loop(now) {
      requestAnimationFrame(loop);
      frames++;
      var d = now - last;
      last = now;
      if (d > worst) worst = d;
      if (now - t0 >= 500) {
        var fps = Math.round(frames * 1000 / (now - t0));
        box.textContent = fps + ' FPS · ' + (Math.round((now - t0) / frames * 10) / 10) + 'ms · worst ' + Math.round(worst) + 'ms';
        frames = 0;
        t0 = now;
        worst = 0;
      }
    })(t0);
  }

  /* 供自测页读取的只读状态 */
  MG.shell = MG.shell || {};
  MG.shell.state = function () { return play ? play.state : 'hub'; };
  MG.shell.gameId = function () { return play ? play.def.id : null; };
  MG.shell.isDaily = function () { return !!(play && play.daily); };

  applyTheme();
  if (THEME_OVERRIDE) {
    store.data.theme = THEME_OVERRIDE[2];
    applyTheme();
  }
  applySound();
  refreshWorkTime();
  sync();
  if (FAKE_FIRST) toggleFake(true);
  if (/(^|[?&])fps=1(&|$)/.test(location.search)) initFps();

})(window);
