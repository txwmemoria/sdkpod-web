/* =========================================================================
   摸鱼司 · 插画素材
   全部是手写的 SVG，同一套风格：48×48 画布、暖棕描边、田园色平涂、一点高光。
   颜色固定（不跟主题变量走），所以既能塞进 DOM，也能转成位图给 Canvas 用。
   用法：
     MG.art.html('teacup')        → <svg …>（插进 DOM）
     MG.art.image('teacup')       → HTMLImageElement（给 Canvas drawImage，首次加载是异步的）
     MG.art.ready(fn)             → 所有位图解码完成后回调
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var O = '#5a4a3e';           /* 描边 */
  var SW = 'stroke="' + O + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';
  var HI = 'fill="#fff" opacity=".55"';

  var P = {
    /* ---------------- 田园小物 ---------------- */
    teacup:
      '<ellipse cx="24" cy="38" rx="17" ry="4" fill="#e8dcc8" ' + SW + '/>' +
      '<path d="M10 19h26v6c0 8-5.5 12-13 12S10 33 10 25z" fill="#f6efe2" ' + SW + '/>' +
      '<path d="M36 22h2.5a5 5 0 0 1 0 10H35" fill="none" ' + SW + '/>' +
      '<ellipse cx="23" cy="19" rx="13" ry="3" fill="#a9c79a" ' + SW + '/>' +
      '<path d="M11.5 25.5h23" stroke="#9cc4a4" stroke-width="3"/>' +
      '<path d="M19 13c-2-3 2-4 0-7M26 13c-2-3 2-4 0-7" fill="none" stroke="#b9ab9b" stroke-width="2" stroke-linecap="round"/>',
    sunflower:
      (function () {
        var s = '';
        for (var i = 0; i < 12; i++) {
          var a = i * 30;
          s += '<ellipse cx="24" cy="11" rx="4" ry="7.5" fill="#f0cf7a" ' + SW + ' transform="rotate(' + a + ' 24 22)"/>';
        }
        return s;
      })() +
      '<circle cx="24" cy="22" r="7.5" fill="#9a6b4a" ' + SW + '/>' +
      '<circle cx="22" cy="20" r="1" fill="#5a4a3e"/><circle cx="26" cy="21" r="1" fill="#5a4a3e"/><circle cx="23.5" cy="24.5" r="1" fill="#5a4a3e"/>' +
      '<path d="M24 30v14" ' + SW + '/><path d="M24 39c3-4 7-4 9-3-2 3-6 4-9 3z" fill="#7fb08a" ' + SW + '/>',
    carrot:
      '<path d="M30 14 13 38c-1 1.5.5 3 2 2l20-19z" fill="#e59a62" ' + SW + '/>' +
      '<path d="M22 26l3 2M18 32l3 2M26 20l2.5 2" stroke="' + O + '" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>' +
      '<path d="M31 15c-1-5 0-9 3-11 1 4 0 8-2 10M33 17c4-2 8-2 11 0-3 2-7 3-10 2M32 16c3-3 6-6 10-6-1 3-5 6-8 7" fill="#7fb08a" ' + SW + '/>',
    mushroom:
      '<path d="M18 26h12l1.5 12a3 3 0 0 1-3 3.2h-9a3 3 0 0 1-3-3.2z" fill="#f6efe2" ' + SW + '/>' +
      '<path d="M6 26c0-10 8-17 18-17s18 7 18 17c0 1.5-1 2-2.5 2h-31C7 28 6 27.5 6 26z" fill="#d9796c" ' + SW + '/>' +
      '<circle cx="16" cy="18" r="2.6" fill="#fbf4e8"/><circle cx="27" cy="14" r="2.2" fill="#fbf4e8"/><circle cx="33" cy="21" r="2.6" fill="#fbf4e8"/><circle cx="23" cy="22" r="1.6" fill="#fbf4e8"/>',
    leaf:
      '<path d="M40 8C22 8 9 15 9 30c0 3 .6 6 1.8 9C14 25 22 17 33 13 23 19 16 28 12.5 40H16c14 0 24-12 24-32z" fill="#8fbf8f" ' + SW + '/>' +
      '<path d="M15 37C19 27 25 20 33 14" fill="none" stroke="#5f9474" stroke-width="1.8" stroke-linecap="round"/>',
    apple:
      '<path d="M24 15c-3-2.5-12-3.5-15 4-3 8 2 21 9 22 2.5.3 4-1 6-1s3.5 1.3 6 1c7-1 12-14 9-22-3-7.5-12-6.5-15-4z" fill="#d9796c" ' + SW + '/>' +
      '<path d="M24 15c0-4 1-7 3-9" fill="none" ' + SW + '/>' +
      '<path d="M26 10c3-4 8-4 10-3-2 4-6 5-10 3z" fill="#7fb08a" ' + SW + '/>' +
      '<path d="M14 21c1-3 3-4 5-4.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>',
    honey:
      '<rect x="12" y="8" width="24" height="6" rx="2" fill="#c98b6b" ' + SW + '/>' +
      '<path d="M13 14h22c2 3 3 6 3 11 0 9-5 15-14 15S10 34 10 25c0-5 1-8 3-11z" fill="#e8b866" ' + SW + '/>' +
      '<rect x="15" y="21" width="18" height="11" rx="2.5" fill="#f6efe2" ' + SW + '/>' +
      '<path d="M19 26.5h10" stroke="#c98b6b" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M17 14v4a2 2 0 0 0 4 0v-4" fill="#e8b866" ' + SW + '/>',
    strawberry:
      '<path d="M24 42C13 36 8 27 10 20c1.5-4.5 6-6 14-6s12.5 1.5 14 6c2 7-3 16-14 22z" fill="#e0837a" ' + SW + '/>' +
      '<g fill="#f7e2a8"><circle cx="17" cy="22" r="1.1"/><circle cx="24" cy="21" r="1.1"/><circle cx="31" cy="22" r="1.1"/><circle cx="20" cy="28" r="1.1"/><circle cx="28" cy="28" r="1.1"/><circle cx="24" cy="34" r="1.1"/></g>' +
      '<path d="M14 15c3 1 6 1 10-1 4 2 7 2 10 1-2 3-5 4-10 3-5 1-8 0-10-3z" fill="#7fb08a" ' + SW + '/>' +
      '<path d="M24 14V8" ' + SW + '/>',
    sprout:
      '<path d="M14 30h20l-2.5 11a2.5 2.5 0 0 1-2.4 2H18.9a2.5 2.5 0 0 1-2.4-2z" fill="#c98b6b" ' + SW + '/>' +
      '<rect x="12" y="27" width="24" height="5" rx="2" fill="#d9a07f" ' + SW + '/>' +
      '<path d="M24 27V16" ' + SW + '/>' +
      '<path d="M24 19c-2-6-8-8-12-7 1 5 6 8 12 7zM24 16c1-6 7-9 12-8-1 5-6 9-12 8z" fill="#8fbf8f" ' + SW + '/>',
    basket:
      '<path d="M12 22c0-8 5-13 12-13s12 5 12 13" fill="none" ' + SW + '/>' +
      '<circle cx="18" cy="20" r="5" fill="#d9796c" ' + SW + '/><circle cx="29" cy="19" r="5" fill="#f0cf7a" ' + SW + '/>' +
      '<path d="M7 22h34l-4 17a3 3 0 0 1-3 2.3H14a3 3 0 0 1-3-2.3z" fill="#d9b48c" ' + SW + '/>' +
      '<path d="M10 28h28M12 34h24M18 22l2 19M30 22l-2 19" stroke="' + O + '" stroke-width="1.4" opacity=".55"/>',
    calendar:
      '<rect x="8" y="11" width="32" height="29" rx="4" fill="#f6efe2" ' + SW + '/>' +
      '<path d="M8 15a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v5H8z" fill="#9cc4a4" ' + SW + '/>' +
      '<path d="M16 7v7M32 7v7" ' + SW + '/>' +
      '<circle cx="24" cy="30" r="5" fill="#f0cf7a" ' + SW + '/>',
    pause:
      '<circle cx="24" cy="24" r="17" fill="#e6eee1" ' + SW + '/>' +
      '<rect x="17.5" y="16" width="4.5" height="16" rx="2" fill="#5f9474"/><rect x="26" y="16" width="4.5" height="16" rx="2" fill="#5f9474"/>',
    ribbon:
      '<path d="M17 28l-5 14 6-3 4 5 3-13M31 28l5 14-6-3-4 5-3-13" fill="#d9796c" ' + SW + '/>' +
      '<circle cx="24" cy="20" r="13" fill="#f0cf7a" ' + SW + '/>' +
      '<circle cx="24" cy="20" r="8" fill="#f6dfa0" ' + SW + '/>' +
      '<path d="M24 15l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#e5b25d"/>',

    /* ---------------- 报销单 ---------------- */
    receipt:
      '<path d="M12 6h24v34l-4-3-4 3-4-3-4 3-4-3-4 3z" fill="#f6efe2" ' + SW + '/>' +
      '<path d="M17 14h14M17 20h14M17 26h8" stroke="#9bb8d8" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="30" cy="27" r="3.4" fill="#9bb8d8" ' + SW + '/>',
    taxi:
      '<path d="M8 30l3-9a4 4 0 0 1 3.8-2.8h18.4A4 4 0 0 1 37 21l3 9v6a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z" fill="#f0cf7a" ' + SW + '/>' +
      '<path d="M14 21h20l2 7H12z" fill="#cfe0ea" ' + SW + '/>' +
      '<rect x="20" y="13" width="8" height="5" rx="1.5" fill="#f6efe2" ' + SW + '/>' +
      '<circle cx="15" cy="38" r="4" fill="#6b5a4c" ' + SW + '/><circle cx="33" cy="38" r="4" fill="#6b5a4c" ' + SW + '/>' +
      '<path d="M11 32h4M33 32h4" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>',
    coffee:
      '<path d="M13 15h22l-3 26a2.5 2.5 0 0 1-2.5 2.2h-11A2.5 2.5 0 0 1 16 41z" fill="#f6efe2" ' + SW + '/>' +
      '<path d="M14.5 24h19l-1.2 10H15.7z" fill="#b08a66" ' + SW + '/>' +
      '<rect x="11" y="10" width="26" height="5.5" rx="2" fill="#8a6a4f" ' + SW + '/>' +
      '<path d="M17 8h14" ' + SW + '/>',
    donut:
      '<circle cx="24" cy="25" r="16" fill="#e2c194" ' + SW + '/>' +
      '<path d="M10 22c2-7 8-11 14-11s12 4 14 11c1 4-2 4-3 2-1 3-4 3-5 1-2 3-5 3-6 0-2 3-5 2-6 0-2 2-5 2-5-1-2 1-4 1-3-2z" fill="#eaa3a0" ' + SW + '/>' +
      '<circle cx="24" cy="25" r="5" fill="#fff" ' + SW + '/>' +
      '<path d="M17 17l2 1M28 15l1.5 1.5M33 21l2-.5M21 13l1.5-1" stroke="#9cc4a4" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M15 21l1.5-1.5M30 19l2 1" stroke="#f0cf7a" stroke-width="2" stroke-linecap="round"/>',
    milktea:
      '<path d="M28 4l-3 14" ' + SW + '/>' +
      '<path d="M12 14h24l-3 27a2.5 2.5 0 0 1-2.5 2.2h-13A2.5 2.5 0 0 1 15 41z" fill="#f0e2cc" ' + SW + '/>' +
      '<path d="M12 14h24" ' + SW + '/>' +
      '<g fill="#6b5a4c"><circle cx="19" cy="37" r="2.2"/><circle cx="24.5" cy="38" r="2.2"/><circle cx="29.5" cy="36.5" r="2.2"/><circle cx="22" cy="33" r="2.2"/><circle cx="27" cy="32.5" r="2.2"/></g>' +
      '<path d="M14 22h20" stroke="#d9b48c" stroke-width="2.4"/>',
    bento:
      '<rect x="6" y="12" width="36" height="26" rx="5" fill="#d98f7a" ' + SW + '/>' +
      '<rect x="10" y="16" width="16" height="18" rx="2.5" fill="#fbf7ef" ' + SW + '/>' +
      '<rect x="28" y="16" width="10" height="8" rx="2" fill="#f0cf7a" ' + SW + '/>' +
      '<rect x="28" y="26" width="10" height="8" rx="2" fill="#8fbf8f" ' + SW + '/>' +
      '<rect x="15" y="22" width="6" height="6" rx="1" fill="#d9796c"/>',

    /* ---------------- 游戏图标 ---------------- */
    g_memory:
      '<rect x="7" y="12" width="20" height="27" rx="4" fill="#b7a9d6" ' + SW + ' transform="rotate(-8 17 25)"/>' +
      '<rect x="21" y="9" width="20" height="27" rx="4" fill="#f6efe2" ' + SW + ' transform="rotate(7 31 22)"/>' +
      '<circle cx="31" cy="22.5" r="5" fill="#d9796c" ' + SW + '/>',
    g_lights:
      '<path d="M14 22c0-7 4.5-12 10-12s10 5 10 12z" fill="#f0cf7a" ' + SW + '/>' +
      '<path d="M24 22v14M15 40h18" ' + SW + '/>' +
      '<path d="M18 26l-4 6M30 26l4 6M24 27v6" stroke="#f0cf7a" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>',
    g_cups:
      '<path d="M11 14h22v14a10 10 0 0 1-10 10h-2a10 10 0 0 1-10-10z" fill="#9cc4a4" ' + SW + '/>' +
      '<path d="M33 18h3a5 5 0 0 1 0 10h-3.5" fill="none" ' + SW + '/>' +
      '<path d="M8 42h30" ' + SW + '/><path d="M15 19h14" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>',
    g_slide:
      '<path d="M6 14a3 3 0 0 1 3-3h9l4 4h17a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z" fill="#9bb8d8" ' + SW + '/>' +
      '<path d="M6 20h36" ' + SW + '/><rect x="14" y="25" width="10" height="3" rx="1.5" fill="#f6efe2"/>',
    g_sudoku:
      '<rect x="7" y="7" width="34" height="34" rx="5" fill="#f6efe2" ' + SW + '/>' +
      '<path d="M18.3 8v32M29.6 8v32M8 18.3h32M8 29.6h32" stroke="' + O + '" stroke-width="1.6" opacity=".55"/>' +
      '<rect x="18.3" y="18.3" width="11.3" height="11.3" fill="#a9c79a"/>' +
      '<text x="12.8" y="16.5" font-family="Georgia,serif" font-size="9" fill="' + O + '">3</text>' +
      '<text x="34" y="38.5" font-family="Georgia,serif" font-size="9" fill="' + O + '">7</text>',
    bee:
      '<ellipse cx="17" cy="15" rx="7" ry="5" fill="#dcebf3" ' + SW + ' transform="rotate(-25 17 15)"/>' +
      '<ellipse cx="29" cy="14" rx="7" ry="5" fill="#dcebf3" ' + SW + ' transform="rotate(25 29 14)"/>' +
      '<ellipse cx="24" cy="28" rx="14" ry="11" fill="#f0cf7a" ' + SW + '/>' +
      '<path d="M19 18.5c-1.5 6-1.5 13 0 19M27 18c1.5 6 1.5 14 0 20" stroke="' + O + '" stroke-width="3.2" stroke-linecap="round"/>' +
      '<circle cx="33.5" cy="26" r="1.6" fill="' + O + '"/>' +
      '<path d="M10 28l-4 1" ' + SW + '/>',
    g_golf:
      '<ellipse cx="24" cy="36" rx="18" ry="6" fill="#9cc4a4" ' + SW + '/>' +
      '<ellipse cx="28" cy="35" rx="3.5" ry="1.4" fill="' + O + '"/>' +
      '<path d="M28 35V9" ' + SW + '/><path d="M28.5 9l11 4.5-11 4.5z" fill="#d9796c" ' + SW + '/>' +
      '<circle cx="15" cy="34" r="3" fill="#fff" ' + SW + '/>',
    g_tetris:
      '<g ' + SW + '>' +
      '<rect x="8" y="30" width="10" height="10" rx="2.5" fill="#9bb8d8"/><rect x="18" y="30" width="10" height="10" rx="2.5" fill="#9bb8d8"/>' +
      '<rect x="28" y="30" width="10" height="10" rx="2.5" fill="#a9c79a"/><rect x="28" y="20" width="10" height="10" rx="2.5" fill="#a9c79a"/>' +
      '<rect x="14" y="8" width="10" height="10" rx="2.5" fill="#e5b25d"/><rect x="14" y="18" width="10" height="10" rx="2.5" fill="#e5b25d"/><rect x="24" y="8" width="10" height="10" rx="2.5" fill="#e5b25d"/>' +
      '</g>',
    g_snake:
      '<path d="M10 36c0-6 6-7 12-7s10-2 10-7-5-6-10-6-8-3-6-6" fill="none" stroke="' + O + '" stroke-width="9.5" stroke-linecap="round"/>' +
      '<path d="M10 36c0-6 6-7 12-7s10-2 10-7-5-6-10-6-8-3-6-6" fill="none" stroke="#8fbf8f" stroke-width="6" stroke-linecap="round"/>' +
      '<circle cx="16.5" cy="9.5" r="5.2" fill="#8fbf8f" ' + SW + '/>' +
      '<circle cx="15.5" cy="8.5" r="1.1" fill="' + O + '"/><circle cx="18.6" cy="9.8" r="1.1" fill="' + O + '"/>' +
      '<circle cx="38" cy="34" r="4" fill="#d9796c" ' + SW + '/>'
  };

  /* 一些别名：游戏图标里直接复用的素材 */
  P.g_receipt = P.receipt;
  P.g_sweep = P.bee;

  function svg(name) {
    var body = P[name];
    if (!body) return '';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true">' + body + '</svg>';
  }

  var images = {};
  var pending = 0;
  var waiters = [];

  function image(name) {
    if (images[name]) return images[name];
    var img = new Image();
    pending++;
    img.onload = img.onerror = function () {
      pending--;
      if (!pending) { var list = waiters; waiters = []; list.forEach(function (fn) { fn(); }); }
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(name));
    images[name] = img;
    return img;
  }

  MG.art = {
    has: function (name) { return !!P[name]; },
    html: svg,
    image: image,
    /* 所有已请求的位图都解码完成后回调（已经完成就立即回调） */
    ready: function (fn) { if (!pending) fn(); else waiters.push(fn); },
    /* 游戏 id → 图标 */
    gameIcon: function (def) {
      var key = 'g_' + def.id;
      return P[key] ? svg(key) : '';
    },
    names: Object.keys(P)
  };

  /* Canvas 游戏要用的几张提前解码 */
  ['receipt', 'taxi', 'coffee', 'donut', 'milktea', 'bento', 'apple', 'strawberry', 'carrot', 'teacup'].forEach(image);
})(window);
