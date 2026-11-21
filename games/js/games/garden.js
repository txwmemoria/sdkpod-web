/* =========================================================================
   小游戏 · 菜园守卫
   蚜虫、毛毛虫和蜗牛沿着田埂小路去偷吃白菜。在路边摆瓢虫小屋、稻草人和
   洒水壶，把它们「劝走」——不打不杀，被赶走的虫子会晃晃悠悠地飘走。
   下一波什么时候来由你决定，不催；守住 12 波就赢。
   竖着拿手机时整张地图转 90°，格子更大更好点。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var WAVES = 12;
  var CABBAGES = 10;
  var START_SEEDS = 70;
  var BAR = 58;

  /* 横版 16×10。小路拐角（格子坐标），最后一段走进右下的菜畦 */
  var COLS0 = 16, ROWS0 = 10;
  var ROUTE = [[-1, 1], [4, 1], [4, 6], [1, 6], [1, 8], [8, 8], [8, 3], [12, 3], [12, 7], [14.2, 7]];
  var PATCH = { c: 14, r: 6, w: 2, h: 3 };

  var PESTS = {
    aphid: { hp: 3, speed: 1.55, seeds: 2, size: 0.56, art: 'aphid' },
    caterpillar: { hp: 8, speed: 0.95, seeds: 4, size: 0.86, art: 'caterpillar' },
    snail: { hp: 24, speed: 0.52, seeds: 9, size: 0.92, art: 'snail' }
  };

  var TOWERS = {
    ladybug: { cost: 20, art: 'td_ladybug', dmg: [2, 3, 5], range: [2.3, 2.6, 2.9], cd: [0.8, 0.68, 0.56] },
    scarecrow: { cost: 25, art: 'td_scarecrow', slow: [0.4, 0.5, 0.6], range: [1.7, 2.0, 2.3] },
    can: { cost: 35, art: 'td_can', dmg: [2, 3, 4], range: [1.5, 1.75, 2.0], cd: [1.5, 1.35, 1.2] }
  };
  var TOWER_KEYS = ['ladybug', 'scarecrow', 'can'];

  function upCost(t) { return TOWERS[t.type].cost * t.lv; }
  function refund(t) { return Math.floor(t.spent * 0.7); }

  /* 第 n 波（从 1 起）出场名单：毛毛虫打底，第 2 波起混进蚜虫群，第 4 波起有蜗牛 */
  function waveList(n) {
    var out = [];
    var cat = 3 + n;
    var aph = n >= 2 ? n * 2 : 0;
    var sna = n >= 4 ? Math.floor((n - 2) / 2) : 0;
    var i;
    for (i = 0; i < cat; i++) out.push({ k: 'caterpillar', gap: 1.1 });
    for (i = 0; i < aph; i++) out.splice(Math.min(out.length, 2 + i * 2), 0, { k: 'aphid', gap: 0.45 });
    for (i = 0; i < sna; i++) out.splice(Math.min(out.length, 3 + i * 4), 0, { k: 'snail', gap: 1.6 });
    return out;
  }

  MG.register({
    id: 'garden',
    name: '菜园守卫',
    icon: '🥬',
    accent: '#7fae73',
    tagline: '虫子们排着队来偷白菜。在小路边摆上瓢虫、稻草人和洒水壶，把它们劝回去。',
    tags: ['策略', '塔防'],
    duration: '约 10 分钟',
    howto: '从下方选一样帮手，点路边的草地放下。瓢虫小屋会派瓢虫去顶虫子，稻草人让附近的虫子走慢，洒水壶一圈圈浇水。赶走虫子得种子，用种子添帮手或升级。准备好了再放下一波；守住 12 波就赢。',
    controls: [['1 / 2 / 3', '选帮手'], ['点草地', '放下'], ['点帮手', '升级 · 收回'], ['N', '下一波'], ['F', '加速']],

    mount: function (stage, host) {
      stage.textContent = '';
      var field = MG.h('div', 'gd-field');
      var canvas = document.createElement('canvas');
      field.appendChild(canvas);
      stage.appendChild(field);
      var bar = MG.h('div', 'gd-bar');
      stage.appendChild(bar);

      /* 竖屏（手机竖着拿）：地图转置。还没开始摆东西时，尺寸变了可以重新判断 */
      var tall = null, COLS, ROWS, route, patch, segs, L, onPath, cabbageSpots;
      function geometry() {
        var rect = stage.getBoundingClientRect();
        var t = rect.width > 0 ? rect.height > rect.width * 1.05 : !!(w.matchMedia && w.matchMedia('(max-width: 620px)').matches);
        if (t === tall) return;
        tall = t;
        COLS = tall ? ROWS0 : COLS0;
        ROWS = tall ? COLS0 : ROWS0;
        route = ROUTE.map(function (p) { return tall ? [p[1], p[0]] : [p[0], p[1]]; });
        patch = tall ? { c: PATCH.r, r: PATCH.c, w: PATCH.h, h: PATCH.w } : PATCH;
        segs = [];
        L = 0;
        onPath = {};
        for (var i = 0; i < route.length - 1; i++) {
          var a = route[i], b = route[i + 1];
          var len = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
          segs.push({ a: a, b: b, at: L, len: len, dx: Math.sign(b[0] - a[0]), dy: Math.sign(b[1] - a[1]) });
          L += len;
          var steps = Math.ceil(len);
          for (var s = 0; s <= steps; s++) {
            var x = Math.round(a[0] + (b[0] - a[0]) * Math.min(1, s / len));
            var y = Math.round(a[1] + (b[1] - a[1]) * Math.min(1, s / len));
            onPath[x + ',' + y] = 1;
          }
        }
        /* 白菜：菜畦里两行五棵 */
        cabbageSpots = [];
        for (var k = 0; k < CABBAGES; k++) {
          var u = k % 2, v = Math.floor(k / 2);
          if (tall) cabbageSpots.push({ x: patch.c + 0.34 + v * (patch.w - 0.68) / 4, y: patch.r + 0.5 + u });
          else cabbageSpots.push({ x: patch.c + 0.5 + u, y: patch.r + 0.34 + v * (patch.h - 0.68) / 4 });
        }
        bg = null;
      }

      function posAt(d) {
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
        return c >= 0 && r >= 0 && c < COLS && r < ROWS && !onPath[c + ',' + r] && !inPatch(c, r) && !towerAt(c, r);
      }

      /* ---------- 状态 ---------- */
      var S;
      function fresh() {
        S = {
          running: false, over: false,
          wave: 0, queue: [], spawnT: 0,
          seeds: START_SEEDS, cabbages: CABBAGES,
          score: 0, shooed: 0,
          pests: [], towers: [], bugs: [], rings: [], puffs: [],
          armed: null, sel: null, hover: null,
          speed: 1, last: 0, t: 0, dirty: true
        };
      }
      fresh();

      function towerAt(c, r) {
        for (var i = 0; i < S.towers.length; i++) if (S.towers[i].c === c && S.towers[i].r === r) return S.towers[i];
        return null;
      }

      /* ---------- 画布与坐标 ---------- */
      var view = null, cs = 1, ox = 0, oy = 0, bg = null, bgKey = '';
      var spr = {};

      function layout() {
        view = MG.fitCanvas(canvas);
        cs = Math.min(view.w / COLS, view.h / ROWS);
        ox = (view.w - cs * COLS) / 2;
        oy = (view.h - cs * ROWS) / 2;
        spr = {};
        bg = null;
        S.dirty = true;
      }

      function sprite(name, px) {
        px = Math.max(8, Math.round(px));
        var key = name + '@' + px;
        if (spr[key]) return spr[key];
        var img = MG.art.image(name);
        if (!img.complete || !img.naturalWidth) return null;
        var dpr = Math.min(w.devicePixelRatio || 1, 2);
        var c = document.createElement('canvas');
        c.width = c.height = Math.round(px * dpr);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        spr[key] = c;
        return c;
      }

      function drawSprite(ctx, name, x, y, size, flip, alpha) {
        var px = size * cs;
        var c = sprite(name, px);
        if (!c) return;
        ctx.save();
        if (alpha !== undefined) ctx.globalAlpha = alpha;
        ctx.translate(ox + x * cs, oy + y * cs);
        if (flip) ctx.scale(-1, 1);
        ctx.drawImage(c, -px / 2, -px / 2, px, px);
        ctx.restore();
      }

      function palette() {
        var dark = MG.theme.dark;
        return dark ? {
          grass: '#3d4a3c', grass2: '#435241', path: '#6a5a46', pathIn: '#77664f', edge: 'rgba(0,0,0,.18)',
          soil: '#5a4838', soilRow: '#4c3c2f', dot: 'rgba(255,255,255,.07)', flower: ['#c9a5a0', '#d6c38d', '#a9b8cf'],
          ring: 'rgba(160,200,230,.55)', range: 'rgba(230,240,220,.10)', rangeLine: 'rgba(230,240,220,.35)', bad: 'rgba(220,130,120,.18)'
        } : {
          grass: '#cfe2bb', grass2: '#c6dcb0', path: '#e6d3ad', pathIn: '#efe0c0', edge: 'rgba(120,96,70,.16)',
          soil: '#c9a27c', soilRow: '#b88f6a', dot: 'rgba(90,110,70,.09)', flower: ['#e8a7a0', '#f0cf7a', '#a9c3e0'],
          ring: 'rgba(110,160,200,.6)', range: 'rgba(90,120,80,.10)', rangeLine: 'rgba(90,120,80,.4)', bad: 'rgba(210,110,100,.16)'
        };
      }

      /* 静态底图：草地、小路、菜畦。尺寸或主题变了才重画 */
      function buildBg() {
        var key = view.w + 'x' + view.h + (MG.theme.dark ? 'd' : 'l');
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

        c.fillStyle = P.grass;
        MG.roundRect(c, 0, 0, COLS * cs, ROWS * cs, cs * 0.4);
        c.fill();
        c.save();
        MG.roundRect(c, 0, 0, COLS * cs, ROWS * cs, cs * 0.4);
        c.clip();
        for (var r = 0; r < ROWS; r++) {
          for (var q = 0; q < COLS; q++) {
            if ((r + q) % 2) { c.fillStyle = P.grass2; c.fillRect(q * cs, r * cs, cs, cs); }
          }
        }
        /* 草地上的小点和小花：固定种子，每次都一样 */
        var seed = 7;
        function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
        for (var i = 0; i < COLS * ROWS * 0.9; i++) {
          var fx = rnd() * COLS, fy = rnd() * ROWS;
          var cc = Math.floor(fx), rr = Math.floor(fy);
          if (onPath[cc + ',' + rr] || inPatch(cc, rr)) continue;
          if (rnd() < 0.12) {
            c.fillStyle = P.flower[Math.floor(rnd() * 3)];
            for (var k = 0; k < 4; k++) {
              c.beginPath();
              c.arc(fx * cs + Math.cos(k * 1.57) * cs * 0.05, fy * cs + Math.sin(k * 1.57) * cs * 0.05, cs * 0.045, 0, 6.2832);
              c.fill();
            }
          } else {
            c.fillStyle = P.dot;
            c.beginPath();
            c.arc(fx * cs, fy * cs, cs * 0.03, 0, 6.2832);
            c.fill();
          }
        }

        /* 小路：一条粗的圆角折线，再叠一条浅色的 */
        function routeLine(width, color) {
          c.strokeStyle = color;
          c.lineWidth = width;
          c.lineCap = 'round';
          c.lineJoin = 'round';
          c.beginPath();
          route.forEach(function (p, j) {
            var x = (p[0] + 0.5) * cs, y = (p[1] + 0.5) * cs;
            if (j) c.lineTo(x, y); else c.moveTo(x, y);
          });
          c.stroke();
        }
        routeLine(cs * 0.86, P.edge);
        routeLine(cs * 0.78, P.path);
        routeLine(cs * 0.42, P.pathIn);

        /* 菜畦 */
        c.fillStyle = P.soil;
        MG.roundRect(c, patch.c * cs + 3, patch.r * cs + 3, patch.w * cs - 6, patch.h * cs - 6, cs * 0.25);
        c.fill();
        c.strokeStyle = P.soilRow;
        c.lineWidth = 2;
        var nrow = tall ? patch.w : patch.h;
        for (var j = 1; j < nrow * 2; j++) {
          c.beginPath();
          if (tall) {
            var xx = patch.c * cs + (j / (nrow * 2)) * patch.w * cs;
            c.moveTo(xx, patch.r * cs + 8); c.lineTo(xx, (patch.r + patch.h) * cs - 8);
          } else {
            var yy = patch.r * cs + (j / (nrow * 2)) * patch.h * cs;
            c.moveTo(patch.c * cs + 8, yy); c.lineTo((patch.c + patch.w) * cs - 8, yy);
          }
          c.stroke();
        }
        c.restore();
      }


      /* ---------- HUD 与工具栏 ---------- */
      var tools = {};
      var waveBtn, speedBtn, selBox, toolBox, upBtn, sellBtn;

      function buildBar() {
        bar.textContent = '';
        toolBox = MG.h('div', 'gd-tools');
        TOWER_KEYS.forEach(function (k, i) {
          var b = MG.h('button', 'gd-tool');
          b.type = 'button';
          b.dataset.t = k;
          var ic = MG.h('span', 'gd-ico');
          ic.innerHTML = MG.art.html(TOWERS[k].art);
          b.appendChild(ic);
          var tx = MG.h('span', 'gd-txt');
          tx.appendChild(MG.h('span', 'gd-name', MG.t('g.garden.t.' + k)));
          tx.appendChild(MG.h('span', 'gd-cost', '● ' + TOWERS[k].cost));
          b.appendChild(tx);
          b.title = MG.t('g.garden.t.' + k) + ' · ' + MG.t('g.garden.d.' + k) + ' (' + (i + 1) + ')';
          b.addEventListener('click', function () { b.blur(); arm(k); });
          tools[k] = b;
          toolBox.appendChild(b);
        });
        bar.appendChild(toolBox);

        selBox = MG.h('div', 'gd-tools gd-selbox');
        selBox.hidden = true;
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

        bar.appendChild(MG.h('span', 'gd-spacer'));
        speedBtn = MG.h('button', 'btn ghost gd-speed', '×1');
        speedBtn.type = 'button';
        speedBtn.title = MG.t('g.garden.speed') + ' (F)';
        speedBtn.addEventListener('click', function () { speedBtn.blur(); toggleSpeed(); });
        bar.appendChild(speedBtn);
        waveBtn = MG.h('button', 'btn primary gd-wave', '');
        waveBtn.type = 'button';
        waveBtn.addEventListener('click', function () { waveBtn.blur(); nextWave(); });
        bar.appendChild(waveBtn);
        paintBar();
      }

      function paintBar() {
        TOWER_KEYS.forEach(function (k) {
          var b = tools[k];
          b.disabled = S.seeds < TOWERS[k].cost || S.over;
          b.classList.toggle('on', S.armed === k);
        });
        var t = S.sel;
        toolBox.hidden = !!t;
        selBox.hidden = !t;
        if (t) {
          var maxed = t.lv >= 3;
          upBtn.innerHTML = '';
          var ic = MG.h('span', 'gd-ico');
          ic.innerHTML = MG.art.html(TOWERS[t.type].art);
          upBtn.appendChild(ic);
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
        var busy = S.queue.length > 0;
        waveBtn.disabled = S.over || busy || S.wave >= WAVES;
        waveBtn.textContent = S.wave >= WAVES ? MG.t('g.garden.last')
          : MG.t(S.wave === 0 ? 'g.garden.go' : 'g.garden.next', { n: S.wave + 1 });
        speedBtn.textContent = '×' + S.speed;
        speedBtn.classList.toggle('on', S.speed > 1);
      }

      function hud() {
        var m = {};
        m[MG.t('g.garden.wave')] = S.wave + ' / ' + WAVES;
        m[MG.t('g.garden.seeds')] = S.seeds;
        m[MG.t('g.garden.cabbages')] = S.cabbages + ' / ' + CABBAGES;
        host.meta(m);
        host.score(S.score);
      }

      function changed() { paintBar(); hud(); S.dirty = true; }

      /* ---------- 操作 ---------- */

      function arm(k) {
        if (S.over) return;
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
        S.towers.push({ type: k, c: c, r: r, x: c + 0.5, y: r + 0.5, lv: 1, cd: 0, spent: cost, sway: 0, pop: 0.0001 });
        MG.audio.play('good');
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
        MG.audio.play('perfect');
        changed();
      }

      function sell() {
        var t = S.sel;
        if (!t) return;
        S.seeds += refund(t);
        S.towers.splice(S.towers.indexOf(t), 1);
        S.bugs = S.bugs.filter(function (b) { return b.home !== t; });
        S.sel = null;
        MG.audio.play('click');
        changed();
      }

      function toggleSpeed() {
        S.speed = S.speed === 1 ? 2 : 1;
        changed();
      }

      function nextWave() {
        if (S.over || S.queue.length || S.wave >= WAVES) return;
        /* 场上还有虫子就提前叫下一波：给一点种子作为奖励 */
        if (S.pests.some(function (p) { return !p.flee; })) {
          S.seeds += 5;
          MG.toast(MG.t('g.garden.early'));
        }
        S.wave++;
        S.queue = waveList(S.wave);
        S.spawnT = 0;
        S.hpMul = 1 + 0.22 * (S.wave - 1) + 0.05 * (S.wave - 1) * (S.wave - 1);
        MG.audio.play('tick');
        changed();
      }

      /* ---------- 模拟 ---------- */

      function spawn(k) {
        var d = PESTS[k];
        var hp = Math.round(d.hp * S.hpMul);
        S.pests.push({ k: k, d: -0.3, hp: hp, max: hp, speed: d.speed, slow: 0, hit: 0, flee: 0, x: 0, y: 0, dx: 1, dy: 0, bob: MG._rng() * 6 });
      }

      function shoo(p) {
        if (p.flee) return;
        p.flee = 0.0001;
        var gain = PESTS[p.k].seeds;
        S.seeds += gain;
        S.score += gain * 10;
        S.shooed++;
        S.puffs.push({ x: p.x, y: p.y - 0.3, t: 0, text: '+' + gain });
        changed();
      }

      function dist2(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }

      function step(dt) {
        S.t += dt;

        /* 出场 */
        if (S.queue.length) {
          S.spawnT -= dt;
          if (S.spawnT <= 0) {
            var nx = S.queue.shift();
            spawn(nx.k);
            S.spawnT = nx.gap;
            if (!S.queue.length) paintBar();
          }
        }

        /* 稻草人：范围内的虫子减速（取最强的那个） */
        var i, j, p, t;
        for (i = 0; i < S.pests.length; i++) S.pests[i].slow = 0;
        for (j = 0; j < S.towers.length; j++) {
          t = S.towers[j];
          if (t.type !== 'scarecrow') continue;
          var R = TOWERS.scarecrow.range[t.lv - 1];
          var near = false;
          for (i = 0; i < S.pests.length; i++) {
            p = S.pests[i];
            if (p.flee || dist2(p, t) > R * R) continue;
            p.slow = Math.max(p.slow, TOWERS.scarecrow.slow[t.lv - 1]);
            near = true;
          }
          t.sway = near ? t.sway + dt * 3 : t.sway * 0.9;
        }

        /* 虫子前进 */
        for (i = S.pests.length - 1; i >= 0; i--) {
          p = S.pests[i];
          if (p.flee) {
            p.flee += dt;
            if (p.flee > 0.9) S.pests.splice(i, 1);
            continue;
          }
          p.d += p.speed * (1 - p.slow) * dt;
          p.hit = Math.max(0, p.hit - dt);
          var pos = posAt(p.d);
          p.x = pos.x; p.y = pos.y; p.dx = pos.dx; p.dy = pos.dy;
          if (p.d >= L) {
            S.pests.splice(i, 1);
            S.cabbages--;
            MG.audio.play('bad');
            MG.toast(MG.t('g.garden.nibble', { n: S.cabbages }));
            changed();
            if (S.cabbages <= 0) { end(false); return; }
          }
        }

        /* 帮手们 */
        for (j = 0; j < S.towers.length; j++) {
          t = S.towers[j];
          if (t.pop) { t.pop += dt; if (t.pop > 0.35) t.pop = 0; }
          if (t.type === 'scarecrow') continue;
          var st = TOWERS[t.type];
          var range = st.range[t.lv - 1];
          t.cd -= dt;
          if (t.cd > 0) continue;
          if (t.type === 'ladybug') {
            /* 挑离白菜最近的那只 */
            var best = null;
            for (i = 0; i < S.pests.length; i++) {
              p = S.pests[i];
              if (p.flee || p.d < 0 || dist2(p, t) > range * range) continue;
              if (!best || p.d > best.d) best = p;
            }
            if (best) {
              S.bugs.push({ x: t.x, y: t.y - 0.2, home: t, target: best, dmg: st.dmg[t.lv - 1], back: false, a: 0 });
              t.cd = st.cd[t.lv - 1];
            }
          } else {
            var any = false;
            for (i = 0; i < S.pests.length; i++) {
              p = S.pests[i];
              if (p.flee || p.d < 0 || dist2(p, t) > range * range) continue;
              any = true;
              p.hp -= st.dmg[t.lv - 1];
              p.hit = 0.25;
              if (p.hp <= 0) shoo(p);
            }
            if (any) {
              S.rings.push({ x: t.x, y: t.y, r: range, t: 0 });
              t.cd = st.cd[t.lv - 1];
            }
          }
        }

        /* 飞出去的瓢虫：顶一下虫子就飞回家 */
        for (i = S.bugs.length - 1; i >= 0; i--) {
          var b = S.bugs[i];
          var goal = b.back ? { x: b.home.x, y: b.home.y - 0.2 } : b.target;
          if (!b.back && (b.target.flee || S.pests.indexOf(b.target) < 0)) { b.back = true; continue; }
          var dx = goal.x - b.x, dy = goal.y - b.y;
          var dd = Math.sqrt(dx * dx + dy * dy);
          var v = 7 * dt;
          b.a = Math.atan2(dy, dx);
          if (dd <= v + 0.15) {
            if (b.back) { S.bugs.splice(i, 1); continue; }
            b.target.hp -= b.dmg;
            b.target.hit = 0.25;
            if (b.target.hp <= 0) shoo(b.target);
            b.back = true;
          } else {
            b.x += dx / dd * v;
            b.y += dy / dd * v;
          }
        }

        for (i = S.rings.length - 1; i >= 0; i--) { S.rings[i].t += dt; if (S.rings[i].t > 0.7) S.rings.splice(i, 1); }
        for (i = S.puffs.length - 1; i >= 0; i--) { S.puffs[i].t += dt; if (S.puffs[i].t > 1) S.puffs.splice(i, 1); }

        /* 一波清空 */
        if (S.wave && !S.queue.length && !S.pests.length && !S.waveDone) {
          S.waveDone = true;
          if (S.wave >= WAVES) { end(true); return; }
          var bonus = 6 + S.wave;
          S.seeds += bonus;
          S.score += S.wave * 40;
          MG.toast(MG.t('g.garden.cleared', { n: S.wave, seeds: bonus }));
          MG.audio.play('good');
          changed();
        }
        if (S.queue.length || S.pests.length) S.waveDone = false;
      }

      function end(won) {
        if (S.over) return;
        S.over = true;
        S.running = false;
        cancelAnimationFrame(raf);
        S.armed = null; S.sel = null;
        if (won) S.score += S.cabbages * 150 + 500;
        changed();
        draw();
        MG.audio.play(won ? 'win' : 'over');
        host.finish({
          score: S.score,
          note: won ? MG.t('g.garden.win', { left: S.cabbages, n: S.shooed })
            : MG.t('g.garden.lose', { wave: S.wave, n: S.shooed }),
          meta: { won: won, wave: S.wave, cabbages: S.cabbages, shooed: S.shooed }
        });
      }

      /* ---------- 绘制 ---------- */

      function draw() {
        if (!view) return;
        var ctx = view.ctx;
        var P = palette();
        buildBg();
        ctx.clearRect(0, 0, view.w, view.h);
        ctx.drawImage(bg, 0, 0, view.w, view.h);
        var i, t, p;

        /* 白菜 */
        for (i = 0; i < CABBAGES; i++) {
          var sp = cabbageSpots[i];
          if (i < S.cabbages) drawSprite(ctx, 'cabbage', sp.x, sp.y, tall ? 0.62 : 0.6);
          else {
            ctx.fillStyle = P.soilRow;
            ctx.beginPath();
            ctx.ellipse(ox + sp.x * cs, oy + (sp.y + 0.12) * cs, cs * 0.16, cs * 0.07, 0, 0, 6.2832);
            ctx.fill();
          }
        }

        /* 放置预览 / 选中的范围 */
        var show = null;
        if (S.sel) show = { x: S.sel.x, y: S.sel.y, r: rangeOf(S.sel.type, S.sel.lv), ok: true };
        else if (S.armed && S.hover) show = { x: S.hover.c + 0.5, y: S.hover.r + 0.5, r: rangeOf(S.armed, 1), ok: buildable(S.hover.c, S.hover.r), ghost: S.armed };
        if (show) {
          ctx.save();
          ctx.fillStyle = show.ok ? P.range : P.bad;
          ctx.strokeStyle = P.rangeLine;
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ox + show.x * cs, oy + show.y * cs, show.r * cs, 0, 6.2832);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          if (show.ghost) drawSprite(ctx, TOWERS[show.ghost].art, show.x, show.y, 0.9, false, show.ok ? 0.6 : 0.25);
        }

        /* 水圈 */
        for (i = 0; i < S.rings.length; i++) {
          var rg = S.rings[i];
          var k = rg.t / 0.7;
          ctx.save();
          ctx.globalAlpha = (1 - k) * 0.8;
          ctx.strokeStyle = P.ring;
          ctx.lineWidth = Math.max(1.5, cs * 0.05);
          ctx.setLineDash([cs * 0.08, cs * 0.12]);
          ctx.beginPath();
          ctx.arc(ox + rg.x * cs, oy + rg.y * cs, rg.r * cs * (0.3 + 0.7 * k), 0, 6.2832);
          ctx.stroke();
          ctx.restore();
        }

        /* 帮手（按 y 排序，下面的压住上面的） */
        var list = S.towers.slice().sort(function (a, b) { return a.y - b.y; });
        for (i = 0; i < list.length; i++) {
          t = list[i];
          var pop = t.pop ? 1 + Math.sin(t.pop / 0.35 * Math.PI) * 0.12 : 1;
          ctx.save();
          ctx.fillStyle = 'rgba(60,50,40,.14)';
          ctx.beginPath();
          ctx.ellipse(ox + t.x * cs, oy + (t.y + 0.36) * cs, cs * 0.32, cs * 0.1, 0, 0, 6.2832);
          ctx.fill();
          ctx.restore();
          if (t.type === 'scarecrow' && t.sway) {
            ctx.save();
            ctx.translate(ox + t.x * cs, oy + (t.y + 0.4) * cs);
            ctx.rotate(Math.sin(t.sway) * 0.06);
            ctx.translate(-(ox + t.x * cs), -(oy + (t.y + 0.4) * cs));
            drawSprite(ctx, TOWERS[t.type].art, t.x, t.y, 0.94 * pop);
            ctx.restore();
          } else {
            drawSprite(ctx, TOWERS[t.type].art, t.x, t.y, 0.94 * pop);
          }
          /* 等级：小叶子 */
          for (var lv = 1; lv < t.lv; lv++) {
            ctx.fillStyle = '#7fae73';
            ctx.beginPath();
            ctx.ellipse(ox + (t.x + 0.3 - (lv - 1) * 0.16) * cs, oy + (t.y + 0.36) * cs, cs * 0.07, cs * 0.045, -0.5, 0, 6.2832);
            ctx.fill();
          }
          if (S.sel === t) {
            ctx.save();
            ctx.strokeStyle = MG.theme.accent;
            ctx.lineWidth = 2;
            MG.roundRect(ctx, ox + t.c * cs + 2, oy + t.r * cs + 2, cs - 4, cs - 4, cs * 0.2);
            ctx.stroke();
            ctx.restore();
          }
        }

        /* 虫子 */
        var ps = S.pests.slice().sort(function (a, b) { return a.y - b.y; });
        for (i = 0; i < ps.length; i++) {
          p = ps[i];
          if (p.d < -0.2) continue;
          var meta = PESTS[p.k];
          var bob = Math.sin(S.t * (p.k === 'snail' ? 2 : 6) + p.bob) * 0.03;
          var ax = p.x, ay = p.y + bob - 0.06;
          var alpha = 1;
          if (p.flee) {
            var f = p.flee / 0.9;
            ay -= f * 0.9;
            ax += Math.sin(f * 9) * 0.12;
            alpha = 1 - f;
          }
          /* 被顶到时轻轻一晃（不闪屏） */
          if (p.hit) ax += Math.sin(p.hit * 40) * 0.03;
          var flip = p.dx < 0;
          if (p.slow && !p.flee) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#e5c36a';
            ctx.beginPath();
            ctx.arc(ox + (ax + 0.2) * cs, oy + (ay - meta.size * 0.45) * cs, cs * 0.05, 0, 6.2832);
            ctx.arc(ox + (ax - 0.05) * cs, oy + (ay - meta.size * 0.52) * cs, cs * 0.04, 0, 6.2832);
            ctx.fill();
            ctx.restore();
          }
          drawSprite(ctx, meta.art, ax, ay, meta.size, flip, alpha);
          if (!p.flee && p.hp < p.max) {
            var bw = meta.size * 0.8 * cs, bh = Math.max(3, cs * 0.06);
            var bx = ox + ax * cs - bw / 2, by = oy + (ay + meta.size * 0.42) * cs;
            ctx.fillStyle = 'rgba(60,50,40,.18)';
            MG.roundRect(ctx, bx, by, bw, bh, bh / 2);
            ctx.fill();
            ctx.fillStyle = '#e59a62';
            MG.roundRect(ctx, bx, by, Math.max(bh, bw * p.hp / p.max), bh, bh / 2);
            ctx.fill();
          }
        }

        /* 瓢虫 */
        for (i = 0; i < S.bugs.length; i++) {
          var b = S.bugs[i];
          var bx2 = ox + b.x * cs, by2 = oy + b.y * cs, br = cs * 0.13;
          ctx.save();
          ctx.translate(bx2, by2);
          ctx.rotate(b.a + Math.PI / 2);
          ctx.fillStyle = '#d9675c';
          ctx.strokeStyle = '#5a4a3e';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(0, 0, br, 0, 6.2832); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#5a4a3e';
          ctx.beginPath(); ctx.arc(0, -br * 0.9, br * 0.45, 0, 6.2832); ctx.fill();
          ctx.beginPath(); ctx.moveTo(0, -br); ctx.lineTo(0, br); ctx.stroke();
          ctx.beginPath(); ctx.arc(-br * 0.45, 0.1 * br, br * 0.2, 0, 6.2832); ctx.arc(br * 0.45, 0.3 * br, br * 0.2, 0, 6.2832); ctx.fill();
          ctx.restore();
        }

        /* +种子 */
        ctx.save();
        ctx.font = '700 ' + Math.round(cs * 0.3) + 'px -apple-system,"Segoe UI","Microsoft YaHei",system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (i = 0; i < S.puffs.length; i++) {
          var pf = S.puffs[i];
          ctx.globalAlpha = 1 - pf.t;
          ctx.fillStyle = MG.theme.dark ? '#d6e6c4' : '#5f8a52';
          ctx.fillText(pf.text, ox + pf.x * cs, oy + (pf.y - pf.t * 0.6) * cs);
        }
        ctx.restore();

        /* 开局提示 */
        if (S.wave === 0 && !S.towers.length && S.running) {
          ctx.save();
          ctx.font = '600 ' + Math.max(12, Math.round(cs * 0.26)) + 'px -apple-system,"Segoe UI","Microsoft YaHei",system-ui';
          ctx.textAlign = 'center';
          ctx.fillStyle = MG.theme.muted;
          ctx.fillText(MG.t('g.garden.hint'), view.w / 2, oy + (tall ? 0.6 : ROWS - 0.3) * cs);
          ctx.restore();
        }
      }

      function rangeOf(type, lv) { return TOWERS[type].range[lv - 1]; }

      /* ---------- 主循环 ---------- */
      var raf = 0;
      function frame(now) {
        if (!S.running) return;
        raf = requestAnimationFrame(frame);
        if (!S.last) S.last = now;
        var dt = Math.min(0.05, (now - S.last) / 1000);
        S.last = now;
        var active = S.queue.length || S.pests.length || S.bugs.length || S.rings.length || S.puffs.length;
        var pops = S.towers.some(function (t) { return t.pop || t.sway > 0.01; });
        if (active || pops) {
          var n = S.speed;
          for (var k = 0; k < n && S.running; k++) step(dt);
          draw();
        } else if (S.dirty || (bgKey && bgKey.slice(-1) !== (MG.theme.dark ? 'd' : 'l'))) {
          draw();
          S.dirty = false;
        }
      }

      /* ---------- 输入 ---------- */
      function cellAt(e) {
        var rect = canvas.getBoundingClientRect();
        var x = (e.clientX - rect.left) * (view.w / rect.width);
        var y = (e.clientY - rect.top) * (view.h / rect.height);
        var c = Math.floor((x - ox) / cs), r = Math.floor((y - oy) / cs);
        if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return null;
        return { c: c, r: r };
      }

      var offDown = MG.on(canvas, 'pointerdown', function (e) {
        if (!S.running) return;
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
        var same = cell && S.hover && cell.c === S.hover.c && cell.r === S.hover.r;
        if (same) return;
        S.hover = cell;
        S.dirty = true;
      });
      var offLeave = MG.on(canvas, 'pointerleave', function () { if (S.hover) { S.hover = null; S.dirty = true; } });

      var offKey = MG.on(window, 'keydown', function (e) {
        if (!S.running || e.metaKey || e.ctrlKey || e.altKey) return;
        var k = e.key;
        if (k === '1' || k === '2' || k === '3') { arm(TOWER_KEYS[+k - 1]); e.preventDefault(); }
        else if (k === 'n' || k === 'N') nextWave();
        else if (k === 'f' || k === 'F') toggleSpeed();
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
      /* 调试：?debug 时暴露内部，方便跑平衡测试 */
      if (/[?&]debug\b/.test(location.search)) {
        w.__garden = { S: function () { return S; }, step: step, place: function (k, c, r) { S.armed = k; place(c, r); S.armed = null; },
          upgrade: function (t) { S.sel = t; upgrade(); S.sel = null; }, next: nextWave, buildable: function (c, r) { return buildable(c, r); },
          dims: function () { return { COLS: COLS, ROWS: ROWS, onPath: onPath }; } };
      }
      MG.art.ready(function () { spr = {}; S.dirty = true; draw(); });
      draw();

      return {
        start: function () {
          cancelAnimationFrame(raf);
          fresh();
          geometry();
          layout();
          S.running = true;
          buildBar();
          changed();
          draw();
          raf = requestAnimationFrame(frame);
        },
        pause: function () {
          if (!S.running) return;
          S.running = false;
          cancelAnimationFrame(raf);
        },
        resume: function () {
          if (S.running || S.over) return;
          S.running = true;
          S.last = 0;
          S.dirty = true;
          raf = requestAnimationFrame(frame);
        },
        destroy: function () {
          S.running = false;
          cancelAnimationFrame(raf);
          offDown(); offMove(); offLeave(); offKey(); offResize();
        }
      };
    }
  });
})(window);
