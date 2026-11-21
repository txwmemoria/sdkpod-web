/* =========================================================================
   小游戏 · 菜园守卫
   虫子们沿着田间小路去偷吃白菜。在路边摆上帮手，把它们「劝走」——不打不杀，
   被赶走的虫子会晃晃悠悠地飘走。四块地可选，闯关 12 波或无尽模式。
   下一波什么时候来由你决定，不催。
   竖着拿手机时整张地图转 90°，格子更大更好点。
   声音全是现场合成的（WebAudio），背景音乐是一段随机生成的田园小调。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var WAVES = 12;
  var CABBAGES = 10;
  var START_SEEDS = 80;
  var COLS0 = 16, ROWS0 = 10;
  var PREF_KEY = 'mg.gd';
  var TAU = Math.PI * 2;
  var FONT = '-apple-system,"Segoe UI","Microsoft YaHei",system-ui';

  /* ------------------------------------------------------------ 地图 */
  /* 横版坐标（格子）。route 是拐角，最后一段走进菜畦；菜畦 2×3 格 */
  var MAPS = [
    { id: 'ridge', routes: [[[-1, 1], [4, 1], [4, 6], [1, 6], [1, 8], [8, 8], [8, 3], [12, 3], [12, 7], [14.2, 7]]],
      patch: { c: 14, r: 6 }, trees: [], rocks: [[6, 5], [10, 1], [2, 3], [14, 1]] },
    { id: 'creek', routes: [[[-1, 7], [3, 7], [3, 2], [7, 2], [7, 7], [11, 7], [11, 2], [14.2, 2]]],
      patch: { c: 14, r: 1 }, creek: 9, trees: [[1, 4], [13, 8]], rocks: [[5, 5], [15, 6]] },
    { id: 'orchard', routes: [[[-1, 1], [14, 1], [14, 8], [2, 8], [2, 5], [10.2, 5]]],
      patch: { c: 10, r: 4 }, trees: [[5, 3], [8, 3], [12, 6], [6, 6], [0, 4], [12, 3]], rocks: [[15, 4]] },
    { id: 'fork', routes: [[[-1, 2], [6, 2], [6, 5], [14.2, 5]], [[3, 11], [3, 8], [9, 8], [9, 5], [14.2, 5]]],
      patch: { c: 14, r: 4 }, trees: [[11, 8], [1, 5], [12, 1]], rocks: [[8, 3]] }
  ];

  /* ------------------------------------------------------------ 虫子 */
  var PESTS = {
    aphid: { hp: 3, speed: 1.5, seeds: 2, size: 0.56, art: 'aphid', cost: 1, gap: 0.42 },
    caterpillar: { hp: 8, speed: 0.95, seeds: 4, size: 0.86, art: 'caterpillar', cost: 2, gap: 1.0 },
    snail: { hp: 24, speed: 0.5, seeds: 9, size: 0.92, art: 'snail', cost: 5, gap: 1.6 },
    beetle: { hp: 15, speed: 0.78, seeds: 7, size: 0.84, art: 'beetle', cost: 4, gap: 1.2, armor: 2 },
    moth: { hp: 7, speed: 1.25, seeds: 5, size: 0.78, art: 'moth', cost: 3, gap: 0.8, fly: true },
    mole: { hp: 16, speed: 0.9, seeds: 8, size: 0.86, art: 'mole', cost: 4, gap: 1.2, dig: true },
    crow: { hp: 75, speed: 0.58, seeds: 40, size: 1.25, art: 'crow', cost: 0, gap: 2.6, fly: true, boss: true, bite: 2 }
  };
  /* 第几波第一次出现 */
  var INTRO = { caterpillar: 1, aphid: 2, snail: 4, crow: 5, beetle: 6, moth: 7, mole: 9 };

  /* ------------------------------------------------------------ 帮手 */
  var TOWERS = {
    ladybug: { cost: 20, art: 'td_ladybug', dmg: [2, 3, 5], range: [2.3, 2.6, 2.9], cd: [0.8, 0.68, 0.56], kb: 0.06 },
    scarecrow: { cost: 25, art: 'td_scarecrow', slow: [0.4, 0.5, 0.6], range: [1.7, 2.0, 2.3] },
    can: { cost: 35, art: 'td_can', dmg: [2, 3, 4], range: [1.5, 1.75, 2.0], cd: [1.5, 1.35, 1.2], kb: 0.04 },
    hive: { cost: 40, art: 'td_hive', dmg: [2, 3, 4], range: [2.2, 2.4, 2.6], cd: [1.3, 1.15, 1.0], chain: [3, 4, 5] },
    frog: { cost: 45, art: 'td_frog', dmg: [9, 14, 22], range: [3.0, 3.4, 3.8], cd: [2.1, 1.9, 1.7], kb: 0.14 },
    sunflower: { cost: 30, art: 'sunflower', gift: [2, 3, 4], every: 9, bonus: [4, 7, 10] }
  };
  var TOWER_KEYS = ['ladybug', 'scarecrow', 'can', 'hive', 'frog', 'sunflower'];

  function upCost(t) { return TOWERS[t.type].cost * t.lv; }
  function refund(t) { return Math.floor(t.spent * 0.7); }

  /* 第 n 波出场名单：按预算随机凑几组（今日挑战下随机数是固定种子），逢 5 来乌鸦 */
  function waveList(n) {
    var pool = [];
    for (var k in INTRO) if (k !== 'crow' && n >= INTRO[k]) pool.push(k);
    var budget = 4 + n * 4 + Math.floor(n * n * 0.2);
    var out = [];
    var fresh = null;
    for (var f in INTRO) if (INTRO[f] === n && f !== 'crow') fresh = f;
    while (budget > 0) {
      var kind = fresh || MG.pick(pool);
      fresh = null;
      var c = PESTS[kind].cost;
      var size = c <= 1 ? MG.randInt(4, 6) : c <= 3 ? MG.randInt(2, 3) : MG.randInt(1, 2);
      for (var i = 0; i < size && budget > 0; i++) {
        out.push({ k: kind, gap: PESTS[kind].gap });
        budget -= c;
      }
      out[out.length - 1].gap += 0.9;
    }
    if (n % 5 === 0) {
      for (var b = 0; b < Math.floor(n / 5); b++) out.push({ k: 'crow', gap: PESTS.crow.gap });
    }
    return out;
  }

  function loadPref() {
    try { return JSON.parse(w.localStorage.getItem(PREF_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function savePref(p) {
    try { w.localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (e) {}
  }

  /* ================================================================ 声音 */
  /* 音效：现场合成，短、软、限频，避免一群蚜虫时吵成一锅粥 */
  var noiseBuf = null;
  var lastAt = {};
  function noise(ctx) {
    if (noiseBuf) return noiseBuf;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(ctx, out, type, f0, f1, t, dur, peak, filter) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.006, peak, dur);
    var node = o;
    if (filter) {
      var fl = ctx.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = filter;
      o.connect(fl);
      node = fl;
    }
    node.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function hiss(ctx, out, type, freq, t, dur, peak, q) {
    var s = ctx.createBufferSource();
    s.buffer = noise(ctx);
    var fl = ctx.createBiquadFilter();
    fl.type = type;
    fl.frequency.setValueAtTime(freq, t);
    if (q) fl.Q.value = q;
    var g = ctx.createGain();
    env(g, t, 0.005, peak, dur);
    s.connect(fl); fl.connect(g); g.connect(out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
    return fl;
  }

  var GAP = { pop: 0.05, splash: 0.12, ribbit: 0.15, buzz: 0.12, shoo: 0.06, seed: 0.07, nibble: 0.2, wave: 0.5, caw: 0.6, place: 0.08, dig: 0.3 };
  function sfx(name) {
    var ctx = MG.audio.ctx && MG.audio.ctx();
    if (!ctx) return;
    var now = ctx.currentTime;
    if (lastAt[name] && now - lastAt[name] < (GAP[name] || 0.05)) return;
    lastAt[name] = now;
    var out = ctx.destination;
    var t = now + 0.005;
    switch (name) {
      case 'pop': tone(ctx, out, 'sine', 620, 190, t, 0.1, 0.11); break;
      case 'splash':
        hiss(ctx, out, 'bandpass', 1500, t, 0.24, 0.07, 0.8);
        tone(ctx, out, 'sine', 900, 1300, t + 0.02, 0.06, 0.025);
        break;
      case 'ribbit':
        tone(ctx, out, 'square', 190, 120, t, 0.07, 0.045, 900);
        tone(ctx, out, 'square', 170, 110, t + 0.1, 0.08, 0.04, 900);
        break;
      case 'buzz': tone(ctx, out, 'sawtooth', 250, 210, t, 0.2, 0.03, 1100); break;
      case 'shoo':
        var fl = hiss(ctx, out, 'highpass', 700, t, 0.2, 0.04);
        fl.frequency.exponentialRampToValueAtTime(3200, t + 0.2);
        tone(ctx, out, 'triangle', 880, 1320, t + 0.03, 0.12, 0.035);
        break;
      case 'seed': tone(ctx, out, 'triangle', 1568, 1568, t, 0.08, 0.03); break;
      case 'nibble':
        for (var i = 0; i < 3; i++) hiss(ctx, out, 'lowpass', 1000, t + i * 0.07, 0.04, 0.12);
        break;
      case 'wave':
        tone(ctx, out, 'triangle', 392, 392, t, 0.22, 0.06);
        tone(ctx, out, 'triangle', 523, 523, t + 0.18, 0.3, 0.06);
        break;
      case 'caw':
        tone(ctx, out, 'sawtooth', 640, 380, t, 0.2, 0.05, 1600);
        tone(ctx, out, 'sawtooth', 600, 360, t + 0.26, 0.2, 0.045, 1600);
        break;
      case 'place':
        tone(ctx, out, 'sine', 170, 90, t, 0.14, 0.14);
        hiss(ctx, out, 'lowpass', 1800, t, 0.05, 0.05);
        break;
      case 'dig': hiss(ctx, out, 'lowpass', 600, t, 0.18, 0.08); break;
    }
  }

  /* 背景音乐：76 BPM、五声音阶的随机小调。和弦 I–vi–IV–V，低音 + 柔和的铺底 + 八音盒旋律，
     来虫子的时候多一层沙锤。总音量很低，跟音效一样受全站静音开关控制。 */
  function Music() {
    var ctx = null, master = null, timer = 0, nextT = 0, step = 0, busy = false, mel = 7;
    var EIGHTH = 60 / 76 / 2;
    var CH = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]];
    var SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    function hz(semi, base) { return base * Math.pow(2, semi / 12); }
    function note(type, f, t, dur, peak, att) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + (att || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    }
    function schedule(i, t) {
      var bar = Math.floor(i / 8) % 4, beat = i % 8;
      var ch = CH[bar];
      if (beat === 0) {
        note('sine', hz(ch[0], 130.81), t, EIGHTH * 3.5, 0.09, 0.02);
        ch.forEach(function (s) { note('sine', hz(s + 12, 130.81), t, EIGHTH * 8, 0.018, 0.4); });
      }
      if (beat === 4) note('sine', hz(ch[0] + 7, 130.81), t, EIGHTH * 3, 0.06, 0.02);
      /* 旋律：在音阶上小步游走，强拍落在和弦音上 */
      if (Math.random() < (beat % 2 ? 0.45 : 0.75)) {
        mel = MG.clamp(mel + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)], 0, SCALE.length - 1);
        var semi = SCALE[mel];
        if (beat === 0) {
          semi = ch[Math.floor(Math.random() * 3)] + 12;
          while (semi < 0) semi += 12;
        }
        var f = hz(semi, 523.25);
        note('triangle', f, t, EIGHTH * 1.8, 0.035);
        note('sine', f * 2, t, EIGHTH * 1.2, 0.012);
      }
      if (busy && beat % 2 === 1) {
        var s = ctx.createBufferSource();
        s.buffer = noise(ctx);
        var fl = ctx.createBiquadFilter();
        fl.type = 'highpass'; fl.frequency.value = 6500;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.022, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        s.connect(fl); fl.connect(g); g.connect(master);
        s.start(t, Math.random() * 0.5); s.stop(t + 0.06);
      }
    }
    function tick() {
      if (!ctx || !master || !MG.audio.isOn()) { stop(); return; }
      while (nextT < ctx.currentTime + 0.35) { schedule(step, nextT); nextT += EIGHTH; step++; }
    }
    function start() {
      if (timer) return;
      ctx = MG.audio.ctx && MG.audio.ctx();
      if (!ctx) return;
      master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.7, ctx.currentTime + 1.5);
      master.connect(ctx.destination);
      nextT = ctx.currentTime + 0.1;
      step = 0;
      timer = setInterval(tick, 120);
      tick();
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = 0;
      if (ctx && master) {
        var m = master;
        try {
          m.gain.cancelScheduledValues(ctx.currentTime);
          m.gain.setValueAtTime(Math.max(0.0001, m.gain.value), ctx.currentTime);
          m.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        } catch (e) {}
        setTimeout(function () { try { m.disconnect(); } catch (e) {} }, 700);
      }
      master = null;
    }
    return { start: start, stop: stop, on: function () { return !!timer; }, busy: function (b) { busy = b; } };
  }

  /* ================================================================ 游戏 */
  MG.register({
    id: 'garden',
    name: '菜园守卫',
    icon: '🥬',
    accent: '#7fae73',
    tagline: '虫子们排着队来偷白菜。在小路边摆上瓢虫、稻草人、蜂箱和青蛙，把它们劝回去。',
    tags: ['策略', '塔防', '无尽'],
    duration: '约 10 分钟',
    howto: '先挑一块地和模式。从下方选一样帮手，点路边的草地放下；点已放下的帮手可以升级或收回。赶走虫子得种子。准备好了再放下一波，不催你。',
    controls: [['1–6', '选帮手'], ['点草地', '放下'], ['点帮手', '升级 · 收回'], ['N', '下一波'], ['F', '加速'], ['M', '音乐']],

    mount: function (stage, host) {
      stage.textContent = '';
      var field = MG.h('div', 'gd-field');
      var canvas = document.createElement('canvas');
      field.appendChild(canvas);
      stage.appendChild(field);
      var bar = MG.h('div', 'gd-bar');
      stage.appendChild(bar);
      var pickEl = MG.h('div', 'gd-pick');
      pickEl.hidden = true;
      stage.appendChild(pickEl);

      var pref = loadPref();
      if (!pref.best) pref.best = {};
      if (pref.music === undefined) pref.music = true;
      var mapId = pref.map && MAPS.some(function (m) { return m.id === pref.map; }) ? pref.map : 'ridge';
      var mode = pref.mode === 'endless' ? 'endless' : 'classic';
      var music = Music();

      /* -------------------------------------------------- 几何 */
      var tall = null, COLS, ROWS, routes, patch, onPath, blocked, cabbageSpots, map, creekCells, trees, rocks;
      var view = null, cs = 1, ox = 0, oy = 0, bg = null, bgKey = '';
      var spr = {};
      function T(p) { return tall ? [p[1], p[0]] : [p[0], p[1]]; }
      function geometry(force) {
        var rect = stage.getBoundingClientRect();
        var t = rect.width > 0 ? rect.height > rect.width * 1.05 : !!(w.matchMedia && w.matchMedia('(max-width: 620px)').matches);
        if (t === tall && !force) return;
        tall = t;
        map = MAPS.filter(function (m) { return m.id === mapId; })[0];
        COLS = tall ? ROWS0 : COLS0;
        ROWS = tall ? COLS0 : ROWS0;
        var pc = T([map.patch.c, map.patch.r]);
        patch = tall ? { c: pc[0], r: pc[1], w: 3, h: 2 } : { c: pc[0], r: pc[1], w: 2, h: 3 };
        onPath = {};
        blocked = {};
        routes = map.routes.map(function (pts0) {
          var pts = pts0.map(T);
          var segs = [], L = 0;
          for (var i = 0; i < pts.length - 1; i++) {
            var a = pts[i], b = pts[i + 1];
            var len = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
            segs.push({ a: a, b: b, at: L, len: len, dx: Math.sign(b[0] - a[0]), dy: Math.sign(b[1] - a[1]) });
            L += len;
            for (var s = 0; s <= Math.ceil(len); s++) {
              var k = Math.min(1, s / len);
              onPath[Math.round(a[0] + (b[0] - a[0]) * k) + ',' + Math.round(a[1] + (b[1] - a[1]) * k)] = 1;
            }
          }
          return { pts: pts, segs: segs, L: L };
        });
        creekCells = [];
        if (map.creek !== undefined) {
          for (var r = 0; r < ROWS0; r++) {
            var cc = T([map.creek, r]);
            creekCells.push(cc);
            blocked[cc[0] + ',' + cc[1]] = 1;
          }
        }
        trees = map.trees.map(T);
        trees.forEach(function (p) { blocked[p[0] + ',' + p[1]] = 1; });
        rocks = (map.rocks || []).map(T);
        cabbageSpots = [];
        for (var q = 0; q < CABBAGES; q++) {
          var u = q % 2, v = Math.floor(q / 2);
          if (tall) cabbageSpots.push({ x: patch.c + 0.34 + v * (patch.w - 0.68) / 4, y: patch.r + 0.5 + u });
          else cabbageSpots.push({ x: patch.c + 0.5 + u, y: patch.r + 0.34 + v * (patch.h - 0.68) / 4 });
        }
        bg = null;
      }

      function posAt(route, d) {
        var segs = route.segs;
        for (var i = 0; i < segs.length; i++) {
          var s = segs[i];
          if (d <= s.at + s.len || i === segs.length - 1) {
            var t = MG.clamp((d - s.at) / s.len, 0, 1);
            return { x: s.a[0] + (s.b[0] - s.a[0]) * t + 0.5, y: s.a[1] + (s.b[1] - s.a[1]) * t + 0.5, dx: s.dx, dy: s.dy };
          }
        }
        return { x: 0, y: 0, dx: 1, dy: 0 };
      }
      function inPatch(c, r) { return c >= patch.c && c < patch.c + patch.w && r >= patch.r && r < patch.r + patch.h; }
      function buildable(c, r) {
        return c >= 0 && r >= 0 && c < COLS && r < ROWS && !onPath[c + ',' + r] && !blocked[c + ',' + r] && !inPatch(c, r) && !towerAt(c, r);
      }

      /* -------------------------------------------------- 状态 */
      var S;
      function fresh() {
        S = {
          phase: 'pick', running: false, over: false,
          wave: 0, queue: [], spawnT: 0, spawnN: 0, hpMul: 1, waveDone: true,
          seeds: START_SEEDS, cabbages: CABBAGES, bitten: [],
          score: 0, shooed: 0,
          pests: [], towers: [], shots: [], rings: [], parts: [], texts: [], coins: [],
          armed: null, sel: null, hover: null, banner: null,
          speed: 1, last: 0, t: 0, dirty: true, skip: 0,
          flies: [], clouds: []
        };
        for (var i = 0; i < 3; i++) S.flies.push({ x: 2 + i * 5, y: 2 + i * 2.5, tx: 0, ty: 0, ph: i * 2, dir: 1, hue: ['#f2c3a7', '#cfd9f0', '#f3e1a0'][i] });
        S.clouds = [{ x: -3, y: 2.5, r: 3.2, v: 0.12 }, { x: 8, y: 7, r: 2.6, v: 0.09 }];
      }
      fresh();

      function towerAt(c, r) {
        for (var i = 0; i < S.towers.length; i++) if (S.towers[i].c === c && S.towers[i].r === r) return S.towers[i];
        return null;
      }

      /* -------------------------------------------------- 画布 */
      function layout() {
        view = MG.fitCanvas(canvas);
        cs = Math.min(view.w / COLS, view.h / ROWS);
        ox = (view.w - cs * COLS) / 2;
        oy = (view.h - cs * ROWS) / 2;
        spr = {};
        bg = null;
        S.dirty = true;
      }
      function X(x) { return ox + x * cs; }
      function Y(y) { return oy + y * cs; }

      function sprite(name, px, tint) {
        px = Math.max(8, Math.round(px));
        var key = name + '@' + px + (tint ? '!' : '');
        if (spr[key]) return spr[key];
        var img = MG.art.image(name);
        if (!img.complete || !img.naturalWidth) return null;
        var dpr = Math.min(w.devicePixelRatio || 1, 2);
        var c = document.createElement('canvas');
        c.width = c.height = Math.round(px * dpr);
        var g = c.getContext('2d');
        g.drawImage(img, 0, 0, c.width, c.height);
        if (tint) {
          g.globalCompositeOperation = 'source-atop';
          g.fillStyle = 'rgba(255,255,255,.85)';
          g.fillRect(0, 0, c.width, c.height);
        }
        spr[key] = c;
        return c;
      }

      /* (x, y) 是贴图中心（格子坐标）；缩放以贴图底边为支点，挤压拉伸时脚不离地 */
      function drawSprite(ctx, name, x, y, size, o) {
        o = o || {};
        var px = size * cs;
        var c = sprite(name, px);
        if (!c) return;
        ctx.save();
        ctx.translate(X(x), Y(y) + px / 2);
        if (o.rot) ctx.rotate(o.rot);
        ctx.scale((o.flip ? -1 : 1) * (o.sx || 1), o.sy || 1);
        var a = o.alpha === undefined ? 1 : o.alpha;
        ctx.globalAlpha = a;
        ctx.drawImage(c, -px / 2, -px, px, px);
        if (o.flash) {
          var ct = sprite(name, px, true);
          if (ct) { ctx.globalAlpha = a * o.flash; ctx.drawImage(ct, -px / 2, -px, px, px); }
        }
        ctx.restore();
      }

      function palette() {
        return MG.theme.dark ? {
          grass: '#3b4a3b', grassA: '#425241', grassB: '#354334', blade: 'rgba(150,190,140,.22)',
          dirt: '#6b5a45', dirtEdge: '#54463a', dirtIn: '#77654e', rut: 'rgba(40,30,20,.25)', pebble: '#8a7a66',
          soil: '#5a4838', soilRow: '#4a3a2e', fence: '#8a7058', water: '#4b6a78', waterHi: 'rgba(200,230,240,.25)',
          tree: '#4f6b4c', treeHi: '#5e7c5a', trunk: '#6b5545', rock: '#77736a', tuft: 'rgba(140,180,120,.45)',
          flower: ['#c9a5a0', '#d6c38d', '#a9b8cf'], ring: 'rgba(160,200,230,.6)', hole: '#2a2420',
          range: 'rgba(230,240,220,.10)', rangeLine: 'rgba(230,240,220,.38)', bad: 'rgba(220,130,120,.18)', grid: 'rgba(230,240,220,.12)',
          shadow: 'rgba(0,0,0,.25)', cloud: 'rgba(0,0,0,.10)', text: '#e3ecd9', pill: 'rgba(30,36,30,.85)', dust: '#7a6a55', puff: '#c9d2c4'
        } : {
          grass: '#cde2b6', grassA: '#d6e8c0', grassB: '#c2daa9', blade: 'rgba(90,130,70,.22)',
          dirt: '#e2c99b', dirtEdge: '#c9ab7c', dirtIn: '#ecd8b0', rut: 'rgba(150,115,75,.22)', pebble: '#b7a68d',
          soil: '#c49c76', soilRow: '#ad8662', fence: '#a8805c', water: '#9fc9d9', waterHi: 'rgba(255,255,255,.55)',
          tree: '#8fbf7f', treeHi: '#a9d293', trunk: '#9a7356', rock: '#bdb5a7', tuft: 'rgba(110,150,90,.55)',
          flower: ['#e8a7a0', '#f0cf7a', '#a9c3e0'], ring: 'rgba(100,155,200,.65)', hole: '#5e4a3a',
          range: 'rgba(90,120,80,.10)', rangeLine: 'rgba(90,120,80,.42)', bad: 'rgba(210,110,100,.16)', grid: 'rgba(80,110,70,.13)',
          shadow: 'rgba(60,50,40,.16)', cloud: 'rgba(40,70,40,.06)', text: '#4d5f45', pill: 'rgba(255,253,246,.94)', dust: '#d8c4a0', puff: '#ffffff'
        };
      }

      /* 静态底图：草地、泥土路、小溪、桥、树、石头、菜畦。尺寸 / 主题 / 地图变了才重画 */
      function buildBg() {
        var key = view.w + 'x' + view.h + (MG.theme.dark ? 'd' : 'l') + mapId + tall;
        if (bg && bgKey === key) return;
        bgKey = key;
        var P = palette();
        var dpr = Math.min(w.devicePixelRatio || 1, 2);
        bg = document.createElement('canvas');
        bg.width = Math.round(view.w * dpr);
        bg.height = Math.round(view.h * dpr);
        var c = bg.getContext('2d');
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.translate(ox, oy);
        var W = COLS * cs, H = ROWS * cs;
        var seed = 11 + MAPS.indexOf(map) * 97;
        function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
        var i, k;

        c.save();
        MG.roundRect(c, 0, 0, W, H, cs * 0.4);
        c.clip();
        c.fillStyle = P.grass;
        c.fillRect(0, 0, W, H);
        /* 草地上大块的深浅斑 */
        c.globalAlpha = 0.7;
        for (i = 0; i < COLS * ROWS * 0.35; i++) {
          c.fillStyle = rnd() < 0.5 ? P.grassA : P.grassB;
          c.beginPath();
          c.ellipse(rnd() * W, rnd() * H, cs * (0.6 + rnd() * 1.2), cs * (0.4 + rnd() * 0.8), rnd() * 3, 0, TAU);
          c.fill();
        }
        c.globalAlpha = 1;
        /* 草叶 */
        c.strokeStyle = P.blade;
        c.lineWidth = Math.max(1, cs * 0.025);
        c.lineCap = 'round';
        c.beginPath();
        for (i = 0; i < COLS * ROWS * 2.2; i++) {
          var gx = rnd() * W, gy = rnd() * H;
          c.moveTo(gx, gy); c.lineTo(gx - cs * 0.04, gy - cs * 0.12);
          c.moveTo(gx, gy); c.lineTo(gx + cs * 0.05, gy - cs * 0.1);
        }
        c.stroke();
        /* 小花 */
        for (i = 0; i < COLS * ROWS * 0.12; i++) {
          var fx = rnd() * COLS, fy = rnd() * ROWS;
          var fc = P.flower[Math.floor(rnd() * 3)];
          if (onPath[Math.floor(fx) + ',' + Math.floor(fy)] || blocked[Math.floor(fx) + ',' + Math.floor(fy)]) continue;
          c.fillStyle = fc;
          for (k = 0; k < 5; k++) {
            c.beginPath();
            c.arc(fx * cs + Math.cos(k * 1.26) * cs * 0.055, fy * cs + Math.sin(k * 1.26) * cs * 0.055, cs * 0.04, 0, TAU);
            c.fill();
          }
          c.fillStyle = '#f6e6a8';
          c.beginPath(); c.arc(fx * cs, fy * cs, cs * 0.03, 0, TAU); c.fill();
        }

        /* 小溪：一条弯弯的水带 */
        if (creekCells.length) {
          c.lineCap = 'round';
          c.lineJoin = 'round';
          var creekLine = function (width, color) {
            c.strokeStyle = color;
            c.lineWidth = width;
            c.beginPath();
            for (var j = -1; j <= ROWS0; j += 0.25) {
              var wob = Math.sin(j * 1.3) * cs * 0.14;
              var along = (j + 0.5) * cs, across = (map.creek + 0.5) * cs + wob;
              var px2 = tall ? along : across, py2 = tall ? across : along;
              if (j === -1) c.moveTo(px2, py2); else c.lineTo(px2, py2);
            }
            c.stroke();
          };
          creekLine(cs * 0.95, P.dirtEdge);
          creekLine(cs * 0.82, P.water);
          creekLine(cs * 0.3, P.waterHi);
        }

        /* 泥土路：沿路线密密地点一串大小不一的圆，边缘自然起伏 */
        routes.forEach(function (rt) {
          var pts = [];
          rt.segs.forEach(function (s) {
            for (var d = 0; d < s.len; d += 0.12) pts.push({ x: s.a[0] + s.dx * d + 0.5, y: s.a[1] + s.dy * d + 0.5, dx: s.dx, dy: s.dy });
          });
          var last = rt.segs[rt.segs.length - 1];
          pts.push({ x: last.b[0] + 0.5, y: last.b[1] + 0.5, dx: last.dx, dy: last.dy });
          rt.dots = pts;
        });
        function road(rad, jitter, color) {
          c.fillStyle = color;
          routes.forEach(function (rt) {
            rt.dots.forEach(function (p) {
              c.beginPath();
              c.arc(p.x * cs + (rnd() - 0.5) * jitter * cs, p.y * cs + (rnd() - 0.5) * jitter * cs, (rad + (rnd() - 0.5) * jitter) * cs, 0, TAU);
              c.fill();
            });
          });
        }
        road(0.47, 0.08, P.dirtEdge);
        road(0.41, 0.07, P.dirt);
        road(0.23, 0.1, P.dirtIn);
        /* 车辙 */
        c.strokeStyle = P.rut;
        c.lineWidth = Math.max(1, cs * 0.035);
        routes.forEach(function (rt) {
          [-0.17, 0.17].forEach(function (off) {
            c.beginPath();
            rt.dots.forEach(function (p, j) {
              var x = (p.x - p.dy * off) * cs, y = (p.y + p.dx * off) * cs;
              if (j) c.lineTo(x, y); else c.moveTo(x, y);
            });
            c.stroke();
          });
        });
        /* 小石子与泥点 */
        routes.forEach(function (rt) {
          rt.dots.forEach(function (p) {
            if (rnd() < 0.35) {
              c.fillStyle = rnd() < 0.5 ? P.pebble : P.dirtEdge;
              c.beginPath();
              c.ellipse(p.x * cs + (rnd() - 0.5) * cs * 0.6, p.y * cs + (rnd() - 0.5) * cs * 0.6, cs * (0.02 + rnd() * 0.03), cs * (0.015 + rnd() * 0.02), rnd() * 3, 0, TAU);
              c.fill();
            }
          });
        });
        /* 路边草簇 */
        c.strokeStyle = P.tuft;
        c.lineWidth = Math.max(1, cs * 0.03);
        c.beginPath();
        routes.forEach(function (rt) {
          rt.dots.forEach(function (p) {
            if (rnd() < 0.2) {
              var side = rnd() < 0.5 ? -1 : 1;
              var tx = (p.x - p.dy * 0.48 * side) * cs, ty = (p.y + p.dx * 0.48 * side) * cs;
              for (var b = -1; b <= 1; b++) { c.moveTo(tx, ty); c.lineTo(tx + b * cs * 0.06, ty - cs * (0.12 + rnd() * 0.06)); }
            }
          });
        });
        c.stroke();

        /* 桥：路和小溪交叉的地方铺木板 */
        creekCells.forEach(function (cc) {
          if (!onPath[cc[0] + ',' + cc[1]]) return;
          var bx = cc[0] * cs, by = cc[1] * cs;
          c.fillStyle = P.fence;
          for (var pl = 0; pl < 5; pl++) {
            if (!tall) MG.roundRect(c, bx - cs * 0.08, by + cs * (0.06 + pl * 0.18), cs * 1.16, cs * 0.15, cs * 0.04);
            else MG.roundRect(c, bx + cs * (0.06 + pl * 0.18), by - cs * 0.08, cs * 0.15, cs * 1.16, cs * 0.04);
            c.fill();
          }
          c.strokeStyle = 'rgba(70,50,35,.4)';
          c.lineWidth = 2;
          c.beginPath();
          if (!tall) { c.moveTo(bx - cs * 0.08, by + cs * 0.04); c.lineTo(bx + cs * 1.08, by + cs * 0.04); c.moveTo(bx - cs * 0.08, by + cs * 0.96); c.lineTo(bx + cs * 1.08, by + cs * 0.96); }
          else { c.moveTo(bx + cs * 0.04, by - cs * 0.08); c.lineTo(bx + cs * 0.04, by + cs * 1.08); c.moveTo(bx + cs * 0.96, by - cs * 0.08); c.lineTo(bx + cs * 0.96, by + cs * 1.08); }
          c.stroke();
        });

        /* 虫子的老窝：每条路入口处一个土洞 */
        routes.forEach(function (rt) {
          var a = rt.pts[0], b = rt.pts[1];
          var ex = MG.clamp(a[0], 0, COLS - 1) + 0.5, ey = MG.clamp(a[1], 0, ROWS - 1) + 0.5;
          if (a[0] < 0 || a[0] >= COLS) ey = b[1] + 0.5;
          if (a[1] < 0 || a[1] >= ROWS) ex = b[0] + 0.5;
          c.fillStyle = P.dirtEdge;
          c.beginPath(); c.ellipse(ex * cs, ey * cs, cs * 0.44, cs * 0.32, 0, 0, TAU); c.fill();
          c.fillStyle = P.hole;
          c.beginPath(); c.ellipse(ex * cs, ey * cs + cs * 0.03, cs * 0.28, cs * 0.18, 0, 0, TAU); c.fill();
        });

        /* 石头 */
        rocks.forEach(function (p) {
          if (onPath[p[0] + ',' + p[1]]) return;
          var rx = (p[0] + 0.5) * cs, ry = (p[1] + 0.6) * cs;
          c.fillStyle = P.shadow;
          c.beginPath(); c.ellipse(rx, ry + cs * 0.1, cs * 0.24, cs * 0.07, 0, 0, TAU); c.fill();
          c.fillStyle = P.rock;
          c.beginPath(); c.ellipse(rx, ry, cs * 0.22, cs * 0.15, 0, 0, TAU); c.fill();
          c.fillStyle = 'rgba(255,255,255,.3)';
          c.beginPath(); c.ellipse(rx - cs * 0.06, ry - cs * 0.05, cs * 0.08, cs * 0.04, -0.3, 0, TAU); c.fill();
        });

        /* 菜畦 */
        var px0 = patch.c * cs, py0 = patch.r * cs, pw = patch.w * cs, ph = patch.h * cs;
        c.fillStyle = P.soil;
        MG.roundRect(c, px0 + 4, py0 + 4, pw - 8, ph - 8, cs * 0.25);
        c.fill();
        c.strokeStyle = P.soilRow;
        c.lineWidth = 2;
        var nrow = tall ? patch.w * 2 : patch.h * 2;
        for (var j = 1; j < nrow; j++) {
          c.beginPath();
          if (tall) { var xx = px0 + (j / nrow) * pw; c.moveTo(xx, py0 + 10); c.lineTo(xx, py0 + ph - 10); }
          else { var yy = py0 + (j / nrow) * ph; c.moveTo(px0 + 10, yy); c.lineTo(px0 + pw - 10, yy); }
          c.stroke();
        }

        /* 树 */
        trees.forEach(function (p) {
          var tx = (p[0] + 0.5) * cs, ty = (p[1] + 0.5) * cs;
          c.fillStyle = P.shadow;
          c.beginPath(); c.ellipse(tx + cs * 0.06, ty + cs * 0.38, cs * 0.42, cs * 0.12, 0, 0, TAU); c.fill();
          c.fillStyle = P.trunk;
          MG.roundRect(c, tx - cs * 0.06, ty, cs * 0.12, cs * 0.4, cs * 0.04);
          c.fill();
          c.fillStyle = P.tree;
          [[0, -0.12, 0.36], [-0.2, 0.02, 0.26], [0.2, 0.02, 0.26]].forEach(function (b) {
            c.beginPath(); c.arc(tx + b[0] * cs, ty + b[1] * cs, b[2] * cs, 0, TAU); c.fill();
          });
          c.fillStyle = P.treeHi;
          c.beginPath(); c.arc(tx - cs * 0.1, ty - cs * 0.22, cs * 0.14, 0, TAU); c.fill();
          if (mapId === 'orchard') {
            c.fillStyle = '#e08f7f';
            [[0.14, -0.05], [-0.18, 0.08], [0.02, 0.1], [0.2, 0.12]].forEach(function (f) {
              c.beginPath(); c.arc(tx + f[0] * cs, ty + f[1] * cs, cs * 0.05, 0, TAU); c.fill();
            });
          }
        });
        c.restore();
      }

      /* 篱笆：压在白菜上面一层；路进来的那边留个口子 */
      function drawFence(ctx) {
        var P = palette();
        var x0 = X(patch.c) + 3, y0 = Y(patch.r) + 3, x1 = X(patch.c + patch.w) - 3, y1 = Y(patch.r + patch.h) - 3;
        var ls = routes[0].segs[routes[0].segs.length - 1];
        var gapSide = ls.dx > 0 ? 'l' : ls.dx < 0 ? 'r' : ls.dy > 0 ? 't' : 'b';
        var vertical = gapSide === 'l' || gapSide === 'r';
        var mid = vertical ? Y(ls.b[1] + 0.5) : X(ls.b[0] + 0.5);
        var gap = cs * 0.42;
        ctx.save();
        ctx.strokeStyle = P.fence;
        ctx.lineWidth = Math.max(1.5, cs * 0.045);
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.9;
        function rail(side, ax, ay, bx, by) {
          [-0.06, 0.04].forEach(function (off) {
            var o = off * cs;
            ctx.beginPath();
            if (side === 'l' || side === 'r') {
              if (side === gapSide) { ctx.moveTo(ax, ay + o); ctx.lineTo(ax, mid - gap + o); ctx.moveTo(ax, mid + gap + o); ctx.lineTo(bx, by + o); }
              else { ctx.moveTo(ax, ay + o); ctx.lineTo(bx, by + o); }
            } else {
              if (side === gapSide) { ctx.moveTo(ax, ay + o); ctx.lineTo(mid - gap, ay + o); ctx.moveTo(mid + gap, ay + o); ctx.lineTo(bx, by + o); }
              else { ctx.moveTo(ax, ay + o); ctx.lineTo(bx, by + o); }
            }
            ctx.stroke();
          });
        }
        rail('t', x0, y0, x1, y0);
        rail('b', x0, y1, x1, y1);
        rail('l', x0, y0, x0, y1);
        rail('r', x1, y0, x1, y1);
        ctx.globalAlpha = 1;
        ctx.fillStyle = P.fence;
        var stepPx = cs * 0.5;
        function post(x, y) { MG.roundRect(ctx, x - cs * 0.045, y - cs * 0.14, cs * 0.09, cs * 0.22, cs * 0.03); ctx.fill(); }
        for (var x = x0; x <= x1 + 1; x += stepPx) {
          if (!(gapSide === 't' && Math.abs(x - mid) < gap)) post(x, y0);
          if (!(gapSide === 'b' && Math.abs(x - mid) < gap)) post(x, y1);
        }
        for (var y = y0 + stepPx; y < y1 - 1; y += stepPx) {
          if (!(gapSide === 'l' && Math.abs(y - mid) < gap)) post(x0, y);
          if (!(gapSide === 'r' && Math.abs(y - mid) < gap)) post(x1, y);
        }
        ctx.restore();
      }

      /* -------------------------------------------------- 工具栏 */
      var tools = {};
      var waveBtn, speedBtn, musicBtn, selBox, toolBox, upBtn, sellBtn, selName;

      function buildBar() {
        bar.textContent = '';
        toolBox = MG.h('div', 'gd-tools');
        TOWER_KEYS.forEach(function (k, i) {
          var b = MG.h('button', 'gd-tool');
          b.type = 'button';
          var ic = MG.h('span', 'gd-ico');
          ic.innerHTML = MG.art.html(TOWERS[k].art);
          b.appendChild(ic);
          var tx = MG.h('span', 'gd-txt');
          tx.appendChild(MG.h('span', 'gd-name', MG.t('g.garden.t.' + k)));
          tx.appendChild(MG.h('span', 'gd-cost', '● ' + TOWERS[k].cost));
          b.appendChild(tx);
          b.appendChild(MG.h('kbd', 'gd-key', String(i + 1)));
          b.title = MG.t('g.garden.t.' + k) + ' · ' + MG.t('g.garden.d.' + k);
          b.setAttribute('aria-label', b.title);
          b.addEventListener('click', function () { b.blur(); arm(k); });
          tools[k] = b;
          toolBox.appendChild(b);
        });
        bar.appendChild(toolBox);

        selBox = MG.h('div', 'gd-tools gd-selbox');
        selBox.hidden = true;
        selName = MG.h('span', 'gd-selname');
        selBox.appendChild(selName);
        upBtn = MG.h('button', 'gd-tool gd-act');
        upBtn.type = 'button';
        upBtn.addEventListener('click', function () { upBtn.blur(); upgrade(); });
        sellBtn = MG.h('button', 'gd-tool gd-act');
        sellBtn.type = 'button';
        sellBtn.addEventListener('click', function () { sellBtn.blur(); sell(); });
        var closeBtn = MG.h('button', 'gd-tool gd-act gd-close', '×');
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', MG.t('g.garden.close'));
        closeBtn.addEventListener('click', function () { closeBtn.blur(); select(null); });
        selBox.appendChild(upBtn);
        selBox.appendChild(sellBtn);
        selBox.appendChild(closeBtn);
        bar.appendChild(selBox);

        var acts = MG.h('div', 'gd-acts');
        musicBtn = MG.h('button', 'btn ghost gd-music');
        musicBtn.type = 'button';
        musicBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="16.5" cy="16" r="2.5" fill="currentColor"/></svg>';
        musicBtn.title = MG.t('g.garden.music') + ' (M)';
        musicBtn.setAttribute('aria-label', MG.t('g.garden.music'));
        musicBtn.addEventListener('click', function () { musicBtn.blur(); toggleMusic(); });
        acts.appendChild(musicBtn);
        speedBtn = MG.h('button', 'btn ghost gd-speed', '×1');
        speedBtn.type = 'button';
        speedBtn.title = MG.t('g.garden.speed') + ' (F)';
        speedBtn.addEventListener('click', function () { speedBtn.blur(); toggleSpeed(); });
        acts.appendChild(speedBtn);
        waveBtn = MG.h('button', 'btn primary gd-wave', '');
        waveBtn.type = 'button';
        waveBtn.addEventListener('click', function () { waveBtn.blur(); nextWave(); });
        acts.appendChild(waveBtn);
        bar.appendChild(acts);
        paintBar();
      }

      function paintBar() {
        if (!waveBtn) return;
        TOWER_KEYS.forEach(function (k) {
          var b = tools[k];
          b.disabled = S.seeds < TOWERS[k].cost || S.over || S.phase !== 'play';
          b.classList.toggle('on', S.armed === k);
        });
        var t = S.sel;
        toolBox.hidden = !!t;
        selBox.hidden = !t;
        if (t) {
          var maxed = t.lv >= 3;
          selName.textContent = MG.t('g.garden.t.' + t.type) + ' · Lv' + t.lv;
          upBtn.innerHTML = '';
          var tx = MG.h('span', 'gd-txt');
          tx.appendChild(MG.h('span', 'gd-name', maxed ? MG.t('g.garden.maxed') : MG.t('g.garden.upgrade', { n: t.lv + 1 })));
          tx.appendChild(MG.h('span', 'gd-cost', maxed ? '★★★' : '● ' + upCost(t)));
          upBtn.appendChild(tx);
          upBtn.disabled = maxed || S.seeds < upCost(t);
          sellBtn.innerHTML = '';
          var tx2 = MG.h('span', 'gd-txt');
          tx2.appendChild(MG.h('span', 'gd-name', MG.t('g.garden.sell')));
          tx2.appendChild(MG.h('span', 'gd-cost', '+ ' + refund(t)));
          sellBtn.appendChild(tx2);
        }
        var done = mode !== 'endless' && S.wave >= WAVES;
        waveBtn.disabled = S.over || S.queue.length > 0 || done || S.phase !== 'play';
        waveBtn.textContent = done ? MG.t('g.garden.last')
          : MG.t(S.wave === 0 ? 'g.garden.go' : 'g.garden.next', { n: S.wave + 1 });
        speedBtn.textContent = '×' + S.speed;
        speedBtn.classList.toggle('on', S.speed > 1);
        musicBtn.classList.toggle('on', !!pref.music);
        musicBtn.setAttribute('aria-pressed', pref.music ? 'true' : 'false');
      }

      function hud() {
        var m = {};
        m[MG.t('g.garden.wave')] = mode === 'endless' ? S.wave + ' · ∞' : S.wave + ' / ' + WAVES;
        m[MG.t('g.garden.seeds')] = S.seeds;
        m[MG.t('g.garden.cabbages')] = S.cabbages + ' / ' + CABBAGES;
        host.meta(m);
        host.score(S.score);
      }

      function changed() { paintBar(); hud(); S.dirty = true; }

      /* -------------------------------------------------- 选地图 */
      function thumb(m) {
        var cv = document.createElement('canvas');
        var W = 160, H = 100, k = W / COLS0;
        var dpr = Math.min(w.devicePixelRatio || 1, 2);
        cv.width = W * dpr; cv.height = H * dpr;
        var c = cv.getContext('2d');
        c.scale(dpr, dpr);
        var P = palette();
        c.fillStyle = P.grass; c.fillRect(0, 0, W, H);
        if (m.creek !== undefined) { c.fillStyle = P.water; c.fillRect(m.creek * k + 1, 0, k - 2, H); }
        c.strokeStyle = P.dirt; c.lineWidth = k * 0.8; c.lineCap = 'round'; c.lineJoin = 'round';
        m.routes.forEach(function (r) {
          c.beginPath();
          r.forEach(function (p, i) { var x = (p[0] + 0.5) * k, y = (p[1] + 0.5) * k; if (i) c.lineTo(x, y); else c.moveTo(x, y); });
          c.stroke();
        });
        c.fillStyle = P.soil; c.fillRect(m.patch.c * k + 1, m.patch.r * k + 1, 2 * k - 2, 3 * k - 2);
        c.fillStyle = '#b9da9c';
        for (var i = 0; i < 6; i++) { c.beginPath(); c.arc((m.patch.c + 0.5 + (i % 2)) * k, (m.patch.r + 0.5 + Math.floor(i / 2)) * k, k * 0.28, 0, TAU); c.fill(); }
        c.fillStyle = P.tree;
        m.trees.forEach(function (p) { c.beginPath(); c.arc((p[0] + 0.5) * k, (p[1] + 0.5) * k, k * 0.42, 0, TAU); c.fill(); });
        return cv;
      }

      function bestText(id) {
        var a = pref.best[id + ':classic'], b = pref.best[id + ':endless'];
        var bits = [];
        if (a) bits.push(MG.t('g.garden.bestClassic', { n: MG.fmtScore(a) }));
        if (b) bits.push(MG.t('g.garden.bestEndless', { n: b }));
        return bits.join(' · ') || MG.t('g.garden.fresh');
      }

      function showPick() {
        S.phase = 'pick';
        stage.classList.add('gd-picking');
        pickEl.textContent = '';
        var panel = MG.h('div', 'gd-pick-panel');
        panel.appendChild(MG.h('h3', null, MG.t('g.garden.pickTitle')));
        var maps = MG.h('div', 'gd-maps');
        MAPS.forEach(function (m) {
          var b = MG.h('button', 'gd-map' + (m.id === mapId ? ' on' : ''));
          b.type = 'button';
          b.appendChild(thumb(m));
          var tx = MG.h('span', 'gd-map-txt');
          tx.appendChild(MG.h('b', null, MG.t('g.garden.map.' + m.id)));
          tx.appendChild(MG.h('span', null, MG.t('g.garden.mapd.' + m.id)));
          tx.appendChild(MG.h('em', null, bestText(m.id)));
          b.appendChild(tx);
          b.addEventListener('click', function () {
            mapId = m.id;
            maps.querySelectorAll('.gd-map').forEach(function (x) { x.classList.remove('on'); });
            b.classList.add('on');
            geometry(true); layout(); draw();
            MG.audio.play('click');
          });
          maps.appendChild(b);
        });
        panel.appendChild(maps);
        var modes = MG.h('div', 'gd-modes');
        ['classic', 'endless'].forEach(function (md) {
          var b = MG.h('button', 'gd-mode' + (md === mode ? ' on' : ''));
          b.type = 'button';
          b.appendChild(MG.h('b', null, MG.t('g.garden.mode.' + md)));
          b.appendChild(MG.h('span', null, MG.t('g.garden.moded.' + md)));
          b.addEventListener('click', function () {
            mode = md;
            modes.querySelectorAll('.gd-mode').forEach(function (x) { x.classList.remove('on'); });
            b.classList.add('on');
            MG.audio.play('click');
          });
          modes.appendChild(b);
        });
        panel.appendChild(modes);
        var go = MG.h('button', 'btn primary gd-go', MG.t('g.garden.begin'));
        go.type = 'button';
        go.addEventListener('click', function () { go.blur(); beginPlay(); });
        panel.appendChild(go);
        pickEl.appendChild(panel);
        pickEl.hidden = false;
        geometry(true);
        layout();
        changed();
        draw();
      }

      function beginPlay() {
        if (S.phase !== 'pick') return;
        pref.map = mapId;
        pref.mode = mode;
        savePref(pref);
        pickEl.hidden = true;
        stage.classList.remove('gd-picking');
        S.phase = 'play';
        if (pref.music) music.start();
        changed();
      }

      /* -------------------------------------------------- 操作 */
      function arm(k) {
        if (S.over || S.phase !== 'play') return;
        if (S.seeds < TOWERS[k].cost) { MG.toast(MG.t('g.garden.poor')); return; }
        S.sel = null;
        S.armed = S.armed === k ? null : k;
        if (S.armed) MG.audio.play('click');
        changed();
      }

      function select(t) {
        S.sel = t;
        S.armed = null;
        changed();
      }

      function place(c, r) {
        var k = S.armed;
        if (!buildable(c, r)) { MG.toast(MG.t('g.garden.noSpot')); return; }
        var cost = TOWERS[k].cost;
        if (S.seeds < cost) { MG.toast(MG.t('g.garden.poor')); return; }
        S.seeds -= cost;
        S.towers.push({ type: k, c: c, r: r, x: c + 0.5, y: r + 0.5, lv: 1, cd: 0.3, spent: cost, sway: 0, pop: 0.0001, kick: 0, gift: TOWERS[k].every || 0, ph: (c * 7 + r * 3) % 6 });
        burst(c + 0.5, r + 0.85, 'dust', 8);
        sfx('place');
        if (S.seeds < cost) S.armed = null;
        changed();
      }

      function upgrade() {
        var t = S.sel;
        if (!t || t.lv >= 3) return;
        var cost = upCost(t);
        if (S.seeds < cost) { MG.toast(MG.t('g.garden.poor')); return; }
        S.seeds -= cost;
        t.spent += cost;
        t.lv++;
        t.pop = 0.0001;
        burst(t.x, t.y, 'leaf', 10);
        burst(t.x, t.y - 0.3, 'star', 8);
        MG.audio.play('perfect');
        changed();
      }

      function sell() {
        var t = S.sel;
        if (!t) return;
        S.seeds += refund(t);
        S.towers.splice(S.towers.indexOf(t), 1);
        S.shots = S.shots.filter(function (b) { return b.home !== t; });
        burst(t.x, t.y + 0.3, 'dust', 8);
        S.sel = null;
        MG.audio.play('click');
        changed();
      }

      function toggleSpeed() {
        if (S.phase !== 'play') return;
        S.speed = S.speed === 1 ? 2 : 1;
        changed();
      }

      function toggleMusic() {
        pref.music = !pref.music;
        savePref(pref);
        if (pref.music && S.running && S.phase === 'play') {
          if (!MG.audio.isOn()) MG.toast(MG.t('g.garden.muted'));
          music.start();
        } else music.stop();
        paintBar();
      }

      function nextWave() {
        if (S.over || S.phase !== 'play' || S.queue.length) return;
        if (mode !== 'endless' && S.wave >= WAVES) return;
        if (S.pests.some(function (p) { return !p.flee; })) {
          S.seeds += 5;
          floatText(COLS / 2, 1.2, MG.t('g.garden.early'), '#a4925a');
        }
        S.wave++;
        S.queue = waveList(S.wave);
        S.spawnT = 0;
        var n = S.wave - 1;
        S.hpMul = 1 + 0.15 * n + 0.03 * n * n;
        var news = null;
        for (var k in INTRO) if (INTRO[k] === S.wave && k !== 'crow') news = k;
        var boss = S.wave % 5 === 0;
        S.banner = {
          t: 0,
          title: MG.t('g.garden.waveN', { n: S.wave }),
          sub: boss ? MG.t('g.garden.bossComing') : news ? MG.t('g.garden.newcomer', { name: MG.t('g.garden.p.' + news), d: MG.t('g.garden.pd.' + news) }) : ''
        };
        sfx(boss ? 'caw' : 'wave');
        changed();
      }

      /* -------------------------------------------------- 特效 */
      function burst(x, y, kind, n, color) {
        if (S.parts.length > 260) return;
        for (var i = 0; i < n; i++) {
          var a = MG.rand(0, TAU), sp = MG.rand(0.6, 2.2);
          var p = { x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.8, life: 0, max: MG.rand(0.35, 0.7), size: MG.rand(0.04, 0.08), kind: kind, color: color, rot: MG.rand(0, 6), vr: MG.rand(-8, 8) };
          if (kind === 'puff') { p.vx *= 0.4; p.vy = MG.rand(-0.9, -0.3); p.size = MG.rand(0.08, 0.14); p.max = MG.rand(0.5, 0.8); }
          if (kind === 'drop') { p.vy -= 1.2; p.size = MG.rand(0.03, 0.05); }
          if (kind === 'dust') { p.vy = MG.rand(-0.6, -0.1); p.size = MG.rand(0.05, 0.1); }
          S.parts.push(p);
        }
      }
      function floatText(x, y, text, color, big) { S.texts.push({ x: x, y: y, t: 0, text: text, color: color, big: !!big }); }
      function coin(x, y) { if (S.coins.length < 30) S.coins.push({ x: x, y: y, t: 0 }); }

      /* -------------------------------------------------- 模拟 */
      function spawn(k) {
        var d = PESTS[k];
        var hp = Math.round(d.hp * S.hpMul);
        var route = routes[S.spawnN % routes.length];
        S.spawnN++;
        S.pests.push({ k: k, route: route, d: -0.4, hp: hp, max: hp, speed: d.speed * MG.rand(0.95, 1.05), slow: 0, hit: 0, flee: 0, x: -5, y: -5, dx: 1, dy: 0, bob: MG.rand(0, 6), dig: d.dig ? MG.rand(1, 3) : 0, under: false });
        if (d.boss) sfx('caw');
      }

      function targetable(p) { return !p.flee && p.d >= 0 && !p.under; }

      function hurt(p, dmg, kb, from) {
        if (!targetable(p)) return;
        var meta = PESTS[p.k];
        var real = from === 'frog' ? dmg : Math.max(1, dmg - (meta.armor || 0));
        p.hp -= real;
        p.hit = 0.16;
        if (kb) p.d = Math.max(-0.3, p.d - kb * (meta.boss ? 0.25 : 1));
        if (meta.armor && from !== 'frog') burst(p.x, p.y - 0.3, 'star', 2, '#c9d3e6');
        if (real >= 5) floatText(p.x, p.y - meta.size * 0.9, '-' + real, MG.theme.dark ? '#f2c3a7' : '#c47a5a');
        if (p.hp <= 0) shoo(p);
      }

      function shoo(p) {
        if (p.flee) return;
        p.flee = 0.0001;
        var meta = PESTS[p.k];
        var gain = meta.seeds;
        S.seeds += gain;
        S.score += gain * 10;
        S.shooed++;
        burst(p.x, p.y - 0.2, 'puff', meta.boss ? 12 : 6);
        burst(p.x, p.y - 0.2, 'leaf', meta.boss ? 8 : 3);
        floatText(p.x, p.y - 0.5, '+' + gain, MG.theme.dark ? '#d6e6c4' : '#5f8a52', meta.boss);
        for (var i = 0; i < Math.min(4, Math.ceil(gain / 3)); i++) coin(p.x + MG.rand(-0.2, 0.2), p.y - 0.2);
        sfx('shoo');
        changed();
      }

      function dist2(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }

      function step(dt) {
        S.t += dt;
        var i, j, p, t;

        if (S.queue.length) {
          S.spawnT -= dt;
          if (S.spawnT <= 0) {
            var nx = S.queue.shift();
            spawn(nx.k);
            S.spawnT = nx.gap;
            if (!S.queue.length) paintBar();
          }
        }

        /* 稻草人：范围内的地面虫子减速；乌鸦最怕稻草人，飞蛾不理它 */
        for (i = 0; i < S.pests.length; i++) S.pests[i].slow = 0;
        for (j = 0; j < S.towers.length; j++) {
          t = S.towers[j];
          if (t.type !== 'scarecrow') continue;
          var R = TOWERS.scarecrow.range[t.lv - 1];
          var near = false;
          for (i = 0; i < S.pests.length; i++) {
            p = S.pests[i];
            if (p.flee || p.under || p.k === 'moth' || dist2(p, t) > R * R) continue;
            p.slow = Math.max(p.slow, Math.min(0.8, TOWERS.scarecrow.slow[t.lv - 1] * (p.k === 'crow' ? 1.4 : 1)));
            near = true;
          }
          t.sway = near ? t.sway + dt * 4 : t.sway * 0.9;
        }

        /* 虫子前进 */
        for (i = S.pests.length - 1; i >= 0; i--) {
          p = S.pests[i];
          if (p.flee) {
            p.flee += dt;
            if (p.flee > 0.9) S.pests.splice(i, 1);
            continue;
          }
          var meta = PESTS[p.k];
          if (meta.dig && p.d > 0.5) {
            p.dig -= dt;
            if (p.dig <= 0) {
              p.under = !p.under;
              p.dig = p.under ? 1.6 : MG.rand(2.6, 3.6);
              burst(p.x, p.y + 0.2, 'dust', 6);
              sfx('dig');
            }
          }
          p.d += p.speed * (1 - p.slow) * (p.under ? 1.15 : 1) * dt;
          p.hit = Math.max(0, p.hit - dt);
          var pos = posAt(p.route, p.d);
          p.x = pos.x; p.y = pos.y;
          if (pos.dx) p.dx = pos.dx;
          if (p.d >= p.route.L) {
            S.pests.splice(i, 1);
            var bite = meta.bite || 1;
            for (var b = 0; b < bite && S.cabbages > 0; b++) {
              S.cabbages--;
              var sp = cabbageSpots[S.cabbages];
              S.bitten.push({ i: S.cabbages, t: 0 });
              burst(sp.x, sp.y - 0.2, 'leaf', 8, '#b9da9c');
            }
            sfx('nibble');
            MG.toast(MG.t('g.garden.nibble', { n: S.cabbages }));
            changed();
            if (S.cabbages <= 0) { end(false); return; }
          }
        }

        /* 帮手 */
        for (j = 0; j < S.towers.length; j++) {
          t = S.towers[j];
          if (t.pop) { t.pop += dt; if (t.pop > 0.35) t.pop = 0; }
          if (t.kick) t.kick = Math.max(0, t.kick - dt);
          var st = TOWERS[t.type];
          if (t.type === 'scarecrow') continue;
          if (t.type === 'sunflower') {
            if (S.queue.length || S.pests.length) {
              t.gift -= dt;
              if (t.gift <= 0) {
                t.gift = st.every;
                var g = st.gift[t.lv - 1];
                S.seeds += g;
                t.kick = 0.25;
                floatText(t.x, t.y - 0.8, '+' + g, '#c9a23a');
                coin(t.x, t.y - 0.5);
                sfx('seed');
                changed();
              }
            }
            continue;
          }
          var range = st.range[t.lv - 1];
          t.cd -= dt;
          if (t.cd > 0) continue;
          var best = null, q;
          if (t.type === 'ladybug' || t.type === 'hive') {
            for (q = 0; q < S.pests.length; q++) {
              p = S.pests[q];
              if (!targetable(p) || dist2(p, t) > range * range) continue;
              if (!best || p.d > best.d) best = p;
            }
            if (best) {
              if (t.type === 'ladybug') S.shots.push({ kind: 'bug', x: t.x, y: t.y - 0.4, home: t, target: best, dmg: st.dmg[t.lv - 1], back: false, a: 0 });
              else { S.shots.push({ kind: 'bee', x: t.x, y: t.y - 0.4, home: t, target: best, dmg: st.dmg[t.lv - 1], left: st.chain[t.lv - 1], hit: [], a: 0, fade: 0 }); sfx('buzz'); }
              t.cd = st.cd[t.lv - 1];
              t.kick = 0.18;
            }
          } else if (t.type === 'frog') {
            for (q = 0; q < S.pests.length; q++) {
              p = S.pests[q];
              if (!targetable(p) || dist2(p, t) > range * range) continue;
              if (!best || p.hp > best.hp) best = p;
            }
            if (best) {
              S.shots.push({ kind: 'tongue', home: t, target: best, dmg: st.dmg[t.lv - 1], t: 0, done: false, tx: best.x, ty: best.y });
              t.cd = st.cd[t.lv - 1];
              t.kick = 0.22;
              sfx('ribbit');
            }
          } else if (t.type === 'can') {
            var any = false;
            for (q = 0; q < S.pests.length; q++) {
              p = S.pests[q];
              if (!targetable(p) || PESTS[p.k].fly || dist2(p, t) > range * range) continue;
              any = true;
              hurt(p, st.dmg[t.lv - 1], st.kb, 'can');
              burst(p.x, p.y - 0.2, 'drop', 3, '#8fbfe0');
            }
            if (any) {
              S.rings.push({ x: t.x, y: t.y, r: range, t: 0 });
              burst(t.x + 0.3, t.y - 0.4, 'drop', 6, '#8fbfe0');
              t.cd = st.cd[t.lv - 1];
              t.kick = 0.22;
              sfx('splash');
            }
          }
        }

        /* 飞行物 */
        for (i = S.shots.length - 1; i >= 0; i--) {
          var s = S.shots[i];
          if (s.kind === 'tongue') {
            s.t += dt;
            if (!s.target.flee) { s.tx = s.target.x; s.ty = s.target.y - PESTS[s.target.k].size * 0.4 - (PESTS[s.target.k].fly ? 0.38 : 0); }
            if (!s.done && s.t >= 0.11) {
              s.done = true;
              hurt(s.target, s.dmg, TOWERS.frog.kb, 'frog');
              burst(s.tx, s.ty, 'star', 6, '#f0cf7a');
              sfx('pop');
            }
            if (s.t > 0.24) S.shots.splice(i, 1);
            continue;
          }
          if (s.kind === 'bee') {
            if (s.fade) {
              s.fade += dt;
              s.y -= dt * 1.2;
              if (s.fade > 0.5) S.shots.splice(i, 1);
              continue;
            }
            if (!targetable(s.target)) {
              s.target = nextBeeTarget(s, s);
              if (!s.target) { s.fade = 0.001; continue; }
            }
            var gx = s.target.x, gy = s.target.y - 0.35;
            var ddx = gx - s.x, ddy = gy - s.y, dd = Math.sqrt(ddx * ddx + ddy * ddy);
            var v = 6.5 * dt;
            s.a = Math.atan2(ddy, ddx);
            if (dd <= v + 0.15) {
              var was = s.target;
              hurt(was, s.dmg, 0.02, 'hive');
              burst(gx, gy, 'star', 3, '#f0cf7a');
              sfx('pop');
              s.hit.push(was);
              s.left--;
              s.target = s.left > 0 ? nextBeeTarget(s, was) : null;
              if (!s.target) s.fade = 0.001;
            } else {
              s.x += ddx / dd * v + Math.cos(S.t * 20 + i) * 0.02;
              s.y += ddy / dd * v + Math.sin(S.t * 23 + i) * 0.02;
            }
            continue;
          }
          /* 瓢虫：顶一下就飞回家 */
          if (!s.back && !targetable(s.target)) s.back = true;
          var goal = s.back ? { x: s.home.x, y: s.home.y - 0.4 } : { x: s.target.x, y: s.target.y - 0.35 };
          var dx = goal.x - s.x, dy = goal.y - s.y;
          var d2 = Math.sqrt(dx * dx + dy * dy);
          var vv = 7.5 * dt;
          s.a = Math.atan2(dy, dx);
          if (d2 <= vv + 0.15) {
            if (s.back) { S.shots.splice(i, 1); continue; }
            hurt(s.target, s.dmg, TOWERS.ladybug.kb, 'ladybug');
            burst(goal.x, goal.y, 'star', 4, '#f0cf7a');
            sfx('pop');
            s.back = true;
          } else {
            s.x += dx / d2 * vv;
            s.y += dy / d2 * vv;
          }
        }

        stepFx(dt);

        /* 一波清空 */
        if (S.wave && !S.queue.length && !S.pests.length && !S.waveDone) {
          S.waveDone = true;
          if (mode !== 'endless' && S.wave >= WAVES) { end(true); return; }
          var bonus = 6 + S.wave;
          S.towers.forEach(function (tw) {
            if (tw.type !== 'sunflower') return;
            var g2 = TOWERS.sunflower.bonus[tw.lv - 1];
            bonus += g2;
            tw.kick = 0.25;
            floatText(tw.x, tw.y - 0.8, '+' + g2, '#c9a23a');
          });
          S.seeds += bonus;
          S.score += S.wave * 40;
          MG.toast(MG.t('g.garden.cleared', { n: S.wave, seeds: bonus }));
          MG.audio.play('good');
          changed();
        }
        if (S.queue.length || S.pests.length) S.waveDone = false;
      }

      function nextBeeTarget(s, from) {
        var best = null, bd = 1.7 * 1.7;
        for (var i = 0; i < S.pests.length; i++) {
          var p = S.pests[i];
          if (!targetable(p) || s.hit.indexOf(p) >= 0) continue;
          var d = dist2(p, from);
          if (d < bd) { bd = d; best = p; }
        }
        return best;
      }

      /* 只跟画面有关的动画：粒子、飘字、种子、横幅 */
      function stepFx(dt) {
        var i;
        for (i = S.rings.length - 1; i >= 0; i--) { S.rings[i].t += dt; if (S.rings[i].t > 0.7) S.rings.splice(i, 1); }
        for (i = S.parts.length - 1; i >= 0; i--) {
          var p = S.parts[i];
          p.life += dt;
          if (p.life > p.max) { S.parts.splice(i, 1); continue; }
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.kind === 'drop' || p.kind === 'leaf' || p.kind === 'star') p.vy += 4 * dt;
          p.vx *= 0.96; p.rot += p.vr * dt;
        }
        for (i = S.texts.length - 1; i >= 0; i--) { S.texts[i].t += dt; if (S.texts[i].t > 1) S.texts.splice(i, 1); }
        for (i = S.coins.length - 1; i >= 0; i--) {
          S.coins[i].t += dt * 1.6;
          if (S.coins[i].t >= 1) { S.coins.splice(i, 1); sfx('seed'); }
        }
        for (i = S.bitten.length - 1; i >= 0; i--) { S.bitten[i].t += dt; if (S.bitten[i].t > 0.6) S.bitten.splice(i, 1); }
        if (S.banner) { S.banner.t += dt; if (S.banner.t > 2.6) S.banner = null; }
      }

      /* 蝴蝶和云影：选地图时也在动 */
      function stepAmbient(dt) {
        S.flies.forEach(function (f) {
          if (!f.tx || Math.abs(f.x - f.tx) + Math.abs(f.y - f.ty) < 0.3) { f.tx = 0.5 + Math.random() * (COLS - 1); f.ty = 0.5 + Math.random() * (ROWS - 1); }
          var dx = f.tx - f.x, dy = f.ty - f.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
          f.x += dx / d * 0.7 * dt + Math.sin(S.t * 3 + f.ph) * 0.01;
          f.y += dy / d * 0.7 * dt + Math.cos(S.t * 4 + f.ph) * 0.012;
          f.dir = dx < 0 ? -1 : 1;
        });
        S.clouds.forEach(function (c) {
          c.x += c.v * dt;
          if (c.x - c.r > COLS + 1) c.x = -c.r - 1;
        });
      }

      function end(won) {
        if (S.over) return;
        S.over = true;
        S.running = false;
        cancelAnimationFrame(raf);
        music.stop();
        S.armed = null; S.sel = null;
        var endless = mode === 'endless';
        if (won) S.score += S.cabbages * 150 + 500;
        if (endless) S.score += Math.max(0, S.wave - 1) * 100;
        var keyC = mapId + ':' + mode;
        if (endless) { if (S.wave > (pref.best[keyC] || 0)) pref.best[keyC] = S.wave; }
        else if (won && S.score > (pref.best[keyC] || 0)) pref.best[keyC] = S.score;
        savePref(pref);
        changed();
        draw();
        MG.audio.play(won || endless ? 'win' : 'over');
        var mapName = MG.t('g.garden.map.' + mapId);
        host.finish({
          score: S.score,
          note: endless ? MG.t('g.garden.endlessNote', { map: mapName, wave: S.wave, n: S.shooed })
            : won ? MG.t('g.garden.win', { map: mapName, left: S.cabbages, n: S.shooed })
            : MG.t('g.garden.lose', { map: mapName, wave: S.wave, n: S.shooed }),
          meta: endless ? { endless: true, wave: S.wave, shooed: S.shooed, map: mapId }
            : { won: won, wave: S.wave, cabbages: S.cabbages, shooed: S.shooed, map: mapId }
        });
      }

      /* -------------------------------------------------- 绘制 */
      function easeOut(k) { return 1 - Math.pow(1 - k, 3); }

      function draw() {
        if (!view) return;
        var ctx = view.ctx;
        var P = palette();
        buildBg();
        ctx.clearRect(0, 0, view.w, view.h);
        ctx.drawImage(bg, 0, 0, view.w, view.h);
        var i, p;

        /* 小溪的水纹，顺流而下 */
        if (creekCells.length) {
          ctx.save();
          ctx.strokeStyle = P.waterHi;
          ctx.lineWidth = Math.max(1, cs * 0.03);
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (i = 0; i < 14; i++) {
            var along = ((i * 0.83 + S.t * 0.5) % (ROWS0 + 1)) - 0.5;
            var across = Math.sin(along * 1.3) * 0.14 + ((i % 3) - 1) * 0.2;
            var cx2 = tall ? along + 0.5 : map.creek + 0.5 + across;
            var cy2 = tall ? map.creek + 0.5 + across : along + 0.5;
            if (onPath[Math.floor(cx2) + ',' + Math.floor(cy2)]) continue;
            if (tall) { ctx.moveTo(X(cx2 - 0.12), Y(cy2)); ctx.lineTo(X(cx2 + 0.12), Y(cy2)); }
            else { ctx.moveTo(X(cx2), Y(cy2 - 0.12)); ctx.lineTo(X(cx2), Y(cy2 + 0.12)); }
          }
          ctx.stroke();
          ctx.restore();
        }

        /* 摆放时：能放的格子显示淡淡的格线 */
        if (S.armed) {
          ctx.save();
          ctx.strokeStyle = P.grid;
          ctx.lineWidth = 1;
          for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
            if (!buildable(c, r)) continue;
            MG.roundRect(ctx, X(c) + 3, Y(r) + 3, cs - 6, cs - 6, cs * 0.18);
            ctx.stroke();
          }
          ctx.restore();
        }

        /* 白菜 */
        for (i = 0; i < CABBAGES; i++) {
          var sp = cabbageSpots[i];
          var bit = null;
          for (var b = 0; b < S.bitten.length; b++) if (S.bitten[b].i === i) bit = S.bitten[b];
          var csz = tall ? 0.62 : 0.6;
          if (i < S.cabbages) {
            var breathe = 1 + Math.sin(S.t * 1.5 + i) * 0.02;
            drawSprite(ctx, 'cabbage', sp.x, sp.y - 0.05, csz, { sx: breathe, sy: breathe });
          } else if (bit) {
            var k2 = bit.t / 0.6;
            drawSprite(ctx, 'cabbage', sp.x + Math.sin(bit.t * 60) * 0.04, sp.y - 0.05, csz, { alpha: 1 - k2, sx: 1 - k2 * 0.6, sy: 1 - k2 * 0.8 });
          } else {
            ctx.fillStyle = P.soilRow;
            ctx.beginPath();
            ctx.ellipse(X(sp.x), Y(sp.y + 0.15), cs * 0.16, cs * 0.07, 0, 0, TAU);
            ctx.fill();
          }
        }
        drawFence(ctx);

        /* 范围 */
        var show = null;
        if (S.sel && TOWERS[S.sel.type].range) show = { x: S.sel.x, y: S.sel.y, r: TOWERS[S.sel.type].range[S.sel.lv - 1], ok: true };
        else if (S.armed && S.hover) show = { x: S.hover.c + 0.5, y: S.hover.r + 0.5, r: TOWERS[S.armed].range ? TOWERS[S.armed].range[0] : 0.45, ok: buildable(S.hover.c, S.hover.r), ghost: S.armed };
        if (show) {
          ctx.save();
          ctx.fillStyle = show.ok ? P.range : P.bad;
          ctx.strokeStyle = P.rangeLine;
          ctx.setLineDash([6, 6]);
          ctx.lineDashOffset = -S.t * 12;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(X(show.x), Y(show.y), show.r * cs, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          if (show.ghost) drawSprite(ctx, TOWERS[show.ghost].art, show.x, show.y - 0.05, 0.94, { alpha: show.ok ? 0.6 : 0.25 });
        }
        if (S.sel) {
          ctx.save();
          ctx.strokeStyle = MG.theme.accent;
          ctx.lineWidth = 2;
          MG.roundRect(ctx, X(S.sel.c) + 2, Y(S.sel.r) + 2, cs - 4, cs - 4, cs * 0.2);
          ctx.stroke();
          ctx.restore();
        }

        /* 水圈 */
        for (i = 0; i < S.rings.length; i++) {
          var rg = S.rings[i];
          var k = rg.t / 0.7;
          ctx.save();
          ctx.globalAlpha = (1 - k) * 0.85;
          ctx.strokeStyle = P.ring;
          ctx.lineWidth = Math.max(1.5, cs * 0.06 * (1 - k * 0.5));
          ctx.setLineDash([cs * 0.08, cs * 0.12]);
          ctx.beginPath();
          ctx.arc(X(rg.x), Y(rg.y), rg.r * cs * (0.25 + 0.75 * k), 0, TAU);
          ctx.stroke();
          ctx.restore();
        }

        /* 帮手 + 虫子：按 y 排序一起画，前后遮挡才对 */
        var items = [];
        S.towers.forEach(function (tw) { items.push({ y: tw.y + 0.3, tw: tw }); });
        S.pests.forEach(function (ps) { if (ps.d > -0.25) items.push({ y: ps.y + (PESTS[ps.k].fly ? 0.5 : 0.2), ps: ps }); });
        items.sort(function (a, b2) { return a.y - b2.y; });
        for (i = 0; i < items.length; i++) {
          if (items[i].tw) drawTower(ctx, items[i].tw, P);
          else drawPest(ctx, items[i].ps, P);
        }

        for (i = 0; i < S.shots.length; i++) drawShot(ctx, S.shots[i]);

        /* 粒子 */
        for (i = 0; i < S.parts.length; i++) {
          p = S.parts[i];
          var a = 1 - p.life / p.max;
          ctx.save();
          ctx.globalAlpha = a * (p.kind === 'puff' ? 0.7 : 0.9);
          var px = X(p.x), py = Y(p.y), sz = p.size * cs * (p.kind === 'puff' ? 1 + p.life * 2 : 1);
          if (p.kind === 'star') {
            ctx.fillStyle = p.color || '#f0cf7a';
            ctx.translate(px, py); ctx.rotate(p.rot);
            ctx.beginPath();
            for (var s = 0; s < 8; s++) {
              var rr = s % 2 ? sz * 0.4 : sz;
              ctx.lineTo(Math.cos(s * Math.PI / 4) * rr, Math.sin(s * Math.PI / 4) * rr);
            }
            ctx.closePath(); ctx.fill();
          } else if (p.kind === 'leaf') {
            ctx.fillStyle = p.color || '#8fbf7f';
            ctx.translate(px, py); ctx.rotate(p.rot);
            ctx.beginPath(); ctx.ellipse(0, 0, sz * 1.2, sz * 0.55, 0, 0, TAU); ctx.fill();
          } else {
            ctx.fillStyle = p.kind === 'drop' ? (p.color || '#8fbfe0') : p.kind === 'dust' ? P.dust : P.puff;
            ctx.beginPath(); ctx.arc(px, py, sz, 0, TAU); ctx.fill();
          }
          ctx.restore();
        }

        /* 云影（只落在地里） */
        ctx.save();
        MG.roundRect(ctx, X(0), Y(0), COLS * cs, ROWS * cs, cs * 0.4);
        ctx.clip();
        ctx.fillStyle = P.cloud;
        S.clouds.forEach(function (cl) {
          ctx.beginPath();
          ctx.ellipse(X(cl.x), Y(cl.y), cl.r * cs, cl.r * cs * 0.55, 0, 0, TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(X(cl.x + cl.r * 0.6), Y(cl.y + 0.3), cl.r * cs * 0.6, cl.r * cs * 0.4, 0, 0, TAU);
          ctx.fill();
        });
        ctx.restore();

        /* 蝴蝶 */
        S.flies.forEach(function (f) {
          var flap = Math.abs(Math.sin(S.t * 9 + f.ph));
          ctx.save();
          ctx.translate(X(f.x), Y(f.y));
          ctx.scale(f.dir || 1, 1);
          ctx.fillStyle = f.hue;
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.ellipse(-cs * 0.06, -cs * 0.02, cs * 0.08 * (0.3 + flap * 0.7), cs * 0.06, -0.4, 0, TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(cs * 0.04, -cs * 0.03, cs * 0.07 * (0.3 + flap * 0.7), cs * 0.05, 0.4, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#6b5545';
          ctx.fillRect(-cs * 0.01, -cs * 0.05, cs * 0.02, cs * 0.08);
          ctx.restore();
        });

        /* 飘字：弹一下再淡出 */
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (i = 0; i < S.texts.length; i++) {
          var tx = S.texts[i];
          var e = tx.t;
          var scale = e < 0.12 ? 0.6 + e / 0.12 * 0.5 : 1.1 - Math.min(0.1, e - 0.12);
          ctx.font = '800 ' + Math.round(cs * (tx.big ? 0.46 : 0.3) * scale) + 'px ' + FONT;
          ctx.globalAlpha = e > 0.6 ? 1 - (e - 0.6) / 0.4 : 1;
          ctx.lineWidth = 3;
          ctx.strokeStyle = MG.theme.dark ? 'rgba(20,26,20,.6)' : 'rgba(255,255,255,.85)';
          ctx.strokeText(tx.text, X(tx.x), Y(tx.y - e * 0.6));
          ctx.fillStyle = tx.color;
          ctx.fillText(tx.text, X(tx.x), Y(tx.y - e * 0.6));
        }
        ctx.restore();

        /* 种子：划一道弧线飞进下方的工具栏 */
        for (i = 0; i < S.coins.length; i++) {
          var cn = S.coins[i];
          var u = cn.t;
          var tx2 = view.w * 0.08, ty2 = view.h + cs * 0.4;
          var sx = X(cn.x), sy = Y(cn.y);
          var mx = (sx + tx2) / 2, my = Math.min(sy, ty2) - cs * 1.4;
          var qx = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * mx + u * u * tx2;
          var qy = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * my + u * u * ty2;
          ctx.save();
          ctx.translate(qx, qy);
          ctx.rotate(u * 8);
          ctx.fillStyle = '#b8894f';
          ctx.strokeStyle = '#6b5545';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(0, 0, cs * 0.08, cs * 0.055, 0, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.restore();
        }

        /* 横幅：第 N 波 */
        if (S.banner) {
          var bt = S.banner.t;
          var inK = Math.min(1, bt / 0.35), outK = bt > 2.1 ? (bt - 2.1) / 0.5 : 0;
          var by = Y(0) + cs * 0.25 - (1 - easeOut(inK)) * cs;
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, inK * 1.5) - outK);
          var f1 = '800 ' + Math.round(cs * 0.42) + 'px ' + FONT, f2 = '500 ' + Math.round(Math.max(11, cs * 0.24)) + 'px ' + FONT;
          ctx.font = f1;
          var tw1 = ctx.measureText(S.banner.title).width;
          ctx.font = f2;
          var tw2 = S.banner.sub ? ctx.measureText(S.banner.sub).width : 0;
          var bw = Math.min(view.w - 20, Math.max(tw1, tw2) + cs * 1.2);
          var bh = S.banner.sub ? cs * 1.08 : cs * 0.72;
          ctx.fillStyle = P.pill;
          ctx.shadowColor = 'rgba(40,40,30,.18)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
          MG.roundRect(ctx, view.w / 2 - bw / 2, by, bw, bh, Math.min(bh / 2, cs * 0.4));
          ctx.fill();
          ctx.shadowColor = 'transparent';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = P.text;
          ctx.font = f1;
          ctx.fillText(S.banner.title, view.w / 2, by + (S.banner.sub ? cs * 0.36 : bh / 2));
          if (S.banner.sub) {
            ctx.font = f2;
            ctx.globalAlpha *= 0.85;
            ctx.fillText(S.banner.sub, view.w / 2, by + cs * 0.78, bw - cs * 0.4);
          }
          ctx.restore();
        }

        /* 选中帮手时：顶部一行说明 */
        var info = S.armed ? MG.t('g.garden.t.' + S.armed) + ' · ' + MG.t('g.garden.d.' + S.armed) : '';
        if (!info && S.phase === 'play' && S.wave === 0 && !S.towers.length) info = MG.t('g.garden.hint');
        if (info && !S.banner) {
          ctx.save();
          ctx.font = '600 ' + Math.max(12, Math.round(cs * 0.26)) + 'px ' + FONT;
          var iw = Math.min(view.w - 16, ctx.measureText(info).width + cs * 0.8);
          var ih = Math.max(24, cs * 0.56);
          ctx.fillStyle = P.pill;
          MG.roundRect(ctx, view.w / 2 - iw / 2, Y(0) + 6, iw, ih, ih / 2);
          ctx.fill();
          ctx.fillStyle = P.text;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(info, view.w / 2, Y(0) + 6 + ih / 2, iw - cs * 0.3);
          ctx.restore();
        }
      }

      function drawTower(ctx, t, P) {
        var st = TOWERS[t.type];
        var pop = t.pop ? 1 + Math.sin(t.pop / 0.35 * Math.PI) * 0.18 : 1;
        var breathe = 1 + Math.sin(S.t * 2 + t.ph) * 0.02;
        var kick = t.kick ? Math.sin(Math.min(1, t.kick / 0.22) * Math.PI) : 0;
        var sx = pop * (1 + kick * 0.1) / breathe, sy = pop * breathe * (1 - kick * 0.12);
        ctx.fillStyle = P.shadow;
        ctx.beginPath();
        ctx.ellipse(X(t.x), Y(t.y + 0.38), cs * 0.32, cs * 0.1, 0, 0, TAU);
        ctx.fill();
        var rot = 0;
        if (t.type === 'scarecrow' && t.sway) rot = Math.sin(t.sway) * 0.09;
        if (t.type === 'sunflower') rot = Math.sin(S.t * 0.8 + t.ph) * 0.07;
        drawSprite(ctx, st.art, t.x, t.y - 0.06, 0.94, { sx: sx, sy: sy, rot: rot });
        /* 蜂箱门口转悠的两只小蜜蜂 */
        if (t.type === 'hive') {
          for (var b = 0; b < 2; b++) {
            var ang = S.t * (2.2 + b) + b * 3 + t.ph;
            drawBee(ctx, X(t.x + Math.cos(ang) * 0.34), Y(t.y - 0.15 + Math.sin(ang * 1.3) * 0.16), Math.cos(ang) < 0 ? 1 : -1, 0.7);
          }
        }
        for (var lv = 1; lv < t.lv; lv++) {
          ctx.fillStyle = '#7fae73';
          ctx.beginPath();
          ctx.ellipse(X(t.x + 0.3 - (lv - 1) * 0.16), Y(t.y + 0.4), cs * 0.07, cs * 0.045, -0.5, 0, TAU);
          ctx.fill();
        }
      }

      function drawPest(ctx, p, P) {
        var meta = PESTS[p.k];
        var t = S.t;
        var ax = p.x, ay = p.y;
        var alpha = 1, sx = 1, sy = 1, rot = 0;
        if (p.k === 'caterpillar') { sx = 1 + Math.sin(t * 9 + p.bob) * 0.06; sy = 1 / sx; }
        else if (p.k === 'snail') sx = 1 + Math.sin(t * 3 + p.bob) * 0.05;
        else if (p.k === 'aphid' || p.k === 'beetle') rot = Math.sin(t * 14 + p.bob) * 0.06;
        else if (p.k === 'moth') sy = 0.75 + Math.abs(Math.sin(t * 13 + p.bob)) * 0.35;
        else if (p.k === 'crow') sy = 0.9 + Math.abs(Math.sin(t * 7 + p.bob)) * 0.14;
        else if (p.k === 'mole') sx = 1 + Math.sin(t * 8 + p.bob) * 0.04;
        var lift = meta.fly ? 0.38 + Math.sin(t * 3 + p.bob) * 0.07 : 0;
        if (p.flee) {
          var f = p.flee / 0.9;
          ay -= f * 0.9;
          ax += Math.sin(f * 9) * 0.12;
          alpha = 1 - f;
          rot += f * 0.5;
        }
        var flash = 0;
        if (p.hit) {
          var k = p.hit / 0.16;
          sx *= 1 + 0.25 * k; sy *= 1 - 0.2 * k;
          flash = 0.55 * k;
        }
        if (!p.flee) {
          ctx.fillStyle = P.shadow;
          ctx.beginPath();
          ctx.ellipse(X(ax), Y(ay + 0.24), cs * meta.size * (meta.fly ? 0.24 : 0.32), cs * 0.07, 0, 0, TAU);
          ctx.fill();
        }
        /* 鼹鼠钻在地下：只看到一道拱起来的土 */
        if (p.under && !p.flee) {
          ctx.fillStyle = MG.theme.dark ? '#7a6a55' : '#c9a27c';
          ctx.beginPath();
          ctx.ellipse(X(ax), Y(ay + 0.2 + Math.sin(t * 12 + p.bob) * 0.03), cs * 0.26, cs * 0.14, 0, Math.PI, 0);
          ctx.fill();
          return;
        }
        /* 贴图底边落在 ay + 0.24（地面），飞的再抬高 */
        drawSprite(ctx, meta.art, ax, ay + 0.24 - lift - meta.size / 2, meta.size, { flip: p.dx < 0, alpha: alpha, sx: sx, sy: sy, rot: rot, flash: flash });
        var top = ay + 0.24 - lift - meta.size;
        if (p.slow && !p.flee) {
          ctx.save();
          ctx.fillStyle = '#e5c36a';
          ctx.globalAlpha = 0.75;
          for (var q = 0; q < 3; q++) {
            var aa = t * 3 + q * 2.1;
            ctx.beginPath();
            ctx.arc(X(ax + Math.cos(aa) * 0.2), Y(top + Math.sin(aa) * 0.05), cs * 0.035, 0, TAU);
            ctx.fill();
          }
          ctx.restore();
        }
        if (!p.flee && p.hp < p.max) {
          var bw = Math.min(1.1, meta.size * 0.8) * cs, bh = Math.max(3, cs * 0.065);
          var bx = X(ax) - bw / 2, by = Y(ay + 0.34);
          ctx.fillStyle = 'rgba(60,50,40,.22)';
          MG.roundRect(ctx, bx, by, bw, bh, bh / 2);
          ctx.fill();
          ctx.fillStyle = meta.boss ? '#d9796c' : '#e59a62';
          MG.roundRect(ctx, bx, by, Math.max(bh, bw * p.hp / p.max), bh, bh / 2);
          ctx.fill();
        }
      }

      function drawBee(ctx, x, y, dir, scale) {
        var r = cs * 0.09 * (scale || 1);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(dir, 1);
        var flap = Math.abs(Math.sin(S.t * 40)) * 0.6 + 0.4;
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.9, r * 0.6, r * 0.45 * flap, -0.4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f0cf7a';
        ctx.strokeStyle = '#5a4a3e';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.72, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#5a4a3e';
        ctx.fillRect(-r * 0.25, -r * 0.65, r * 0.2, r * 1.3);
        ctx.fillRect(r * 0.25, -r * 0.6, r * 0.18, r * 1.2);
        ctx.restore();
      }

      function drawShot(ctx, s) {
        if (s.kind === 'tongue') {
          var k = s.t < 0.11 ? s.t / 0.11 : 1 - (s.t - 0.11) / 0.13;
          k = MG.clamp(k, 0, 1);
          var hx = X(s.home.x), hy = Y(s.home.y - 0.22);
          var ex = hx + (X(s.tx) - hx) * k, ey = hy + (Y(s.ty) - hy) * k;
          ctx.save();
          ctx.strokeStyle = '#e08a8a';
          ctx.lineWidth = Math.max(2, cs * 0.07);
          ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.fillStyle = '#d9707a';
          ctx.beginPath(); ctx.arc(ex, ey, cs * 0.08, 0, TAU); ctx.fill();
          ctx.restore();
          return;
        }
        if (s.kind === 'bee') {
          ctx.save();
          if (s.fade) ctx.globalAlpha = Math.max(0, 1 - s.fade / 0.5);
          drawBee(ctx, X(s.x), Y(s.y), Math.cos(s.a) < 0 ? -1 : 1, 1);
          ctx.restore();
          return;
        }
        var br = cs * 0.13;
        ctx.save();
        ctx.translate(X(s.x), Y(s.y));
        ctx.rotate(s.a + Math.PI / 2);
        var flap = Math.abs(Math.sin(S.t * 30));
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath(); ctx.ellipse(-br * 0.9, br * 0.2, br * 0.7 * flap + 0.5, br * 0.4, 0.5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(br * 0.9, br * 0.2, br * 0.7 * flap + 0.5, br * 0.4, -0.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#d9675c';
        ctx.strokeStyle = '#5a4a3e';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, 0, br, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#5a4a3e';
        ctx.beginPath(); ctx.arc(0, -br * 0.9, br * 0.45, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -br); ctx.lineTo(0, br); ctx.stroke();
        ctx.beginPath(); ctx.arc(-br * 0.45, 0.1 * br, br * 0.2, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(br * 0.45, 0.3 * br, br * 0.2, 0, TAU); ctx.fill();
        ctx.restore();
      }

      /* -------------------------------------------------- 主循环 */
      var raf = 0;
      function frame(now) {
        if (!S.running) return;
        raf = requestAnimationFrame(frame);
        if (!S.last) S.last = now;
        var busy = S.queue.length || S.pests.length || S.shots.length || S.parts.length || S.texts.length || S.coins.length || S.banner;
        /* 省电：没有虫子时只有蝴蝶和云影在动，隔一帧画一次 */
        if (!busy && !S.dirty) { S.skip ^= 1; if (S.skip) return; }
        var dt = Math.min(0.06, (now - S.last) / 1000);
        S.last = now;
        stepAmbient(dt);
        if (S.phase === 'play') {
          for (var k = 0; k < S.speed && S.running; k++) step(dt);
        } else {
          S.t += dt;
          stepFx(dt);
        }
        music.busy(!!(S.queue.length || S.pests.length));
        if (S.running) draw();
        S.dirty = false;
      }

      /* -------------------------------------------------- 输入 */
      function cellAt(e) {
        var rect = canvas.getBoundingClientRect();
        var x = (e.clientX - rect.left) * (view.w / rect.width);
        var y = (e.clientY - rect.top) * (view.h / rect.height);
        var c = Math.floor((x - ox) / cs), r = Math.floor((y - oy) / cs);
        if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return null;
        return { c: c, r: r };
      }

      var offDown = MG.on(canvas, 'pointerdown', function (e) {
        if (!S.running || S.phase !== 'play') return;
        var cell = cellAt(e);
        if (!cell) return;
        if (e.cancelable) e.preventDefault();
        var t = towerAt(cell.c, cell.r);
        if (t) { select(S.sel === t ? null : t); return; }
        if (S.armed) { S.hover = cell; place(cell.c, cell.r); return; }
        if (S.sel) select(null);
      });
      var offMove = MG.on(canvas, 'pointermove', function (e) {
        if (!S.armed || e.pointerType === 'touch') return;
        var cell = cellAt(e);
        if (cell && S.hover && cell.c === S.hover.c && cell.r === S.hover.r) return;
        S.hover = cell;
        S.dirty = true;
      });
      var offLeave = MG.on(canvas, 'pointerleave', function () { if (S.hover) { S.hover = null; S.dirty = true; } });

      var offKey = MG.on(window, 'keydown', function (e) {
        if (!S.running || e.metaKey || e.ctrlKey || e.altKey) return;
        var k = e.key;
        if (S.phase === 'pick') {
          if (k === 'Enter') { e.preventDefault(); beginPlay(); }
          return;
        }
        if (k >= '1' && k <= '6' && k.length === 1) { arm(TOWER_KEYS[+k - 1]); e.preventDefault(); }
        else if (k === 'n' || k === 'N') nextWave();
        else if (k === 'f' || k === 'F') toggleSpeed();
        else if (k === 'm' || k === 'M') toggleMusic();
        else if ((k === 'u' || k === 'U') && S.sel) upgrade();
        else if ((k === 'x' || k === 'X' || k === 'Delete' || k === 'Backspace') && S.sel) sell();
      });

      function refit() { if (!S.wave && !S.towers.length) geometry(); layout(); draw(); }
      var ro = w.ResizeObserver ? new w.ResizeObserver(refit) : null;
      if (ro) ro.observe(field);
      var offResize = ro ? function () { ro.disconnect(); } : MG.on(window, 'resize', refit);

      geometry();
      buildBar();
      layout();
      hud();
      MG.art.ready(function () { spr = {}; S.dirty = true; draw(); });
      draw();

      /* 调试：?debug 时暴露内部，方便跑平衡测试 */
      if (/[?&]debug\b/.test(location.search)) {
        w.__garden = {
          S: function () { return S; }, step: step, next: nextWave, begin: beginPlay,
          setMap: function (id, md) { mapId = id; mode = md || 'classic'; geometry(true); layout(); },
          place: function (k, c, r) { S.armed = k; place(c, r); S.armed = null; },
          upgrade: function (t) { S.sel = t; upgrade(); S.sel = null; },
          buildable: function (c, r) { return buildable(c, r); },
          dims: function () { return { COLS: COLS, ROWS: ROWS, onPath: onPath }; }
        };
      }

      return {
        start: function () {
          cancelAnimationFrame(raf);
          music.stop();
          fresh();
          S.running = true;
          buildBar();
          showPick();
          raf = requestAnimationFrame(frame);
        },
        pause: function () {
          if (!S.running) return;
          S.running = false;
          cancelAnimationFrame(raf);
          music.stop();
        },
        resume: function () {
          if (S.running || S.over) return;
          S.running = true;
          S.last = 0;
          S.dirty = true;
          if (pref.music && S.phase === 'play') music.start();
          raf = requestAnimationFrame(frame);
        },
        destroy: function () {
          S.running = false;
          cancelAnimationFrame(raf);
          music.stop();
          offDown(); offMove(); offLeave(); offKey(); offResize();
        }
      };
    }
  });
})(window);
