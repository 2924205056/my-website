/**
 * Portfolio layout polish — keeps static build changes stable after React renders.
 */
(function() {
  'use strict';

  var STYLE_ID = 'portfolio-layout-polish-style';
  var firstProjectAutoCollapsed = false;

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#portfolio-utility-tools{margin-top:56px!important;padding-top:34px!important;border-top:1px solid rgba(136,162,204,.28);}',
      '#portfolio-utility-tools h3{font-size:clamp(2rem,5vw,3.4rem)!important;line-height:1.05!important;}',
      '#portfolio-utility-tools a{padding-top:18px!important;padding-bottom:18px!important;}',
      '#portfolio-utility-tools a span{line-height:1.2!important;}',
      '[data-portfolio-hidden="true"]{display:none!important;}'
    ].join('');
    document.head.appendChild(style);
  }

  function hideContactEntryPoints() {
    document.querySelectorAll('header button, header a, nav button, nav a').forEach(function(el) {
      if (text(el) === '联系我') {
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
      }
    });

    var homeButtons = Array.from(document.querySelectorAll('#root button')).filter(function(el) {
      return text(el) === '联系我' && !el.closest('#portfolio-contact-tools');
    });
    homeButtons.forEach(function(el) {
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
    });
  }

  function text(el) {
    return (el && el.textContent || '').trim();
  }

  function isVisible(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    var style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function findSectionByHeading(label) {
    var headings = Array.from(document.querySelectorAll('#root h1, #root h2, #root h3'));
    var heading = headings.find(function(el) {
      return text(el) === label && isVisible(el);
    }) || headings.find(function(el) {
      return text(el) === label;
    });
    return heading ? heading.closest('section') : null;
  }

  function replaceText(root, from, to) {
    if (!root || root.textContent.indexOf(from) === -1) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.indexOf(from) !== -1) {
        node.nodeValue = node.nodeValue.split(from).join(to);
      }
    }
  }

  function findProjectCard(title) {
    var section = findSectionByHeading('个人作品集');
    if (!section) return null;
    var titles = ['校园经历', '智能客服 Agent 搭建', 'Workflow 搭建', 'GEO 稿件撰写', '小红书词书账号运营', '智能词书工作坊', '其他探索'];
    var titleNode = Array.from(section.querySelectorAll('h3, h4, p, span, div')).find(function(el) {
      return text(el) === title;
    });
    if (!titleNode) return null;

    var node = titleNode;
    while (node && node !== section) {
      var nodeText = text(node);
      var otherTitleCount = titles.filter(function(item) {
        return item !== title && nodeText.indexOf(item) !== -1;
      }).length;
      if (nodeText.indexOf(title) !== -1 && node.querySelector('button') && otherTitleCount === 0 && node.offsetHeight > 40) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function reorderSections() {
    var personal = findSectionByHeading('个人作品集');
    var tools = findSectionByHeading('实用工具');
    var contact = document.getElementById('portfolio-contact-tools');
    var root = (personal || tools || contact) && (personal || tools || contact).parentElement;
    if (!root) return;

    if (personal && personal.parentElement === root) {
      if (tools && tools.parentElement === root) {
        tools.id = 'portfolio-utility-tools';
        if (contact && contact.parentElement === root && contact.nextElementSibling !== tools) {
          root.insertBefore(contact, tools);
        }
        if (tools !== root.lastElementChild) {
          root.appendChild(tools);
        }
      } else if (contact && contact.parentElement === root && contact !== root.lastElementChild) {
        root.appendChild(contact);
      }
    }
  }

  function polishProjects() {
    var section = findSectionByHeading('个人作品集');
    if (!section) return;

    replaceText(section, '智能客服 Agent 搭建', 'Workflow 搭建');
    replaceText(section, '使用扣子（Coze）搭建智能客服对话流', '使用扣子（Coze）搭建 Workflow 对话流');

    ['校园经历', 'Workflow 搭建', 'GEO 稿件撰写', '小红书词书账号运营', '智能词书工作坊', '其他探索'].forEach(function(title) {
      var card = findProjectCard(title);
      if (card) card.classList.add('portfolio-project-card');
    });

    var otherCard = findProjectCard('其他探索');
    if (otherCard) {
      otherCard.dataset.portfolioHidden = 'true';
    }

    var firstCard = findProjectCard('校园经历');
    if (firstCard && !firstProjectAutoCollapsed && firstCard.querySelectorAll('img').length) {
      var button = firstCard.querySelector('button');
      if (button) {
        firstProjectAutoCollapsed = true;
        button.click();
      }
    }
  }

  function run() {
    installStyles();
    hideContactEntryPoints();
    polishProjects();
    reorderSections();
  }

  run();
  setInterval(run, 600);
  document.addEventListener('DOMContentLoaded', run);
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
})();
