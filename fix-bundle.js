/**
 * fix-bundle.js — 修复 React FortuneTeller 组件
 *
 * 1. 隐藏 React 算命铺（使用新的纯 JS 版本）
 * 2. 清除旧 API Key 配置
 * 3. Markdown 渲染
 */
(function() {
  'use strict';

  // 1. 添加 CSS 隐藏 React FortuneTeller
  var style = document.createElement('style');
  style.textContent = '[code-path*="FortuneTeller"]{display:none!important}';
  document.head.appendChild(style);

  // 2. 清除旧 localStorage 中的 API Key 配置
  var keysToClean = ['xiaokang_fortune_config', 'fortune_config'];
  keysToClean.forEach(function(key) {
    var val = localStorage.getItem(key);
    if (val) {
      try {
        var cfg = JSON.parse(val);
        // 如果有旧 API Key，清除它
        if (cfg.k || cfg.key || cfg.token || cfg.botId) {
          localStorage.setItem(key, JSON.stringify({ endpoint: '/api/daily', model: 'deepseek-v4-pro', enabled: true }));
          console.log('[fix-bundle] 已清除旧 API Key');
        }
      } catch(e) {}
    }
  });

  // 3. Markdown 渲染
  if (typeof marked !== 'undefined') {
    marked.setOptions({ breaks: true, gfm: true });
    var renderTimeout = null;
    function tryRenderMarkdown() {
      var fortuneRoot = document.querySelector('[code-path*="FortuneTeller"]');
      if (!fortuneRoot) return;
      var allEls = fortuneRoot.querySelectorAll('p, span, div');
      for (var i = 0; i < allEls.length; i++) {
        var el = allEls[i];
        if (el.dataset.mdRendered === '1') continue;
        var text = el.textContent || '';
        if (text.length < 30) continue;
        if (/[*#`>\-\[\]!]/.test(text) && text.indexOf('\n') > -1) {
          try {
            el.innerHTML = marked.parse(text);
            el.dataset.mdRendered = '1';
            el.style.lineHeight = '1.8';
          } catch(e) {}
        }
      }
    }
    tryRenderMarkdown();
    setInterval(tryRenderMarkdown, 500);
    new MutationObserver(function() {
      clearTimeout(renderTimeout);
      renderTimeout = setTimeout(tryRenderMarkdown, 200);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  console.log('[fix-bundle] 已隐藏 React 算命铺 + 清除旧 Key');
})();
