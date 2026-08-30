/* 鸟栖书塔 —— 程序化 3D 模型（three r128 兼容）
 * 三本交错叠放的精装书（藏蓝/军绿/米白）+ 顶上一只圆润小白鸟
 * userData.fx = { tap() } : 小鸟跳跃扑翅两下，顶书封面绕书脊翻开约 40° 又合上
 */
(function(){
  'use strict';

  var NAVY = 0x2c4a6e, BLUE = 0x4a7cb8, BRASS = 0xc9a05a, BRASS_D = 0xa8843f,
      WOOD_D = 0x66452a, CREAM = 0xead9b8, PORCELAIN = 0xf2ede2, INK = 0x1c1c20,
      GREEN = 0x687a55, GREEN_D = 0x556347, IVORY = 0xe8dfc8, IVORY_D = 0xd8ccb0,
      PAGE = 0xd8bd8a, PAGE_D = 0xc2a26c, WING = 0xe4dccb;

  function lam(color){ return new THREE.MeshLambertMaterial({color: color}); }

  function roundedBox(w, h, d, r){
    var x = -w/2, y = -h/2;
    var shape = new THREE.Shape();
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    var bevel = Math.min(r * 0.9, d * 0.2);
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.01, d - bevel * 2),
      bevelEnabled: true, bevelThickness: bevel, bevelSize: Math.min(bevel, r * 0.95),
      bevelSegments: 2, curveSegments: 8
    });
    geo.translate(0, 0, -Math.max(0.01, d - bevel * 2) / 2);
    return geo;
  }

  /* 平躺的圆角封面板：w 沿 x（书脊在 -x），厚 h 沿 y，深 d 沿 z */
  function coverSlab(w, h, d, r){
    var geo = roundedBox(w, d, h, r); // 先在 xy 平面画 w×d，再绕 x 转平
    geo.rotateX(-Math.PI / 2);
    return geo;
  }

  /* 一本精装书。局部坐标：书脊 -x，前口 +x，底面 y=0，顶面 y=t。
   * openable=true 时返回 {group, cover}，封面挂在书脊铰链组上。 */
  function makeBook(w, t, d, coverColor, coverDark, openable){
    var g = new THREE.Group();
    var cT = 0.024;                 // 封面板厚
    var matCover = lam(coverColor), matCoverD = lam(coverDark);

    function add(geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      (parent || g).add(m);
      return m;
    }

    // 书页芯：略缩进，前口微圆
    add(roundedBox(w - 0.035, d - 0.05, t - 0.03, 0.02).rotateX(-Math.PI / 2),
        lam(PAGE), -0.004, t / 2, 0);
    // 页层线：两道更深的薄片，制造纸页堆叠感
    [0.32, 0.62].forEach(function(f){
      add(roundedBox(w - 0.045, d - 0.06, 0.006, 0.015).rotateX(-Math.PI / 2),
          lam(PAGE_D), -0.002, t * f, 0);
    });

    // 底封面
    add(coverSlab(w, cT, d, 0.028), matCover, 0, cT / 2, 0);
    // 顶封面（可翻开时挂铰链）
    var coverPivot = null;
    if (openable){
      coverPivot = new THREE.Group();
      coverPivot.position.set(-w / 2 + 0.012, t - cT / 2, 0);
      g.add(coverPivot);
      add(coverSlab(w, cT, d, 0.028), matCover, w / 2 - 0.012, 0, 0, coverPivot);
      // 封面内衬（翻开时露出的奶油衬页）
      add(coverSlab(w - 0.05, 0.008, d - 0.06, 0.02), lam(CREAM),
          w / 2 - 0.012, -cT / 2 - 0.002, 0, coverPivot);
    } else {
      add(coverSlab(w, cT, d, 0.028), matCover, 0, t - cT / 2, 0);
    }

    // 书脊：整根圆筒（内半埋进书页），外弧饱满
    var spine = add(new THREE.CylinderGeometry(t / 2 + 0.004, t / 2 + 0.004, d - 0.02, 18),
        matCoverD, -w / 2 + 0.004, t / 2, 0);
    spine.rotation.x = Math.PI / 2;
    // 书脊黄铜细条：干净的凸起圆箍（两端各一对）
    [-0.34, -0.26, 0.26, 0.34].forEach(function(f){
      var band = add(new THREE.CylinderGeometry(t / 2 + 0.0075, t / 2 + 0.0075, 0.013, 18),
          lam(BRASS), -w / 2 + 0.004, t / 2, d * f);
      band.rotation.x = Math.PI / 2;
    });
    // 书脊中央小黄铜圆点 + 两侧对称小铜钉
    add(new THREE.SphereGeometry(0.012, 10, 8), lam(BRASS_D), -w / 2 - t / 2 + 0.002, t / 2, 0);
    [-0.15, 0.15].forEach(function(f){
      add(new THREE.SphereGeometry(0.007, 8, 6), lam(BRASS), -w / 2 - t / 2 + 0.006, t / 2, d * f);
    });

    // 前口包边：上下封面边缘的细滚边（同色更深），压住封面与书页交界
    [cT / 2, t - cT / 2].forEach(function(y){
      var lip = add(new THREE.CylinderGeometry(cT / 2 + 0.002, cT / 2 + 0.002, d - 0.05, 10),
          matCoverD, w / 2 - 0.006, y, 0);
      lip.rotation.x = Math.PI / 2;
      if (openable && y > t / 2){ // 顶封面的滚边要跟着封面走
        g.remove(lip);
        coverPivot.add(lip);
        lip.position.set(w - 0.018, 0, 0);
      }
    });

    return { group: g, cover: coverPivot };
  }

  /* 黄铜叶饰：一根弯茎 + 几片小叶（压得很扁贴在封面上） */
  function brassSprig(len){
    var s = new THREE.Group();
    var stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-len / 2, 0, 0),
      new THREE.Vector3(0, 0.004, 0.012),
      new THREE.Vector3(len / 2, 0, -0.006)
    ]);
    s.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 8, 0.0035, 6), lam(BRASS)));
    for (var i = 0; i < 6; i++){
      var tt = 0.12 + (i >> 1) * 0.32;
      var p = stemCurve.getPoint(tt);
      var leaf = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), lam(i % 2 ? BRASS : BRASS_D));
      leaf.scale.set(1.15, 0.32, 0.55);
      leaf.position.set(p.x, p.y + 0.004, p.z + (i % 2 ? 0.02 : -0.02));
      leaf.rotation.y = (i % 2 ? -0.6 : 0.6);
      s.add(leaf);
    }
    var tip = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), lam(BRASS));
    tip.position.set(len / 2 + 0.006, 0.002, -0.008);
    s.add(tip);
    return s;
  }

  /* 圆润小白鸟：面朝 +x，脚底在局部 y=0 */
  function makeBird(){
    var bird = new THREE.Group();
    var matBody = lam(PORCELAIN), matWing = lam(WING), matInk = lam(INK);

    function add(geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      (parent || bird).add(m);
      return m;
    }

    var legH = 0.045, bodyY = legH + 0.085;
    // 小细腿 + 扁脚
    [-0.032, 0.032].forEach(function(z){
      add(new THREE.CylinderGeometry(0.0055, 0.0065, legH + 0.03, 8), lam(BRASS_D), 0.01, legH / 2 + 0.012, z);
      var foot = add(new THREE.SphereGeometry(0.016, 8, 6), lam(BRASS_D), 0.02, 0.006, z);
      foot.scale.set(1.5, 0.4, 0.9);
    });
    // 身体：胖椭球，尾部略翘
    var body = add(new THREE.SphereGeometry(0.105, 20, 16), matBody, 0, bodyY, 0);
    body.scale.set(1.2, 0.95, 0.92);
    body.rotation.z = 0.18;
    // 胸脯蓬松感：前下方再叠一个小球
    var chest = add(new THREE.SphereGeometry(0.075, 16, 12), matBody, 0.06, bodyY - 0.025, 0);
    chest.scale.set(1.05, 0.9, 0.95);
    // 头
    var head = add(new THREE.SphereGeometry(0.073, 18, 14), matBody, 0.085, bodyY + 0.105, 0);
    // 尖嘴
    var beak = add(new THREE.ConeGeometry(0.016, 0.05, 10), lam(WOOD_D), 0.163, bodyY + 0.098, 0);
    beak.rotation.z = -Math.PI / 2 - 0.12;
    // 黑豆眼
    [-1, 1].forEach(function(s){
      add(new THREE.SphereGeometry(0.0085, 8, 8), matInk, 0.125, bodyY + 0.125, s * 0.048);
    });
    // 小翅膀：肩部铰链组，扁水滴形贴身
    var wings = [];
    [-1, 1].forEach(function(s){
      var pivot = new THREE.Group();
      pivot.position.set(-0.01, bodyY + 0.045, s * 0.072);
      bird.add(pivot);
      var w = add(new THREE.SphereGeometry(0.062, 14, 10), matWing, -0.03, -0.035, s * 0.022, pivot);
      w.scale.set(1.35, 0.5, 0.42);
      w.rotation.z = 0.5;
      w.rotation.x = s * 0.35;
      var tip = add(new THREE.SphereGeometry(0.03, 10, 8), matWing, -0.095, -0.058, s * 0.026, pivot);
      tip.scale.set(1.3, 0.45, 0.4);
      tip.rotation.z = 0.72;
      wings.push(pivot);
    });
    // 上翘小尾巴
    var tail = add(new THREE.SphereGeometry(0.052, 12, 10), matWing, -0.135, bodyY + 0.045, 0);
    tail.scale.set(1.5, 0.35, 0.55);
    tail.rotation.z = -0.55;

    return { group: bird, wings: wings };
  }

  window.createLockerBookstack = function(){
    var root = new THREE.Group();
    root.name = 'Bird on Bookstack';

    /* ---- 三本书：米白（底）→ 军绿（中）→ 藏蓝（顶），交错微转 ---- */
    var b1 = makeBook(0.62, 0.175, 0.47, IVORY, IVORY_D, false);
    b1.group.position.set(0, 0, 0);
    b1.group.rotation.y = 0.10;
    root.add(b1.group);

    var b2 = makeBook(0.585, 0.165, 0.44, GREEN, GREEN_D, false);
    b2.group.position.set(0.015, 0.175, -0.01);
    b2.group.rotation.y = -0.17;
    root.add(b2.group);

    var b3 = makeBook(0.55, 0.155, 0.41, NAVY, 0x24405f, true);
    b3.group.position.set(-0.005, 0.34, 0.005);
    b3.group.rotation.y = 0.12;
    root.add(b3.group);

    var stackTop = 0.34 + 0.155;

    // 顶封面黄铜叶饰（跟着封面翻动）
    var sprig = brassSprig(0.18);
    sprig.position.set(0.3, 0.017, -0.02);
    sprig.rotation.y = 0.45;
    b3.cover.add(sprig);
    // 藏蓝丝带书签：从底书页间垂出前口
    var ribbon = new THREE.Mesh(roundedBox(0.04, 0.15, 0.007, 0.01), lam(NAVY));
    ribbon.position.set(0.62 / 2 + 0.008, 0.082, 0.1);
    ribbon.rotation.set(0.05, 0.08, -0.12);
    b1.group.add(ribbon);

    /* ---- 小白鸟：站在顶书封面偏书脊侧，面朝前口略偏观众 ---- */
    var birdParts = makeBird();
    var bird = birdParts.group;
    bird.position.set(-0.09, 0.155, 0.03);
    bird.rotation.y = 0.55;
    b3.group.add(bird);

    /* ---- 隐形点击热区 ---- */
    var proxy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.44, 1.05, 10),
      new THREE.MeshBasicMaterial({visible: false})
    );
    proxy.name = 'hit-proxy';
    proxy.position.set(0, 0.5, 0);
    root.add(proxy);

    /* ---- 交互：小鸟跳跃扑翅，封面翻开又合上 ---- */
    var busy = false;
    var birdBaseY = bird.position.y;
    root.userData.fx = {
      tap: function(){
        if (busy) return;
        busy = true;
        var tl = gsap.timeline({
          onComplete: function(){
            busy = false;
            bird.position.y = birdBaseY;
            bird.scale.set(1, 1, 1);
            b3.cover.rotation.z = 0;
            birdParts.wings.forEach(function(w){ w.rotation.x = 0; });
          }
        });
        // 起跳前蹲一下
        tl.to(bird.scale, {y: 0.82, x: 1.1, z: 1.1, duration: 0.1, ease: 'power1.in'}, 0);
        tl.to(bird.scale, {y: 1.08, x: 0.95, z: 0.95, duration: 0.12, ease: 'power2.out'}, 0.1);
        // 跳起 + 落回（封面翻动全程在小鸟滞空窗口内，避免穿模）
        tl.to(bird.position, {y: birdBaseY + 0.26, duration: 0.3, ease: 'power2.out'}, 0.1);
        tl.to(bird.position, {y: birdBaseY, duration: 0.32, ease: 'bounce.out'}, 0.58);
        tl.to(bird.scale, {y: 1, x: 1, z: 1, duration: 0.18, ease: 'power1.out'}, 0.6);
        // 扑扇翅膀两下（yoyo 往返 4 段 = 两次完整扑扇）
        birdParts.wings.forEach(function(w, i){
          var dir = i === 0 ? 1 : -1;
          tl.to(w.rotation, {x: dir * 1.15, duration: 0.11, yoyo: true, repeat: 3, ease: 'sine.inOut'}, 0.12);
        });
        // 顶书封面绕书脊翻开约 40° 再合上（在小鸟落地前完成大部分行程）
        tl.to(b3.cover.rotation, {z: 0.66, duration: 0.2, ease: 'power2.out'}, 0.16);
        tl.to(b3.cover.rotation, {z: 0, duration: 0.22, ease: 'power3.in'}, 0.4);
        // 合上时轻微余震
        tl.to(b3.cover.rotation, {z: 0.05, duration: 0.08, ease: 'power1.out'}, 0.62);
        tl.to(b3.cover.rotation, {z: 0, duration: 0.09, ease: 'power1.in'}, 0.7);
      }
    };
    return root;
  };
})();
