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
      '#portfolio-featured-projects{margin-top:6px!important;}',
      '#portfolio-featured-projects .featured-project-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important;}',
      '#portfolio-featured-projects .featured-project-card{display:block!important;overflow:hidden!important;border:1px solid rgba(255,255,255,.72)!important;border-radius:24px!important;background:rgba(255,255,255,.66)!important;text-decoration:none!important;box-shadow:0 16px 42px rgba(149,197,242,.16)!important;transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease!important;}',
      '#portfolio-featured-projects .featured-project-card:hover{transform:translateY(-2px)!important;border-color:rgba(139,184,245,.72)!important;box-shadow:0 18px 48px rgba(125,181,236,.22)!important;}',
      '#portfolio-featured-projects .featured-project-card img{width:100%!important;aspect-ratio:16/9!important;height:auto!important;object-fit:cover!important;object-position:center top!important;background:#edf8ff!important;}',
      '#portfolio-featured-projects .featured-project-card div{padding:16px!important;}',
      '#portfolio-featured-projects .featured-project-card h4{margin:0 0 7px!important;font-size:16px!important;line-height:1.3!important;color:#2f4f8d!important;}',
      '#portfolio-featured-projects .featured-project-card p{margin:0!important;font-size:12px!important;line-height:1.7!important;color:#5d76a5!important;}',
      '#portfolio-featured-projects .featured-project-card span{display:inline-flex!important;margin-top:12px!important;font-size:11px!important;color:#5d8bc7!important;}',
      '@media(max-width:820px){#portfolio-featured-projects .featured-project-grid{grid-template-columns:1fr!important;}#portfolio-featured-projects .featured-project-card div{padding:14px!important;}}',
      '#portfolio-contact-tools{display:none!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;}',
      '#portfolio-contact-tools .contact-tool-frame,#portfolio-contact-tools #contact-original-frame{display:none!important;height:0!important;min-height:0!important;}',
      'section:has([code-path="src/components/VocabMaster.tsx:241:5"]){display:none!important;}',
      '[data-vocabmaster-hidden="true"]{display:none!important;}',
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
    var featured = document.getElementById('portfolio-featured-projects');
    var tools = findSectionByHeading('实用工具');
    var contact = document.getElementById('portfolio-contact-tools');
    var root = (personal || featured || tools || contact) && (personal || featured || tools || contact).parentElement;
    if (!root) return;

    if (featured && featured.parentElement === root && personal && personal.parentElement === root && featured.nextElementSibling !== personal) {
      root.insertBefore(featured, personal);
    }

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

  function projectCard(project) {
    return [
      '<a class="featured-project-card" href="' + project.href + '" target="' + project.target + '" rel="noopener noreferrer" data-clickable="true">',
        '<img src="' + project.image + '" alt="' + project.alt + '" loading="lazy">',
        '<div>',
          '<h4>' + project.title + '</h4>',
          '<p>' + project.description + '</p>',
          '<span>' + project.action + '</span>',
        '</div>',
      '</a>'
    ].join('');
  }

  function injectFeaturedProjects() {
    if (document.getElementById('portfolio-featured-projects')) return;

    var portfolioIntro = Array.from(document.querySelectorAll('#root h2')).find(function(el) {
      return text(el) === '动效、交互和云朵感实验都放在这里。';
    });
    var introSection = portfolioIntro && portfolioIntro.closest('section');
    var root = introSection && introSection.parentElement;
    if (!root) return;

    var section = document.createElement('section');
    section.id = 'portfolio-featured-projects';
    section.className = 'reveal-section';
    var projects = [
      {
        title: 'ResuMe 简历编辑器',
        description: '在线简历编辑器，支持模板切换、模块自由组合、实时预览和 PDF 导出。',
        image: '/images/resume-editor-preview.png',
        alt: 'ResuMe 简历编辑器预览',
        href: 'https://resume.yangbaibai.cn/',
        target: '_blank',
        action: '打开项目'
      },
      {
        title: '毕业祝福墙',
        description: '毕业季互动祝福页面，支持扫码写祝福、照片上传、大屏展示和烟花动效。',
        image: '/images/blessing-wall-preview.png',
        alt: '毕业祝福墙预览',
        href: 'https://yangbaibai.cn/',
        target: '_blank',
        action: '查看页面'
      },
      {
        title: '飞书多维表格插件',
        description: '飞书多维表格 v2 插件教程，覆盖大模型接入、对话式录入和多模型结果对比。',
        image: '/images/work-3.jpg',
        alt: '飞书多维表格插件教程预览',
        href: '/feishu-bitable-v2.html',
        target: '_self',
        action: '查看教程'
      }
    ];

    section.innerHTML = [
      '<div style="margin-bottom:18px;">',
        '<p style="font-family:Space Mono,monospace;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#88a2cc;margin:0 0 8px;">Featured</p>',
        '<h3 style="font-family:Archivo Black,system-ui,sans-serif;font-size:clamp(2rem,4vw,3rem);line-height:1.08;color:#2f4e8d;margin:0;">精选项目</h3>',
      '</div>',
      '<div class="featured-project-grid">',
        projects.map(projectCard).join(''),
      '</div>'
    ].join('');

    root.insertBefore(section, introSection.nextElementSibling);
  }

  function lazyLoadPortfolioVideo() {
    document.querySelectorAll('video[src*="skate-cloud.mp4"]').forEach(function(video) {
      if (!video.dataset.lazyPortfolioVideo) {
        video.dataset.lazyPortfolioVideo = 'true';
        video.dataset.src = video.getAttribute('src');
        video.removeAttribute('src');
        video.preload = 'none';
      }
    });

    var heading = Array.from(document.querySelectorAll('#root h2')).find(function(el) {
      return text(el) === '动效、交互和云朵感实验都放在这里。' && isVisible(el);
    });
    if (!heading) return;

    var section = heading.closest('section');
    var video = section && section.querySelector('video[data-lazy-portfolio-video][data-src]');
    if (!video || video.getAttribute('src')) return;

    video.setAttribute('src', video.dataset.src);
    video.load();
    var play = video.play();
    if (play && typeof play.catch === 'function') play.catch(function() {});
  }

  function hideVocabMaster() {
    var root = document.querySelector('[code-path="src/components/VocabMaster.tsx:241:5"]');
    if (!root) {
      var title = Array.from(document.querySelectorAll('#root h1, #root h2, #root h3, #root p')).find(function(el) {
        return text(el) === 'VocabMaster' || text(el) === '智能生词提取工坊';
      });
      root = title || null;
    }
    if (!root) return;

    var section = root.closest('section') || root.closest('.reveal-section') || root.parentElement;
    if (!section) return;
    section.dataset.vocabmasterHidden = 'true';
    section.setAttribute('aria-hidden', 'true');
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
    if (firstCard && !firstProjectAutoCollapsed) {
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
    hideVocabMaster();
    injectFeaturedProjects();
    lazyLoadPortfolioVideo();
    polishProjects();
    reorderSections();
  }

  run();
  setInterval(run, 600);
  document.addEventListener('DOMContentLoaded', run);
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
})();
