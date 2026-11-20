/* =========================================================================
   摸鱼司 · 核心
   工具函数 / 本地存档 / 合成音效 / 游戏注册表 / 提示条
   以经典脚本（非 ES module）方式加载：双击 index.html 也能跑（file:// 下
   ES module 会被 CORS 拦掉），所以全部挂在 window.MG 上。
   ========================================================================= */
(function (w) {
  'use strict';

  var MG = (w.MG = w.MG || {});

  /* ---------------------------------------------------------------- 工具 */

  MG.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  MG.lerp = function (a, b, t) { return a + (b - a) * t; };
  /* 随机数统一走 MG._rng，「今日挑战」用固定种子复现同一天的牌面 */
  MG._rng = Math.random;

  MG.setSeed = function (seed) {
    var s = seed >>> 0;
    MG._rng = function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  MG.resetSeed = function () { MG._rng = Math.random; };

  MG.rand = function (a, b) { return a + MG._rng() * (b - a); };
  MG.randInt = function (a, b) { return Math.floor(a + MG._rng() * (b - a + 1)); };
  MG.pick = function (list) { return list[(MG._rng() * list.length) | 0]; };

  MG.h = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  };

  MG.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  /** #rgb / #rrggbb → rgba()，用于按游戏主题色生成半透明层 */
  MG.hexToRgba = function (hex, alpha) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return 'rgba(15,139,116,' + alpha + ')';
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  };

  /** 1200 → 1,200 */
  MG.fmtScore = function (n) {
    n = Math.round(Number(n) || 0);
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  /** 秒表格式：0:07 / 12:30 */
  MG.fmtClock = function (ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    return Math.floor(s / 60) + ':' + MG.pad2(s % 60);
  };

  /** 中文时长：48 秒 / 7 分钟 / 3 小时 12 分 */
  MG.fmtDuration = function (ms) {
    var min = Math.floor(Math.max(0, ms) / 60000);
    if (min < 1) return Math.floor(Math.max(0, ms) / 1000) + ' 秒';
    var h = Math.floor(min / 60);
    var m = min % 60;
    return h > 0 ? h + ' 小时 ' + m + ' 分' : m + ' 分钟';
  };

  /** 绑定事件并返回解绑函数，方便 destroy 时统一清理 */
  MG.on = function (target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    return function () { target.removeEventListener(type, fn, opts); };
  };

  /**
   * 按设备像素比铺满父容器，返回逻辑尺寸与已缩放的 2d 上下文。
   * 调用方只需要按 (w, h) 逻辑坐标绘制。
   */
  MG.fitCanvas = function (canvas) {
    var cw = Math.max(1, Math.round(canvas.clientWidth || 640));
    var ch = Math.max(1, Math.round(canvas.clientHeight || 400));
    var dpr = Math.min(w.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: cw, h: ch, ctx: ctx };
  };

  MG.roundRect = function (ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };

  /* ------------------------------------------------------- 主题缓存（性能） */

  /* 每帧调 getComputedStyle 会触发样式重算，所有游戏改成读这份缓存 */
  MG.theme = {};

  MG.refreshTheme = function () {
    var cs = getComputedStyle(document.documentElement);
    function v(name, fallback) {
      var x = cs.getPropertyValue(name);
      x = x ? x.trim() : '';
      return x || fallback;
    }
    var t = MG.theme;
    t.accent = v('--accent', '#0f8b74');
    t.accent2 = v('--accent-2', '#0a6a59');
    t.ink = v('--ink', '#14171c');
    t.muted = v('--muted', '#78828f');
    t.panel = v('--panel', '#ffffff');
    t.panel2 = v('--panel-2', '#f6f8f9');
    t.line = v('--line', '#e2e6eb');
    t.amber = v('--amber', '#d99a2b');
    t.danger = v('--danger', '#d14848');
    t.dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return t;
  };

  /* --------------------------------------------------------- 特效引擎 */

  /**
   * 每个 Canvas 游戏一份：粒子 + 震屏。
   * 用法：var fx = MG.effects(); fx.burst(x, y, color, 12);
   *       fx.update(dt); var o = fx.offset(); ctx.translate(o.x, o.y); fx.draw(ctx);
   */
  MG.effects = function () {
    var parts = [];
    var shakeAmt = 0;

    return {
      burst: function (x, y, color, count, power) {
        /* 护眼：碎块数量和飞散速度都减半，避免满屏闪 */
        count = Math.max(4, Math.round((count || 10) * 0.5));
        power = (power || 190) * 0.6;
        for (var i = 0; i < count; i++) {
          var a = MG.rand(0, Math.PI * 2);
          var s = MG.rand(power * 0.25, power);
          parts.push({
            x: x,
            y: y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s - power * 0.3,
            life: 0,
            max: MG.rand(0.32, 0.68),
            size: MG.rand(2.2, 5.4),
            color: color,
            rot: MG.rand(0, 6.28),
            spin: MG.rand(-8, 8)
          });
        }
        if (parts.length > 260) parts.splice(0, parts.length - 260);
      },

      /* 护眼：不震屏。保留接口，游戏代码不用改 */
      shake: function () {},

      update: function (dt) {
        for (var i = parts.length - 1; i >= 0; i--) {
          var p = parts[i];
          p.life += dt;
          if (p.life >= p.max) { parts.splice(i, 1); continue; }
          p.vy += 540 * dt;
          p.vx *= Math.max(0, 1 - 2.4 * dt);
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.spin * dt;
        }
        shakeAmt *= Math.pow(0.015, dt);
        if (shakeAmt < 0.15) shakeAmt = 0;
      },

      draw: function (ctx) {
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          var k = 1 - p.life / p.max;
          ctx.save();
          ctx.globalAlpha = k > 0 ? k * 0.75 : 0;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          var w = p.size;
          var h = p.size * (0.5 + k * 0.9);
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.restore();
        }
      },

      offset: function () {
        if (!shakeAmt) return { x: 0, y: 0 };
        return { x: MG.rand(-shakeAmt, shakeAmt), y: MG.rand(-shakeAmt, shakeAmt) };
      },

      clear: function () { parts.length = 0; shakeAmt = 0; },

      count: function () { return parts.length; }
    };
  };

  /** DOM 里撒纸屑（破纪录时用），纯 CSS 动画，1.6s 后自动清理 */
  MG.confetti = function (container, count) {
    if (!container) return;
    count = count || 26;
    var colors = ['#f0b429', '#e8892b', '#0f8b74', '#4a7bd8', '#d9556a', '#7b6fd0'];
    for (var i = 0; i < count; i++) {
      var el = document.createElement('i');
      el.className = 'confetti';
      el.style.left = (8 + Math.random() * 84) + '%';
      el.style.background = colors[i % colors.length];
      el.style.animationDelay = (Math.random() * 0.3).toFixed(2) + 's';
      el.style.width = (5 + Math.random() * 5).toFixed(1) + 'px';
      el.style.height = (8 + Math.random() * 9).toFixed(1) + 'px';
      el.style.setProperty('--dx', (Math.random() * 200 - 100).toFixed(0) + 'px');
      el.style.setProperty('--rot', (Math.random() * 900 - 450).toFixed(0) + 'deg');
      container.appendChild(el);
    }
    setTimeout(function () {
      var olds = container.querySelectorAll('.confetti');
      for (var j = 0; j < olds.length; j++) olds[j].remove();
    }, 2200);
  };

  /** 数字滚动，结算面板用 */
  MG.countUp = function (el, to, ms) {
    if (!el) return;
    var start = performance.now();
    var dur = ms || 620;
    function tick(now) {
      var k = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - k, 3);
      el.textContent = MG.fmtScore(Math.round(to * eased));
      if (k < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };

  /** DOM 元素抖一下（Boss 用） */
  MG.shakeEl = function (el, intensity) {
    if (!el) return;
    el.style.setProperty('--shake', String(intensity || 6) + 'px');
    el.classList.remove('shake-strong');
    void el.offsetWidth;
    el.classList.add('shake-strong');
  };


  /* --------------------------------------------------------------- 存档 */

  var KEY = 'mg.v1';

  /* 与主站 sdkpod.com 共用的偏好键：主站选了深色 / 中文，进来就是深色 / 中文 */
  function siteGet(k) {
    try { return w.localStorage.getItem(k); } catch (err) { return null; }
  }

  function defaultTheme() {
    var t = siteGet('theme');
    if (t === 'dark' || t === 'light') return t;
    return w.matchMedia && w.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function defaultLang() {
    var l = siteGet('lang');
    if (l === 'zh' || l === 'en') return l;
    return String(navigator.language || 'zh').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
  }

  function defaults() {
    return {
      theme: defaultTheme(),
      lang: defaultLang(),
      sound: false,
      best: {},
      plays: {},
      workMs: 0,
      since: Date.now(),
      ach: {},
      seen: false,
      lastGame: '',
      daily: { date: '', gameId: '', best: 0, plays: 0, streak: 0, lastDate: '' }
    };
  }

  var data = defaults();
  try {
    var raw = w.localStorage.getItem(KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.theme === 'dark' || parsed.theme === 'light') data.theme = parsed.theme;
        if (parsed.lang === 'zh' || parsed.lang === 'en') data.lang = parsed.lang;
        data.sound = !!parsed.sound;
        data.best = (parsed.best && typeof parsed.best === 'object') ? parsed.best : {};
        data.plays = (parsed.plays && typeof parsed.plays === 'object') ? parsed.plays : {};
        data.workMs = (typeof parsed.workMs === 'number' && parsed.workMs >= 0) ? parsed.workMs : 0;
        data.since = (typeof parsed.since === 'number' && parsed.since > 0) ? parsed.since : Date.now();
        data.ach = (parsed.ach && typeof parsed.ach === 'object') ? parsed.ach : {};
        data.seen = !!parsed.seen;
        data.lastGame = typeof parsed.lastGame === 'string' ? parsed.lastGame : '';
        if (parsed.daily && typeof parsed.daily === 'object') {
          var d = parsed.daily;
          data.daily = {
            date: typeof d.date === 'string' ? d.date : '',
            gameId: typeof d.gameId === 'string' ? d.gameId : '',
            best: typeof d.best === 'number' ? d.best : 0,
            plays: typeof d.plays === 'number' ? d.plays : 0,
            streak: typeof d.streak === 'number' ? d.streak : 0,
            lastDate: typeof d.lastDate === 'string' ? d.lastDate : ''
          };
        }
      }
    }
  } catch (err) {
    /* 隐私模式 / 禁用 storage：功能照常，只是不落盘 */
  }

  MG.store = {
    key: KEY,
    data: data,

    save: function () {
      try { w.localStorage.setItem(KEY, JSON.stringify(data)); } catch (err) { /* 忽略 */ }
    },

    bestOf: function (id) {
      var v = data.best[id];
      return typeof v === 'number' ? v : 0;
    },

    /**
     * 只在 >0 且超过历史时写入。
     * @returns {{best:number, record:boolean}}
     */
    setBest: function (id, score) {
      var s = Math.max(0, Math.round(score || 0));
      var old = MG.store.bestOf(id);
      var record = s > old;
      if (record) {
        data.best[id] = s;
        MG.store.save();
      }
      return { best: Math.max(old, s), record: record };
    },

    notePlay: function (id) {
      data.plays[id] = (data.plays[id] || 0) + 1;
      MG.store.save();
    },

    addWork: function (ms) {
      if (!(ms > 0)) return;
      data.workMs += ms;
    },

    totalPlays: function () {
      var n = 0;
      for (var k in data.plays) if (data.plays.hasOwnProperty(k)) n += data.plays[k];
      return n;
    },

    bestCount: function () {
      var n = 0;
      for (var k in data.best) if (data.best.hasOwnProperty(k) && data.best[k] > 0) n++;
      return n;
    },

    /* ---------- 今日挑战 ---------- */

    /** 日期变了就重置当天记录 */
    syncDaily: function (gameId) {
      var today = MG.dailyKey();
      if (data.daily.date !== today) {
        data.daily = {
          date: today,
          gameId: gameId,
          best: 0,
          plays: 0,
          streak: data.daily.streak,
          lastDate: data.daily.lastDate
        };
        MG.store.save();
      } else if (gameId && data.daily.gameId !== gameId) {
        data.daily.gameId = gameId;
        data.daily.best = 0;
        data.daily.plays = 0;
        MG.store.save();
      }
      return data.daily;
    },

    /** 记录一次今日挑战成绩，并推进连续天数 */
    setDaily: function (gameId, score) {
      var d = MG.store.syncDaily(gameId);
      var today = MG.dailyKey();
      if (d.lastDate !== today) {
        var yesterday = new Date(Date.now() - 86400000);
        var yKey = yesterday.getFullYear() + '-' + MG.pad2(yesterday.getMonth() + 1) + '-' + MG.pad2(yesterday.getDate());
        d.streak = (d.lastDate === yKey) ? (d.streak || 0) + 1 : 1;
        d.lastDate = today;
      }
      var s = Math.max(0, Math.round(score || 0));
      var record = s > d.best;
      if (record) d.best = s;
      d.plays = (d.plays || 0) + 1;
      MG.store.save();
      return { best: d.best, record: record, streak: d.streak };
    },

    /* ---------- 成就 ---------- */

    hasAch: function (id) { return !!data.ach[id]; },

    unlockAch: function (id) {
      if (data.ach[id]) return false;
      data.ach[id] = Date.now();
      MG.store.save();
      return true;
    },

    achCount: function () {
      var n = 0;
      for (var k in data.ach) if (data.ach.hasOwnProperty(k)) n++;
      return n;
    },

    reset: function () {
      data = defaults();
      MG.store.data = data;
      MG.store.save();
    }
  };

  /* ----------------------------------------------------- 今日挑战与成就 */

  MG.dailyKey = function (d) {
    d = d || new Date();
    return d.getFullYear() + '-' + MG.pad2(d.getMonth() + 1) + '-' + MG.pad2(d.getDate());
  };

  /** 从 1970 起的第几天，用来挑当天玩哪款、生成当天种子 */
  MG.dayNumber = function () {
    var now = new Date();
    var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.floor(midnight / 86400000);
  };

  MG.dailyGame = function () {
    if (!MG.games.length) return null;
    return MG.games[MG.dayNumber() % MG.games.length];
  };

  MG.dailySeed = function () {
    return (MG.dayNumber() * 2654435761) >>> 0;
  };

  /* 成就表：判断条件写在 app.js 的 evaluateAchievements() 里 */
  MG.achievements = [
    { id: 'first', icon: '🐟', name: '初次摸鱼', desc: '完成任意一局游戏' },
    { id: 'six', icon: '🧩', name: '全勤', desc: '每款游戏各玩一局' },
    { id: 'memory20', icon: '🧠', name: '过目不忘', desc: '《工位配对》20 步内完成' },
    { id: 'daily', icon: '📅', name: '今日打卡', desc: '完成一次今日挑战' },
    { id: 'streak3', icon: '🗓️', name: '连续摸鱼', desc: '连续 3 天完成今日挑战' },
    { id: 'receipt3000', icon: '🧾', name: '报销达人', desc: '《报销单消消乐》单局 3000 分' },
    { id: 'golf5', icon: '⛳', name: '午休选手', desc: '《午休一杆进洞》三洞 ≤ 5 杆' },
    { id: 'tetris10', icon: '🧱', name: '文件柜', desc: '《工位叠方块》消除 10 行' },
    { id: 'lightsPar', icon: '💡', name: '一步不多', desc: '《关灯下班》用最少步数关完' },
    { id: 'cupsClean', icon: '☕', name: '不用撤销', desc: '《茶水间收杯子》一次撤销都没用' },
    { id: 'slide40', icon: '🗂️', name: '归档专家', desc: '《整理文件柜》40 步内完成' },
    { id: 'sudokuClean', icon: '🔢', name: '一笔不改', desc: '《午后数独》零失误完成' },
    { id: 'sweepWin', icon: '🐝', name: '园丁', desc: '《菜园扫雷》清理完整块菜地' }
  ];

  MG.achById = function (id) {
    for (var i = 0; i < MG.achievements.length; i++) {
      if (MG.achievements[i].id === id) return MG.achievements[i];
    }
    return null;
  };

  /* --------------------------------------------------------------- 音效 */

  var actx = null;
  var mutedLabel = true;

  function audioCtx() {
    if (actx) return actx;
    var Ctor = w.AudioContext || w.webkitAudioContext;
    if (!Ctor) return null;
    try { actx = new Ctor(); } catch (err) { return null; }
    return actx;
  }

  /* 每个音效是若干音符：f 频率、d 时长、type 波形、v 音量、at 延迟秒 */
  var SFX = {
    click: [{ f: 520, d: .05, type: 'square', v: .08 }],
    good: [
      { f: 784, d: .07, type: 'triangle', v: .16 },
      { f: 1175, d: .09, type: 'triangle', v: .11, at: .055 }
    ],
    perfect: [
      { f: 1046, d: .06, type: 'triangle', v: .14 },
      { f: 1568, d: .08, type: 'triangle', v: .12, at: .05 },
      { f: 2093, d: .1, type: 'sine', v: .09, at: .11 }
    ],
    bad: [
      { f: 196, d: .12, type: 'sawtooth', v: .12 },
      { f: 147, d: .16, type: 'sawtooth', v: .1, at: .09 }
    ],
    over: [
      { f: 523, d: .12, type: 'triangle', v: .14 },
      { f: 392, d: .14, type: 'triangle', v: .13, at: .11 },
      { f: 262, d: .3, type: 'triangle', v: .12, at: .25 }
    ],
    win: [
      { f: 659, d: .1, type: 'triangle', v: .14 },
      { f: 880, d: .1, type: 'triangle', v: .13, at: .1 },
      { f: 1319, d: .18, type: 'triangle', v: .12, at: .2 }
    ],
    tick: [{ f: 1100, d: .03, type: 'sine', v: .06 }]
  };

  MG.audio = {
    isOn: function () { return MG.store.data.sound; },

    setOn: function (on) {
      MG.store.data.sound = !!on;
      MG.store.save();
      if (on) {
        var ctx = audioCtx();
        if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (err) {} }
      }
    },

    play: function (name) {
      if (!MG.store.data.sound) return;
      var notes = SFX[name];
      if (!notes) return;
      var ctx = audioCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch (err) {} }
      var t0 = ctx.currentTime;
      for (var i = 0; i < notes.length; i++) {
        var n = notes[i];
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        var start = t0 + (n.at || 0);
        osc.type = n.type || 'sine';
        osc.frequency.setValueAtTime(n.f, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(n.v || .1, start + .012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + (n.d || .1));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + (n.d || .1) + .02);
      }
    }
  };

  /* ----------------------------------------------------------- 游戏注册表 */

  MG.games = [];

  /**
   * 注册一个游戏。字段说明见 README。
   * mount(stage, host) 必须返回 { start, pause, resume, destroy }（可缺省）。
   */
  MG.register = function (def) {
    if (!def || !def.id) throw new Error('游戏缺少 id');
    if (MG.gameById(def.id)) throw new Error('游戏 id 重复：' + def.id);
    MG.games.push(def);
    return def;
  };

  MG.gameById = function (id) {
    for (var i = 0; i < MG.games.length; i++) {
      if (MG.games[i].id === id) return MG.games[i];
    }
    return null;
  };

  /* --------------------------------------------------------------- 提示条 */

  var toastTimer = 0;
  MG.toast = function (msg, ms) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, ms || 1800);
  };

  /* 供自测页使用的最小导出信息 */
  MG.version = '1.0.0';

})(window);
