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
    els.btnTheme.setAttribute('aria-label', els.btnTheme.getAttribute('title'));
    if (MG.refreshTheme) MG.refreshTheme();
  }

  function applySound() {
    els.btnSound.innerHTML = MG.icons[store.data.sound ? 'soundOn' : 'soundOff'];
    els.btnSound.setAttribute('title', MG.t(store.data.sound ? 'app.soundOn' : 'app.soundOff'));
    els.btnSound.setAttribute('aria-label', els.btnSound.getAttribute('title'));
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
    if (!store.data.sound && MG.ambientStop) MG.ambientStop();
    if (!store.data.sound && MG.music) MG.music.pause();
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

  /* -------------------------------------------------------------- 音乐 */

  var musicEls = {
    box: document.getElementById('music'),
    btn: document.getElementById('btnMusic'),
    next: document.getElementById('btnMusicNext'),
    label: document.querySelector('#btnMusic .music-label'),
    credit: document.getElementById('footMusic')
  };
  var musicBeforeFake = false;

  function paintMusic(st) {
    if (!musicEls.btn || !MG.music) return;
    st = st || MG.music.state;
    musicEls.box.classList.toggle('playing', !!st.playing);
    musicEls.box.classList.toggle('loading', !!st.loading);
    musicEls.next.hidden = !st.file;
    musicEls.label.textContent = st.loading ? MG.t('music.loading') : (st.file ? st.title : MG.t('music.play'));
    musicEls.btn.title = st.file ? st.title + ' · ' + MG.t(st.playing ? 'music.pause' : 'music.resume') : MG.t('music.title');
    musicEls.btn.setAttribute('aria-label', musicEls.btn.title);
    if (st.file && musicEls.credit) musicEls.credit.hidden = false;
  }

  if (MG.music && musicEls.btn) {
    MG.music.onChange(paintMusic);
    musicEls.btn.addEventListener('click', function () { MG.music.toggle(); });
    musicEls.next.addEventListener('click', function () { MG.music.next(); });
  }

  /* -------------------------------------------------------------- 假装工作 */

  function toggleFake(force) {
    var on = (typeof force === 'boolean') ? force : !fakeOn;
    if (on === fakeOn) return;
    fakeOn = on;
    if (on && play && play.state === 'running') pauseGame();
    if (MG.music) {
      if (on) { musicBeforeFake = MG.music.state.playing; MG.music.pause(); }
      else if (musicBeforeFake) { musicBeforeFake = false; MG.music.resume(); }
    }
    els.fake.hidden = !on;
    document.body.classList.toggle('faking', on);
    disguiseTab(on);
  }

  /* 假装工作时，连浏览器标签的标题和图标都换成表格 */
  var favicon = document.getElementById('favicon');
  var realIcon = favicon ? favicon.getAttribute('href') : '';
  var SHEET_ICON = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="3" y="4" width="26" height="24" rx="3" fill="#217346"/>' +
    '<path d="M3 11h26M3 17h26M3 23h26M12 4v24M21 4v24" stroke="#fff" stroke-opacity=".55" stroke-width="1.4"/></svg>');
  function disguiseTab(on) {
    if (on) {
      document.title = MG.t('fake.tab');
      if (favicon) favicon.setAttribute('href', SHEET_ICON);
    } else {
      document.title = MG.t('app.title');
      if (favicon) favicon.setAttribute('href', realIcon);
    }
  }

  /* ------------------------------------------------------------ 摸鱼计时 */

  /* 护眼 20-20-20：连续玩 20 分钟，停下来看 6 米外 20 秒 */
  var EYE_EVERY = 20 * 60 * 1000;
  var sessionMs = 0;
  var nextEye = EYE_EVERY;

  function settle() {
    if (!play || play.state !== 'running' || !play.mark) return;
    var now = Date.now();
    var delta = now - play.mark;
    if (!(delta > 0)) return;
    play.mark = now;
    play.playedMs += delta;
    sessionMs += delta;
    store.addWork(delta);
    store.save();
    refreshWorkTime();
    if (sessionMs >= nextEye) {
      nextEye = sessionMs + EYE_EVERY;
      setTimeout(eyeBreak, 0);
    }
  }

  function eyeBreak() {
    if (!play || play.state !== 'running') return;
    pauseGame();
    var panel = MG.h('div', 'panel panel-eye');
    panel.appendChild(artBox('panel-head', MG.art.html('leaf'), ''));
    panel.appendChild(MG.h('h3', null, MG.t('eye.title')));
    panel.appendChild(MG.h('p', null, MG.t('eye.text')));
    var count = MG.h('div', 'eye-count', '20');
    panel.appendChild(count);
    var actions = MG.h('div', 'actions');
    var go = button(MG.t('panel.resume'), '', resumeGame);
    actions.appendChild(go);
    panel.appendChild(actions);
    showOverlay(panel, 'eye');
    var left = 20;
    var timer = setInterval(function () {
      if (!play || play.overlayKind !== 'eye') { clearInterval(timer); return; }
      left--;
      count.textContent = left > 0 ? String(left) : MG.t('eye.done');
      if (left <= 0) {
        clearInterval(timer);
        go.classList.add('primary');
        MG.audio.play('good');
      }
    }, 1000);
  }
  MG.shell = MG.shell || {};
  MG.shell.eyeBreak = eyeBreak;

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
    var hubAd = MG.ads && MG.ads.block('hub');
    if (hubAd) view.appendChild(hubAd);
    view.appendChild(buildBadges());
  }

  /* ===================================================== v5 大厅（场景化） */

  /* 主视觉：田园午后（夜间是月夜，农舍亮灯、天上有星）。颜色全部走 CSS 变量。 */
  function trees(list) {
    return list.map(function (t) {
      return '<ellipse cx="' + t[0] + '" cy="' + t[1] + '" rx="' + t[2] + '" ry="' + (t[2] * 1.15).toFixed(1) + '"/>' +
        '<rect x="' + (t[0] - 1.5) + '" y="' + (t[1] + t[2] * 0.9).toFixed(1) + '" width="3" height="' + (t[2] * 0.7).toFixed(1) + '"/>';
    }).join('');
  }
  function fence(x0, x1, yAt) {
    var out = '';
    for (var x = x0; x <= x1; x += 26) out += '<rect x="' + x + '" y="' + (yAt(x) - 16) + '" width="3.4" height="18" rx="1.2"/>';
    out += '<path d="M' + x0 + ' ' + (yAt(x0) - 11) + ' Q ' + ((x0 + x1) / 2) + ' ' + (yAt((x0 + x1) / 2) - 13) + ' ' + (x1 + 3) + ' ' + (yAt(x1) - 11) + '" fill="none" stroke-width="2.2"/>';
    out += '<path d="M' + x0 + ' ' + (yAt(x0) - 4) + ' Q ' + ((x0 + x1) / 2) + ' ' + (yAt((x0 + x1) / 2) - 6) + ' ' + (x1 + 3) + ' ' + (yAt(x1) - 4) + '" fill="none" stroke-width="2.2"/>';
    return out;
  }
  /* 雨丝和雪花的位置：固定的伪随机，每次渲染都一样 */
  function scatter(n, seed, make) {
    var s = seed, out = '';
    function r() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    for (var i = 0; i < n; i++) out += make(r(), r(), r(), i);
    return out;
  }
  var RAIN = scatter(70, 7, function (a, b, c, i) {
    var x = Math.round(a * 1260 - 30), y = Math.round(b * 360 - 20), len = 10 + Math.round(c * 8);
    return '<line x1="' + x + '" y1="' + y + '" x2="' + (x - 3) + '" y2="' + (y + len) + '" style="animation-delay:-' + (c * 1.6).toFixed(2) + 's"/>';
  });
  var SNOW = scatter(60, 11, function (a, b, c) {
    return '<circle cx="' + Math.round(a * 1200) + '" cy="' + Math.round(b * 300 - 40) + '" r="' + (1.4 + c * 2).toFixed(1) + '" style="animation-delay:-' + (c * 9).toFixed(2) + 's;animation-duration:' + (8 + a * 5).toFixed(1) + 's"/>';
  });

  var LEAF_FILLS = ['#d79a5c', '#c9824c', '#e2b26a', '#b8794a'];
  var DRIFT_LEAVES = scatter(9, 23, function (a, b, c, i) {
    var x = Math.round(380 + a * 800), y = Math.round(30 + b * 120);
    return '<g style="animation-delay:-' + (c * 16).toFixed(1) + 's;animation-duration:' + (15 + a * 8).toFixed(1) + 's">' +
      '<path transform="translate(' + x + ' ' + y + ') rotate(' + Math.round(c * 360) + ')" d="M0 -6 C5 -4 6 2 0 7 C-6 2 -5 -4 0 -6Z" fill="' + LEAF_FILLS[i % 4] + '" opacity=".85"/></g>';
  });
  var DRIFT_PETALS = scatter(10, 31, function (a, b, c) {
    var x = Math.round(380 + a * 800), y = Math.round(30 + b * 120);
    return '<g style="animation-delay:-' + (c * 16).toFixed(1) + 's;animation-duration:' + (16 + a * 8).toFixed(1) + 's">' +
      '<ellipse cx="' + x + '" cy="' + y + '" rx="3.6" ry="2.4" fill="#f1c4cb" opacity=".9"/></g>';
  });
  var FIREFLIES = scatter(12, 41, function (a, b, c) {
    return '<circle cx="' + Math.round(420 + a * 760) + '" cy="' + Math.round(250 + b * 80) + '" r="2.2" fill="#f4e3a1" style="animation-delay:-' + (c * 5).toFixed(1) + 's"/>';
  });

  var SCENE = [
    '<svg class="scene" viewBox="0 0 1200 380" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">',
    '<defs>',
    '<linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="var(--sky-1)"/><stop offset="1" stop-color="var(--sky-2)"/>',
    '</linearGradient>',
    '<radialGradient id="sc-sun" cx=".5" cy=".5" r=".5">',
    '<stop offset="0" stop-color="var(--sun)" stop-opacity=".9"/><stop offset=".5" stop-color="var(--sun)" stop-opacity=".3"/>',
    '<stop offset="1" stop-color="var(--sun)" stop-opacity="0"/>',
    '</radialGradient>',
    '<clipPath id="sc-near"><path d="M0 318 C160 292 300 304 470 314 S760 292 920 308 S1120 316 1200 308 V380 H0Z"/></clipPath>',
    '</defs>',
    '<rect width="1200" height="380" fill="url(#sc-sky)"/>',
    /* 星星：白天透明 */
    '<g fill="var(--star)">',
    '<circle cx="120" cy="60" r="1.4"/><circle cx="260" cy="40" r="1.1"/><circle cx="420" cy="74" r="1.3"/><circle cx="610" cy="38" r="1"/>',
    '<circle cx="700" cy="96" r="1.2"/><circle cx="1010" cy="52" r="1.3"/><circle cx="1120" cy="84" r="1"/><circle cx="1160" cy="30" r="1.2"/>',
    '<circle cx="540" cy="120" r="1"/><circle cx="330" cy="118" r="1"/>',
    '</g>',
    '<g class="sun-hit" role="button" aria-label="sun">',
    '<circle cx="880" cy="138" r="130" fill="url(#sc-sun)"/>',
    '<circle cx="880" cy="138" r="32" fill="var(--sun-core)"/>',
    '<circle cx="880" cy="138" r="48" fill="transparent"/>',
    '</g>',
    '<g class="clouds" fill="var(--cloud)">',
    '<ellipse cx="260" cy="92" rx="96" ry="12"/><ellipse cx="318" cy="80" rx="52" ry="12"/>',
    '<ellipse cx="660" cy="64" rx="74" ry="9"/><ellipse cx="700" cy="56" rx="34" ry="8"/>',
    '<ellipse cx="1060" cy="104" rx="66" ry="9"/>',
    '</g>',
    /* 多云 / 阴天 / 雨雪时多出来的厚云 */
    '<g class="wx-clouds" fill="var(--cloud-2)">',
    '<ellipse cx="420" cy="70" rx="130" ry="26"/><ellipse cx="480" cy="54" rx="70" ry="24"/><ellipse cx="360" cy="60" rx="56" ry="18"/>',
    '<ellipse cx="820" cy="96" rx="150" ry="28"/><ellipse cx="880" cy="76" rx="80" ry="26"/><ellipse cx="760" cy="86" rx="60" ry="20"/>',
    '<ellipse cx="1130" cy="60" rx="110" ry="22"/><ellipse cx="1080" cy="48" rx="56" ry="18"/>',
    '</g>',
    '<g class="birds" fill="none" stroke="var(--bird)" stroke-width="1.8" stroke-linecap="round">',
    '<rect x="996" y="62" width="80" height="44" fill="transparent" stroke="none"/>',
    '<path d="M1010 92 q6 -6 12 0 q6 -6 12 0"/><path d="M1042 78 q5 -5 10 0 q5 -5 10 0"/>',
    '</g>',
    '<rect class="wx-veil" width="1200" height="380" fill="var(--veil)"/>',
    /* 最远的山 */
    '<path d="M0 232 L90 196 L170 214 L280 170 L380 206 L470 188 L560 210 L700 176 L820 204 L930 184 L1040 206 L1130 190 L1200 200 V380 H0Z" fill="var(--hill-4)"/>',
    '<g class="wx-caps" fill="var(--cap)">',
    '<path d="M262 177 L280 170 L299 178 L291 180 L282 175 L272 181Z"/><path d="M684 182 L700 176 L716 183 L708 184 L700 180 L692 185Z"/>',
    '<path d="M916 189 L930 184 L944 190 L936 191 L929 188 L922 192Z"/><path d="M1118 194 L1130 190 L1144 196 L1136 197 L1129 194 L1122 198Z"/>',
    '</g>',
    '<path d="M0 252 C120 210 220 220 330 236 S540 206 650 218 S860 196 980 216 S1130 230 1200 218 V380 H0Z" fill="var(--hill-3)"/>',
    '<g fill="var(--tree-2)">', trees([[150, 222, 9], [168, 226, 7], [610, 206, 10], [632, 210, 8], [650, 205, 9], [990, 208, 8], [1008, 212, 6]]), '</g>',
    '<path d="M0 292 C140 256 260 266 380 282 S600 254 740 268 S960 252 1080 270 S1170 278 1200 272 V380 H0Z" fill="var(--hill-2)"/>',
    /* 农舍 */
    '<g class="house-hit" transform="translate(700 236)">',
    '<rect x="0" y="12" width="46" height="26" fill="var(--house)"/>',
    '<path d="M-6 14 L23 -6 L52 14Z" fill="var(--roof)"/>',
    '<rect class="house-window" x="8" y="20" width="10" height="9" rx="1.5" fill="var(--window)"/>',
    '<rect x="28" y="22" width="9" height="16" rx="1.5" fill="var(--roof)" opacity=".75"/>',
    '<rect x="34" y="-6" width="5" height="10" fill="var(--roof)"/>',
    '</g>',
    '<g fill="var(--tree)">', trees([[300, 262, 13], [324, 266, 10], [760, 252, 11], [850, 258, 14], [876, 262, 10], [470, 268, 9]]), '</g>',
    '<g class="wx-fog" fill="var(--fog)">',
    '<ellipse cx="300" cy="262" rx="420" ry="18"/><ellipse cx="900" cy="250" rx="380" ry="16"/>',
    '</g>',
    '<path d="M0 332 C160 296 300 308 470 318 S760 296 920 312 S1120 320 1200 312 V380 H0Z" fill="var(--hill-1)"/>',
    '<g class="wx-fog wx-fog-2" fill="var(--fog)">',
    '<ellipse cx="600" cy="320" rx="560" ry="14"/>',
    '</g>',
    /* 近处田垄 */
    '<g clip-path="url(#sc-near)" fill="none" stroke="var(--field)" stroke-width="3" stroke-linecap="round">',
    '<path d="M-20 340 Q300 312 700 330"/><path d="M-20 352 Q320 324 740 342"/><path d="M-20 364 Q340 336 780 354"/>',
    '<path d="M560 330 Q820 306 1220 322"/><path d="M600 344 Q860 320 1220 336"/>',
    '</g>',
    '<g fill="var(--fence)" stroke="var(--fence)">', fence(600, 800, function (x) { return 322 - Math.sin(x / 260) * 4; }), '</g>',
    /* 草丛 */
    '<g fill="none" stroke="var(--leaf)" stroke-width="2" stroke-linecap="round" opacity=".8">',
    '<path d="M420 352 q2 -10 6 -14 M426 352 q0 -9 -4 -15 M432 352 q3 -8 8 -11"/>',
    '<path d="M610 350 q2 -10 6 -14 M616 350 q0 -9 -4 -15"/>',
    '</g>',
    '<g class="drift drift-leaves">', DRIFT_LEAVES, '</g>',
    '<g class="drift drift-petals">', DRIFT_PETALS, '</g>',
    '<g class="drift drift-flies">', FIREFLIES, '</g>',
    '<g class="wx-rain" stroke="var(--rain)" stroke-width="1.6" stroke-linecap="round">', RAIN, '</g>',
    '<g class="wx-snow" fill="var(--snow)">', SNOW, '</g>',
    /* 桌沿：茶杯 + 小盆栽 */
    '<rect x="0" y="356" width="1200" height="24" fill="var(--desk)"/>',
    '<rect x="0" y="356" width="1200" height="2" fill="#fff" opacity=".18"/>',
    '<g class="scene-desk" transform="translate(-110 0)">',
    '<g class="cup-hit" role="button" aria-label="tea">',
    '<rect x="1000" y="276" width="72" height="84" fill="transparent"/>',
    '<ellipse cx="1032" cy="356" rx="30" ry="4" fill="#000" opacity=".08"/>',
    '<path d="M1010 320 h44 l-4 30 a8 8 0 0 1 -8 6 h-20 a8 8 0 0 1 -8 -6z" fill="var(--cup)"/>',
    '<path d="M1012 326 h40" stroke="var(--cup-band)" stroke-width="4"/>',
    '<path d="M1054 326 h7 a9 9 0 0 1 0 18 h-6" fill="none" stroke="var(--cup)" stroke-width="5"/>',
    '<path class="steam" d="M1024 310 c-6 -10 6 -14 0 -26 M1040 310 c-6 -10 6 -14 0 -26" fill="none" stroke="var(--steam)" stroke-width="3" stroke-linecap="round"/>',
    '</g>',
    '<path d="M1110 328 h40 l-5 28 h-30z" fill="var(--pot)"/>',
    '<path d="M1108 328 h44" stroke="var(--pot)" stroke-width="5" stroke-linecap="round"/>',
    '<path d="M1130 326 c-2 -22 -18 -30 -28 -34 c14 0 26 10 28 22 c2 -16 14 -30 30 -32 c-14 8 -24 22 -30 44z" fill="var(--leaf)"/>',
    '<path d="M1130 326 c0 -14 4 -26 12 -40 c-2 14 -6 26 -12 40z" fill="var(--leaf)" opacity=".7"/>',
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
    sudoku: (function () {
      var digits = { 0: 5, 2: 3, 4: 7, 10: 9, 12: 1, 14: 6, 19: 4, 21: 8, 24: 2, 28: 6, 30: 3, 33: 9 };
      var out = '<rect x="88" y="14" width="144" height="144" rx="10" fill="var(--cv-paper)"/>';
      for (var k = 1; k < 9; k++) {
        var thick = k % 3 === 0;
        var p = 88 + k * 16;
        out += '<path d="M' + p + ' 16 V156 M90 ' + (14 + k * 16) + ' H230" stroke="var(--cv-ink)" stroke-opacity="' + (thick ? 0.35 : 0.1) + '" stroke-width="' + (thick ? 1.6 : 1) + '"/>';
      }
      for (var i in digits) {
        var x = 96 + (i % 9) * 16, y = 27 + Math.floor(i / 9) * 16;
        out += '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="11" font-family="Georgia,serif" fill="' + (i % 5 ? 'var(--cv-ink)' : 'var(--ga)') + '" opacity=".75">' + digits[i] + '</text>';
      }
      out += '<rect x="136" y="62" width="16" height="16" fill="var(--ga)" opacity=".25"/>';
      return out;
    })(),
    sweep: (function () {
      var openSet = { 13: 1, 14: 2, 15: 0, 16: 0, 17: 1, 23: 1, 24: 0, 25: 0, 26: 0, 27: 1, 33: 2, 34: 1, 35: 0, 36: 1, 37: 2 };
      var nc = { 1: '#5b84b8', 2: '#5f9474' };
      var out = '';
      for (var i = 0; i < 40; i++) {
        var x = 50 + (i % 10) * 22, y = 40 + Math.floor(i / 10) * 26;
        var o = i in openSet;
        out += '<rect x="' + x + '" y="' + y + '" width="20" height="23" rx="4" fill="' + (o ? '#eadfcb' : 'var(--ga)') + '" opacity="' + (o ? 0.95 : 0.55) + '"/>';
        if (o && openSet[i]) out += '<text x="' + (x + 10) + '" y="' + (y + 16) + '" text-anchor="middle" font-size="12" font-weight="700" font-family="Georgia,serif" fill="' + nc[openSet[i]] + '">' + openSet[i] + '</text>';
      }
      out += '<path d="M' + (50 + 8 * 22 + 8) + ' ' + (40 + 5) + ' v14" stroke="#7b5b45" stroke-width="2"/><path d="M' + (50 + 8 * 22 + 9) + ' ' + (40 + 5) + ' l8 4 -8 4z" fill="#d7807a"/>';
      out += '<path d="M' + (50 + 2 * 22 + 8) + ' ' + (40 + 3 * 26 + 5) + ' v14" stroke="#7b5b45" stroke-width="2"/><path d="M' + (50 + 2 * 22 + 9) + ' ' + (40 + 3 * 26 + 5) + ' l8 4 -8 4z" fill="#d7807a"/>';
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

  /* ---------- 窗外：时辰、天气、季节、一句《诗经》 ---------- */

  function daypart() {
    var h = new Date().getHours();
    if (h >= 5 && h < 9) return 'dawn';
    if (h >= 9 && h < 11) return 'morning';
    if (h >= 11 && h < 13) return 'noon';
    if (h >= 13 && h < 17) return 'afternoon';
    if (h >= 17 && h < 19) return 'dusk';
    if (h >= 19 && h < 23) return 'evening';
    return 'late';
  }

  /* 都出自《诗经》，和主站的「如切如磋」一脉；英文是自己译的大意。每种心情一小组，按日子轮换，点一下换一句 */
  var POEMS = {
    rain: [
      ['风雨如晦，鸡鸣不已。', '《郑风·风雨》', 'Wind and rain, dark as dusk — still the rooster calls.'],
      ['习习谷风，以阴以雨。', '《邶风·谷风》', 'A soft valley wind brings cloud, then rain.']
    ],
    storm: [
      ['风雨凄凄，鸡鸣喈喈。', '《郑风·风雨》', 'Cold wind and rain; the rooster calls on.'],
      ['殷其雷，在南山之阳。', '《召南·殷其雷》', 'Thunder rumbles on the sunny side of the southern hill.']
    ],
    snow: [
      ['今我来思，雨雪霏霏。', '《小雅·采薇》', 'Now that I return, the snow falls thick.'],
      ['北风其凉，雨雪其雱。', '《邶风·北风》', 'The north wind is cold; the snow comes down.']
    ],
    fog: [
      ['蒹葭苍苍，白露为霜。', '《秦风·蒹葭》', 'Reeds grey-green, white dew turned to frost.'],
      ['蒹葭萋萋，白露未晞。', '《秦风·蒹葭》', 'Reeds lush and thick; the dew not yet dry.']
    ],
    night: [
      ['月出皎兮，佼人僚兮。', '《陈风·月出》', 'The moon comes out so bright.'],
      ['嘒彼小星，三五在东。', '《召南·小星》', 'Faint little stars, three or five in the east.']
    ],
    spring: [
      ['桃之夭夭，灼灼其华。', '《周南·桃夭》', 'The young peach tree, its blossoms ablaze.'],
      ['春日载阳，有鸣仓庚。', '《豳风·七月》', 'Spring days grow warm; the orioles sing.'],
      ['采采芣苢，薄言采之。', '《周南·芣苢》', 'Gather, gather the plantain — let us gather it.']
    ],
    summer: [
      ['呦呦鹿鸣，食野之苹。', '《小雅·鹿鸣》', 'Deer call to each other, grazing in the wild.'],
      ['绵绵葛藟，在河之浒。', '《王风·葛藟》', 'Long kudzu vines along the riverbank.']
    ],
    autumn: [
      ['八月剥枣，十月获稻。', '《豳风·七月》', 'Dates in the eighth month, rice in the tenth.'],
      ['七月流火，九月授衣。', '《豳风·七月》', 'The Fire Star sinks in the seventh month; warm clothes come out in the ninth.']
    ],
    winter: [
      ['二之日凿冰冲冲。', '《豳风·七月》', 'In the deep of winter we cut ice — chip, chip.'],
      ['北风其喈，雨雪其霏。', '《邶风·北风》', 'The north wind howls; the snow drifts down.']
    ],
    any: [
      ['如切如磋，如琢如磨。', '《卫风·淇奥》', 'As cut, as filed; as chiselled, as polished.'],
      ['投我以木瓜，报之以琼琚。', '《卫风·木瓜》', 'You gave me a quince; I gave you a jade pendant.'],
      ['青青子衿，悠悠我心。', '《郑风·子衿》', 'Blue, blue your collar; long, long my longing.'],
      ['昔我往矣，杨柳依依。', '《小雅·采薇》', 'When I set out, the willows swayed.']
    ]
  };

  function poemKey(wx, season) {
    if (wx && (wx.kind === 'rain' || wx.kind === 'storm' || wx.kind === 'snow' || wx.kind === 'fog')) return wx.kind;
    var dp = daypart();
    if ((wx && !wx.isDay) || dp === 'evening' || dp === 'late') return 'night';
    return season;
  }

  /* 当前心情那组在前，通用的几句在后；起点按日期轮换 */
  function poemList(key) { return (POEMS[key] || []).concat(POEMS.any); }
  var poemShift = 0;

  /* ---------- 二十四节气（寿星公式，适用于 2001–2099） ---------- */
  var TERMS = [
    [1, 5.4055, '小寒', 'Minor Cold', '天渐寒，尚未大冷', 'cold, not yet bitter'],
    [1, 20.12, '大寒', 'Major Cold', '一年中最冷的时候', 'the coldest stretch of the year'],
    [2, 3.87, '立春', 'Start of Spring', '东风解冻，春天开始', 'the east wind thaws the ice'],
    [2, 18.73, '雨水', 'Rain Water', '冰雪化开，散而为雨', 'snow melts and falls as rain'],
    [3, 5.63, '惊蛰', 'Awakening of Insects', '春雷乍动，惊醒蛰虫', 'spring thunder wakes the sleeping insects'],
    [3, 20.646, '春分', 'Spring Equinox', '昼夜平分', 'day and night in balance'],
    [4, 4.81, '清明', 'Clear and Bright', '万物洁齐而清明', 'everything washed clean and bright'],
    [4, 20.1, '谷雨', 'Grain Rain', '雨生百谷', 'rain that grows the grain'],
    [5, 5.52, '立夏', 'Start of Summer', '万物至此皆长大', 'everything grows tall'],
    [5, 21.04, '小满', 'Grain Buds', '麦粒渐满，尚未全熟', 'the grain fills, not yet ripe'],
    [6, 5.678, '芒种', 'Grain in Ear', '有芒之谷，可以播种', 'time to sow the bearded grain'],
    [6, 21.37, '夏至', 'Summer Solstice', '白昼最长', 'the longest day'],
    [7, 7.108, '小暑', 'Minor Heat', '暑气渐盛', 'the heat builds'],
    [7, 22.83, '大暑', 'Major Heat', '一年中最热的时候', 'the hottest stretch of the year'],
    [8, 7.5, '立秋', 'Start of Autumn', '凉风至', 'the cool wind arrives'],
    [8, 23.13, '处暑', 'End of Heat', '暑气至此而止', 'the heat finally ends'],
    [9, 7.646, '白露', 'White Dew', '露凝而白', 'dew turns white'],
    [9, 23.042, '秋分', 'Autumn Equinox', '昼夜又一次平分', 'day and night in balance again'],
    [10, 8.318, '寒露', 'Cold Dew', '露气寒冷，将凝结', 'the dew grows cold'],
    [10, 23.438, '霜降', 'Frost’s Descent', '气肃而凝，露结为霜', 'dew turns to frost'],
    [11, 7.438, '立冬', 'Start of Winter', '水始冰，地始冻', 'water begins to freeze'],
    [11, 22.36, '小雪', 'Minor Snow', '气寒而将雪，雪未盛', 'cold enough for the first light snow'],
    [12, 7.18, '大雪', 'Major Snow', '至此而雪盛', 'the heavy snows begin'],
    [12, 21.94, '冬至', 'Winter Solstice', '白昼最短，阳气始生', 'the shortest day; light begins to return']
  ];

  function termDate(year, t) {
    var y = year % 100;
    var leap = t[0] <= 2 ? Math.floor((y - 1) / 4) : Math.floor(y / 4);
    return new Date(year, t[0] - 1, Math.floor(y * 0.2422 + t[1]) - leap);
  }

  /* 今天是节气，或者三天内就到 → 返回 { t, days } */
  function nearTerm() {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (var k = 0; k < TERMS.length; k++) {
      var d = termDate(today.getFullYear(), TERMS[k]);
      var days = Math.round((d - today) / 86400000);
      if (days >= 0 && days <= 3) return { t: TERMS[k], days: days, date: d };
    }
    return null;
  }

  /* ---------- 环境声：WebAudio 现场合成，不加载任何音频文件 ---------- */
  var ambient = { ctx: null, src: null, gain: null, on: false };

  function ambientStart(rainy) {
    var Ctor = w.AudioContext || w.webkitAudioContext;
    if (!Ctor) return false;
    if (!ambient.ctx) ambient.ctx = new Ctor();
    var ctx = ambient.ctx;
    if (ctx.state === 'suspended') ctx.resume();
    var len = ctx.sampleRate * 4;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    var last = 0;
    for (var i = 0; i < len; i++) {
      var white = Math.random() * 2 - 1;
      if (rainy) data[i] = white;
      else { last = (last + 0.02 * white) / 1.02; data[i] = last * 3.5; }
    }
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = rainy ? 2600 : 650;
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = rainy ? 380 : 40;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(rainy ? 0.045 : 0.09, ctx.currentTime + 1.6);
    src.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
    src.start();
    ambient.src = src; ambient.gain = gain; ambient.on = true;
    return true;
  }

  function ambientStop() {
    if (!ambient.on) return;
    var ctx = ambient.ctx, src = ambient.src, gain = ambient.gain;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    setTimeout(function () { try { src.stop(); } catch (e) {} }, 900);
    ambient.on = false;
  }
  MG.ambientStop = ambientStop;

  function teaCount(add) {
    var n = 0;
    try { n = parseInt(w.localStorage.getItem('mg.tea') || '0', 10) || 0; } catch (e) {}
    if (add) { n++; try { w.localStorage.setItem('mg.tea', String(n)); } catch (e) {} }
    return n;
  }

  function buildHero() {
    var sec = MG.h('section', 'hub-hero');
    var season = MG.weather ? MG.weather.season() : 'autumn';
    sec.dataset.season = season;
    sec.dataset.weather = 'clear';
    sec.dataset.daypart = daypart();
    sec.dataset.night = /evening|late/.test(daypart()) ? '1' : '0';

    var art = MG.h('div', 'hub-scene');
    art.innerHTML = SCENE;
    sec.appendChild(art);

    var copy = MG.h('div', 'hub-copy');
    var kicker = MG.h('p', 'hub-kicker');
    kicker.appendChild(MG.h('span', 'hub-greet', MG.t('hub.greet.' + daypart())));
    var chip = MG.h('span', 'wx-chip');
    chip.hidden = true;
    kicker.appendChild(chip);
    var locate = MG.h('button', 'wx-locate', '');
    locate.type = 'button';
    locate.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>';
    locate.title = MG.t('hub.locate');
    locate.setAttribute('aria-label', MG.t('hub.locate'));
    locate.hidden = true;
    kicker.appendChild(locate);
    var term = nearTerm();
    if (term) {
      var en = MG.i18n.lang === 'en';
      var name = en ? term.t[3] : term.t[2];
      var label = term.days === 0
        ? MG.t('hub.termToday', { name: name })
        : MG.t('hub.termSoon', { name: name, n: term.days });
      var tchip = MG.h('span', 'term-chip', label);
      tchip.title = (en ? term.t[5] : term.t[4]) + ' · ' + (term.date.getMonth() + 1) + '/' + term.date.getDate();
      kicker.appendChild(tchip);
    }
    copy.appendChild(kicker);

    copy.appendChild(MG.h('h1', null, MG.t('hub.h1')));
    var lede = MG.h('p', 'hub-lede', MG.t('hub.lede'));
    copy.appendChild(lede);

    var row = MG.h('div', 'hub-actions');
    var go = button(MG.t('hub.random'), 'primary', playRandom);
    go.setAttribute('title', MG.t('hub.randomHint'));
    row.appendChild(go);

    var def = MG.dailyGame();
    var d = def ? store.syncDaily(def.id) : null;
    if (def) {
      var daily = button(MG.t('hub.dailyChip', { name: MG.gtext(def).name }), 'ghost', function () { startDaily(def.id); });
      daily.classList.add('daily-btn');
      row.appendChild(daily);
    }
    copy.appendChild(row);

    var poem = MG.h('p', 'hub-poem');
    copy.appendChild(poem);

    var meta = MG.h('div', 'hub-meta');
    if (d) {
      meta.appendChild(MG.h('span', null,
        (d.best ? MG.t('daily.best', { n: MG.fmtScore(d.best) }) : MG.t('daily.none')) +
        ' · ' + MG.t('daily.streak', { n: d.streak || 0 }) +
        ' · ' + MG.t('hub.slacked', { t: MG.durationText(store.data.workMs) })));
    }
    var amb = MG.h('button', 'amb-btn', '');
    amb.type = 'button';
    meta.appendChild(amb);
    copy.appendChild(meta);

    if (!store.data.seen) copy.appendChild(MG.h('p', 'hub-hint', MG.t('hub.hintFirst')));
    sec.appendChild(copy);

    var current = null;

    function rainy() { return current && (current.kind === 'rain' || current.kind === 'storm'); }
    function paintAmb() {
      amb.textContent = (ambient.on ? '♪ ' : '♫ ') + MG.t(ambient.on ? 'hub.ambOn' : (rainy() ? 'hub.ambRain' : 'hub.ambSoft'));
      amb.classList.toggle('on', ambient.on);
    }
    function paintPoem() {
      var list = poemList(poemKey(current, season));
      var p = list[(MG.dayNumber() + poemShift) % list.length];
      poem.textContent = '';
      poem.appendChild(MG.h('span', 'poem-line', p[0]));
      poem.appendChild(MG.h('span', 'poem-src', MG.i18n.lang === 'en' ? p[2] + ' — Book of Songs' : '《诗经·' + p[1].slice(1)));
      poem.title = MG.t('hub.poemMore');
    }
    poem.addEventListener('click', function () {
      poemShift++;
      poem.classList.remove('turn');
      void poem.offsetWidth;
      poem.classList.add('turn');
      paintPoem();
    });

    function applyWx(wx) {
      if (!wx || !sec.isConnected) return;
      current = wx;
      sec.dataset.weather = wx.kind;
      sec.dataset.season = wx.season;
      season = wx.season;
      chip.hidden = false;
      chip.textContent = wx.city + ' · ' + MG.t('hub.wx.' + wx.kind) + ' ' + wx.temp + '°';
      locate.hidden = wx.mine;
      var night = !wx.isDay;
      sec.dataset.night = night ? '1' : '0';
      var line = MG.t('hub.wxLine.' + (wx.kind === 'clear' ? (night ? 'night' : 'clear') : wx.kind));
      lede.textContent = line + MG.t('hub.ledeTail');
      paintPoem();
      paintAmb();
      var credit = document.getElementById('footWx');
      if (credit) credit.hidden = false;
    }

    paintPoem();
    paintAmb();
    /* 缓存命中时回调是同步的，等这一段挂进页面之后再取 */
    if (MG.weather) setTimeout(function () { MG.weather.get(applyWx); }, 0);

    locate.addEventListener('click', function () {
      locate.disabled = true;
      MG.weather.locate(function (ok) {
        locate.disabled = false;
        MG.toast(MG.t(ok ? 'hub.located' : 'hub.locateFail'));
        if (ok) MG.weather.get(applyWx);
      });
    });

    amb.addEventListener('click', function () {
      if (ambient.on) ambientStop();
      else ambientStart(rainy());
      paintAmb();
    });

    /* 小彩蛋：点太阳 / 月亮换昼夜；点茶杯续一杯 */
    var sun = art.querySelector('.sun-hit');
    if (sun) sun.addEventListener('click', function () {
      els.btnTheme.click();
      MG.toast(MG.t(store.data.theme === 'dark' ? 'hub.eggNight' : 'hub.eggDay'));
    });
    var birds = art.querySelector('.birds');
    if (birds) birds.addEventListener('click', function () {
      if (birds.classList.contains('away')) return;
      birds.classList.add('away');
      MG.toast(MG.t('hub.birds'));
      setTimeout(function () { birds.classList.remove('away'); }, 30000);
    });
    var house = art.querySelector('.house-hit');
    if (house) house.addEventListener('click', function () {
      var dark = house.classList.toggle('lights-off');
      MG.toast(MG.t(dark ? 'hub.houseOff' : 'hub.houseOn'));
    });
    var cup = art.querySelector('.cup-hit');
    if (cup) cup.addEventListener('click', function () {
      var n = teaCount(true);
      cup.classList.remove('refill');
      void cup.getBoundingClientRect();
      cup.classList.add('refill');
      MG.audio.play('tick');
      MG.toast(MG.t('hub.tea', { n: n }));
    });

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

  /* 成就 → 插画 */
  var ACH_ART = {
    first: 'sprout', six: 'basket', memory20: 'g_memory', daily: 'calendar', streak3: 'sunflower',
    receipt3000: 'receipt', golf5: 'g_golf', tetris10: 'g_tetris', lightsPar: 'g_lights',
    cupsClean: 'g_cups', slide40: 'g_slide', sudokuClean: 'g_sudoku', sweepWin: 'bee'
  };

  /* 有插画就放插画，没有就退回 emoji */
  function artBox(cls, svgHtml, fallback) {
    var el = MG.h('span', cls);
    if (svgHtml) el.innerHTML = svgHtml;
    else el.textContent = fallback || '';
    return el;
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
      item.appendChild(artBox('badge-icon', ACH_ART[a.id] ? MG.art.html(ACH_ART[a.id]) : '', a.icon));
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
    if (run.gameId === 'sudoku' && m.mistakes === 0) grant('sudokuClean');
    if (run.gameId === 'sweep' && m.won) grant('sweepWin');

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
    title.appendChild(artBox('card-icon', MG.art.gameIcon(def), def.icon));
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
    var rulesBtn = button('', 'rules-btn', function () { toggleRules(); });
    rulesBtn.innerHTML = '<span aria-hidden="true">?</span> <span class="rules-label"></span>';
    rulesBtn.querySelector('.rules-label').textContent = MG.t('play.rules');
    rulesBtn.title = MG.t('play.rulesTitle');
    actions.appendChild(meta);
    actions.appendChild(rulesBtn);
    actions.appendChild(pauseBtn);

    head.appendChild(back);
    head.appendChild(title);
    head.appendChild(scoreBox);
    head.appendChild(actions);

    var stage = MG.h('div', 'stage');

    var howto = MG.h('p', 'play-howto', T.howto || '');
    var hint = MG.h('div', 'play-hint');
    (T.controls || []).forEach(function (c) {
      if (Object.prototype.toString.call(c) === '[object Array]') hint.appendChild(controlRow(c[0], c[1]));
      else {
        var span = MG.h('span');
        span.textContent = c;
        hint.appendChild(span);
      }
    });
    hint.appendChild(controlRow('?', MG.t('play.rules')));
    hint.appendChild(controlRow('Esc', MG.t('app.bossKey')));

    wrap.appendChild(head);
    wrap.appendChild(stage);
    wrap.appendChild(howto);
    wrap.appendChild(hint);
    var playAd = MG.ads && MG.ads.block('play');
    if (playAd) wrap.appendChild(playAd);
    view.appendChild(wrap);

    play.stage = stage;
    play.els = {
      score: scoreVal,
      best: bestVal,
      scoreLabel: scoreLabel,
      bestLabel: bestLabel,
      back: back,
      meta: meta,
      pause: pauseBtn,
      rules: rulesBtn
    };
  }

  function refreshPlayChrome() {
    if (!play || !play.els) return;
    var paused = play.state === 'paused';
    play.els.pause.textContent = MG.t(paused ? 'play.resume' : 'play.pause');
    play.els.scoreLabel.textContent = MG.t('play.score');
    play.els.bestLabel.textContent = MG.t('play.best');
    play.els.back.title = MG.t('play.back');
    play.els.rules.querySelector('.rules-label').textContent = MG.t('play.rules');
    play.els.rules.title = MG.t('play.rulesTitle');
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

    p.stage.dataset.game = p.def.id;
    p.inst = p.def.mount(p.stage, makeHost()) || {};

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
    panel.appendChild(artBox('panel-head', MG.art.gameIcon(play.def), play.def.icon));
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

  function keysBox(T) {
    var keys = MG.h('div', 'keys');
    (T.controls || []).forEach(function (c) {
      if (Object.prototype.toString.call(c) === '[object Array]') keys.appendChild(controlRow(c[0], c[1]));
      else keys.appendChild(MG.h('span', null, String(c)));
    });
    return keys;
  }

  /* 对局中随时看规则：正在玩就先暂停，看完回到原来的状态 */
  function showRules() {
    if (!play) return;
    var from = play.overlayKind;
    if (from === 'rules') return;
    if (play.state === 'running') { pauseGame(); from = 'paused'; }
    play.rulesFrom = from;

    var T = MG.gtext(play.def);
    var panel = MG.h('div', 'panel panel-rules');
    panel.appendChild(artBox('panel-head', MG.art.gameIcon(play.def), play.def.icon));
    panel.appendChild(MG.h('h3', null, MG.t('panel.rules')));
    panel.appendChild(MG.h('p', null, T.howto || ''));
    panel.appendChild(keysBox(T));

    var actions = MG.h('div', 'actions');
    if (play.state === 'paused') actions.appendChild(button(MG.t('panel.resume'), 'primary', resumeGame));
    else if (play.state === 'idle') actions.appendChild(button(MG.t('panel.start'), 'primary', startGame));
    actions.appendChild(button(MG.t('panel.gotIt'), play.state === 'over' ? 'primary' : '', closeRules));
    panel.appendChild(actions);

    showOverlay(panel, 'rules');
  }

  function closeRules() {
    if (!play || play.overlayKind !== 'rules') return;
    var from = play.rulesFrom;
    play.rulesFrom = null;
    if (play.state === 'paused') showPaused();
    else if (play.state === 'idle') showStart();
    else if (play.state === 'over' && play.lastResult) showOver(play.lastResult, true);
    else clearOverlay();
    return from;
  }

  function toggleRules() {
    if (!play) return;
    if (play.overlayKind === 'rules') closeRules();
    else showRules();
  }

  function showPaused() {
    var panel = MG.h('div', 'panel panel-paused');
    panel.appendChild(artBox('panel-head', MG.art.html('pause'), '⏸'));
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
    panel.appendChild(artBox('panel-head', MG.art.html(result.record ? 'ribbon' : 'sprout'), ''));
    if (result.record) {
      var seal = MG.h('span', 'seal');
      seal.appendChild(MG.h('span', null, MG.t('panel.seal')));
      panel.appendChild(seal);
    }
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
      record: res.record && score > 0 && !(payload.meta && payload.meta.won === false),
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

    if (e.key === '?' || e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      toggleRules();
      return;
    }

    if (e.key === 'p' || e.key === 'P') {
      if (play.state === 'running') pauseGame();
      else if (play.state === 'paused') resumeGame();
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (!fakeOn) document.title = document.hidden ? MG.t('app.awayTitle') : MG.t('app.title');
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
    if (MG.music) { MG.music.retitle(); paintMusic(); }
    applyTheme();
    applySound();
    refreshWorkTime();

    if (play) {
      refreshPlayChrome();
      if (play.overlayKind === 'start') showStart();
      else if (play.overlayKind === 'paused') showPaused();
      else if (play.overlayKind === 'rules') { play.overlayKind = null; showRules(); }
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

  /* 打开开发者工具的人，也送一句 */
  try {
    console.log('%c如切如磋，如琢如磨。', 'font: 600 18px "Songti SC", serif; color: #4f8a6f; padding: 6px 0');
    console.log('%c《诗经·卫风·淇奥》 · SDK Pods · https://sdkpod.com', 'color: #7f8c85');
  } catch (e) {}

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
