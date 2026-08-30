/* 米白折纸飞机 —— 程序化 3D 模型（three r128 兼容）
 * 经典尖头折纸飞机：中脊 + 双折痕机翼 + 下垂龙骨，蓝色邮戳装饰
 * 黄铜小底座 + 透明玻璃立杆，纸飞机悬停其上，机头微微上扬
 * userData.fx = { tap() } 点击：起飞绕原位飞一个带侧倾的大圈，滑翔归位
 */
(function(){
  'use strict';

  var NAVY = 0x2c4a6e, BLUE = 0x4a7cb8,
      BRASS = 0xc9a05a, BRASS_D = 0xa8843f,
      PAPER = 0xf3e8d2, PAPER_IN = 0xe0d0ae, PAPER_D = 0xd0bd95, PAPER_FOLD = 0xb8a37e;

  function lam(color){ return new THREE.MeshLambertMaterial({color: color}); }

  /* 三角纸面板：给平面三角一点厚度（三棱柱），非索引 → 硬折边 */
  function paperPanel(a, b, c, t){
    var ab = new THREE.Vector3().subVectors(b, a);
    var ac = new THREE.Vector3().subVectors(c, a);
    var n = new THREE.Vector3().crossVectors(ab, ac).normalize();
    var off = n.clone().multiplyScalar(t / 2);
    var A1 = a.clone().add(off), B1 = b.clone().add(off), C1 = c.clone().add(off);
    var A2 = a.clone().sub(off), B2 = b.clone().sub(off), C2 = c.clone().sub(off);
    var tris = [
      A1, B1, C1,            // 正面
      A2, C2, B2,            // 背面
      A1, A2, B1,  B1, A2, B2,
      B1, B2, C1,  C1, B2, C2,
      C1, C2, A1,  A1, C2, A2
    ];
    var pos = [];
    for (var i = 0; i < tris.length; i++){ pos.push(tris[i].x, tris[i].y, tris[i].z); }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }

  /* 折痕线：两点之间的细圆管 */
  function creaseTube(a, b, r){
    var curve = new THREE.CatmullRomCurve3([a, b]);
    return new THREE.TubeGeometry(curve, 1, r, 6);
  }

  window.createLockerPlane = function(){
    var root = new THREE.Group();
    root.name = 'Paper Plane';
    var matBrass = lam(BRASS), matBrassD = lam(BRASS_D);
    var matPaper = lam(PAPER), matPaperIn = lam(PAPER_IN),
        matPaperD = lam(PAPER_D), matFold = lam(PAPER_FOLD);

    function mesh(name, geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.name = name;
      (parent || root).add(m);
      return m;
    }

    /* ---- 黄铜底座 + 玻璃立杆 ---- */
    var basePts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.115, 0.0),
      new THREE.Vector2(0.125, 0.014),
      new THREE.Vector2(0.118, 0.03),
      new THREE.Vector2(0.07, 0.042),
      new THREE.Vector2(0.048, 0.05),
      new THREE.Vector2(0.04, 0.066),
      new THREE.Vector2(0.026, 0.078),
      new THREE.Vector2(0.024, 0.09),
      new THREE.Vector2(0.0, 0.092)
    ];
    mesh('stand-base', new THREE.LatheGeometry(basePts, 28), matBrass, 0, 0, 0);
    mesh('stand-ring', new THREE.TorusGeometry(0.118, 0.009, 8, 28), matBrassD, 0, 0.014, 0)
      .rotation.x = Math.PI / 2;
    mesh('stand-bead', new THREE.TorusGeometry(0.033, 0.009, 8, 18), matBrassD, 0, 0.062, 0)
      .rotation.x = Math.PI / 2;
    mesh('stand-rod', new THREE.CylinderGeometry(0.01, 0.013, 0.5, 10),
      new THREE.MeshLambertMaterial({color: 0xdfe8ee, transparent: true, opacity: 0.16}),
      0, 0.33, 0);
    mesh('stand-tip', new THREE.SphereGeometry(0.014, 10, 8), matBrassD, 0, 0.578, 0);

    /* ---- 飞行组（动画只动它） > 机身组（静态姿态：机头上扬） ---- */
    var HOME_Y = 0.68;
    var flyer = new THREE.Group();
    flyer.name = 'flyer';
    flyer.position.set(0, HOME_Y, 0);
    root.add(flyer);

    var craft = new THREE.Group();
    craft.name = 'craft';
    craft.rotation.x = -0.14;   // 机头(+z)微微上扬
    flyer.add(craft);

    /* 关键点：机头 +z，尾缘 z=-0.5 */
    var T = 0.014;               // 纸厚
    var NOSE  = new THREE.Vector3(0, 0.015, 0.58);
    var RIDGE = new THREE.Vector3(0, 0.125, -0.5);       // 尾部中脊顶
    var creM  = 0.17, creY = 0.045;                      // 翼面折痕位置
    var tipX  = 0.44, tipY = 0.115;                      // 翼尖微上反
    var KEELB = new THREE.Vector3(0, -0.165, -0.44);     // 龙骨最低点

    [1, -1].forEach(function(s){
      var M = new THREE.Vector3(s * creM, creY, -0.5);
      var W = new THREE.Vector3(s * tipX, tipY, -0.5);
      // 内翼板（从中脊折下，色略深显折面）+ 外翼板（折痕处再折起）
      mesh('wing-inner-' + s, paperPanel(NOSE, RIDGE, M, T), matPaperIn, 0, 0, 0, craft);
      mesh('wing-outer-' + s, paperPanel(NOSE, M, W, T), matPaper, 0, 0, 0, craft);
      // 尾缘包边：折痕点 → 翼尖的细管，柔化生硬后缘
      mesh('trail-' + s, creaseTube(M, W, 0.0055), matFold, 0, 0, 0, craft);
      // 龙骨（机腹下垂的折边，左右各一片微微分开）
      var kx = s * 0.012;
      mesh('keel-' + s, paperPanel(
        new THREE.Vector3(kx, 0.005, 0.565),
        new THREE.Vector3(kx, 0.055, -0.5),
        new THREE.Vector3(kx * 1.3, KEELB.y, KEELB.z), T * 0.8), matPaperD, 0, 0, 0, craft);
      // 折痕线：机头 → 翼面折痕点
      mesh('crease-' + s, creaseTube(NOSE, M, 0.0058), matFold, 0, 0, 0, craft);
    });
    // 中脊折痕 + 龙骨底缘线 + 小圆机头（纸尖聚拢的钝头）
    mesh('crease-ridge', creaseTube(NOSE, RIDGE, 0.007), matFold, 0, 0, 0, craft);
    mesh('crease-keel', creaseTube(new THREE.Vector3(0, 0.005, 0.565), KEELB, 0.005),
      matFold, 0, 0, 0, craft);
    mesh('nose-cap', new THREE.SphereGeometry(0.013, 10, 8), matFold, 0, 0.016, 0.578, craft);

    /* 蓝色邮戳：右外翼板上的一枚圆环戳 + 小飞机横杆 + 两道波浪短线 */
    var stamp = new THREE.Group();
    stamp.name = 'stamp';
    var Mr = new THREE.Vector3(creM, creY, -0.5), Wr = new THREE.Vector3(tipX, tipY, -0.5);
    var nrm = new THREE.Vector3().crossVectors(
      new THREE.Vector3().subVectors(Mr, NOSE),
      new THREE.Vector3().subVectors(Wr, NOSE)).normalize();
    if (nrm.y < 0) nrm.negate();
    var sPos = new THREE.Vector3().addScaledVector(NOSE, 0.34)
      .addScaledVector(Mr, 0.33).addScaledVector(Wr, 0.33)
      .addScaledVector(nrm, T * 0.55);
    stamp.position.copy(sPos);
    stamp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);
    craft.add(stamp);
    var ring = mesh('stamp-ring', new THREE.TorusGeometry(0.056, 0.007, 6, 26), lam(BLUE), 0, 0, 0, stamp);
    ring.rotation.x = Math.PI / 2;
    var ring2 = mesh('stamp-ring2', new THREE.TorusGeometry(0.038, 0.005, 6, 22), lam(BLUE), 0, 0, 0, stamp);
    ring2.rotation.x = Math.PI / 2;
    var bar = mesh('stamp-wing', new THREE.BoxGeometry(0.052, 0.007, 0.014), lam(NAVY), 0, 0.003, 0, stamp);
    bar.rotation.y = 0.55;
    [0, 1, 2].forEach(function(i){
      var wave = mesh('stamp-wave-' + i, new THREE.BoxGeometry(0.07, 0.006, 0.009),
        lam(BLUE), 0.105, 0.001, 0.026 - i * 0.026, stamp);
      wave.rotation.y = 0.12;
    });

    /* ---- 隐形点击热区 ---- */
    var proxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.05, 1.2),
      new THREE.MeshBasicMaterial({visible: false})
    );
    proxy.name = 'hit-proxy';
    proxy.position.set(0, 0.5, 0);
    root.add(proxy);

    /* ---- 交互：起飞绕圈滑翔 ---- */
    var flying = false;
    var flightPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, HOME_Y, 0),
      new THREE.Vector3(0.03, HOME_Y + 0.12, 0.38),
      new THREE.Vector3(0.46, HOME_Y + 0.24, 0.4),
      new THREE.Vector3(0.7, HOME_Y + 0.3, -0.08),
      new THREE.Vector3(0.34, HOME_Y + 0.27, -0.54),
      new THREE.Vector3(-0.34, HOME_Y + 0.2, -0.52),
      new THREE.Vector3(-0.66, HOME_Y + 0.14, 0.0),
      new THREE.Vector3(-0.34, HOME_Y + 0.07, 0.38),
      new THREE.Vector3(-0.02, HOME_Y + 0.015, 0.16),
      new THREE.Vector3(0, HOME_Y, 0)
    ], false, 'catmullrom', 0.4);

    root.userData.fx = {
      tap: function(){
        if (flying) return;
        flying = true;
        var state = { t: 0 }, bank = 0;
        var pt = new THREE.Vector3(), aim = new THREE.Vector3();
        gsap.to(state, {
          t: 1, duration: 3.6, ease: 'power1.inOut',
          onUpdate: function(){
            var t = state.t;
            flightPath.getPointAt(t, pt);
            flyer.position.copy(pt);
            var tan = flightPath.getTangentAt(t);
            aim.copy(pt).add(tan);
            flyer.lookAt(aim);
            // 侧倾：按航向角变化率滚转（平滑跟随）
            var t2 = Math.min(1, t + 0.02);
            var tan2 = flightPath.getTangentAt(t2);
            var h1 = Math.atan2(tan.x, tan.z), h2 = Math.atan2(tan2.x, tan2.z);
            var dh = h2 - h1;
            if (dh > Math.PI) dh -= Math.PI * 2;
            if (dh < -Math.PI) dh += Math.PI * 2;
            var target = Math.max(-0.85, Math.min(0.85, dh * 9));
            // 起降段收平
            var fade = Math.min(1, Math.min(t, 1 - t) * 6);
            bank += (target * fade - bank) * 0.12;
            craft.rotation.z = bank;
          },
          onComplete: function(){
            gsap.to(flyer.position, {x: 0, y: HOME_Y, z: 0, duration: 0.35, ease: 'sine.out'});
            gsap.to(flyer.rotation, {x: 0, y: 0, z: 0, duration: 0.35, ease: 'sine.out'});
            gsap.to(craft.rotation, {
              z: 0, duration: 0.35, ease: 'sine.out',
              onComplete: function(){ flying = false; }
            });
          }
        });
      }
    };

    return root;
  };
})();
