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
    }
  };
})(window);
