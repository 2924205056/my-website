/* 黄铜风铃 —— 程序化 3D 模型（three r128 兼容）
 * 深色木顶盘 + 5 根黄铜管 + 蓝/奶油木珠 + 木质小鸟风坠
 * 原点在顶盘，整体向 y 负方向延伸（挂在柜顶用）
 * userData.fx = { tap() } —— 管子依次摆动、风坠画圈，2 秒渐停
 */
(function(){
  'use strict';

  var NAVY = 0x2c4a6e, BLUE = 0x4a7cb8, BRASS = 0xc9a05a, BRASS_D = 0xa8843f,
      WOOD = 0x8a6134, WOOD_D = 0x66452a, CREAM = 0xead9b8,
      PORCELAIN = 0xf2ede2, INK = 0x1c1c20,
      BRASS_L = 0xd8b26e, WOOD_L = 0xa87d4a, CORD = 0xb9a37e,
      WOOD_NAVY = 0x3e5a78; // 蓝染木（呼应参考图的蓝调浮木）

  function lam(color){ return new THREE.MeshLambertMaterial({color: color}); }

  /* 圆润小圆盘（黏土感木盘）：Lathe 侧影，rim 圆滚 */
  function puckGeometry(r, h){
    var pts = [], k = h / 2;
    pts.push(new THREE.Vector2(0.001, -k));
    pts.push(new THREE.Vector2(r * 0.55, -k));
    pts.push(new THREE.Vector2(r * 0.88, -k * 0.85));
    pts.push(new THREE.Vector2(r, -k * 0.3));
    pts.push(new THREE.Vector2(r, k * 0.3));
    pts.push(new THREE.Vector2(r * 0.88, k * 0.85));
    pts.push(new THREE.Vector2(r * 0.55, k));
    pts.push(new THREE.Vector2(0.001, k));
    return new THREE.LatheGeometry(pts, 40);
  }

  /* 小鸟尾羽：扇形挤出，根部在原点，向 -X 展开 */
  function tailGeometry(){
    var s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(-0.045, 0.028, -0.075, 0.020);
    s.quadraticCurveTo(-0.082, 0.002, -0.072, -0.014);
    s.quadraticCurveTo(-0.040, -0.020, 0, 0);
    return new THREE.ExtrudeGeometry(s, {
      depth: 0.010, bevelEnabled: true, bevelThickness: 0.006,
      bevelSize: 0.006, bevelSegments: 2, curveSegments: 10
    });
  }

  /* 小翅膀：柳叶形挤出 */
  function wingGeometry(){
    var s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.020, 0.026, 0.072, 0.010);
    s.quadraticCurveTo(0.078, -0.002, 0.068, -0.008);
    s.quadraticCurveTo(0.028, -0.022, 0, 0);
    return new THREE.ExtrudeGeometry(s, {
      depth: 0.007, bevelEnabled: true, bevelThickness: 0.005,
      bevelSize: 0.005, bevelSegments: 2, curveSegments: 10
    });
  }

  window.createLockerWindchime = function(){
    var root = new THREE.Group();
    root.name = 'Brass Windchime';

    var matWood = lam(WOOD), matWoodD = lam(WOOD_D), matWoodL = lam(WOOD_L),
        matBrass = lam(BRASS), matBrassD = lam(BRASS_D), matBrassL = lam(BRASS_L),
        matCord = lam(CORD), matBlue = lam(BLUE), matNavy = lam(NAVY),
        matCream = lam(CREAM), matInk = lam(INK), matWoodNavy = lam(WOOD_NAVY);

    function mesh(name, geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.name = name;
      (parent || root).add(m);
      return m;
    }

    /* body：可整体轻摆的内层组（root 保持给集成方摆放） */
    var body = new THREE.Group();
    body.name = 'body';
    root.add(body);

    /* ---- 顶部：深色木圆盘 + 黄铜饰环 + 挂绳环 ---- */
    var DISC_R = 0.26, DISC_H = 0.075;
    mesh('top-disc', puckGeometry(DISC_R, DISC_H), matWoodD, 0, -DISC_H / 2, 0, body);
    // 蓝染饰带：呼应参考图浮木上的靛蓝渍染
    var band = mesh('disc-band', new THREE.TorusGeometry(DISC_R * 0.955, 0.017, 8, 44),
      matWoodNavy, 0, -DISC_H * 0.30, 0, body);
    band.rotation.x = Math.PI / 2;
    var rim = mesh('disc-rim', new THREE.TorusGeometry(DISC_R * 0.99, 0.008, 8, 40),
      matBrass, 0, -DISC_H / 2, 0, body);
    rim.rotation.x = Math.PI / 2;
    // 挂绳：小结 + 竖环
    mesh('hang-knot', new THREE.SphereGeometry(0.022, 12, 10), matCord, 0, 0.012, 0, body);
    var loop = mesh('hang-loop', new THREE.TorusGeometry(0.030, 0.009, 8, 20),
      matCord, 0, 0.048, 0, body);
    loop.rotation.y = 0; // 面向 x-y 平面
    mesh('top-cap', new THREE.SphereGeometry(0.016, 10, 8), matBrass, 0, -DISC_H - 0.002, 0, body);

    /* ---- 5 根黄铜管：不同长度，环绕悬挂 ---- */
    var tubeGroups = [];
    var TUBE_LENS = [0.42, 0.55, 0.68, 0.60, 0.48];
    var HANG_R = 0.175, TUBE_R = 0.023, STR_LEN = 0.10;
    for (var i = 0; i < 5; i++){
      var ang = (i / 5) * Math.PI * 2 + 0.35;
      var g = new THREE.Group();
      g.name = 'tube-' + i;
      g.position.set(Math.cos(ang) * HANG_R, -DISC_H + 0.012, Math.sin(ang) * HANG_R);
      body.add(g);
      // 细线
      mesh('t-string', new THREE.CylinderGeometry(0.0035, 0.0035, STR_LEN, 6),
        matCord, 0, -STR_LEN / 2, 0, g);
      // 顶端小环
      var ring = mesh('t-ring', new THREE.TorusGeometry(0.014, 0.005, 6, 14),
        matBrassD, 0, -STR_LEN - 0.008, 0, g);
      ring.rotation.y = ang;
      // 管身（上下微收一点点，更有手作感）
      var L = TUBE_LENS[i];
      var tubeTop = -STR_LEN - 0.020;
      mesh('t-tube', new THREE.CylinderGeometry(TUBE_R * 0.96, TUBE_R, L, 16),
        (i % 2 === 0) ? matBrass : matBrassL, 0, tubeTop - L / 2, 0, g);
      // 顶部箍环 + 底部收口环
      var c1 = mesh('t-collar', new THREE.TorusGeometry(TUBE_R * 0.98, 0.006, 6, 16),
        matBrassD, 0, tubeTop - 0.018, 0, g);
      c1.rotation.x = Math.PI / 2;
      var c2 = mesh('t-foot', new THREE.TorusGeometry(TUBE_R * 0.99, 0.005, 6, 16),
        matBrassD, 0, tubeTop - L + 0.010, 0, g);
      c2.rotation.x = Math.PI / 2;
      // 管口音孔（近黑内芯，从底部看进去有深度）
      mesh('t-bore', new THREE.CylinderGeometry(TUBE_R * 0.7, TUBE_R * 0.7, L - 0.02, 12),
        matInk, 0, tubeTop - L / 2 - 0.012, 0, g);
      tubeGroups.push(g);
    }

    /* ---- 中央垂饰：细线 + 木珠 + 打板小圆盘 + 小鸟风坠 ---- */
    var center = new THREE.Group();
    center.name = 'center-drop';
    center.position.set(0, -DISC_H + 0.01, 0);
    body.add(center);

    var STRIKER_Y = -0.46;   // 打板处于管群中段
    var BIRD_Y = -0.92;      // 小鸟低于最长管（管底约 -0.87）

    mesh('c-string-1', new THREE.CylinderGeometry(0.0035, 0.0035, -STRIKER_Y, 6),
      matCord, 0, STRIKER_Y / 2, 0, center);
    // 珠串：蓝 / 奶油 / 木 交替
    mesh('bead-1', new THREE.SphereGeometry(0.020, 12, 10), matBlue, 0, -0.13, 0, center);
    mesh('bead-2', new THREE.SphereGeometry(0.015, 12, 10), matCream, 0, -0.185, 0, center);
    mesh('bead-3', new THREE.SphereGeometry(0.017, 12, 10), matWoodL, 0, -0.24, 0, center);
    mesh('bead-4', new THREE.SphereGeometry(0.014, 12, 10), matNavy, 0, -0.30, 0, center);
    // 打板小木盘（蓝染木，呼应顶盘饰带）
    mesh('striker', puckGeometry(0.085, 0.030), matWoodNavy, 0, STRIKER_Y, 0, center);
    var srim = mesh('striker-rim', new THREE.TorusGeometry(0.0845, 0.005, 6, 26),
      matBrass, 0, STRIKER_Y, 0, center);
    srim.rotation.x = Math.PI / 2;
    // 打板到小鸟的线 + 珠
    mesh('c-string-2', new THREE.CylinderGeometry(0.003, 0.003, STRIKER_Y - BIRD_Y, 6),
      matCord, 0, (STRIKER_Y + BIRD_Y) / 2, 0, center);
    mesh('bead-5', new THREE.SphereGeometry(0.016, 12, 10), matCream, 0, STRIKER_Y - 0.09, 0, center);
    mesh('bead-6', new THREE.SphereGeometry(0.018, 12, 10), matBlue, 0, STRIKER_Y - 0.155, 0, center);

    /* 小鸟：黏土圆润风 —— 椭球身 + 球头 + 黄铜喙 + 双侧柳叶翅 + 扇形尾 */
    var bird = new THREE.Group();
    bird.name = 'bird';
    bird.position.set(0, BIRD_Y, 0);
    center.add(bird);
    var bBody = mesh('bird-body', new THREE.SphereGeometry(0.052, 18, 14), matCream, 0, -0.035, 0, bird);
    bBody.scale.set(1.28, 0.88, 0.82);
    var bHead = mesh('bird-head', new THREE.SphereGeometry(0.034, 16, 12), matCream, 0.058, 0.002, 0, bird);
    var beak = mesh('bird-beak', new THREE.ConeGeometry(0.012, 0.032, 10), matBrassD, 0.098, -0.002, 0, bird);
    beak.rotation.z = -Math.PI / 2;
    mesh('bird-eye-l', new THREE.SphereGeometry(0.005, 8, 6), matInk, 0.072, 0.012, 0.026, bird);
    mesh('bird-eye-r', new THREE.SphereGeometry(0.005, 8, 6), matInk, 0.072, 0.012, -0.026, bird);
    var tail = mesh('bird-tail', tailGeometry(), matWoodL, -0.055, -0.022, -0.005, bird);
    tail.rotation.z = 0.5;
    var wL = mesh('bird-wing-l', wingGeometry(), matWoodL, -0.005, -0.020, 0.038, bird);
    wL.rotation.set(-0.35, 0.15, 0.35);
    var wR = mesh('bird-wing-r', wingGeometry(), matWoodL, -0.005, -0.020, -0.044, bird);
    wR.rotation.set(0.35, -0.15, 0.35);
    // 背上小系环（线从这里下来）
    var bRing = mesh('bird-ring', new THREE.TorusGeometry(0.010, 0.0035, 6, 12),
      matBrassD, 0, 0.010, 0, bird);
    bRing.rotation.y = Math.PI / 2;

    /* ---- 隐形点击热区 ---- */
    var proxy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 1.15, 10),
      new THREE.MeshBasicMaterial({visible: false})
    );
    proxy.name = 'hit-proxy';
    proxy.position.set(0, -0.52, 0);
    root.add(proxy);

    /* ---- 交互：tap() 风拂过 ---- */
    var playing = false;
    root.userData.fx = {
      tap: function(){
        if (playing) return;
        playing = true;
        var st = {t: 0};
        gsap.to(st, {
          t: 1, duration: 2.0, ease: 'none',
          onUpdate: function(){
            var t = st.t;
            var decay = Math.exp(-2.6 * t) * (1 - t * t); // 结尾精确归零
            // 五根管依次摆动（相位错开）
            for (var k = 0; k < tubeGroups.length; k++){
              var ph = k * 0.9;
              var dir = k * 2.4;
              var s = decay * 0.30 * Math.sin(t * 15 - ph);
              tubeGroups[k].rotation.x = s * Math.cos(dir);
              tubeGroups[k].rotation.z = s * Math.sin(dir);
            }
            // 风坠画小圈（锥摆）
            var ca = decay * 0.16;
            center.rotation.x = ca * Math.sin(t * 11);
            center.rotation.z = ca * Math.cos(t * 11);
            bird.rotation.y = decay * 0.9 * Math.sin(t * 7);
            // 整体轻轻被风拂过
            body.rotation.x = decay * 0.045 * Math.sin(t * 6 + 0.5);
            body.rotation.z = decay * 0.045 * Math.cos(t * 5);
          },
          onComplete: function(){
            for (var k = 0; k < tubeGroups.length; k++){
              tubeGroups[k].rotation.set(0, 0, 0);
            }
            center.rotation.set(0, 0, 0);
            bird.rotation.set(0, 0, 0);
            body.rotation.set(0, 0, 0);
            playing = false;
          }
        });
      }
    };

    return root;
  };
})();
