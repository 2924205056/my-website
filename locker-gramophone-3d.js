/* 复古留声机 —— 程序化 3D 模型（three r128 兼容）
 * 木柜 + 黑胶转盘 + 黄铜唱臂 + 牵牛花瓣大喇叭 + 手摇柄
 * userData.gram = { record, crank, horn, setPlaying(bool) }
 */
(function(){
  'use strict';

  var WOOD = 0x8a6134, WOOD_D = 0x66452a, NAVY = 0x2c4a6e,
      BRASS = 0xc9a05a, BRASS_D = 0xa8843f, VINYL = 0x1c1c20,
      LABEL = 0x4a7cb8, CREAM = 0xead9b8;

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

  /* 牵牛花喇叭：沿 +Y 展开，喉部在 y=0，花口在 y≈len。
   * 半径按角度做 cos(petals·θ) 调制 → 扇形花瓣边；越靠花口越明显。
   * shrink<1 时整体缩一圈，用于内壁（BackSide 奶油色）。 */
  function morningGloryGeometry(len, petals, shrink){
    shrink = shrink || 1;
    // 侧影曲线：喉部细长，末端急速外翻 + 轻微上翘的唇边
    var profile = new THREE.CubicBezierCurve(
      new THREE.Vector2(0.048, 0),
      new THREE.Vector2(0.062, len * 0.55),
      new THREE.Vector2(0.115, len * 0.86),
      new THREE.Vector2(0.30, len)
    );
    var L = 15, R = 64;
    var rows = [];
    for (var i = 0; i <= L; i++){
      var p = profile.getPoint(i / L);
      rows.push(p);
    }
    // 唇边：最后再向外翻一点点
    rows.push(new THREE.Vector2(0.325, len * 1.015));
    var pos = [], idx = [];
    var mouthEdge = [];   // 花口一圈的点，给包边用
    for (var vi = 0; vi < rows.length; vi++){
      var rBase = rows[vi].x * shrink;
      var y = rows[vi].y;
      // 花瓣幅度随外翻程度增强（只在花口附近出现）
      var w = Math.max(0, (rows[vi].x - 0.06) / (0.325 - 0.06));
      var amp = 0.13 * w * w;
      for (var j = 0; j <= R; j++){
        var th = j / R * Math.PI * 2;
        var r = rBase * (1 + amp * Math.cos(petals * th));
        var px = Math.cos(th) * r, pz = Math.sin(th) * r;
        pos.push(px, y, pz);
        if (vi === rows.length - 1 && j < R && shrink === 1){
          mouthEdge.push(new THREE.Vector3(px, y, pz));
        }
      }
    }
    var cols = R + 1;
    for (var a = 0; a < rows.length - 1; a++){
      for (var b = 0; b < R; b++){
        var o = a * cols + b;
        idx.push(o, o + cols, o + 1, o + 1, o + cols, o + cols + 1);
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.userData = { mouthEdge: mouthEdge };
    return geo;
  }

  window.createLockerGramophone = function(){
    var root = new THREE.Group();
    root.name = 'Vintage Gramophone';
    var matWood = lam(WOOD), matWoodD = lam(WOOD_D),
        matBrass = lam(BRASS), matBrassD = lam(BRASS_D), matVinyl = lam(VINYL);

    function mesh(name, geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.name = name;
      (parent || root).add(m);
      return m;
    }

    /* ---- 木柜（束腰 + 顶盖出檐 + 黄铜柱脚）---- */
    mesh('cabinet', roundedBox(0.66, 0.34, 0.54, 0.04), matWood, 0, 0.2, 0);
    mesh('cabinet-top', roundedBox(0.74, 0.05, 0.62, 0.02), matWoodD, 0, 0.4, 0);
    mesh('cabinet-base', roundedBox(0.72, 0.05, 0.6, 0.02), matWoodD, 0, 0.045, 0);
    // 正面拱形饰板 + 音孔格栅
    mesh('front-panel', roundedBox(0.46, 0.22, 0.02, 0.05), matWoodD, 0, 0.2, 0.27);
    for (var g = -2; g <= 2; g++){
      mesh('grille-' + (g + 2), new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6),
        matBrass, g * 0.045, 0.2, 0.285);
    }
    [[-0.32, -0.26], [0.32, -0.26], [-0.32, 0.26], [0.32, 0.26]].forEach(function(p, i){
      mesh('foot-' + i, new THREE.CylinderGeometry(0.025, 0.035, 0.05, 10), matBrassD, p[0], 0.025, p[1]);
    });

    /* ---- 转盘（点击后旋转）---- */
    var record = new THREE.Group();
    record.name = 'record';
    record.position.set(-0.1, 0.44, 0.08);
    root.add(record);
    mesh('platter', new THREE.CylinderGeometry(0.2, 0.21, 0.022, 28), matBrassD, 0, 0, 0, record);
    mesh('vinyl', new THREE.CylinderGeometry(0.175, 0.175, 0.03, 28), matVinyl, 0, 0.01, 0, record);
    // 唱纹：两圈细环
    [0.10, 0.145].forEach(function(r, i){
      var groove = mesh('groove-' + i, new THREE.TorusGeometry(r, 0.0028, 4, 30),
        lam(0x35353c), 0, 0.026, 0, record);
      groove.rotation.x = Math.PI / 2;
    });
    mesh('label', new THREE.CylinderGeometry(0.058, 0.058, 0.034, 20), lam(LABEL), 0, 0.011, 0, record);
    mesh('spindle', new THREE.CylinderGeometry(0.007, 0.007, 0.055, 8), matBrass, 0, 0.036, 0, record);
    mesh('record-dot', new THREE.SphereGeometry(0.011, 8, 6), matBrass, 0.125, 0.026, 0, record);

    /* ---- 唱臂（从右后方探到唱片上）---- */
    var arm = new THREE.Group();
    arm.name = 'tonearm';
    arm.position.set(0.22, 0.43, 0.16);
    root.add(arm);
    mesh('arm-pivot', new THREE.CylinderGeometry(0.026, 0.03, 0.07, 12), matBrass, 0, 0.02, 0, arm);
    var armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.055, 0),
      new THREE.Vector3(-0.1, 0.075, -0.02),
      new THREE.Vector3(-0.2, 0.055, -0.05)
    ]);
    mesh('arm-rod', new THREE.TubeGeometry(armCurve, 10, 0.009, 8), matBrass, 0, 0, 0, arm);
    mesh('arm-head', new THREE.CylinderGeometry(0.02, 0.026, 0.035, 10), matBrassD, -0.2, 0.038, -0.05, arm);

    /* ---- 喇叭（灵魂：牵牛花大喇叭，花口朝向观众微微上扬）---- */
    var horn = new THREE.Group();
    horn.name = 'horn';
    horn.position.set(0.12, 0.42, -0.14);
    horn.rotation.y = -0.5; // 花口偏向左前方，露出海军蓝外壁
    root.add(horn);
    // 鹅颈弯管：从柜顶后方升起，前倾接花喉
    var neckCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.02, 0.13, -0.09),
      new THREE.Vector3(-0.01, 0.28, -0.13),
      new THREE.Vector3(-0.05, 0.4, -0.08)
    ]);
    mesh('horn-neck', new THREE.TubeGeometry(neckCurve, 16, 0.03, 10), matBrass, 0, 0, 0, horn);
    mesh('neck-base', new THREE.CylinderGeometry(0.045, 0.055, 0.05, 12), matBrassD, 0, 0.01, 0, horn);

    var bell = new THREE.Group();
    bell.name = 'horn-bell';
    bell.position.set(-0.05, 0.4, -0.08);
    // +Y 花口轴转向前上方（观众能看进花朵内部）
    bell.rotation.set(Math.PI / 2 - 0.58, 0, 0.06);
    horn.add(bell);

    var BELL_LEN = 0.4, PETALS = 8;
    var outerGeo = morningGloryGeometry(BELL_LEN, PETALS, 1);
    mesh('bell-outer', outerGeo,
      new THREE.MeshLambertMaterial({color: NAVY, side: THREE.FrontSide}), 0, 0, 0, bell);
    mesh('bell-inner', morningGloryGeometry(BELL_LEN, PETALS, 0.985),
      new THREE.MeshLambertMaterial({color: CREAM, side: THREE.BackSide}), 0, 0, 0, bell);
    // 花口黄铜包边：沿扇形边缘走一圈的细管
    var edge = outerGeo.userData.mouthEdge;
    if (edge && edge.length){
      var rimCurve = new THREE.CatmullRomCurve3(edge, true);
      mesh('bell-rim', new THREE.TubeGeometry(rimCurve, 128, 0.009, 6), matBrass, 0, 0, 0, bell);
    }
    // 喉部黄铜箍，遮住颈管与花喉的接缝
    mesh('throat-collar', new THREE.CylinderGeometry(0.056, 0.062, 0.055, 14), matBrass, 0, 0.02, 0, bell);

    /* ---- 手摇柄（右侧）---- */
    var crank = new THREE.Group();
    crank.name = 'crank';
    crank.position.set(0.34, 0.22, 0.08);
    root.add(crank);
    var c1 = mesh('crank-axle', new THREE.CylinderGeometry(0.013, 0.013, 0.1, 8), matBrass, 0.05, 0, 0, crank);
    c1.rotation.z = Math.PI / 2;
    mesh('crank-hub', new THREE.CylinderGeometry(0.028, 0.028, 0.03, 12), matBrassD, 0.0, 0, 0, crank)
      .rotation.z = Math.PI / 2;
    mesh('crank-arm', new THREE.CylinderGeometry(0.01, 0.01, 0.09, 8), matBrass, 0.1, -0.045, 0, crank);
    var c3 = mesh('crank-grip', new THREE.CylinderGeometry(0.015, 0.015, 0.065, 8), matWoodD, 0.1, -0.09, 0.028, crank);
    c3.rotation.x = Math.PI / 2;

    /* 隐形点击热区 */
    var proxy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 1.2, 8),
      new THREE.MeshBasicMaterial({visible: false})
    );
    proxy.name = 'hit-proxy';
    proxy.position.set(0, 0.55, 0);
    root.add(proxy);

    /* ---- 播放控制 ---- */
    var spinTween = null, crankTween = null, swayTween = null;
    root.userData.gram = {
      record: record, crank: crank, horn: horn,
      playing: false,
      setPlaying: function(on){
        this.playing = on;
        if(on){
          if(!spinTween){
            spinTween = gsap.to(record.rotation, {y: '+=' + Math.PI * 2, duration: 2.2, repeat: -1, ease: 'none'});
            crankTween = gsap.to(crank.rotation, {x: '+=' + Math.PI * 2, duration: 1.4, repeat: -1, ease: 'none'});
            swayTween = gsap.to(horn.rotation, {z: 0.04, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut'});
          }
        } else {
          if(spinTween){ spinTween.kill(); crankTween.kill(); swayTween.kill();
            spinTween = crankTween = swayTween = null;
            gsap.to(horn.rotation, {z: 0, duration: 0.4});
          }
        }
      }
    };
    return root;
  };
})();
