// 隐藏右侧导航栏中的"联系我"
(function() {
  var observer = new MutationObserver(function() {
    // 找导航中所有的 联系我 链接/按钮，只隐藏导航栏里的（有 data-clickable）
    var items = document.querySelectorAll('[data-clickable]');
    for (var i = 0; i < items.length; i++) {
      var text = items[i].textContent || '';
      if (text.trim() === '联系我') {
        items[i].style.display = 'none';
        console.log('Nav: hid 联系我');
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  // 立即执行一次
  setTimeout(function() {
    var items = document.querySelectorAll('[data-clickable]');
    for (var i = 0; i < items.length; i++) {
      if ((items[i].textContent||'').trim() === '联系我') {
        items[i].style.display = 'none';
      }
    }
  }, 1000);
})();
