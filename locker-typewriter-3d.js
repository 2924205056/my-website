/* 复古打字机 —— 手作黏土质感程序化 3D 模型（three r128 兼容）
 * v3：1950s 便携机流线造型（侧轮廓 Extrude 一体壳 / 黄铜包边圆键帽 / 弯管回车扳手 / 椭圆徽标牌）
 * createLockerTypewriter() -> THREE.Group
 * group.userData.typer = { keyMap, press(ch), print(ch), newline(), backspace(), type(str), carriage, paperTex }
 */
(function(){
  'use strict';

  /* ---- 复古配色 ---- */
  var PINE   = 0x2e4a3a;  // 深松绿机身
  var PINE_D = 0x24402f;  // 深色细节
  var CREAM  = 0xf3e9cf;  // 奶油饰面
  var INKKEY = 0x2b2b30;  // 键座深色
  var BLACK  = 0x232326;  // 滚筒黑
  var CHROME = 0xc8c9c4;  // 铬金属件
  var BRASS  = 0xc9a05a;  // 黄铜细节
  var WOOD   = 0x7a5236;  // 木握球
  var PAPER  = 0xefe3c4;  // 做旧纸张
  var INK    = '#3a4048'; // 打字墨色

  function lam(color){ return new THREE.MeshLambertMaterial({color: color}); }

  /* 圆角盒（r128 无 RoundedBoxGeometry） */
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
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: Math.min(bevel, r * 0.95),
      bevelSegments: 3,
      curveSegments: 10
    });
    geo.translate(0, 0, -Math.max(0.01, d - bevel * 2) / 2);
    return geo;
  }

  /* 胶囊（r128 无 CapsuleGeometry） */
  function capsuleGeo(r, len){
    var pts = [], seg = 8, j, aa;
    var half = len / 2;
    for (j = 0; j <= seg; j++){ aa = Math.PI - (j / seg) * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(aa) * r, half + Math.cos(aa) * r)); }
    for (j = 1; j <= seg; j++){ aa = Math.PI * 1.5 - (j / seg) * Math.PI / 2; pts.push(new THREE.Vector2(Math.abs(Math.sin(aa)) * r, -half + Math.cos(aa) * r)); }
    return new THREE.LatheGeometry(pts, 12);
  }

  /* ---- 一体流线机壳：侧面轮廓 Shape + 大倒角 Extrude（圆肩） ----
   * 轮廓画在 (px, y) 平面，px 正方向 = 机身后方；挤出方向经 rotateY 后为机身宽度 X。
   * bevelSize=BV 会让中段轮廓整体外扩 BV，故轮廓按“内缩 BV”绘制。 */
  function hullGeo(){
    var BV = 0.08;           // 圆肩半径
    var DEPTH = 0.86;        // 挤出深度（总宽 = DEPTH + 2*BV ≈ 1.02）
    var s = new THREE.Shape();
    s.moveTo(-0.30, 0.10);                                  // 前底
    s.quadraticCurveTo(-0.395, 0.115, -0.385, 0.20);        // 前脸外鼓
    s.quadraticCurveTo(-0.375, 0.27, -0.285, 0.305);        // 前肩滚过
    s.quadraticCurveTo(-0.12, 0.335, 0.02, 0.38);           // 键盘斜台
    s.quadraticCurveTo(0.14, 0.42, 0.205, 0.48);            // 抬升
    s.quadraticCurveTo(0.275, 0.548, 0.335, 0.50);          // 背峰驼顶
    s.quadraticCurveTo(0.39, 0.44, 0.378, 0.30);            // 背面上段
    s.quadraticCurveTo(0.368, 0.145, 0.30, 0.102);          // 背面收底
    s.quadraticCurveTo(0.0, 0.075, -0.30, 0.10);            // 底缘微弧
    var geo = new THREE.ExtrudeGeometry(s, {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: BV,
      bevelSize: BV,
      bevelSegments: 6,
      curveSegments: 18
    });
    geo.translate(0, 0, -DEPTH / 2);
    geo.rotateY(Math.PI / 2);   // 挤出轴 -> X（宽度），轮廓 px -> -Z（后方为 -Z）
    return geo;
  }

  /* ---- 纸张画布：做旧底 + 淡云 + 可打印 ---- */
  var PW = 512, PH = 640;
  function makePaper(){
    var cv = document.createElement('canvas');
    cv.width = PW; cv.height = PH;
    var g = cv.getContext('2d');
    paintBase(g);
    var tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    return {cv: cv, g: g, tex: tex, cx: 64, cy: 175};
  }
  function paintBase(g){
    g.fillStyle = '#efe3c4';
    g.fillRect(0, 0, PW, PH);
    // 做旧：四角淡淡晕影
    var gr = g.createRadialGradient(PW/2, PH/2, PH*0.25, PW/2, PH/2, PH*0.75);
    gr.addColorStop(0, 'rgba(120,90,40,0)');
    gr.addColorStop(1, 'rgba(120,90,40,.10)');
    g.fillStyle = gr;
    g.fillRect(0, 0, PW, PH);
    // 淡淡云线描
    g.strokeStyle = 'rgba(122,139,160,.4)';
    g.lineWidth = 6;
    g.lineCap = 'round';
    cloud(g, 150, 90, 40);
    cloud(g, 350, 70, 48);
  }
  function cloud(g, cx, cy, s){
    g.beginPath();
    g.moveTo(cx - 1.5 * s, cy + 0.45 * s);
    g.arc(cx - 0.95 * s, cy + 0.42 * s, 0.55 * s, Math.PI * 0.95, Math.PI * 1.85);
    g.arc(cx - 0.1 * s, cy - 0.05 * s, 0.78 * s, Math.PI * 1.15, Math.PI * 1.95);
    g.arc(cx + 0.85 * s, cy + 0.3 * s, 0.6 * s, Math.PI * 1.35, Math.PI * 0.55);
    g.closePath();
    g.stroke();
  }

  /* ---- 键帽字母贴图（缓存） ---- */
  var letterCache = {};
  function letterTex(ch){
    if(letterCache[ch]) return letterCache[ch];
    var cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    var g = cv.getContext('2d');
    g.fillStyle = '#f3e9cf';
    g.beginPath(); g.arc(32, 32, 32, 0, 7); g.fill();
    g.strokeStyle = 'rgba(60,50,30,.35)';
    g.lineWidth = 2;
    g.beginPath(); g.arc(32, 32, 29, 0, 7); g.stroke();
    g.fillStyle = '#2b2b30';
    g.font = 'bold 34px Georgia, "Times New Roman", serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, 32, 34);
    var t = new THREE.CanvasTexture(cv);
    letterCache[ch] = t;
    return t;
  }

  /* ---- 徽标牌文字贴图 ---- */
  function logoTex(){
    var cv = document.createElement('canvas');
    cv.width = 256; cv.height = 96;
    var g = cv.getContext('2d');
    g.clearRect(0, 0, 256, 96);
    g.fillStyle = '#2e4a3a';
    g.font = 'italic bold 40px Georgia, "Times New Roman", serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('Songbird', 128, 44);
    g.strokeStyle = 'rgba(46,74,58,.8)';
    g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(56, 72); g.quadraticCurveTo(128, 82, 200, 72); g.stroke();
    return new THREE.CanvasTexture(cv);
  }

  window.createLockerTypewriter = function(){
    var root = new THREE.Group();
    root.name = 'Vintage Typewriter';
    var matPine = lam(PINE), matPineD = lam(PINE_D), matCream = lam(CREAM),
        matInk = lam(INKKEY), matBlack = lam(BLACK), matChrome = lam(CHROME),
        matBrass = lam(BRASS), matWood = lam(WOOD);

    function add(name, geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.name = name;
      (parent || root).add(m);
      return m;
    }

    /* ===== 机身：一体流线壳 ===== */
    add('body-hull', hullGeo(), matPine, 0, 0, 0);
    // 深色底盘缝（视觉接地）
    add('chassis', roundedBox(0.94, 0.06, 0.72, 0.025), matInk, 0, 0.035, 0.01);
    // 四个橡胶小脚
    [[-0.40, 0.26], [0.40, 0.26], [-0.40, -0.26], [0.40, -0.26]].forEach(function(p, i){
      add('foot-' + i, new THREE.CylinderGeometry(0.05, 0.06, 0.05, 12), matBlack, p[0], 0.026, p[1]);
    });

    /* 前脸奶油饰条 + 黄铜细线 */
    add('trim-cream', roundedBox(0.78, 0.034, 0.024, 0.012), matCream, 0, 0.155, 0.452);
    add('trim-brass', roundedBox(0.78, 0.013, 0.02, 0.006), matBrass, 0, 0.118, 0.448);

    /* 椭圆徽标牌（奶油面 + 黄铜圈 + 手写字） */
    var plaque = add('logo-plaque', new THREE.CylinderGeometry(0.072, 0.072, 0.016, 24), matCream, 0, 0.27, 0.462);
    plaque.rotation.x = Math.PI / 2 + 0.10;
    plaque.scale.set(1.65, 1, 1);
    var prim = add('logo-rim', new THREE.TorusGeometry(0.072, 0.006, 8, 32), matBrass, 0, 0.27, 0.470);
    prim.rotation.x = 0.10;
    prim.scale.set(1.65, 1, 1);
    var ptext = add('logo-text', new THREE.PlaneGeometry(0.19, 0.072),
      null, 0, 0.271, 0.4745);
    ptext.material = new THREE.MeshBasicMaterial({map: logoTex(), transparent: true});
    ptext.rotation.x = 0.10;

    /* 侧面奶油椭圆饰板（左右） */
    [-1, 1].forEach(function(sd){
      var disc = add('side-panel-' + (sd < 0 ? 'l' : 'r'),
        new THREE.CylinderGeometry(0.105, 0.105, 0.02, 24), matCream, sd * 0.505, 0.26, 0.02);
      disc.rotation.z = Math.PI / 2;
      disc.scale.set(1, 1, 1.4);
      var ring = add('side-rim-' + (sd < 0 ? 'l' : 'r'),
        new THREE.TorusGeometry(0.105, 0.006, 8, 32), matBrass, sd * 0.516, 0.26, 0.02);
      ring.rotation.y = Math.PI / 2;
      ring.scale.set(1.4, 1, 1);
    });

    /* 字锤井口（浅浅深色斜板） + 色带轴 */
    var well = add('well-mouth', roundedBox(0.46, 0.04, 0.22, 0.018), matInk, 0, 0.505, -0.15);
    well.rotation.x = -0.30;
    [-1, 1].forEach(function(sd, i){
      var spool = add('ribbon-spool-' + i, new THREE.CylinderGeometry(0.046, 0.05, 0.032, 16), matBlack, sd * 0.195, 0.545, -0.17);
      spool.rotation.x = -0.30;
      var cap = add('ribbon-cap-' + i, new THREE.CylinderGeometry(0.016, 0.016, 0.014, 10), matBrass, sd * 0.195, 0.562, -0.175);
      cap.rotation.x = -0.30;
    });

    /* 字锤扇（typebasket，press 时起落） */
    var basket = new THREE.Group();
    basket.name = 'typebasket';
    basket.position.set(0, 0.44, -0.07);
    basket.rotation.x = -0.45;
    root.add(basket);
    var BAR_N = 11, BAR_R = 0.14, BAR_L = 0.24;
    for (var i = 0; i < BAR_N; i++){
      var a = (-48 + (96 / (BAR_N - 1)) * i) * Math.PI / 180;
      var bar = new THREE.Mesh(capsuleGeo(0.0075, BAR_L), matChrome);
      bar.name = 'typebar-' + i;
      bar.position.set(Math.sin(a) * BAR_R, Math.cos(a) * BAR_R, 0);
      bar.rotation.z = -a;
      basket.add(bar);
    }
    add('center-guide', roundedBox(0.07, 0.09, 0.06, 0.02), matChrome, 0, 0.685, -0.195);

    /* 滑架滑轨（静态铬杆）+ 后甲板（机身与滑架的视觉衔接） */
    var deck = add('rear-deck', roundedBox(0.90, 0.07, 0.20, 0.03), matPineD, 0, 0.575, -0.27);
    var rail = add('carriage-rail', new THREE.CylinderGeometry(0.011, 0.011, 1.08, 10), matChrome, 0, 0.635, -0.31);
    rail.rotation.z = Math.PI / 2;

    /* ===== 滑架组：滚筒 + 旋钮 + 扳手 + 纸张（打字时整体左移） ===== */
    var carriage = new THREE.Group();
    carriage.name = 'carriage';
    root.add(carriage);

    var platen = new THREE.Group();
    platen.name = 'platen';
    platen.position.set(0, 0.72, -0.24);
    carriage.add(platen);
    var roller = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.95, 22), matBlack);
    roller.name = 'platen-roller';
    roller.rotation.z = Math.PI / 2;
    platen.add(roller);
    // 滚筒端环（黄铜）
    [-0.47, 0.47].forEach(function(x, i){
      var band = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.018, 18), matBrass);
      band.name = 'platen-band-' + i;
      band.rotation.z = Math.PI / 2;
      band.position.x = x;
      platen.add(band);
    });
    // 压纸杆（paper bail）
    var bail = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.62, 8), matChrome);
    bail.name = 'paper-bail';
    bail.rotation.z = Math.PI / 2;
    bail.position.set(0, 0.865, -0.245);
    carriage.add(bail);
    [-0.14, 0.14].forEach(function(x, i){
      var br = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.035, 10), matBlack);
      br.name = 'bail-roller-' + i;
      br.rotation.z = Math.PI / 2;
      br.position.set(x, 0.865, -0.245);
      carriage.add(br);
    });
    // 两端旋钮：黑轮 + 黄铜盘 + 铬芯
    [-1, 1].forEach(function(s){
      var knob = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.075, 18), matBlack);
      knob.name = s < 0 ? 'knob-left' : 'knob-right';
      knob.rotation.z = Math.PI / 2;
      knob.position.set(s * 0.565, 0.72, -0.24);
      carriage.add(knob);
      var disc = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.016, 16), matBrass);
      disc.rotation.z = Math.PI / 2;
      disc.position.set(s * 0.61, 0.72, -0.24);
      carriage.add(disc);
      var core = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.018, 10), matChrome);
      core.rotation.z = Math.PI / 2;
      core.position.set(s * 0.622, 0.72, -0.24);
      carriage.add(core);
    });

    /* 回车扳手：弯曲铬管 + 木握球 */
    var lever = new THREE.Group();
    lever.name = 'return-lever';
    carriage.add(lever);
    var leverCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.50, 0.72, -0.24),
      new THREE.Vector3(-0.63, 0.80, -0.17),
      new THREE.Vector3(-0.71, 0.845, -0.04),
      new THREE.Vector3(-0.735, 0.85, 0.07)
    ]);
    var leverTube = new THREE.Mesh(new THREE.TubeGeometry(leverCurve, 20, 0.010, 8), matChrome);
    leverTube.name = 'lever-tube';
    lever.add(leverTube);
    var grip = new THREE.Mesh(new THREE.SphereGeometry(0.033, 14, 12), matWood);
    grip.name = 'lever-grip';
    grip.position.set(-0.745, 0.851, 0.085);
    lever.add(grip);

    /* 纸张 */
    var paper = makePaper();
    var paperG = new THREE.Group();
    paperG.name = 'paper';
    paperG.position.set(0, 1.03, -0.27);
    carriage.add(paperG);
    var sheet = new THREE.Mesh(roundedBox(0.68, 0.72, 0.03, 0.012), lam(PAPER));
    sheet.name = 'paper-sheet';
    paperG.add(sheet);
    var decal = new THREE.Mesh(
      new THREE.PlaneGeometry(0.64, 0.68),
      new THREE.MeshBasicMaterial({map: paper.tex})
    );
    decal.name = 'paper-print';
    decal.position.z = 0.017;
    paperG.add(decal);

    /* ===== 键盘：三排错列圆键帽（黄铜包边）+ 胶囊空格 ===== */
    var kb = new THREE.Group();
    kb.name = 'keyboard';
    kb.position.set(0, 0.474, 0.285);
    kb.rotation.x = -0.26;
    root.add(kb);
    var tray = new THREE.Mesh(roundedBox(0.80, 0.022, 0.34, 0.011), matInk);
    tray.name = 'keyboard-tray';
    tray.position.set(0, -0.008, -0.02);
    kb.add(tray);

    var ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
    var keyMap = {};
    var stemGeo = new THREE.CylinderGeometry(0.026, 0.033, 0.05, 12);
    var capGeo = new THREE.CylinderGeometry(0.037, 0.032, 0.018, 18);
    var ringGeo = new THREE.TorusGeometry(0.0365, 0.0042, 8, 22);
    var letterGeo = new THREE.PlaneGeometry(0.056, 0.056);
    ROWS.forEach(function(row, r){
      var n = row.length;
      var z = -0.135 + r * 0.115;
      var y = 0.05 + (2 - r) * 0.012;
      var spacing = 0.092;
      var offset = -(n - 1) * spacing / 2;
      for (var c = 0; c < n; c++){
        var ch = row[c];
        var kg = new THREE.Group();
        kg.name = 'key-' + ch;
        kg.position.set(offset + c * spacing, y, z);
        var stem = new THREE.Mesh(stemGeo, matInk);
        stem.position.y = 0.012;
        kg.add(stem);
        var cap = new THREE.Mesh(capGeo, matCream);
        cap.position.y = 0.040;
        kg.add(cap);
        var ring = new THREE.Mesh(ringGeo, matBrass);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.044;
        kg.add(ring);
        var lt = new THREE.Mesh(letterGeo, new THREE.MeshBasicMaterial({map: letterTex(ch), transparent: true}));
        lt.rotation.x = -Math.PI / 2;
        lt.position.y = 0.0505;
        kg.add(lt);
        kg.userData.homeY = y;
        kb.add(kg);
        keyMap[ch] = kg;
      }
    });
    // 空格：长条胶囊（圆润）+ 两个深色小支脚座
    [-0.16, 0.16].forEach(function(x, i){
      var sst = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.045, 10), matInk);
      sst.name = 'space-stem-' + i;
      sst.position.set(x, 0.022, 0.208);
      kb.add(sst);
    });
    var space = new THREE.Mesh(capsuleGeo(0.024, 0.42), matCream);
    space.name = 'spacebar';
    space.rotation.z = Math.PI / 2;
    space.position.set(0, 0.052, 0.208);
    kb.add(space);
    keyMap[' '] = space;
    space.userData.homeY = 0.052;

    /* 软接地影 */
    var shadowTex = (function(){
      var cv = document.createElement('canvas');
      cv.width = 256; cv.height = 256;
      var g = cv.getContext('2d');
      var gr = g.createRadialGradient(128, 128, 20, 128, 128, 120);
      gr.addColorStop(0, 'rgba(20,26,22,.4)');
      gr.addColorStop(1, 'rgba(20,26,22,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(cv);
    })();
    var shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 1.3),
      new THREE.MeshBasicMaterial({map: shadowTex, transparent: true, depthWrite: false})
    );
    shadow.name = 'contact-shadow';
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    root.add(shadow);

    /* ================= 打字互动 API ================= */
    var CHAR_W = 22, LINE_H = 46, MARGIN_X = 64, START_Y = 175, BOTTOM = PH - 56;
    var CHARS_PER_LINE = Math.floor((PW - MARGIN_X * 2) / CHAR_W);
    var lineChars = 0;

    function texDirty(){ paper.tex.needsUpdate = true; }
    function carriageShift(){
      if(window.gsap){
        gsap.to(carriage.position, {x: -lineChars * 0.008, duration: 0.08, overwrite: true});
      } else {
        carriage.position.x = -lineChars * 0.008;
      }
    }
    function carriageReturn(){
      if(window.gsap){
        gsap.to(carriage.position, {x: 0, duration: 0.55, ease: 'power2.inOut'});
        gsap.to(roller.rotation, {x: '+=0.5', duration: 0.5, ease: 'power2.out'});
      } else {
        carriage.position.x = 0;
      }
    }
    function scrollPaper(){
      // 内容上卷一行
      var g = paper.g;
      var img = g.getImageData(0, LINE_H, PW, PH - LINE_H);
      paintBase(g);
      g.putImageData(img, 0, 0);
      paper.cy -= 0; // cy 已在调用处回退
    }

    var api = {
      keyMap: keyMap,
      carriage: carriage,
      paperTex: paper.tex,
      press: function(ch){
        var k = keyMap[ch];
        if(!k) return;
        if(window.gsap){
          gsap.to(k.position, {y: k.userData.homeY - 0.018, duration: 0.06, overwrite: true,
            onComplete: function(){ gsap.to(k.position, {y: k.userData.homeY, duration: 0.12}); }});
        }
        // 字锤随机挑一根向上打一下
        var bar = basket.children[Math.floor(Math.random() * basket.children.length)];
        if(bar && window.gsap){
          gsap.to(bar.rotation, {x: -0.5, duration: 0.07, overwrite: true,
            onComplete: function(){ gsap.to(bar.rotation, {x: 0, duration: 0.15}); }});
        }
      },
      print: function(ch){
        var g = paper.g;
        if(lineChars >= CHARS_PER_LINE) api.newline();
        g.save();
        g.font = '30px "Courier New", monospace';
        g.fillStyle = INK;
        g.globalAlpha = 0.72 + Math.random() * 0.28;
        g.textBaseline = 'alphabetic';
        g.fillText(ch, paper.cx, paper.cy + (Math.random() - 0.5) * 2.5);
        g.restore();
        paper.cx += CHAR_W;
        lineChars++;
        texDirty();
        carriageShift();
      },
      newline: function(){
        paper.cx = MARGIN_X;
        paper.cy += LINE_H;
        lineChars = 0;
        if(paper.cy > BOTTOM){
          scrollPaper();
          paper.cy = BOTTOM;
        }
        texDirty();
        carriageReturn();
      },
      backspace: function(){
        if(lineChars <= 0) return;
        paper.cx -= CHAR_W;
        lineChars--;
        var g = paper.g;
        g.save();
        g.fillStyle = '#efe3c4';
        g.fillRect(paper.cx - 2, paper.cy - 32, CHAR_W + 4, 42);
        g.restore();
        texDirty();
        carriageShift();
      },
      type: function(str){
        for(var i = 0; i < str.length; i++){
          var ch = str[i].toUpperCase();
          if(ch === '\n'){ api.newline(); continue; }
          if(keyMap[ch] || ch === ' '){ api.press(ch); api.print(ch === ' ' ? ' ' : ch); }
        }
      }
    };
    root.userData.typer = api;
    return root;
  };
})();
