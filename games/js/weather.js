/* =========================================================================
   摸鱼司 · 窗外的天气
   数据来自 Open-Meteo（免费、无需注册、CC BY 4.0，页脚已署名）。
   位置：默认按浏览器时区取一个代表城市，不弹定位权限；
        用户点「用我的位置」才调用 geolocation，坐标只保留两位小数，存在本机。
   结果缓存 30 分钟，大厅反复进出不会重复请求。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var KEY = 'mg.wx';
  var TTL = 30 * 60 * 1000;

  /* 时区 → 代表城市（中文名 / 英文名 / 纬度 / 经度） */
  var ZONES = {
    'Asia/Shanghai': ['上海', 'Shanghai', 31.23, 121.47],
    'Asia/Chongqing': ['重庆', 'Chongqing', 29.56, 106.55],
    'Asia/Harbin': ['哈尔滨', 'Harbin', 45.8, 126.53],
    'Asia/Urumqi': ['乌鲁木齐', 'Ürümqi', 43.83, 87.62],
    'Asia/Hong_Kong': ['香港', 'Hong Kong', 22.32, 114.17],
    'Asia/Macau': ['澳门', 'Macau', 22.2, 113.55],
    'Asia/Taipei': ['台北', 'Taipei', 25.03, 121.56],
    'Asia/Tokyo': ['东京', 'Tokyo', 35.68, 139.69],
    'Asia/Seoul': ['首尔', 'Seoul', 37.57, 126.98],
    'Asia/Singapore': ['新加坡', 'Singapore', 1.35, 103.82],
    'Asia/Kuala_Lumpur': ['吉隆坡', 'Kuala Lumpur', 3.14, 101.69],
    'Asia/Bangkok': ['曼谷', 'Bangkok', 13.76, 100.5],
    'Asia/Kolkata': ['新德里', 'New Delhi', 28.61, 77.21],
    'Asia/Dubai': ['迪拜', 'Dubai', 25.2, 55.27],
    'Europe/London': ['伦敦', 'London', 51.51, -0.13],
    'Europe/Paris': ['巴黎', 'Paris', 48.86, 2.35],
    'Europe/Berlin': ['柏林', 'Berlin', 52.52, 13.4],
    'Europe/Amsterdam': ['阿姆斯特丹', 'Amsterdam', 52.37, 4.9],
    'Europe/Madrid': ['马德里', 'Madrid', 40.42, -3.7],
    'Europe/Rome': ['罗马', 'Rome', 41.9, 12.5],
    'Europe/Moscow': ['莫斯科', 'Moscow', 55.76, 37.62],
    'America/New_York': ['纽约', 'New York', 40.71, -74.01],
    'America/Toronto': ['多伦多', 'Toronto', 43.65, -79.38],
    'America/Chicago': ['芝加哥', 'Chicago', 41.88, -87.63],
    'America/Denver': ['丹佛', 'Denver', 39.74, -104.99],
    'America/Los_Angeles': ['洛杉矶', 'Los Angeles', 34.05, -118.24],
    'America/Vancouver': ['温哥华', 'Vancouver', 49.28, -123.12],
    'America/Sao_Paulo': ['圣保罗', 'São Paulo', -23.55, -46.63],
    'Australia/Sydney': ['悉尼', 'Sydney', -33.87, 151.21],
    'Australia/Melbourne': ['墨尔本', 'Melbourne', -37.81, 144.96],
    'Pacific/Auckland': ['奥克兰', 'Auckland', -36.85, 174.76]
  };

  function load() {
    try { return JSON.parse(w.localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function save(d) {
    try { w.localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* 隐私模式 */ }
  }

  function place() {
    var d = load();
    if (d.loc && typeof d.loc.lat === 'number') return { lat: d.loc.lat, lon: d.loc.lon, zh: '这里', en: 'here', mine: true };
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    var z = ZONES[tz];
    if (!z) return null;
    return { lat: z[2], lon: z[3], zh: z[0], en: z[1], mine: false };
  }

  /* WMO 天气代码 → 七种场景 */
  function kindOf(code) {
    if (code === 0 || code === 1) return 'clear';
    if (code === 2) return 'cloudy';
    if (code === 3) return 'overcast';
    if (code === 45 || code === 48) return 'fog';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 95) return 'storm';
    return 'cloudy';
  }

  function seasonOf(date, lat) {
    var m = date.getMonth() + 1;
    var s = m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
    if (lat < 0) s = { spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' }[s];
    return s;
  }

  function fetchNow(p) {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + p.lat.toFixed(2) +
      '&longitude=' + p.lon.toFixed(2) +
      '&current=temperature_2m,weather_code,is_day&timezone=auto';
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('weather ' + r.status);
      return r.json();
    }).then(function (j) {
      var c = j.current || {};
      return {
        code: c.weather_code,
        kind: kindOf(c.weather_code),
        temp: Math.round(c.temperature_2m),
        isDay: c.is_day === 1,
        at: Date.now()
      };
    });
  }

  MG.weather = {
    /** 立即可用的「季节」：不依赖网络 */
    season: function () {
      var p = place();
      return seasonOf(new Date(), p ? p.lat : 30);
    },

    /** 取天气：先给缓存（如果有），再按需联网；cb(result|null) 可能被调用两次 */
    get: function (cb) {
      var p = place();
      if (!p) { cb(null); return; }
      var d = load();
      var key = p.lat.toFixed(2) + ',' + p.lon.toFixed(2);
      var fresh = d.now && d.now.key === key && Date.now() - d.now.at < TTL;
      if (d.now && d.now.key === key) cb(merge(d.now, p));
      if (fresh || !w.fetch) return;
      fetchNow(p).then(function (now) {
        now.key = key;
        var d2 = load();
        d2.now = now;
        save(d2);
        cb(merge(now, p));
      }).catch(function () { if (!d.now) cb(null); });
    },

    /** 用户主动点「用我的位置」 */
    locate: function (done) {
      if (!navigator.geolocation) { done(false); return; }
      navigator.geolocation.getCurrentPosition(function (pos) {
        var d = load();
        d.loc = { lat: Math.round(pos.coords.latitude * 100) / 100, lon: Math.round(pos.coords.longitude * 100) / 100 };
        d.now = null;
        save(d);
        done(true);
      }, function () { done(false); }, { timeout: 8000, maximumAge: 3600000 });
    },

    usingMine: function () { var p = place(); return !!(p && p.mine); }
  };

  function merge(now, p) {
    return {
      kind: now.kind,
      temp: now.temp,
      isDay: now.isDay,
      city: MG.i18n && MG.i18n.lang === 'en' ? p.en : p.zh,
      mine: p.mine,
      season: seasonOf(new Date(), p.lat)
    };
  }
})(window);
