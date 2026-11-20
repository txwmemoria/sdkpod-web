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

  var HERO_ART = [
    '<svg viewBox="0 0 260 190" role="img" aria-label="工位插画">',
    '<defs><linearGradient id="mg-g" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/>',
    '</linearGradient></defs>',
    '<path d="M8 152h244" stroke="currentColor" stroke-opacity=".16" stroke-width="2.5" stroke-linecap="round"/>',
    '<rect x="50" y="26" width="152" height="96" rx="10" fill="var(--panel-2)" stroke="currentColor" stroke-opacity=".26" stroke-width="2.5"/>',
    '<rect x="58" y="34" width="136" height="72" rx="5" fill="url(#mg-g)" opacity=".12"/>',
    '<path d="M118 76c7-11 23-14 31-4 2.5 3 1.5 7.5-2 9.5-9 5.5-24 4-29-5.5z" fill="url(#mg-g)"/>',
    '<path d="M118 76l-11-8v16z" fill="url(#mg-g)"/>',
    '<circle cx="139" cy="72" r="2.2" fill="#fff"/>',
    '<circle cx="157" cy="60" r="3" fill="none" stroke="var(--accent)" stroke-opacity=".65" stroke-width="1.6"/>',
    '<circle cx="165" cy="51" r="2" fill="none" stroke="var(--accent)" stroke-opacity=".4" stroke-width="1.4"/>',
    '<path d="M118 122v13h18v-13" stroke="currentColor" stroke-opacity=".26" stroke-width="2.5" fill="none"/>',
    '<path d="M96 152h62" stroke="currentColor" stroke-opacity=".26" stroke-width="4" stroke-linecap="round"/>',
    '<path d="M204 126h26l-3 18a8 8 0 0 1-8 7h-4a8 8 0 0 1-8-7z" fill="var(--panel-2)" stroke="currentColor" stroke-opacity=".26" stroke-width="2.2"/>',
    '<path d="M230 131h5a6 6 0 0 1 0 12h-5" fill="none" stroke="currentColor" stroke-opacity=".26" stroke-width="2.2"/>',
    '<path d="M211 118c3-5-3-8 0-13M219 118c3-5-3-8 0-13" stroke="var(--accent)" stroke-opacity=".5" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    '<rect x="76" y="154" width="96" height="13" rx="4" fill="var(--panel-2)" stroke="currentColor" stroke-opacity=".2" stroke-width="2"/>',
    '</svg>'
  ].join('');

  /* ------------------------------------------------------------ 顶栏与偏好 */

  function applyTheme() {
    document.documentElement.dataset.theme = store.data.theme;
    els.btnTheme.textContent = store.data.theme === 'dark' ? '☀️' : '🌙';
    els.btnTheme.setAttribute('title', MG.t(store.data.theme === 'dark' ? 'app.themeLight' : 'app.themeDark'));
    if (MG.refreshTheme) MG.refreshTheme();
  }

  function applySound() {
    els.btnSound.textContent = store.data.sound ? '🔊' : '🔇';
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

  /* 一局能不能在 1 分钟内玩完：用来做「只有一点点时间」的筛选 */
  var QUICK_GAMES = { receipt: 1, memory: 1, golf: 1 };
  var hubFilter = 'all';

  function statPill(value, label) {
    var el = MG.h('span', 'stat-pill');
    el.appendChild(MG.h('b', null, value));
    el.appendChild(MG.h('span', null, label));
    return el;
  }

  function buildQuickStart() {
    var sec = MG.h('section', 'hero hero-compact');
    var main = MG.h('div', 'hero-main');

    var days = Math.max(1, Math.floor((Date.now() - store.data.since) / 86400000) + 1);
    var pill = MG.h('div', 'hero-pill');
    pill.appendChild(MG.h('span', 'dot'));
    pill.appendChild(MG.h('span', null, MG.t('hub.day', { n: days })));
    main.appendChild(pill);

    main.appendChild(MG.h('h1', null, MG.t('hub.h1')));
    main.appendChild(MG.h('p', 'lede', MG.t('hub.lede')));
    if (!store.data.seen) main.appendChild(MG.h('p', 'first-hint', MG.t('hub.hintFirst')));

    var stats = MG.h('div', 'stat-inline');
    stats.appendChild(statPill(String(store.totalPlays()), MG.t('hub.stat2')));
    stats.appendChild(statPill(store.bestCount() + ' / ' + MG.games.length, MG.t('hub.stat3')));
    main.appendChild(stats);

    var actions = MG.h('div', 'quick-actions');

    var randomBtn = button('🎲 ' + MG.t('hub.random'), 'primary', playRandom);
    randomBtn.setAttribute('title', MG.t('hub.randomHint'));
    actions.appendChild(randomBtn);

    var def = MG.dailyGame();
    if (def) {
      var d = store.syncDaily(def.id);
      var daily = MG.h('div', 'daily daily-quick');
      daily.style.setProperty('--ga', def.accent || '#0f8b74');
      daily.style.setProperty('--ga-soft', MG.hexToRgba(def.accent || '#0f8b74', 0.14));
      daily.appendChild(button(MG.t('hub.dailyChip', { name: MG.gtext(def).name }), '', function () { startDaily(def.id); }));
      daily.appendChild(MG.h('span', 'daily-cap',
        (d.best ? MG.t('daily.best', { n: MG.fmtScore(d.best) }) : MG.t('daily.none')) +
        ' · ' + MG.t('daily.streak', { n: d.streak || 0 })));
      actions.appendChild(daily);
    }

    var last = store.data.lastGame ? MG.gameById(store.data.lastGame) : null;
    if (last) {
      var resume = button('↩ ' + MG.t('hub.resume', { name: MG.gtext(last).name }), 'ghost', function () {
        location.hash = '#/g/' + last.id;
      });
      resume.classList.add('resume-btn');
      actions.appendChild(resume);
    }

    var art = MG.h('div', 'hero-art hero-art-sm');
    art.innerHTML = HERO_ART;

    sec.appendChild(main);
    sec.appendChild(actions);
    sec.appendChild(art);
    return sec;
  }

  function playRandom() {
    var pool = MG.games.filter(function (g) { return g.id !== store.data.lastGame; });
    if (!pool.length) pool = MG.games;
    var pick = MG.pick(pool);
    location.hash = '#/g/' + pick.id;
  }

  function buildFilterRow() {
    var row = MG.h('div', 'filter-row');

    var options = [
      { id: 'all', label: MG.t('hub.filterAll') },
      { id: 'quick', label: MG.t('hub.filterQuick') },
      { id: 'endless', label: MG.t('hub.filterEndless') }
    ];

    options.forEach(function (o) {
      var chip = MG.h('button', 'filter-chip' + (hubFilter === o.id ? ' on' : ''), o.label);
      chip.type = 'button';
      chip.addEventListener('click', function () {
        if (hubFilter === o.id) return;
        hubFilter = o.id;
        renderHub();
      });
      row.appendChild(chip);
    });

    row.appendChild(MG.h('span', 'filter-hint', MG.t('hub.gamesHint')));
    return row;
  }

  function matchesFilter(def) {
    if (hubFilter === 'quick') return !!QUICK_GAMES[def.id];
    if (hubFilter === 'endless') return !QUICK_GAMES[def.id];
    return true;
  }

  function buildCard(def, index) {
    var best = store.bestOf(def.id);
    var accent = def.accent || '#0f8b74';
    var T = MG.gtext(def);

    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.dataset.id = def.id;
    card.style.setProperty('--ga', accent);
    card.style.setProperty('--ga-soft', MG.hexToRgba(accent, 0.13));
    card.style.setProperty('--ga-line', MG.hexToRgba(accent, 0.42));
    card.style.animationDelay = (index * 45) + 'ms';

    var top = MG.h('div', 'card-top');
    top.appendChild(MG.h('span', 'card-icon', def.icon || '🎮'));
    if (T.duration) top.appendChild(MG.h('span', 'card-time', T.duration));
    card.appendChild(top);

    card.appendChild(MG.h('h3', null, T.name));
    card.appendChild(MG.h('p', 'tagline', T.tagline || ''));

    var tags = MG.h('div', 'tags');
    (T.tags || []).forEach(function (t) { tags.appendChild(MG.h('span', 'chip', t)); });
    card.appendChild(tags);

    var foot = MG.h('div', 'card-foot');
    foot.appendChild(MG.h('span', 'best', best > 0 ? MG.t('hub.best', { n: MG.fmtScore(best) }) : MG.t('hub.noBest')));
    var go = MG.h('span', 'go');
    go.appendChild(document.createTextNode(MG.t('hub.play')));
    go.appendChild(MG.h('span', 'go-arrow', '→'));
    foot.appendChild(go);
    card.appendChild(foot);

    card.addEventListener('click', function () {
      location.hash = '#/g/' + def.id;
    });
    return card;
  }

  function buildPlaceholder() {
    var card = MG.h('div', 'card placeholder');
    card.appendChild(MG.h('div', 'card-icon', '＋'));
    card.appendChild(MG.h('h3', null, MG.t('hub.placeholderTitle')));
    card.appendChild(MG.h('p', 'tagline', MG.t('hub.placeholderText')));
    var foot = MG.h('div', 'card-foot');
    foot.appendChild(MG.h('span', null, MG.t('hub.placeholderFoot')));
    card.appendChild(foot);
    return card;
  }

  function renderHub() {
    teardownPlay();
    view.textContent = '';

    view.appendChild(buildQuickStart());
    view.appendChild(buildFilterRow());
    view.appendChild(buildGrid());
    view.appendChild(buildAchievements());
    view.appendChild(MG.h('p', 'section-note', MG.t('hub.note')));
  }

  function buildGrid() {
    var grid = MG.h('div', 'grid');
    var list = MG.games.filter(matchesFilter);

    if (!list.length) {
      grid.appendChild(MG.h('p', 'empty-filter', MG.t('hub.emptyFilter')));
      return grid;
    }

    list.forEach(function (def, i) { grid.appendChild(buildCard(def, i)); });
    if (hubFilter === 'all') grid.appendChild(buildPlaceholder());
    return grid;
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

  /* -------------------------------------------------------------- 成就墙 */

  function buildAchievements() {
    var wrap = MG.h('section', 'ach');
    var head = MG.h('div', 'section-head');
    var title = MG.h('div', 'section-title');
    title.appendChild(MG.h('h2', null, MG.t('hub.ach')));
    title.appendChild(MG.h('span', 'count-chip', store.achCount() + ' / ' + MG.achievements.length));
    head.appendChild(title);
    head.appendChild(MG.h('p', 'section-hint', MG.t('hub.achHint')));
    wrap.appendChild(head);

    var strip = MG.h('div', 'ach-strip');
    MG.achievements.forEach(function (a) {
      var on = store.hasAch(a.id);
      var txt = MG.achText(a);
      var item = MG.h('div', 'ach-item' + (on ? ' on' : ''));
      item.appendChild(MG.h('span', 'ach-icon', a.icon));
      var text = MG.h('div', 'ach-text');
      text.appendChild(MG.h('b', null, txt.name));
      text.appendChild(MG.h('span', null, txt.desc));
      item.appendChild(text);
      item.title = txt.name + ' · ' + txt.desc;
      strip.appendChild(item);
    });
    wrap.appendChild(strip);
    return wrap;
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
