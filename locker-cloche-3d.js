/* 雪景玻璃罩 cloche —— 程序化 3D 模型（three r128 兼容）
 * 深色车削木底座 + 蓝调透明玻璃钟罩（顶部玻璃圆钮）+ 罩内蓬蓬小白云
 * userData.fx = { tap() }：整体左右摇摆，14 片小雪花从云底飘落到底座再淡出
 */
(function(){
  'use strict';

  var NAVY = 0x2c4a6e, BLUE = 0x4a7cb8, BRASS = 0xc9a05a, BRASS_D = 0xa8843f,
      WOOD = 0x8a6134, WOOD_D = 0x66452a, WOOD_DK = 0x4e3018, CREAM = 0xead9b8,
      PORCELAIN = 0xf2ede2, INK = 0x1c1c20,
      GLASS_TINT = 0x9fc0dc, CLOUD_SHADE = 0xd8cdb6;

  function lam(color){ return new THREE.MeshLambertMaterial({color: color}); }

  window.createLockerCloche = function(){
    var root = new THREE.Group();
    root.name = 'Snow Cloche';

    var matWoodD = lam(WOOD_D), matWoodDK = lam(WOOD_DK),
        matBrass = lam(BRASS), matBrassD = lam(BRASS_D);
    var matGlass = new THREE.MeshLambertMaterial({
      color: GLASS_TINT, transparent: true, opacity: 0.22,
      side: THREE.DoubleSide, depthWrite: false
    });

    function mesh(name, geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.name = name;
      (parent || root).add(m);
      return m;
    }

    /* ---- 深色木底座：车削线脚（底缘鼓包 + 束腰 + 上唇）---- */
    var basePts = [
      new THREE.Vector2(0.0,   0.0),
      new THREE.Vector2(0.30,  0.0),
      new THREE.Vector2(0.375, 0.008),
      new THREE.Vector2(0.408, 0.036),   // 底部大鼓包（外弧）
      new THREE.Vector2(0.405, 0.058),
      new THREE.Vector2(0.372, 0.078),
      new THREE.Vector2(0.345, 0.085),   // 束腰入弯
      new THREE.Vector2(0.335, 0.102),
      new THREE.Vector2(0.352, 0.116),   // 上唇小外翻
      new THREE.Vector2(0.348, 0.128),
      new THREE.Vector2(0.318, 0.138),
      new THREE.Vector2(0.30,  0.14),
      new THREE.Vector2(0.0,   0.14)
    ];
    mesh('base', new THREE.LatheGeometry(basePts, 40), matWoodDK, 0, 0, 0);
    // 座面木盘（雪落在这上面），略比玻璃口小
    mesh('base-plate', new THREE.CylinderGeometry(0.295, 0.302, 0.016, 36), matWoodD, 0, 0.146, 0);
    // 黄铜饰环：卡在束腰处，点出复古金属细节
    var ring = mesh('brass-ring', new THREE.TorusGeometry(0.343, 0.0085, 8, 44), matBrass, 0, 0.094, 0);
    ring.rotation.x = Math.PI / 2;
    // 正面黄铜凸圆饰钉（椭圆 cabochon），贴在底座鼓包上
    var plaque = mesh('plaque', new THREE.SphereGeometry(0.03, 16, 12), matBrass, 0, 0.052, 0.392);
    plaque.scale.set(1.35, 0.85, 0.45);
    plaque.rotation.x = -0.3;

    /* ---- 玻璃钟罩：直壁 + 圆顶 + 收颈 + 玻璃圆钮（一条 Lathe 轮廓）---- */
    var GY = 0.148;               // 玻璃落座高度
    var R = 0.305, WALL = 0.40;   // 罩半径 / 直壁高
    var glassPts = [];
    glassPts.push(new THREE.Vector2(R + 0.01, 0));       // 罩口微外撇的唇
    glassPts.push(new THREE.Vector2(R + 0.012, 0.012));
    glassPts.push(new THREE.Vector2(R, 0.03));
    glassPts.push(new THREE.Vector2(R, WALL));
    // 圆顶：四分之一椭圆
    var DOME_H = 0.26;
    for (var i = 1; i <= 12; i++){
      var t = i / 12 * Math.PI / 2;
      glassPts.push(new THREE.Vector2(R * Math.cos(t), WALL + DOME_H * Math.sin(t)));
    }
    // 收颈 + 玻璃钮
    var topY = WALL + DOME_H;
    glassPts.push(new THREE.Vector2(0.052, topY + 0.006));
    glassPts.push(new THREE.Vector2(0.034, topY + 0.03));   // 颈部内凹
    glassPts.push(new THREE.Vector2(0.058, topY + 0.06));
    var KNOB_R = 0.062, knobC = topY + 0.078 + KNOB_R * 0.4;
    for (var k = 0; k <= 12; k++){                          // 圆钮球面
      var a = -Math.PI * 0.42 + k / 12 * (Math.PI * 0.42 + Math.PI / 2);
      glassPts.push(new THREE.Vector2(KNOB_R * Math.cos(a), knobC + KNOB_R * Math.sin(a)));
    }
    glassPts.push(new THREE.Vector2(0, knobC + KNOB_R));
    var glass = mesh('glass-dome', new THREE.LatheGeometry(glassPts, 48), matGlass, 0, GY, 0);
    glass.renderOrder = 5;

    /* ---- 座面积雪：一整层圆鼓鼓的雪地 + 几个小雪丘 ---- */
    var matSnow = lam(PORCELAIN);
    var snowGround = mesh('snow-ground', new THREE.SphereGeometry(0.285, 32, 14), matSnow, 0, 0.15, 0);
    snowGround.scale.y = 0.09;
    [
      [ 0.06,  0.09, 0.075, 0.42],
      [-0.13, -0.04, 0.06,  0.38],
      [ 0.14, -0.10, 0.05,  0.35],
      [-0.04,  0.16, 0.045, 0.33]
    ].forEach(function(s, i){
      var mound = mesh('snow-mound-' + i, new THREE.SphereGeometry(s[2], 14, 10),
        matSnow, s[0], 0.168, s[1]);
      mound.scale.y = s[3];
    });

    /* ---- 罩内蓬蓬小白云（多球组合，底部略带阴影色）---- */
    var cloud = new THREE.Group();
    cloud.name = 'cloud';
    cloud.position.set(0, GY + 0.42, 0);
    root.add(cloud);
    var matCloud = lam(PORCELAIN), matCloudD = lam(CLOUD_SHADE);
    var puffs = [
      // [x, y, z, r, 是否阴影色]
      [ 0.00,  0.045, 0.00, 0.115, 0],
      [-0.105, 0.005, 0.02, 0.085, 0],
      [ 0.105, 0.00,  0.03, 0.09,  0],
      [-0.05,  0.075,-0.05, 0.075, 0],
      [ 0.055, 0.08, -0.03, 0.07,  0],
      [ 0.00,  0.03,  0.09, 0.08,  0],
      [-0.155,-0.03,  0.00, 0.058, 1],
      [ 0.16, -0.035, 0.00, 0.06,  1],
      [-0.05, -0.045, 0.05, 0.075, 1],
      [ 0.06, -0.05, -0.04, 0.072, 1],
      [ 0.00, -0.055, 0.00, 0.09,  1]
    ];
    puffs.forEach(function(p, i){
      mesh('puff-' + i, new THREE.SphereGeometry(p[3], 14, 11),
        p[4] ? matCloudD : matCloud, p[0], p[1], p[2], cloud);
    });

    /* ---- 14 片雪花（初始隐藏，tap 时飘落）---- */
    var flakes = [];
    var flakeGeo = new THREE.SphereGeometry(0.0135, 8, 6);
    for (var f = 0; f < 14; f++){
      var fm = new THREE.Mesh(flakeGeo, new THREE.MeshLambertMaterial({
        color: PORCELAIN, transparent: true, opacity: 0
      }));
      fm.name = 'flake-' + f;
      fm.visible = false;
      fm.renderOrder = 4;   // 在玻璃(5)之前画，保证透过玻璃可见
      root.add(fm);
      flakes.push(fm);
    }

    /* ---- 隐形点击热区 ---- */
    var proxy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 1.02, 10),
      new THREE.MeshBasicMaterial({visible: false})
    );
    proxy.name = 'hit-proxy';
    proxy.position.set(0, 0.51, 0);
    root.add(proxy);

    /* ---- 交互：摇摆 + 落雪 ---- */
    var busy = false;
    var CLOUD_BOT = GY + 0.35, FLOOR = 0.183;
    root.userData.fx = {
      tap: function(){
        if (busy) return;
        busy = true;
        var tl = gsap.timeline({
          onComplete: function(){
            busy = false;
            flakes.forEach(function(fl){ fl.visible = false; });
          }
        });
        // 整体左右摇摆一下（绕底部，先右后左回正）
        tl.to(root.rotation, {z: -0.085, duration: 0.16, ease: 'sine.inOut'}, 0)
          .to(root.rotation, {z: 0.065, duration: 0.26, ease: 'sine.inOut'})
          .to(root.rotation, {z: -0.035, duration: 0.24, ease: 'sine.inOut'})
          .to(root.rotation, {z: 0, duration: 0.32, ease: 'sine.out'});
        // 14 片雪花错峰飘落
        flakes.forEach(function(fl, i){
          var ang = i / 14 * Math.PI * 2 + (i % 3) * 0.7;
          var rad = 0.05 + (i % 5) * 0.032;
          var sx = Math.cos(ang) * rad, sz = Math.sin(ang) * rad;
          var startAt = 0.12 + i * 0.075 + (i % 4) * 0.03;
          var fall = 0.95 + (i % 3) * 0.18;
          tl.set(fl.position, {x: sx, y: CLOUD_BOT - (i % 3) * 0.015, z: sz}, startAt)
            .set(fl, {visible: true}, startAt)
            .set(fl.material, {opacity: 0}, startAt)
            .to(fl.material, {opacity: 0.95, duration: 0.15}, startAt)
            .to(fl.position, {
              y: FLOOR,
              x: sx + Math.sin(i * 2.3) * 0.045,
              z: sz + Math.cos(i * 1.7) * 0.04,
              duration: fall, ease: 'sine.in'
            }, startAt)
            .to(fl.material, {opacity: 0, duration: 0.3, ease: 'power1.in'},
              startAt + fall - 0.08);
        });
      }
    };
    return root;
  };
})();
