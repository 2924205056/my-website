/* 羽毛收集罐 —— 程序化 3D 模型（three r128 兼容）
 * 蓝调玻璃罐（微鼓）+ 软木塞 + 麻绳蝴蝶结挂牛皮吊牌 + 罐内 4 根白/浅蓝羽毛
 * userData.fx = { tap() }：木塞跳起悬停，一根羽毛从罐口飘出画懒 8 字，落回罐中，塞子盖好
 */
(function(){
  'use strict';

  var NAVY = 0x2c4a6e, BLUE = 0x4a7cb8, BRASS = 0xc9a05a, BRASS_D = 0xa8843f,
      WOOD = 0x8a6134, WOOD_D = 0x66452a, CREAM = 0xead9b8,
      PORCELAIN = 0xf2ede2, GLASS_BLUE = 0x8fb3d4, FEATHER_BLUE = 0xb5d2e8,
      TWINE = 0xa8843f, CORK = 0xb08d5a, CORK_D = 0x96723f;

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

  /* 扁平羽形：柔软羽绒轮廓（左右对称、细密浅波浪边）+ 沿高度微微后弯 */
  function featherVaneGeometry(len, wid){
    var N = 26; // 每侧采样数
    function halfWidth(t){
      // 根部窄 → 中上部最宽 → 尖端收拢；细密浅波浪模拟蓬松羽枝
      var base = wid * Math.pow(t, 0.38) * Math.pow(1 - t, 0.55) * 2.3;
      var ripple = 1 - 0.09 * (0.5 + 0.5 * Math.sin(t * 34)) * Math.min(1, t * 3);
      return base * ripple;
    }
    var right = [], left = [];
    for (var i = 1; i < N; i++){
      var t = i / N;
      var w = halfWidth(t);
      right.push(new THREE.Vector2(w, t * len));
      left.push(new THREE.Vector2(-w, t * len));
    }
    var s = new THREE.Shape();
    s.moveTo(0, 0);
    right.forEach(function(p){ s.lineTo(p.x, p.y); });
    s.lineTo(0, len);
    for (var j = left.length - 1; j >= 0; j--) s.lineTo(left[j].x, left[j].y);
    s.lineTo(0, 0);
    var geo = new THREE.ShapeGeometry(s, 6);
    // 轻柔的弧度：越靠羽尖越往后弯
    var pos = geo.attributes.position;
    for (var k = 0; k < pos.count; k++){
      var y = pos.getY(k);
      var tt = Math.max(0, y / len);
      pos.setZ(k, pos.getZ(k) - 0.09 * tt * tt * len);
    }
    geo.computeVertexNormals();
    return geo;
  }

  function makeFeather(len, wid, vaneColor){
    var g = new THREE.Group();
    var vane = new THREE.Mesh(featherVaneGeometry(len, wid),
      new THREE.MeshLambertMaterial({color: vaneColor, side: THREE.DoubleSide}));
    vane.name = 'vane';
    g.add(vane);
    // 中轴羽管：贯穿叶片下 2/3（羽尖后弯，杆不追到尖端以免脱离羽面）
    var rachis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0038, 0.0062, len * 0.72, 6), lam(CREAM));
    rachis.position.y = len * 0.34;
    rachis.rotation.x = 0.06;
    g.add(rachis);
    var quill = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0065, 0.0085, len * 0.22, 6), lam(BRASS_D));
    quill.position.y = -len * 0.1;
    g.add(quill);
    return g;
  }

  window.createLockerFeatherjar = function(){
    var root = new THREE.Group();
    root.name = 'Feather Jar';

    function mesh(name, geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.name = name;
      (parent || root).add(m);
      return m;
    }

    /* ---- 罐内羽毛（先加，玻璃透出来）：4 根白/浅蓝相间 ---- */
    var featherSpecs = [
      { len: 0.50, wid: 0.115, color: PORCELAIN,    x: -0.08,  z: -0.04, ry: -0.3,  rz:  0.3,  rx:  0.05 },
      { len: 0.43, wid: 0.10,  color: FEATHER_BLUE, x:  0.095, z:  0.01, ry:  0.45, rz: -0.28, rx: -0.04 },
      { len: 0.54, wid: 0.115, color: PORCELAIN,    x:  0.01,  z: -0.10, ry:  2.85, rz: -0.06, rx:  0.14 },
      { len: 0.39, wid: 0.095, color: FEATHER_BLUE, x: -0.04,  z:  0.09, ry: -2.7,  rz:  0.16, rx: -0.15 }
    ];
    var feathers = [];
    featherSpecs.forEach(function(fs, i){
      var f = makeFeather(fs.len, fs.wid, fs.color);
      f.name = 'feather-' + i;
      f.position.set(fs.x, 0.15, fs.z);
      f.rotation.set(fs.rx, fs.ry, fs.rz);
      // 中间这根是主羽毛：略微前置并提高渲染层级，出场时不会被玻璃和吊牌吞掉。
      if(i === 2){
        f.position.x = 0;
        f.position.z = 0.12;
        f.renderOrder = 24;
      } else {
        f.renderOrder = 12;
      }
      root.add(f);
      feathers.push(f);
    });

    /* ---- 玻璃罐：Lathe 微鼓瓶身 + 收肩 + 细颈 + 外翻唇边 ---- */
    var pts = [
      [0.001, 0.004], [0.17, 0.004], [0.245, 0.02], [0.278, 0.07],
      [0.292, 0.20], [0.296, 0.36], [0.285, 0.50], [0.256, 0.60],
      [0.19, 0.675], [0.152, 0.715], [0.141, 0.755], [0.141, 0.815],
      [0.158, 0.828], [0.166, 0.858], [0.15, 0.872], [0.122, 0.872], [0.118, 0.80]
    ].map(function(p){ return new THREE.Vector2(p[0], p[1]); });
    var glass = mesh('glass', new THREE.LatheGeometry(pts, 44), new THREE.MeshLambertMaterial({
      color: GLASS_BLUE, transparent: true, opacity: 0.25,
      side: THREE.DoubleSide, depthWrite: false
    }), 0, 0, 0);
    glass.renderOrder = 10;
    // 罐底一片更浓的蓝玻璃，压住地面接触感
    var foot = mesh('glass-foot', new THREE.CylinderGeometry(0.235, 0.25, 0.035, 36),
      new THREE.MeshLambertMaterial({color: BLUE, transparent: true, opacity: 0.35, depthWrite: false}),
      0, 0.018, 0);
    foot.renderOrder = 9;
    // 罐口唇边一圈实体浅蓝细环，让瓶口轮廓清楚
    var lip = mesh('glass-lip', new THREE.TorusGeometry(0.144, 0.008, 8, 32),
      lam(0xaac6de), 0, 0.868, 0);
    lip.rotation.x = Math.PI / 2;

    /* ---- 软木塞（上宽下窄圆台，下段插进瓶颈，边缘圆润）---- */
    var cork = new THREE.Group();
    cork.name = 'cork';
    cork.position.set(0, 0.8, 0);
    root.add(cork);
    var corkPts = [
      [0.001, 0], [0.108, 0], [0.118, 0.015], [0.128, 0.07],
      [0.15, 0.085], [0.158, 0.115], [0.16, 0.16],
      [0.148, 0.185], [0.11, 0.196], [0.001, 0.198]
    ].map(function(p){ return new THREE.Vector2(p[0], p[1]); });
    mesh('cork-body', new THREE.LatheGeometry(corkPts, 28), lam(CORK), 0, 0, 0, cork);
    // 顶面浅色圆片 + 侧面两道浅刻痕，做出软木的年轮感
    mesh('cork-top', new THREE.CylinderGeometry(0.112, 0.112, 0.012, 28), lam(0xc19f6d), 0, 0.196, 0, cork);
    var score = mesh('cork-score', new THREE.TorusGeometry(0.159, 0.0035, 5, 28), lam(CORK_D), 0, 0.138, 0, cork);
    score.rotation.x = Math.PI / 2;

    /* ---- 麻绳：颈上三圈缠绕 + 蝴蝶结 + 垂绳 ---- */
    var twineMat = lam(TWINE);
    [0.746, 0.767, 0.788].forEach(function(y, i){
      var ring = mesh('twine-' + i, new THREE.TorusGeometry(0.148, 0.0095, 6, 28), twineMat, 0, y, 0);
      ring.rotation.x = Math.PI / 2;
    });
    mesh('twine-knot', new THREE.SphereGeometry(0.019, 10, 8), twineMat, 0, 0.762, 0.152);
    var loopL = mesh('twine-loop-l', new THREE.TorusGeometry(0.028, 0.008, 6, 18), twineMat, -0.04, 0.77, 0.152);
    loopL.rotation.set(0.35, 0.5, 0.5);
    var loopR = mesh('twine-loop-r', new THREE.TorusGeometry(0.028, 0.008, 6, 18), twineMat, 0.04, 0.77, 0.152);
    loopR.rotation.set(0.35, -0.5, -0.5);
    var strCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.75, 0.15),
      new THREE.Vector3(0.014, 0.66, 0.245),
      new THREE.Vector3(0.02, 0.575, 0.315)
    ]);
    mesh('twine-string', new THREE.TubeGeometry(strCurve, 10, 0.0075, 6), twineMat, 0, 0, 0);

    /* ---- 牛皮纸吊牌（贴着瓶身外侧微斜）+ 黄铜孔环 ---- */
    var tag = new THREE.Group();
    tag.name = 'tag';
    tag.position.set(0.022, 0.45, 0.322);
    tag.rotation.set(-0.2, 0.06, 0.08);
    root.add(tag);
    mesh('tag-card', roundedBox(0.185, 0.26, 0.013, 0.034), lam(CREAM), 0, 0, 0, tag);
    mesh('tag-inner', roundedBox(0.147, 0.222, 0.005, 0.026), lam(0xdcc59e), 0, -0.005, 0.008, tag);
    var grommet = mesh('tag-grommet', new THREE.TorusGeometry(0.017, 0.0065, 6, 16), lam(BRASS), 0, 0.104, 0.006, tag);
    grommet.rotation.x = 0.12;

    /* ---- 隐形点击热区 ---- */
    var proxy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.37, 0.37, 1.15, 8),
      new THREE.MeshBasicMaterial({visible: false})
    );
    proxy.name = 'hit-proxy';
    proxy.position.set(0, 0.55, 0);
    root.add(proxy);

    /* ---- 交互：木塞轻轻提起，一根羽毛慢慢升出罐口、画懒 8 字、再缓缓落回 ---- */
    var busy = false;
    var heroFeather = feathers[2];
    root.userData.fx = {
      tap: function(){
        if (busy) return;
        busy = true;
        // 固定中间的主羽毛出场，其他三根只负责丰富罐内层次。
        var f = heroFeather;
        var home = {
          x: f.position.x, y: f.position.y, z: f.position.z,
          rx: f.rotation.x, ry: f.rotation.y, rz: f.rotation.z
        };
        var corkY = 0.8;
        var mouthY = 1.06;               // 罐口上方的悬停高度
        f.traverse(function(o){
          if(o.material){ o.material.depthTest = false; o.material.needsUpdate = true; }
        });
        var tl = gsap.timeline({
          onComplete: function(){
            f.position.set(home.x, home.y, home.z);
            f.rotation.set(home.rx, home.ry, home.rz);
            f.traverse(function(o){
              if(o.material){ o.material.depthTest = true; o.material.needsUpdate = true; }
            });
            cork.position.set(0, corkY, 0);
            cork.rotation.set(0, 0, 0);
            busy = false;
          }
        });
        // 1) 木塞被轻轻提起、歪向一边（慢速无弹跳），悬停时随呼吸浮动
        tl.to(cork.position, {y: corkY + 0.18, x: -0.42, duration: 0.9, ease: 'sine.inOut'}, 0);
        tl.to(cork.rotation, {z: 0.45, duration: 0.9, ease: 'sine.inOut'}, 0);
        tl.to(cork.position, {y: '+=0.028', duration: 0.85, yoyo: true, repeat: 3, ease: 'sine.inOut'}, 0.95);
        // 2) 羽毛沿罐轴慢慢升出罐口（1.3s 匀缓），同时轻轻摆正面向观众
        tl.to(f.position, {y: mouthY, duration: 1.3, ease: 'sine.inOut'}, 0.55);
        tl.to(f.rotation, {
          x: home.rx * 0.3, y: 0.15, z: home.rz * 0.3,
          duration: 1.3, ease: 'sine.inOut'
        }, 0.55);
        // 3) 罐口上方画一个懒懒的 8 字（振幅由 0 渐入渐出，与升降无缝衔接）
        var s = { p: 0 };
        tl.to(s, {
          p: 1, duration: 2.8, ease: 'none',
          onUpdate: function(){
            var p = s.p;
            var env = Math.sin(Math.PI * p);           // 渐入渐出的振幅包络
            var th = p * Math.PI * 2;
            f.position.x = home.x + env * (0.2 * Math.sin(th) + 0.1 - home.x * 0.5);
            f.position.y = mouthY + env * 0.08 * Math.sin(th * 2);
            f.position.z = home.z + env * (0.14 - home.z * 0.5);
            f.rotation.z = home.rz * 0.3 + env * 0.38 * Math.cos(th);
            f.rotation.y = 0.15 + env * 0.35 * Math.sin(th);
            f.rotation.x = home.rx * 0.3 - env * 0.25;
          }
        }, 1.85);
        // 4) 缓缓沉回罐中（1.3s），姿态同步还原
        tl.to(f.position, {x: home.x, y: home.y, z: home.z, duration: 1.3, ease: 'sine.inOut'}, 4.65);
        tl.to(f.rotation, {x: home.rx, y: home.ry, z: home.rz, duration: 1.3, ease: 'sine.inOut'}, 4.65);
        // 5) 木塞摆正、轻轻落回（不弹）
        tl.to(cork.rotation, {z: 0, duration: 0.7, ease: 'sine.inOut'}, 5.3);
        tl.to(cork.position, {x: 0, y: corkY, duration: 0.85, ease: 'sine.inOut'}, 5.3);
      }
    };
    return root;
  };
})();
