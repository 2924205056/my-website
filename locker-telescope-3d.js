/* 复古黄铜望远镜 —— 程序化 3D 模型（three r128 兼容）
 * 修长海军蓝镜筒 + 两段黄铜伸缩节 + 锥形木三脚架 + 黄铜叉臂云台
 * userData.scope = { tube }；userData.fx = { tap() } 点击时巡天一瞥
 */
(function(){
  'use strict';

  var NAVY = 0x2c4a6e, BLUE = 0x4a7cb8, BRASS = 0xc9a05a, BRASS_D = 0xa8843f,
      WOOD = 0x8a6134, WOOD_D = 0x66452a, CREAM = 0xead9b8, INK = 0x1c1c20,
      GLASS = 0x8fc4e8;

  function lam(color){ return new THREE.MeshLambertMaterial({color: color}); }

  /* 旋成体：pts = [[r,y],...]，自下而上 */
  function lathe(pts, seg){
    var v = pts.map(function(p){ return new THREE.Vector2(p[0], p[1]); });
    return new THREE.LatheGeometry(v, seg || 28);
  }

  window.createLockerTelescope = function(){
    var root = new THREE.Group();
    root.name = 'Vintage Telescope';
    var matNavy = lam(NAVY), matBrass = lam(BRASS), matBrassD = lam(BRASS_D),
        matWood = lam(WOOD), matWoodD = lam(WOOD_D), matInk = lam(INK);

    function mesh(name, geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.name = name;
      (parent || root).add(m);
      return m;
    }

    /* ================= 木三脚架 ================= */
    /* 腿：上粗下细锥形木腿，张角更大更稳；顶端黄铜铰接头、中段箍环、球形脚垫 */
    var HUB_Y = 0.92;                 // 云台底盘中心高
    var legLen = 0.98, spread = 0.5;  // 张角（弧度）
    for (var i = 0; i < 3; i++){
      var a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      var leg = new THREE.Group();
      leg.name = 'leg-' + i;
      leg.position.set(Math.cos(a) * 0.055, HUB_Y - 0.06, Math.sin(a) * 0.055);
      leg.rotation.set(Math.sin(a) * spread, 0, -Math.cos(a) * spread);
      root.add(leg);
      // 锥形木腿（上粗下细），微圆润
      mesh('leg-wood-' + i, lathe([
        [0.001, -legLen], [0.021, -legLen + 0.015], [0.026, -legLen * 0.72],
        [0.033, -legLen * 0.4], [0.04, -0.1], [0.043, -0.02], [0.038, 0.02], [0.001, 0.03]
      ], 14), matWood, 0, 0, 0, leg);
      // 顶端黄铜铰接护套（含小圆轴钮）
      mesh('leg-cap-' + i, lathe([
        [0.001, -0.075], [0.047, -0.07], [0.05, -0.03], [0.05, 0.02], [0.044, 0.045], [0.001, 0.05]
      ], 14), matBrass, 0, 0, 0, leg);
      var pin = mesh('leg-pin-' + i, new THREE.CylinderGeometry(0.014, 0.014, 0.108, 10), matBrassD, 0, -0.012, 0, leg);
      pin.rotation.x = Math.PI / 2;
      // 中段黄铜箍
      mesh('leg-band-' + i, new THREE.CylinderGeometry(0.0335, 0.0295, 0.045, 12), matBrassD, 0, -legLen * 0.56, 0, leg);
      // 脚：黄铜杯托 + 圆球脚垫
      mesh('leg-tipcup-' + i, lathe([
        [0.001, -0.03], [0.024, -0.026], [0.027, 0.012], [0.021, 0.03], [0.001, 0.032]
      ], 12), matBrass, 0, -legLen + 0.02, 0, leg);
      mesh('leg-ball-' + i, new THREE.SphereGeometry(0.03, 12, 10), matBrassD, 0, -legLen - 0.018, 0, leg);
    }
    // 三腿间下垂链条（细管 + 中央小环扣）
    var chainR = 0.315, chainY = 0.34;
    for (var c = 0; c < 3; c++){
      var a1 = (c / 3) * Math.PI * 2 + Math.PI / 6;
      var a2 = ((c + 1) / 3) * Math.PI * 2 + Math.PI / 6;
      var p1 = new THREE.Vector3(Math.cos(a1) * chainR, chainY, Math.sin(a1) * chainR);
      var p2 = new THREE.Vector3(Math.cos(a2) * chainR, chainY, Math.sin(a2) * chainR);
      var mid = p1.clone().add(p2).multiplyScalar(0.5); mid.y -= 0.085;
      mesh('chain-' + c, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p1, mid, p2]), 12, 0.0075, 6),
        matBrassD, 0, 0, 0, root);
      // 腿上的链环扣
      var ring = mesh('chain-ring-' + c, new THREE.TorusGeometry(0.016, 0.006, 6, 12), matBrass,
        Math.cos(a1) * (chainR - 0.005), chainY + 0.005, Math.sin(a1) * (chainR - 0.005), root);
      ring.rotation.y = -a1 + Math.PI / 2;
    }

    /* ================= 黄铜云台 ================= */
    // head：可水平回转的整个上部（云台 + 镜筒），铰在三脚架顶
    var head = new THREE.Group();
    head.name = 'head';
    head.position.set(0, HUB_Y, 0);
    root.add(head);
    var mount = new THREE.Group();
    mount.name = 'mount';
    head.add(mount);
    // 底盘：束腰旋成体（出檐盘 + 细颈 + 座圈），盖住三腿铰接
    mesh('head-disc', lathe([
      [0.001, -0.075], [0.1, -0.07], [0.115, -0.05], [0.105, -0.02],
      [0.07, 0.0], [0.06, 0.03], [0.068, 0.055], [0.09, 0.07], [0.093, 0.1],
      [0.075, 0.115], [0.001, 0.12]
    ], 24), matBrass, 0, 0, 0, mount);
    // 底盘滚花饰环
    var knurl = mesh('head-knurl', new THREE.TorusGeometry(0.098, 0.008, 6, 24), matBrassD, 0, -0.035, 0, mount);
    knurl.rotation.x = Math.PI / 2;
    // 叉臂：两条弧形黄铜臂从底盘两侧升至轴耳
    var TRUN_Y = 0.34;                // 轴耳（俯仰轴）相对 mount 的高度
    [-1, 1].forEach(function(s){
      var yoke = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.045, 0.09, 0),
        new THREE.Vector3(s * 0.1, 0.17, 0),
        new THREE.Vector3(s * 0.108, 0.26, 0),
        new THREE.Vector3(s * 0.092, TRUN_Y - 0.015, 0)
      ]);
      mesh('yoke-' + s, new THREE.TubeGeometry(yoke, 14, 0.017, 10), matBrass, 0, 0, 0, mount);
      // 轴耳圆盘
      var ear = mesh('yoke-ear-' + s, new THREE.CylinderGeometry(0.037, 0.037, 0.03, 16), matBrass,
        s * 0.095, TRUN_Y, 0, mount);
      ear.rotation.z = Math.PI / 2;
    });
    // 俯仰锁紧旋钮（右侧，带滚花边）
    var knob = mesh('tilt-knob', lathe([
      [0.001, 0], [0.024, 0.002], [0.026, 0.02], [0.04, 0.026], [0.042, 0.05], [0.032, 0.058], [0.001, 0.06]
    ], 16), matBrassD, 0.11, TRUN_Y, 0, mount);
    knob.rotation.z = -Math.PI / 2;

    /* ================= 镜筒组（绕轴耳俯仰）================= */
    var tube = new THREE.Group();
    tube.name = 'tube';
    tube.position.set(0, TRUN_Y, 0);           // 铰在轴耳上
    tube.rotation.set(-0.56, 0, -0.1);         // 上扬 + 微侧倾
    head.add(tube);

    var BAL = 0.1;   // 镜筒相对轴心前移量（前段略长，姿态更昂扬）
    // ---- 主筒：修长海军蓝旋成体（前端微鼓的物镜座、筒身细长微锥）----
    // 局部 +Y 为物镜方向
    mesh('barrel', lathe([
      [0.052, -0.42 + BAL],
      [0.056, -0.3 + BAL], [0.06, -0.05 + BAL], [0.063, 0.2 + BAL],
      [0.065, 0.38 + BAL], [0.068, 0.46 + BAL]
    ], 24), matNavy, 0, 0, 0, tube);
    // 物镜端黄铜喇叭座（外扩包口）
    mesh('rim-objective', lathe([
      [0.06, 0.44 + BAL], [0.073, 0.455 + BAL], [0.079, 0.5 + BAL],
      [0.083, 0.53 + BAL], [0.081, 0.545 + BAL], [0.07, 0.55 + BAL], [0.062, 0.548 + BAL]
    ], 24), matBrass, 0, 0, 0, tube);
    var objRing = mesh('rim-objective-lip', new THREE.TorusGeometry(0.076, 0.007, 8, 24), matBrassD, 0, 0.548 + BAL, 0, tube);
    objRing.rotation.x = Math.PI / 2;
    // 物镜玻璃（淡蓝微透 + 内圈墨色衬底）
    mesh('objective-backing', new THREE.CylinderGeometry(0.062, 0.062, 0.012, 20), matInk, 0, 0.538 + BAL, 0, tube);
    var glass = mesh('objective-glass', new THREE.CircleGeometry(0.058, 24),
      new THREE.MeshLambertMaterial({color: GLASS, transparent: true, opacity: 0.8, emissive: 0x2a4a66}),
      0, 0.546 + BAL, 0, tube);
    glass.rotation.x = -Math.PI / 2;
    // 筒身黄铜饰环（前 / 中 / 尾三道）
    mesh('band-front', new THREE.CylinderGeometry(0.068, 0.068, 0.035, 24), matBrass, 0, 0.3 + BAL, 0, tube);
    mesh('band-mid', new THREE.CylinderGeometry(0.064, 0.064, 0.028, 24), matBrass, 0, 0.02 + BAL, 0, tube);
    mesh('band-rear', lathe([
      [0.052, -0.02], [0.062, -0.012], [0.064, 0.02], [0.06, 0.04], [0.05, 0.046]
    ], 24), matBrass, 0, -0.44 + BAL, 0, tube);

    // ---- 两段黄铜伸缩节（drawtube 组，可整体抽拉）----
    var draw = new THREE.Group();
    draw.name = 'drawtube';
    draw.position.set(0, -0.44 + BAL, 0);
    tube.add(draw);
    // 第一节
    mesh('draw-seg1', new THREE.CylinderGeometry(0.041, 0.043, 0.17, 20), matBrass, 0, -0.06, 0, draw);
    mesh('draw-collar1', new THREE.CylinderGeometry(0.047, 0.047, 0.028, 20), matBrassD, 0, -0.135, 0, draw);
    // 第二节（更细）
    mesh('draw-seg2', new THREE.CylinderGeometry(0.031, 0.033, 0.14, 18), matBrass, 0, -0.19, 0, draw);
    mesh('draw-collar2', new THREE.CylinderGeometry(0.037, 0.037, 0.024, 18), matBrassD, 0, -0.25, 0, draw);
    // 目镜杯（喇叭形收口 + 墨色眼罩圈）
    mesh('eyecup', lathe([
      [0.03, -0.32], [0.026, -0.3], [0.02, -0.285], [0.02, -0.265], [0.028, -0.255]
    ], 16), matBrassD, 0, 0, 0, draw);
    var eyeRing = mesh('eyecup-ring', new THREE.TorusGeometry(0.019, 0.006, 6, 14), matInk, 0, -0.322, 0, draw);
    eyeRing.rotation.x = Math.PI / 2;

    // ---- 寻星镜：小巧贴筒，藏在主筒右下侧 ----
    var finder = new THREE.Group();
    finder.name = 'finder';
    finder.position.set(0.028, -0.2 + BAL, 0.075);
    tube.add(finder);
    mesh('finder-tube', lathe([
      [0.016, -0.11], [0.018, -0.06], [0.019, 0.05], [0.022, 0.09]
    ], 14), lam(BLUE), 0, 0, 0, finder);
    mesh('finder-rim', lathe([
      [0.018, 0.085], [0.024, 0.09], [0.026, 0.112], [0.02, 0.12], [0.014, 0.118]
    ], 14), matBrass, 0, 0, 0, finder);
    mesh('finder-eye', new THREE.CylinderGeometry(0.011, 0.014, 0.035, 12), matBrass, 0, -0.125, 0, finder);
    var fGlass = mesh('finder-glass', new THREE.CircleGeometry(0.017, 14),
      new THREE.MeshLambertMaterial({color: GLASS, transparent: true, opacity: 0.8}), 0, 0.118, 0, finder);
    fGlass.rotation.x = -Math.PI / 2;
    // 两个黄铜环形支脚把寻星镜扣在主筒上
    [-0.06, 0.055].forEach(function(fy, fi){
      var clampRing = mesh('finder-clamp-' + fi, new THREE.TorusGeometry(0.02, 0.006, 6, 14), matBrassD, 0, fy, 0, finder);
      clampRing.rotation.x = Math.PI / 2;
      var post = mesh('finder-post-' + fi, new THREE.CylinderGeometry(0.007, 0.007, 0.05, 8), matBrassD,
        -0.011, fy, -0.028, finder);
      post.rotation.x = Math.PI / 2 + 0.36;
      post.rotation.y = 0.35;
    });

    /* ================= 隐形点击热区 ================= */
    var proxy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.5, 1.75, 8),
      new THREE.MeshBasicMaterial({visible: false})
    );
    proxy.name = 'hit-proxy';
    proxy.position.set(0, 0.82, 0);
    root.add(proxy);

    /* ================= API ================= */
    root.userData.scope = { tube: tube };

    // 点击：镜筒缓缓上扬巡天，伸缩节推出，寻星镜微颤，随后归位
    var tapBusy = false;
    var restRX = tube.rotation.x, restRZ = tube.rotation.z;
    root.userData.fx = {
      tap: function(){
        if (tapBusy) return;
        tapBusy = true;
        var tl = gsap.timeline({ onComplete: function(){ tapBusy = false; } });
        tl.to(tube.rotation, { x: restRX - 0.24, z: restRZ + 0.05, duration: 0.55, ease: 'power2.out' }, 0)
          .to(draw.position, { y: '-=0.085', duration: 0.4, ease: 'back.out(2)' }, 0.12)
          .to(head.rotation, { y: 0.35, duration: 0.7, ease: 'sine.inOut' }, 0)
          .to(head.rotation, { y: -0.2, duration: 0.8, ease: 'sine.inOut' }, 0.7)
          .to(tube.rotation, { z: restRZ - 0.06, duration: 0.8, ease: 'sine.inOut' }, 0.55)
          .to(tube.rotation, { x: restRX, z: restRZ, duration: 0.7, ease: 'power2.inOut' }, 1.5)
          .to(head.rotation, { y: 0, duration: 0.7, ease: 'power2.inOut' }, 1.5)
          .to(draw.position, { y: '+=0.085', duration: 0.45, ease: 'power2.inOut' }, 1.55);
      }
    };
    return root;
  };
})();
