/* 鸟窝 + 三枚蛋 —— 程序化 3D 模型（three r128 兼容）
 * 窝体：多圈交错细枝（Torus 随机倾斜）+ 乱枝（CatmullRom Tube），内衬干草色
 * userData.nest = { eggs: [mesh,mesh,mesh], seatY: 鸟落窝高度 }   —— 契约保持不变
 * userData.fx   = { tap: function(){} }  蛋跳一跳 + 窝身弹性挤压
 */
(function(){
  'use strict';

  var TWIG    = 0xa8875f,   // 浅枯枝
      TWIG_D  = 0x84684a,   // 深枯枝
      TWIG_G  = 0x9b8a6e,   // 灰褐枝
      WOOD_D  = 0x66452a,   // 底部阴影枝
      STRAW   = 0xd9c194,   // 内衬干草
      STRAW_D = 0xc4a878,   // 干草暗部
      BRASS   = 0xc9a05a,   // 一根"金草"点缀
      EGG     = 0xf2ede2,   // 白瓷奶油
      SPECK   = 0xd6c8ab;   // 极浅斑点

  function lam(color){ return new THREE.MeshLambertMaterial({color: color}); }

  window.createLockerNest = function(){
    var root = new THREE.Group();
    root.name = 'Bird Nest with Eggs';

    /* 固定种子随机 —— 每次构建形态一致 */
    var seed = 20260829;
    function rnd(){ seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function jit(a){ return (rnd() - 0.5) * 2 * a; }

    var matTwig  = lam(TWIG), matTwigD = lam(TWIG_D), matTwigG = lam(TWIG_G),
        matDark  = lam(WOOD_D), matStraw = lam(STRAW), matStrawD = lam(STRAW_D),
        matBrass = lam(BRASS), matEgg = lam(EGG), matSpeck = lam(SPECK);
    var twigMats = [matTwig, matTwigD, matTwigG, matTwig, matDark];

    /* body：承载全部造型，tap 时挤压它而不是 root（root 的 transform 归外部管） */
    var body = new THREE.Group();
    body.name = 'nest-body';
    root.add(body);

    function mesh(name, geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.name = name;
      (parent || body).add(m);
      return m;
    }

    /* ---- 底垫：压扁球体收住窝底，落地 y=0 ---- */
    var pad = mesh('nest-base', new THREE.SphereGeometry(0.19, 20, 12), matDark, 0, 0.078, 0);
    pad.scale.set(1, 0.42, 1);

    /* ---- 内碗：Lathe 干草衬 ---- */
    var bowlPts = [];
    [[0.0, 0.062], [0.09, 0.068], [0.15, 0.09], [0.19, 0.12], [0.212, 0.15], [0.218, 0.17]]
      .forEach(function(p){ bowlPts.push(new THREE.Vector2(p[0], p[1])); });
    mesh('nest-bowl', new THREE.LatheGeometry(bowlPts, 26), matStraw, 0, 0, 0);
    /* 内衬草圈：几缕浅色干草贴着碗壁 */
    [[0.115, 0.082, 0.007], [0.16, 0.104, 0.008], [0.19, 0.128, 0.008], [0.207, 0.152, 0.007]]
      .forEach(function(s, i){
        var straw = mesh('straw-ring-' + i,
          new THREE.TorusGeometry(s[0], s[2], 6, 26), i % 2 ? matStrawD : matStraw, jit(0.006), s[1], jit(0.006));
        straw.rotation.set(Math.PI / 2 + jit(0.09), jit(0.2), jit(0.09));
        straw.scale.set(1, 1 + jit(0.05), 1);
      });

    /* ---- 窝身：一圈圈交错细枝（多环随机倾斜） ---- */
    var profile = [                       // [y, R] 由底到沿的轮廓
      [0.035, 0.175], [0.06, 0.215], [0.085, 0.248],
      [0.11, 0.272], [0.135, 0.288], [0.158, 0.296], [0.175, 0.293]
    ];
    var ringCount = 0;
    profile.forEach(function(lv){
      var n = 2;                          // 每层两圈，彼此错开
      for (var k = 0; k < n; k++){
        var R = lv[1] + jit(0.012);
        var tube = 0.013 + rnd() * 0.007;
        var ring = mesh('twig-ring-' + (ringCount++),
          new THREE.TorusGeometry(R, tube, 7, 30),
          twigMats[Math.floor(rnd() * twigMats.length)],
          jit(0.008), lv[0] + jit(0.01), jit(0.008));
        /* Euler XYZ：Rz 是绕环自身轴的自转（视觉无感），Ry 小角度让环面微斜，
         * Rx≈π/2 放平 —— 只允许小角度倾斜，环才像一圈圈编上去的枝条 */
        ring.rotation.set(Math.PI / 2 + jit(0.16), jit(0.14), rnd() * Math.PI * 2);
        ring.scale.set(1 + jit(0.04), 1 + jit(0.04), 1);
      }
    });
    /* 一根金色干草绕在窝沿 —— 黄铜点缀 */
    var gold = mesh('golden-straw', new THREE.TorusGeometry(0.288, 0.006, 5, 30), matBrass, 0.004, 0.152, -0.006);
    gold.rotation.set(Math.PI / 2 + 0.1, 0.07, 0);

    /* ---- 乱枝：CatmullRom Tube 斜着从窝身戳出来 ---- */
    function strayTwig(i, a0, y0, len, rad, mat){
      var R0 = 0.18 + (y0 / 0.175) * 0.11;      // 该高度附近的窝身半径
      var sweep = 0.5 + rnd() * 0.55;           // 沿切线方向扫过的角度 → 像编进去的
      var pts = [];
      for (var s = 0; s <= 3; s++){
        var t = s / 3;
        var a = a0 + sweep * t;
        var r = R0 - 0.06 + (0.06 + len) * t;
        pts.push(new THREE.Vector3(
          Math.cos(a) * r,
          y0 + jit(0.012) + t * t * (0.01 + rnd() * 0.03) * (rnd() > 0.4 ? 1 : -0.7),
          Math.sin(a) * r
        ));
      }
      var tw = mesh('stray-twig-' + i,
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, rad, 5), mat, 0, 0, 0);
      /* 枝端小结：封住管口，免得看见空心 */
      var tip = pts[3];
      mesh('twig-tip-' + i, new THREE.SphereGeometry(rad * 1.05, 6, 5), mat, tip.x, tip.y, tip.z);
      return tw;
    }
    for (var i = 0; i < 9; i++){
      strayTwig(i,
        rnd() * Math.PI * 2,
        0.05 + rnd() * 0.115,
        0.1 + rnd() * 0.1,
        0.0065 + rnd() * 0.0035,
        i === 4 ? matBrass : twigMats[Math.floor(rnd() * twigMats.length)]);
    }

    /* ---- 三枚蛋：奶油白、极浅斑点、大小微差、挤在一起 ---- */
    var EGG_R = 0.062;
    function eggWarp(x, y, z, r){          // 蛋形：顶端拉长收窄
      var ny = y / r;
      var up = Math.max(0, ny);
      return [x * (1 - 0.16 * up * ny), y * (1.2 + 0.2 * up), z * (1 - 0.16 * up * ny)];
    }
    function eggGeometry(r){
      var g = new THREE.SphereGeometry(r, 16, 14);
      var pos = g.attributes.position;
      for (var v = 0; v < pos.count; v++){
        var w = eggWarp(pos.getX(v), pos.getY(v), pos.getZ(v), r);
        pos.setXYZ(v, w[0], w[1], w[2]);
      }
      g.computeVertexNormals();
      return g;
    }
    var eggs = [];
    var eggGeo = eggGeometry(EGG_R);
    [ /* x, y, z, scale, leanX, spinY */
      [-0.068, 0.148, 0.034,  1.0,  -0.14, 0.5],
      [ 0.064, 0.152, 0.056,  0.92,  0.12, 2.4],
      [-0.004, 0.144, -0.068, 1.06,  0.18, 4.2]
    ].forEach(function(p, i){
      var e = mesh('egg-' + i, eggGeo, matEgg, p[0], p[1], p[2]);
      e.scale.setScalar(p[3]);
      e.rotation.x = p[4];                 // 只用 x/y 倾斜；rotation.z 留给外部 wiggle 动画
      e.rotation.y = p[5];
      e.userData.baseY = p[1];
      /* 极浅斑点：小圆片微嵌在蛋壳表面（随蛋一起动） */
      for (var d = 0; d < 11; d++){
        var th = rnd() * Math.PI * 2;
        var ph = 0.25 + rnd() * 1.7;       // 避开正底部
        var dir = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
        var sp = eggWarp(dir[0] * EGG_R, dir[1] * EGG_R, dir[2] * EGG_R, EGG_R);
        var speck = mesh('egg-' + i + '-speck-' + d,
          new THREE.SphereGeometry(0.004 + rnd() * 0.0035, 6, 5), matSpeck,
          sp[0] * 0.97, sp[1] * 0.97, sp[2] * 0.97, e);
        void speck;                        // 微嵌壳内，露出浅浅一点
      }
      eggs.push(e);
    });

    /* ---- 隐形点击热区 ---- */
    var proxy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.36, 10),
      new THREE.MeshBasicMaterial({visible: false})
    );
    proxy.name = 'hit-proxy';
    proxy.position.set(0, 0.17, 0);
    root.add(proxy);

    /* ---- 契约字段（保持不变） ---- */
    root.userData.nest = { eggs: eggs, seatY: 0.22 };

    /* ---- 交互：窝身弹性挤压 + 三枚蛋依次跳动打转 ---- */
    var tapBusy = false;
    root.userData.fx = {
      tap: function(){
        if (tapBusy) return;
        tapBusy = true;
        var tl = gsap.timeline({onComplete: function(){
          tapBusy = false;
          body.scale.set(1, 1, 1);
          eggs.forEach(function(e){ e.rotation.z = 0; e.position.y = e.userData.baseY; });
        }});
        tl.fromTo(body.scale, {x: 1.07, y: 0.9, z: 1.07},
          {x: 1, y: 1, z: 1, duration: 0.75, ease: 'elastic.out(1, 0.42)'}, 0);
        eggs.forEach(function(e, i){
          var at = 0.05 + i * 0.13;
          tl.to(e.position, {y: e.userData.baseY + 0.042, duration: 0.17,
            ease: 'power2.out', yoyo: true, repeat: 1}, at);
          tl.fromTo(e.rotation, {z: -0.16}, {z: 0.16, duration: 0.1,
            yoyo: true, repeat: 3, ease: 'sine.inOut'}, at);
        });
        tl.set({}, {}, 1.0); // 收尾留一点余量
      }
    };

    return root;
  };
})();
