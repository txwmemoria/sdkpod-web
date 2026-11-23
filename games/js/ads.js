/* =========================================================================
   摸鱼司 · 广告位（Google AdSense）
   在 index.html 的 window.MG_ADS 里填好 client（ca-pub-…）和广告单元 id 才会生效；
   没填就什么都不做：不加载脚本、不留空白框。
   位置刻意放在「不会误点」的地方：大厅游戏列表下方、对局页玩法说明下方，
   都离操作区很远；结算、暂停这些弹层里一律不放。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;
  var cfg = w.MG_ADS || {};
  var loaded = false;

  function enabled(slot) {
    return /^ca-pub-\d+$/.test(cfg.client || '') && !!cfg[slot];
  }

  function loadScript() {
    if (loaded) return;
    loaded = true;
    /* 页面 <head> 里已经放了 AdSense 脚本（站点验证要用），就不再重复加载 */
    if (document.querySelector('script[src*="adsbygoogle.js"]')) return;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(cfg.client);
    document.head.appendChild(s);
  }

  function push(ins, box) {
    /* 等节点进了页面再请求广告 */
    setTimeout(function () {
      if (!ins.isConnected) return;
      try { (w.adsbygoogle = w.adsbygoogle || []).push({}); } catch (e) { box.remove(); }
    }, 0);
  }

  /* AdSense 会在 <ins> 上写 data-ad-status：filled 才显示，unfilled（没广告可投、网站还在审核）就把整张卡撤掉，不留空框 */
  function watch(ins, box) {
    if (!w.MutationObserver) { box.classList.add('ad-ready'); return; }
    var mo = new MutationObserver(function () {
      var st = ins.getAttribute('data-ad-status');
      if (st === 'filled') { box.classList.add('ad-ready'); mo.disconnect(); }
      else if (st === 'unfilled') { box.remove(); mo.disconnect(); }
    });
    mo.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
    /* 被广告拦截插件挡了、或者迟迟没回应：8 秒后撤掉，免得列表里空着一格 */
    setTimeout(function () { if (!box.classList.contains('ad-ready')) { mo.disconnect(); box.remove(); } }, 8000);
  }

  MG.ads = {
    /** 返回一个带「广告」小标签的容器；没配置时返回 null */
    block: function (slot) {
      if (!enabled(slot)) return null;
      loadScript();
      var box = MG.h('aside', 'ad-box ad-' + slot);
      box.setAttribute('aria-label', MG.t('ad.label'));
      box.appendChild(MG.h('span', 'ad-label', MG.t('ad.label')));
      var ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.setAttribute('data-ad-client', cfg.client);
      ins.setAttribute('data-ad-slot', cfg[slot]);
      ins.setAttribute('data-ad-format', 'auto');
      ins.setAttribute('data-full-width-responsive', 'true');
      box.appendChild(ins);
      /* 等节点进了页面再请求广告 */
      setTimeout(function () {
        if (!ins.isConnected) return;
        try { (w.adsbygoogle = w.adsbygoogle || []).push({}); } catch (e) { box.remove(); }
      }, 0);
      return box;
    },

    /** 信息流广告：做成和游戏卡片一样的一张卡，插在游戏列表里；没配置返回 null */
    feed: function () {
      var f = cfg.feed;
      if (!/^ca-pub-\d+$/.test(cfg.client || '') || !f || !f.slot) return null;
      loadScript();
      var card = MG.h('aside', 'gcard gcard-ad');
      card.setAttribute('aria-label', MG.t('ad.label'));
      card.appendChild(MG.h('span', 'ad-label', MG.t('ad.label')));
      var ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.setAttribute('data-ad-format', 'fluid');
      if (f.layout) ins.setAttribute('data-ad-layout-key', f.layout);
      ins.setAttribute('data-ad-client', cfg.client);
      ins.setAttribute('data-ad-slot', f.slot);
      card.appendChild(ins);
      watch(ins, card);
      push(ins, card);
      return card;
    }
  };
})(window);
