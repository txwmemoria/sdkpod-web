/* =========================================================================
   摸鱼司 · 随机音乐
   音源：Internet Archive 上 Musopen 的《肖邦全集》录音，CC0（公共领域），
   可以自由使用，页脚署名只是礼貌。只挑安静的曲子：夜曲、玛祖卡、圆舞曲、
   前奏曲、摇篮曲、船歌、即兴曲。曲目列表缓存一天；音频直接从 archive.org 串流。
   不会自动播放：第一次一定是访客自己点的。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var ITEM = 'musopen-chopin';
  var LIST_KEY = 'mg.music.list';
  var DAY = 24 * 3600 * 1000;
  var CALM = /Nocturne|Mazurka|Waltz|Valse|Prelude|Berceuse|Barcarolle|Impromptu|Largo/i;
  var SKIP = /Mayer|Allegro|Sonata for Piano and Cello in G Minor, Op\. 65 - (I|II|IV)\./i;

  var GENRE_ZH = [
    [/Nocturne/i, '夜曲'], [/Mazurka/i, '玛祖卡'], [/Waltz|Valse/i, '圆舞曲'], [/Prelude/i, '前奏曲'],
    [/Berceuse/i, '摇篮曲'], [/Barcarolle/i, '船歌'], [/Impromptu/i, '即兴曲'], [/Largo/i, '广板']
  ];

  var audio = null;
  var list = null;
  var order = [];
  var pos = -1;
  var fails = 0;
  var listeners = [];
  var state = { playing: false, loading: false, title: '', file: '' };

  function emit() { listeners.forEach(function (fn) { fn(state); }); }

  function cleanTitle(file) {
    var t = file.replace(/\.mp3$/i, '').replace(/_/g, ':').replace(/\s*\(\d\)$/, '');
    t = t.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/(\d)(In|in)([A-Z])/g, '$1 in $3').replace(/\.(\d)/g, '. $1');
    return t.replace(/\s+/g, ' ').trim();
  }

  function displayTitle(file) {
    var t = cleanTitle(file);
    if (MG.i18n && MG.i18n.lang === 'zh') {
      for (var i = 0; i < GENRE_ZH.length; i++) {
        if (GENRE_ZH[i][0].test(t)) return '肖邦 · ' + GENRE_ZH[i][1] + ' ' + t.replace(GENRE_ZH[i][0], '').replace(/^[\s:-]+/, '');
      }
      return '肖邦 · ' + t;
    }
    return 'Chopin · ' + t;
  }

  function loadList() {
    if (list) return Promise.resolve(list);
    try {
      var cached = JSON.parse(w.localStorage.getItem(LIST_KEY) || 'null');
      if (cached && Date.now() - cached.at < DAY && cached.files.length) { list = cached.files; return Promise.resolve(list); }
    } catch (e) {}
    return fetch('https://archive.org/metadata/' + ITEM + '/files').then(function (r) {
      if (!r.ok) throw new Error('list ' + r.status);
      return r.json();
    }).then(function (j) {
      var files = (j.result || []).map(function (f) { return f.name; })
        .filter(function (n) { return /\.mp3$/i.test(n) && CALM.test(n) && !SKIP.test(n); });
      if (!files.length) throw new Error('empty');
      list = files;
      try { w.localStorage.setItem(LIST_KEY, JSON.stringify({ at: Date.now(), files: files })); } catch (e) {}
      return list;
    });
  }

  function shuffle() {
    order = list.map(function (_, i) { return i; });
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = order[i]; order[i] = order[j]; order[j] = t;
    }
    pos = -1;
  }

  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = 'auto';
    audio.volume = 0.55;
    audio.addEventListener('ended', function () { next(); });
    audio.addEventListener('playing', function () { state.loading = false; state.playing = true; fails = 0; emit(); });
    audio.addEventListener('pause', function () { state.playing = false; emit(); });
    audio.addEventListener('error', function () {
      /* 某一首拿不到就换下一首，连续失败三次才放弃 */
      fails++;
      if (fails >= 3) { state.loading = false; state.playing = false; emit(); MG.toast(MG.t('music.fail')); return; }
      next();
    });
    return audio;
  }

  function playIndex() {
    var file = list[order[pos]];
    state.file = file;
    state.title = displayTitle(file);
    state.loading = true;
    emit();
    var a = ensureAudio();
    a.src = 'https://archive.org/download/' + ITEM + '/' + encodeURIComponent(file);
    var p = a.play();
    if (p && p.catch) p.catch(function () { state.loading = false; emit(); });
  }

  function next() {
    if (!list) return;
    pos++;
    if (pos >= order.length) shuffle(), pos = 0;
    playIndex();
  }

  MG.music = {
    state: state,
    onChange: function (fn) { listeners.push(fn); },

    toggle: function () {
      if (state.playing) { audio.pause(); return; }
      if (audio && audio.src && state.file) {
        var p = audio.play();
        if (p && p.catch) p.catch(function () {});
        return;
      }
      state.loading = true;
      emit();
      loadList().then(function () { shuffle(); next(); }).catch(function () {
        state.loading = false;
        emit();
        MG.toast(MG.t('music.fail'));
      });
    },

    next: function () {
      if (!list) { MG.music.toggle(); return; }
      next();
    },

    pause: function () { if (audio && state.playing) audio.pause(); },
    resume: function () { if (audio && state.file && !state.playing) { var p = audio.play(); if (p && p.catch) p.catch(function () {}); } },

    /* 语言切换后，曲名跟着换 */
    retitle: function () { if (state.file) { state.title = displayTitle(state.file); emit(); } },

    sourceUrl: 'https://archive.org/details/' + ITEM
  };
})(window);
