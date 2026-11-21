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
      '<circle cx="38" cy="34" r="4" fill="#d9796c" ' + SW + '/>',

    /* ---------------- 菜园守卫 ---------------- */
    cabbage:
      '<path d="M7 30c0-11 7.5-18 17-18s17 7 17 18c0 7-7.5 11-17 11S7 37 7 30z" fill="#b9da9c" ' + SW + '/>' +
      '<path d="M12 31c0-7 5-12 12-12s12 5 12 12" fill="#d6ebbd" ' + SW + '/>' +
      '<path d="M18 27c1.5-3 3.5-4.5 6-4.5s4.5 1.5 6 4.5c-1.5 3-3.5 4-6 4s-4.5-1-6-4z" fill="#eef7df" ' + SW + '/>' +
      '<path d="M24 31v9M15 33c2 2 4 5 4.5 7.5M33 33c-2 2-4 5-4.5 7.5" fill="none" stroke="#7fae73" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M13 22c1.5-2.5 3.5-4 6-5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>',
    snail:
      '<path d="M5 39c0-2.5 2-4 5-4h22c4 0 6-3 6.5-8.5V22h4.5v5c0 9-4.5 14-11 14H8c-2 0-3-.8-3-2z" fill="#ead6b4" ' + SW + '/>' +
      '<path d="M40 22l-1.5-8M43 23l2.5-7.5" ' + SW + '/>' +
      '<circle cx="38.3" cy="13.5" r="1.9" fill="' + O + '"/><circle cx="45.8" cy="15.5" r="1.9" fill="' + O + '"/>' +
      '<circle cx="21" cy="24" r="12" fill="#d9a07f" ' + SW + '/>' +
      '<path d="M21 24.5c0-2 2.5-2.5 3.8-1 2 2.2.2 6-3.3 6.2-4.5.3-7-4.2-5.3-8 2-4.6 8.4-5.5 11.6-1.8" fill="none" stroke="' + O + '" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M13 17c2-2 4-3 6.5-3.3" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".5"/>' +
      '<circle cx="40.5" cy="30" r="1.1" fill="' + O + '"/>',
    caterpillar:
      '<g ' + SW + '>' +
      '<circle cx="9" cy="32" r="6" fill="#a9d18e"/><circle cx="17.5" cy="30" r="6.6" fill="#b9da9c"/>' +
      '<circle cx="26.5" cy="31" r="6.6" fill="#a9d18e"/><circle cx="36" cy="27" r="8" fill="#c7e3ad"/>' +
      '</g>' +
      '<path d="M33 19.5l-2-5.5M39 19.5l2-5.5" ' + SW + '/>' +
      '<circle cx="30.8" cy="13.6" r="1.7" fill="#e59a62" ' + SW + '/><circle cx="41.2" cy="13.6" r="1.7" fill="#e59a62" ' + SW + '/>' +
      '<circle cx="35" cy="26" r="1.2" fill="' + O + '"/><circle cx="40" cy="26" r="1.2" fill="' + O + '"/>' +
      '<path d="M35.5 30.5c1.2 1 2.8 1 4 0" fill="none" stroke="' + O + '" stroke-width="1.6" stroke-linecap="round"/>' +
      '<g fill="' + O + '"><circle cx="9" cy="39.5" r="1.3"/><circle cx="17.5" cy="38" r="1.3"/><circle cx="26.5" cy="39" r="1.3"/></g>',
    aphid:
      '<ellipse cx="22" cy="28" rx="13" ry="10" fill="#cfe6a6" ' + SW + '/>' +
      '<circle cx="35" cy="25" r="6" fill="#bcdc92" ' + SW + '/>' +
      '<path d="M37 19.5l2.5-5M33 19.5l-.5-5.5M14 37l-3 4M22 38v4.5M30 37l3 4" ' + SW + '/>' +
      '<circle cx="36.8" cy="24.5" r="1.3" fill="' + O + '"/>' +
      '<path d="M15 23c2-2.5 4.5-3.5 7-3.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>',
    td_ladybug:
      '<path d="M10 22 24 9l14 13" fill="#d9796c" ' + SW + '/>' +
      '<rect x="13" y="21" width="22" height="20" rx="2.5" fill="#e3c39a" ' + SW + '/>' +
      '<path d="M13 28h22M13 34h22" stroke="' + O + '" stroke-width="1.2" opacity=".35"/>' +
      '<circle cx="24" cy="29" r="4.2" fill="#6b5545" ' + SW + '/>' +
      '<path d="M24 41v5" ' + SW + '/>' +
      '<circle cx="31" cy="13" r="5" fill="#d9675c" ' + SW + '/>' +
      '<path d="M31 8v10" stroke="' + O + '" stroke-width="1.6"/>' +
      '<circle cx="29" cy="12" r="1" fill="' + O + '"/><circle cx="33" cy="14.5" r="1" fill="' + O + '"/>',
    td_scarecrow:
      '<path d="M24 22v24M10 26h28" stroke="' + O + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M15 24h18l-2 13H17z" fill="#9cc4a4" ' + SW + '/>' +
      '<path d="M20 29h3M26 32h3" stroke="#e5b25d" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M10 26l-3 3M10 26l-3-2M38 26l3 3M38 26l3-2" stroke="#e5c36a" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="24" cy="17" r="6" fill="#f2deb4" ' + SW + '/>' +
      '<circle cx="22" cy="16.5" r="1" fill="' + O + '"/><circle cx="26" cy="16.5" r="1" fill="' + O + '"/>' +
      '<path d="M22 19.5c1.3.8 2.7.8 4 0" fill="none" stroke="' + O + '" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M12 12.5c3-1.5 7-2 12-2s9 .5 12 2c-2 1.5-6.5 2-12 2s-10-.5-12-2z" fill="#e5c36a" ' + SW + '/>' +
      '<path d="M18 11c0-4 2.5-6 6-6s6 2 6 6" fill="#e5c36a" ' + SW + '/>' +
      '<path d="M18.5 10h11" stroke="#d9796c" stroke-width="2"/>',
    td_can:
      '<path d="M12 20h20v16a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5z" fill="#9bb8d8" ' + SW + '/>' +
      '<path d="M31 25l10-10 3 2-9 13" fill="#9bb8d8" ' + SW + '/>' +
      '<path d="M40 13.5l5 5" stroke="' + O + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M15 20c0-6 3-9 7-9s7 3 7 9" fill="none" ' + SW + '/>' +
      '<path d="M12 27h20" stroke="#fff" stroke-width="2" opacity=".5"/>' +
      '<circle cx="17" cy="32" r="2.2" fill="#f0cf7a" ' + SW + '/>' +
      '<g fill="#9bc7e8"><circle cx="45" cy="25" r="1.5"/><circle cx="41" cy="28" r="1.3"/><circle cx="46" cy="30" r="1.2"/></g>',
    td_frog:
      '<ellipse cx="24" cy="40" rx="19" ry="5.5" fill="#8fbf8f" ' + SW + '/>' +
      '<path d="M37 37l5-3" stroke="' + O + '" stroke-width="1.4" opacity=".5"/>' +
      '<path d="M9 36c0-10 6.5-16 15-16s15 6 15 16c0 3-2 4.5-5 4.5H14c-3 0-5-1.5-5-4.5z" fill="#a6cf8f" ' + SW + '/>' +
      '<ellipse cx="24" cy="35" rx="8" ry="4" fill="#dcefc4"/>' +
      '<circle cx="16" cy="19" r="6" fill="#a6cf8f" ' + SW + '/><circle cx="32" cy="19" r="6" fill="#a6cf8f" ' + SW + '/>' +
      '<circle cx="16" cy="19" r="3.4" fill="#fff" ' + SW + '/><circle cx="32" cy="19" r="3.4" fill="#fff" ' + SW + '/>' +
      '<circle cx="16.8" cy="19.6" r="1.6" fill="' + O + '"/><circle cx="32.8" cy="19.6" r="1.6" fill="' + O + '"/>' +
      '<path d="M18 28.5c4 2.6 8 2.6 12 0" fill="none" stroke="' + O + '" stroke-width="2" stroke-linecap="round"/>' +
      '<ellipse cx="13.5" cy="28" rx="2.4" ry="1.5" fill="#e8a7a0" opacity=".8"/><ellipse cx="34.5" cy="28" rx="2.4" ry="1.5" fill="#e8a7a0" opacity=".8"/>' +
      '<path d="M11 40c-1-2 0-4 3-4M37 40c1-2 0-4-3-4" fill="none" ' + SW + '/>',
    td_hive:
      '<path d="M12 42h24" ' + SW + '/><path d="M16 42v4M32 42v4" ' + SW + '/>' +
      '<path d="M10 40c0-15 6-26 14-26s14 11 14 26z" fill="#e8c46e" ' + SW + '/>' +
      '<path d="M11.5 33h25M13.5 26h21M17.5 19.5h13" stroke="' + O + '" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>' +
      '<path d="M20 40v-3a4 4 0 0 1 8 0v3z" fill="#6b5545" ' + SW + '/>' +
      '<path d="M15 24c1-4 3-6.5 5.5-8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".5"/>' +
      '<ellipse cx="36.5" cy="10" rx="2.6" ry="2" fill="#fff" opacity=".85" ' + SW + '/>' +
      '<ellipse cx="38" cy="14" rx="4.2" ry="3.2" fill="#f0cf7a" ' + SW + '/>' +
      '<path d="M37 11.2v5.6M39.4 11.2v5.6" stroke="' + O + '" stroke-width="1.4"/>',
    beetle:
      '<path d="M5 33c0-9 7-15 16-15s15 6 15 15z" fill="#7d93b8" ' + SW + '/>' +
      '<path d="M20.5 18v15" stroke="' + O + '" stroke-width="1.6" opacity=".45"/>' +
      '<path d="M36 33c0-5 2.5-8 5.5-8s4.5 3 4.5 7v1z" fill="#5d6f8f" ' + SW + '/>' +
      '<path d="M43 25.5l2.5-5.5" ' + SW + '/>' +
      '<circle cx="42.5" cy="29" r="1.3" fill="#fff"/>' +
      '<path d="M11 33l-3 6M21 33v6M30 33l3 6" ' + SW + '/>' +
      '<path d="M4.5 33h41.5" ' + SW + '/>' +
      '<path d="M10 26c2-3 5-4.6 8-5.2" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>',
    moth:
      '<path d="M24 22C16 10 5 11 6 19c1 6 8 9 18 8z" fill="#e6dcef" ' + SW + '/>' +
      '<path d="M24 22c8-12 19-11 18-3-1 6-8 9-18 8z" fill="#e6dcef" ' + SW + '/>' +
      '<path d="M24 27c-7 0-12 3-12 8 0 4 6 4 12-3z" fill="#d4c6e4" ' + SW + '/>' +
      '<path d="M24 27c7 0 12 3 12 8 0 4-6 4-12-3z" fill="#d4c6e4" ' + SW + '/>' +
      '<circle cx="13" cy="19" r="2.2" fill="#c3b0d8"/><circle cx="35" cy="19" r="2.2" fill="#c3b0d8"/>' +
      '<ellipse cx="24" cy="27" rx="3" ry="9" fill="#c2ae95" ' + SW + '/>' +
      '<path d="M23 18.5c-2-4-5-6-8-6.5M25 18.5c2-4 5-6 8-6.5" fill="none" ' + SW + '/>',
    mole:
      '<path d="M2 43c4-4 9-5 14-4 4-3 11-3 16 0 5-2 10-1 14 4z" fill="#c9a27c" ' + SW + '/>' +
      '<path d="M6 38c0-11 8-19 18-19s16 7 18 14c.8 3-1 5-4 5z" fill="#8f7a6b" ' + SW + '/>' +
      '<ellipse cx="41.5" cy="33" rx="3" ry="2.4" fill="#e8a7a0" ' + SW + '/>' +
      '<path d="M32 27c1.2-.9 2.6-.9 3.8 0" fill="none" stroke="' + O + '" stroke-width="1.7" stroke-linecap="round"/>' +
      '<path d="M29 38c0 3 2 4.5 5 4.5M17 38c0 3 2 4.5 5 4.5" fill="#f2deb4" ' + SW + '/>' +
      '<path d="M13 27c2-3 5-5 9-5.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".35"/>',
    crow:
      '<path d="M10 27L2 21.5l2 11 6.5 1z" fill="#4b505d" ' + SW + '/>' +
      '<ellipse cx="22" cy="29" rx="14" ry="10" fill="#5d6371" ' + SW + '/>' +
      '<path d="M20 39v5M26 39v5M17.5 44h5M23.5 44h5" ' + SW + '/>' +
      '<circle cx="35" cy="20" r="7.5" fill="#5d6371" ' + SW + '/>' +
      '<path d="M41.5 17.5l6 3-6 2.5z" fill="#e5b25d" ' + SW + '/>' +
      '<circle cx="36.6" cy="18.5" r="1.9" fill="#fff"/><circle cx="37.1" cy="18.8" r=".95" fill="' + O + '"/>' +
      '<path d="M13 26c5-4 13-4 17 1-4 6-12 7-17-1z" fill="#4b505d" ' + SW + '/>' +
      '<path d="M15 23c3-3 7-4 11-3.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".3"/>',
    boar:
      '<path d="M7 26c-3-1-3.5-4-1-4.5" fill="none" ' + SW + '/>' +
      '<path d="M12 38v6M19 39v5M28 39v5M34 37v6" stroke="' + O + '" stroke-width="3.2" stroke-linecap="round"/>' +
      '<ellipse cx="22" cy="29" rx="16" ry="11" fill="#a8825f" ' + SW + '/>' +
      '<path d="M10 21l2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3" fill="none" stroke="' + O + '" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<ellipse cx="35.5" cy="28" rx="8.5" ry="8" fill="#b48d69" ' + SW + '/>' +
      '<path d="M30 21l2.5-6.5 4.5 6z" fill="#8f6c4f" ' + SW + '/>' +
      '<ellipse cx="43" cy="30.5" rx="3.8" ry="3.2" fill="#e2a89a" ' + SW + '/>' +
      '<circle cx="42" cy="30.3" r=".8" fill="' + O + '"/><circle cx="44.3" cy="30.3" r=".8" fill="' + O + '"/>' +
      '<path d="M38.5 33.5c.6 3 2.6 4.4 5 3.6" fill="none" stroke="#fffaf0" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="37" cy="25" r="1.4" fill="' + O + '"/>' +
      '<path d="M12 25c3-3 7-4.5 11-4.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".3"/>',
    locust:
      '<path d="M14 33c4-9 13-10 17-6" fill="#a5c35a" ' + SW + '/>' +
      '<path d="M18 33l-6 9H7M30 34l3 8M35 34l2 7" fill="none" ' + SW + '/>' +
      '<path d="M5 30c0-4 5-6 14-6h13c5 0 9 2 9 6s-4 5-9 5H19C10 35 5 34 5 30z" fill="#b8d270" ' + SW + '/>' +
      '<path d="M8 27c7-6 18-7 26-3-8 3.5-18 4.5-26 3z" fill="#e8edc0" ' + SW + '/>' +
      '<path d="M11 30.5h20" stroke="' + O + '" stroke-width="1.4" opacity=".4"/>' +
      '<circle cx="39" cy="28" r="6" fill="#a5c35a" ' + SW + '/>' +
      '<circle cx="41" cy="26.6" r="1.6" fill="' + O + '"/><circle cx="41.5" cy="26.2" r=".5" fill="#fff"/>' +
      '<path d="M40 22.5c2-6 5-9 8-10M37.5 22.5c0-6 2-10 4-12.5" fill="none" ' + SW + '/>',
    spider:
      '<path d="M18 28l-9-6-4 4M18 31l-11 0-3 4M19 34l-8 6-1 4M30 28l9-6 4 4M30 31l11 0 3 4M29 34l8 6 1 4" fill="none" ' + SW + '/>' +
      '<ellipse cx="24" cy="31" rx="9" ry="8" fill="#8a7a9a" ' + SW + '/>' +
      '<circle cx="24" cy="21" r="6" fill="#9a8aaa" ' + SW + '/>' +
      '<circle cx="21.8" cy="20.5" r="1.7" fill="#fff"/><circle cx="26.2" cy="20.5" r="1.7" fill="#fff"/>' +
      '<circle cx="22" cy="20.8" r=".9" fill="' + O + '"/><circle cx="26.4" cy="20.8" r=".9" fill="' + O + '"/>' +
      '<path d="M21 33c2 1.5 4 1.5 6 0" fill="none" stroke="#e8a7a0" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M18.5 27c1.5-2 3.5-3 5.5-3.2" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".4"/>',
    stinkbug:
      '<path d="M13 37l-3 5M22 38v5M31 37l3 5" ' + SW + '/>' +
      '<path d="M6 32c0-8 7-14 17-14s14 6 14 14z" fill="#9fb36a" ' + SW + '/>' +
      '<path d="M21 18l3 14" stroke="' + O + '" stroke-width="1.5" opacity=".45"/>' +
      '<path d="M11 26l4-1M15 29l4-1M27 24l4 1" stroke="#7d8f4f" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M36 32c0-5 2.5-7.5 5-7.5s4.5 2.5 4.5 6.5v1z" fill="#8a9c58" ' + SW + '/>' +
      '<path d="M42 25l1.5-5M44 26l3.5-3.5" ' + SW + '/>' +
      '<circle cx="42" cy="28.5" r="1.2" fill="' + O + '"/>' +
      '<path d="M5.5 32h40" ' + SW + '/>' +
      '<path d="M3 22c-1-2 1-3.5 0-5.5M7 18c-1-2 1-3.5 0-5.5" fill="none" stroke="#b5c98a" stroke-width="1.8" stroke-linecap="round"/>',
    wasp:
      '<ellipse cx="22" cy="15" rx="7" ry="4" fill="#fff" opacity=".85" ' + SW + ' transform="rotate(-20 22 15)"/>' +
      '<ellipse cx="29" cy="14" rx="6" ry="3.5" fill="#fff" opacity=".85" ' + SW + ' transform="rotate(15 29 14)"/>' +
      '<path d="M5 28l-3 1.5 3 1.5" fill="' + O + '" ' + SW + '/>' +
      '<ellipse cx="15" cy="28" rx="10" ry="6.5" fill="#f0c95a" ' + SW + '/>' +
      '<path d="M11 22.5v11M16 21.6v12.8M21 22.5v11" stroke="' + O + '" stroke-width="2.4"/>' +
      '<ellipse cx="29" cy="27" rx="4.5" ry="4" fill="#e5b25d" ' + SW + '/>' +
      '<circle cx="37" cy="25" r="5.5" fill="#f0c95a" ' + SW + '/>' +
      '<circle cx="39" cy="24" r="1.4" fill="' + O + '"/>' +
      '<path d="M38 20c1-4 3-6 5-7M36 20c0-4 1-7 2-8.5" fill="none" ' + SW + '/>' +
      '<path d="M27 31l-2 6M31 31l1 6" ' + SW + '/>',
    g_garden:
      '<path d="M5 33c0-10 7-16 15.5-16S36 23 36 33c0 6.5-7 10-15.5 10S5 39.5 5 33z" fill="#b9da9c" ' + SW + '/>' +
      '<path d="M10 34c0-6.5 4.5-11 10.5-11S31 27.5 31 34" fill="#d6ebbd" ' + SW + '/>' +
      '<path d="M20.5 34v8M13 36c2 2 3 4.5 3.5 6.5M28 36c-2 2-3 4.5-3.5 6.5" fill="none" stroke="#7fae73" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="35" cy="14" r="8" fill="#d9675c" ' + SW + '/>' +
      '<path d="M35 6v16" stroke="' + O + '" stroke-width="1.8"/>' +
      '<path d="M29 9.5c-1.5-1.5-1.5-3.5 0-5M41 9.5c1.5-1.5 1.5-3.5 0-5" fill="none" ' + SW + '/>' +
      '<g fill="' + O + '"><circle cx="31.5" cy="13" r="1.4"/><circle cx="38.5" cy="16.5" r="1.4"/><circle cx="32" cy="18" r="1.1"/><circle cx="38.5" cy="11" r="1.1"/></g>'
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
  ['receipt', 'taxi', 'coffee', 'donut', 'milktea', 'bento', 'apple', 'strawberry', 'carrot', 'teacup', 'cabbage', 'snail', 'caterpillar', 'aphid', 'td_ladybug', 'td_scarecrow', 'td_can', 'td_frog', 'td_hive', 'sunflower', 'beetle', 'moth', 'mole', 'crow', 'boar', 'locust', 'spider', 'stinkbug', 'wasp'].forEach(image);
})(window);
