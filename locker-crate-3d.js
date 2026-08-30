/* 敞口木画箱 —— 程序化 3D 模型（three r128 兼容）
 * 板条木箱（做旧灰绿蓝）+ 黄铜护角 + 三幅竖插小画框（海浪 / 云朵 / 飞鸟）
 * userData.fx = { tap() } ：三幅画依次向上弹起又落回，像在打招呼
 */
(function(){
  'use strict';

  var NAVY = 0x2c4a6e, BLUE = 0x4a7cb8, BRASS = 0xc9a05a, BRASS_D = 0xa8843f,
      WOOD = 0x8a6134, WOOD_D = 0x66452a, CREAM = 0xead9b8,
      PORCELAIN = 0xf2ede2, INK = 0x1c1c20,
      // 同系过渡色：做旧灰蓝绿木箱（参考水彩素材气质）
      SAGE = 0x6d8280, SAGE_L = 0x7d928c, SAGE_D = 0x51645f, SAGE_DD = 0x42524e;

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

  /* ---------- 画布贴图：奶油卡纸 + 水粉小画 ---------- */
  function paintingTexture(theme){
    var W = 256, H = 320;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d');

    // 奶油卡纸底
    g.fillStyle = '#ead9b8';
    g.fillRect(0, 0, W, H);
    // 卡纸轻微纹理斑点
    for (var s = 0; s < 60; s++){
      g.fillStyle = 'rgba(140,110,70,' + (Math.random() * 0.05) + ')';
      g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 3, 1.5);
    }

    var m = 30, px = m, py = m, pw = W - m * 2, ph = H - m * 2;

    function skyGradient(top, bottom){
      var gr = g.createLinearGradient(0, py, 0, py + ph);
      gr.addColorStop(0, top);
      gr.addColorStop(1, bottom);
      g.fillStyle = gr;
      g.fillRect(px, py, pw, ph);
    }
    function puff(cx, cy, r, alpha){
      // 一团云 = 几个重叠的软圆
      var n = 5;
      for (var i = 0; i < n; i++){
        var a = i / n * Math.PI;
        var rr = r * (0.55 + Math.random() * 0.35);
        var gg = g.createRadialGradient(
          cx + Math.cos(a) * r * 0.7, cy - Math.sin(a) * r * 0.35, rr * 0.15,
          cx + Math.cos(a) * r * 0.7, cy - Math.sin(a) * r * 0.35, rr);
        gg.addColorStop(0, 'rgba(242,237,226,' + alpha + ')');
        gg.addColorStop(1, 'rgba(242,237,226,0)');
        g.fillStyle = gg;
        g.beginPath();
        g.arc(cx + Math.cos(a) * r * 0.7, cy - Math.sin(a) * r * 0.35, rr, 0, Math.PI * 2);
        g.fill();
      }
    }
    function gull(cx, cy, sz, col, lw){
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cx - sz, cy);
      g.quadraticCurveTo(cx - sz * 0.45, cy - sz * 0.75, cx, cy - sz * 0.12);
      g.quadraticCurveTo(cx + sz * 0.45, cy - sz * 0.8, cx + sz, cy - sz * 0.06);
      g.stroke();
    }

    g.save();
    g.beginPath();
    g.rect(px, py, pw, ph);
    g.clip();

    if (theme === 'waves'){
      skyGradient('#7fa3cd', '#3d648f');
      // 远处小太阳
      g.fillStyle = 'rgba(234,217,184,0.95)';
      g.beginPath(); g.arc(px + pw * 0.74, py + ph * 0.13, 15, 0, Math.PI * 2); g.fill();
      // 层层浪：扇贝弧线带（起得高一点，插在箱里也露得出浪）
      var rows = 6;
      for (var r0 = 0; r0 < rows; r0++){
        var yy = py + ph * (0.24 + r0 * 0.13);
        var deep = ['#5b8ac2', '#4a7cb8', '#3e6ba3', '#33598c', '#2c4a6e', '#25405f'][r0];
        g.fillStyle = deep;
        g.beginPath();
        g.moveTo(px, yy + 20);
        var step = pw / 4;
        for (var k = 0; k <= 4; k++){
          g.arc(px + step * k + (r0 % 2 ? step / 2 : 0), yy + 20, step / 2 + 6, Math.PI, 0, false);
        }
        g.lineTo(px + pw, py + ph); g.lineTo(px, py + ph);
        g.closePath(); g.fill();
        // 浪尖奶油描边
        g.strokeStyle = 'rgba(242,237,226,' + (0.9 - r0 * 0.1) + ')';
        g.lineWidth = 4.5;
        g.beginPath();
        for (var k2 = 0; k2 <= 4; k2++){
          g.arc(px + step * k2 + (r0 % 2 ? step / 2 : 0), yy + 20, step / 2 + 6, Math.PI, 0, false);
        }
        g.stroke();
      }
      gull(px + pw * 0.28, py + ph * 0.12, 11, 'rgba(242,237,226,0.95)', 3);
    } else if (theme === 'clouds'){
      skyGradient('#5d88bd', '#8fb0d6');
      // 大朵水粉云
      puff(px + pw * 0.32, py + ph * 0.22, 44, 0.9);
      puff(px + pw * 0.68, py + ph * 0.42, 54, 0.95);
      puff(px + pw * 0.25, py + ph * 0.62, 48, 0.9);
      puff(px + pw * 0.78, py + ph * 0.12, 26, 0.75);
      // 云底轻微蓝影
      g.fillStyle = 'rgba(44,74,110,0.14)';
      g.beginPath(); g.ellipse(px + pw * 0.66, py + ph * 0.5, 46, 12, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(px + pw * 0.28, py + ph * 0.68, 40, 10, 0, 0, Math.PI * 2); g.fill();
      gull(px + pw * 0.5, py + ph * 0.76, 10, 'rgba(28,28,32,0.55)', 3);
    } else { // birds
      skyGradient('#89aed4', '#5d88bd');
      puff(px + pw * 0.2, py + ph * 0.78, 34, 0.55);
      puff(px + pw * 0.8, py + ph * 0.68, 30, 0.5);
      // 主角大海鸟：躯干 + 两翼
      var bx = px + pw * 0.52, by = py + ph * 0.42;
      g.fillStyle = '#f2ede2';
      g.strokeStyle = '#f2ede2';
      g.lineCap = 'round';
      // 左翼
      g.beginPath();
      g.moveTo(bx, by);
      g.quadraticCurveTo(bx - 34, by - 40, bx - 62, by - 30);
      g.quadraticCurveTo(bx - 34, by - 22, bx - 4, by + 6);
      g.closePath(); g.fill();
      // 右翼（抬起）
      g.beginPath();
      g.moveTo(bx, by);
      g.quadraticCurveTo(bx + 26, by - 48, bx + 54, by - 52);
      g.quadraticCurveTo(bx + 32, by - 24, bx + 6, by + 6);
      g.closePath(); g.fill();
      // 身体
      g.beginPath();
      g.ellipse(bx + 2, by + 6, 22, 8, -0.35, 0, Math.PI * 2);
      g.fill();
      // 尾
      g.beginPath();
      g.moveTo(bx - 16, by + 12);
      g.lineTo(bx - 30, by + 22); g.lineTo(bx - 24, by + 26); g.lineTo(bx - 12, by + 16);
      g.closePath(); g.fill();
      // 喙
      g.fillStyle = '#c9a05a';
      g.beginPath();
      g.moveTo(bx + 22, by + 2); g.lineTo(bx + 32, by + 6); g.lineTo(bx + 21, by + 8);
      g.closePath(); g.fill();
      // 远处两只小鸟
      gull(px + pw * 0.24, py + ph * 0.2, 10, 'rgba(242,237,226,0.9)', 3);
      gull(px + pw * 0.74, py + ph * 0.26, 7, 'rgba(242,237,226,0.8)', 2.5);
    }
    g.restore();

    // 画面内圈细线（卡纸压痕）
    g.strokeStyle = 'rgba(102,69,42,0.55)';
    g.lineWidth = 2.5;
    g.strokeRect(px - 4, py - 4, pw + 8, ph + 8);

    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  window.createLockerCrate = function(){
    var root = new THREE.Group();
    root.name = 'Painting Crate';

    var matSage = lam(SAGE), matSageL = lam(SAGE_L), matSageD = lam(SAGE_D),
        matSageDD = lam(SAGE_DD), matBrass = lam(BRASS), matBrassD = lam(BRASS_D),
        matWood = lam(WOOD), matWoodD = lam(WOOD_D), matCream = lam(CREAM);

    function mesh(name, geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.name = name;
      (parent || root).add(m);
      return m;
    }

    /* ================= 木箱 ================= */
    var CW = 0.9, CD = 0.58, CH = 0.5;    // 箱体外尺寸
    var crate = new THREE.Group();
    crate.name = 'crate-body';
    root.add(crate);

    // 底座（略收，垫起一点脚感）
    mesh('base', roundedBox(CW - 0.06, 0.07, CD - 0.06, 0.025), matSageDD, 0, 0.035, 0);
    // 箱内底板（挡住内部透视）
    mesh('floor', roundedBox(CW - 0.14, 0.05, CD - 0.14, 0.02), matSageD, 0, 0.09, 0);
    // 深色内衬：让板条缝隙露出暗部，才有板条箱的缝隙感
    mesh('liner', new THREE.BoxGeometry(CW - 0.16, CH - 0.1, CD - 0.16),
      lam(0x33403c), 0, 0.1 + (CH - 0.1) / 2, 0);

    // 板条墙：前后各 3 条，左右各 3 条，条间留缝
    var slatH = 0.128, gap = 0.028, slatT = 0.05;
    var slatYs = [0.14, 0.14 + slatH + gap, 0.14 + (slatH + gap) * 2]; // 0.14 / 0.296 / 0.452
    var slatShades = [matSage, matSageL, matSage];
    var i;
    for (i = 0; i < 3; i++){
      // 前 / 后
      mesh('slat-f' + i, roundedBox(CW - 0.1, slatH, slatT, 0.018), slatShades[i], 0, slatYs[i], CD / 2 - slatT / 2);
      mesh('slat-b' + i, roundedBox(CW - 0.1, slatH, slatT, 0.018), slatShades[(i + 1) % 3], 0, slatYs[i], -CD / 2 + slatT / 2);
      // 左 / 右
      var sl = mesh('slat-l' + i, roundedBox(CD - 0.1, slatH, slatT, 0.018), slatShades[(i + 2) % 3], -CW / 2 + slatT / 2, slatYs[i], 0);
      sl.rotation.y = Math.PI / 2;
      var sr = mesh('slat-r' + i, roundedBox(CD - 0.1, slatH, slatT, 0.018), slatShades[i], CW / 2 - slatT / 2, slatYs[i], 0);
      sr.rotation.y = Math.PI / 2;
    }

    // 四根角柱（圆润方柱，压住板条端头）
    var postH = CH + 0.06;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function(p, idx){
      mesh('post-' + idx, roundedBox(0.085, postH, 0.085, 0.026), matSageD,
        p[0] * (CW / 2 - 0.045), postH / 2 + 0.02, p[1] * (CD / 2 - 0.045));
    });

    // 顶口浅色木沿（参考图箱口那圈亮木边，做窄一点）
    var rimT = 0.028, rimY = CH + 0.04;
    var rimMat = lam(0xc9b489); // 晒白的旧木，奶油偏木色
    mesh('rim-f', roundedBox(CW + 0.015, rimT, 0.058, 0.013), rimMat, 0, rimY, CD / 2 - 0.018);
    mesh('rim-b', roundedBox(CW + 0.015, rimT, 0.058, 0.013), rimMat, 0, rimY, -CD / 2 + 0.018);
    var rimL = mesh('rim-l', roundedBox(CD + 0.015, rimT, 0.058, 0.013), rimMat, -CW / 2 + 0.018, rimY, 0);
    rimL.rotation.y = Math.PI / 2;
    var rimR = mesh('rim-r', roundedBox(CD + 0.015, rimT, 0.058, 0.013), rimMat, CW / 2 - 0.018, rimY, 0);
    rimR.rotation.y = Math.PI / 2;

    // 正面黄铜小铭牌 + 铆钉
    mesh('plate', roundedBox(0.15, 0.052, 0.012, 0.014), matBrass, 0, slatYs[1], CD / 2 + 0.002);
    mesh('plate-n1', new THREE.SphereGeometry(0.007, 8, 6), matBrassD, -0.058, slatYs[1], CD / 2 + 0.01);
    mesh('plate-n2', new THREE.SphereGeometry(0.007, 8, 6), matBrassD, 0.058, slatYs[1], CD / 2 + 0.01);

    // 黄铜护角（L 形两片薄板 + 铆钉），上下各一组，只做前面两角 + 后面两角
    function cornerBracket(sx, sz, y){
      var grp = new THREE.Group();
      grp.position.set(sx * (CW / 2), y, sz * (CD / 2));
      root.add(grp);
      var pf = mesh('bk-f', roundedBox(0.1, 0.075, 0.012, 0.012), matBrassD, -sx * 0.045, 0, sz * 0.008, grp);
      var ps = mesh('bk-s', roundedBox(0.1, 0.075, 0.012, 0.012), matBrassD, sx * 0.008, 0, -sz * 0.045, grp);
      ps.rotation.y = Math.PI / 2;
      // 铆钉
      mesh('bk-n1', new THREE.SphereGeometry(0.011, 8, 6), matBrass, -sx * 0.06, 0.014, sz * 0.014, grp);
      mesh('bk-n2', new THREE.SphereGeometry(0.011, 8, 6), matBrass, sx * 0.014, -0.014, -sz * 0.06, grp);
      return grp;
    }
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function(p){
      cornerBracket(p[0], p[1], 0.135);
      cornerBracket(p[0], p[1], 0.44);
    });

    // 左右提手孔（深色内凹胶囊，微微凸出板条外露出轮廓）
    var hGeo = roundedBox(0.17, 0.055, 0.026, 0.026);
    var hMat = lam(0x2a3532);
    var hl = mesh('handle-l', hGeo, hMat, -CW / 2 + 0.006, slatYs[2], 0);
    hl.rotation.y = Math.PI / 2;
    var hr = mesh('handle-r', hGeo, hMat, CW / 2 - 0.006, slatYs[2], 0);
    hr.rotation.y = Math.PI / 2;

    /* ================= 三幅小画框 ================= */
    function makeFrame(w, h, theme, frameMat){
      var grp = new THREE.Group();
      grp.name = 'frame-' + theme;
      // 外框
      mesh('fr-border', roundedBox(w, h, 0.05, 0.018), frameMat, 0, 0, 0, grp);
      // 画面（含奶油卡纸边）
      var pic = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.055, h - 0.055),
        new THREE.MeshLambertMaterial({map: paintingTexture(theme)})
      );
      pic.name = 'fr-picture';
      pic.position.z = 0.0265;
      grp.add(pic);
      // 背板（避免背面看穿）
      var back = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.05, h - 0.05),
        lam(WOOD_D)
      );
      back.name = 'fr-back';
      back.rotation.y = Math.PI;
      back.position.z = -0.0265;
      grp.add(back);
      // 顶部黄铜小挂环
      var ring = mesh('fr-ring', new THREE.TorusGeometry(0.016, 0.006, 6, 14), matBrass, 0, h / 2 + 0.008, 0, grp);
      ring.rotation.x = 0.25;
      return grp;
    }

    var frames = [];
    // 后：最高，云朵（木框）
    var f1 = makeFrame(0.46, 0.56, 'clouds', matWood);
    f1.position.set(-0.1, 0.62, -0.1);
    f1.rotation.set(-0.06, 0.1, 0.025);
    // 中：飞鸟（深木框）——主角，最靠中
    var f2 = makeFrame(0.4, 0.5, 'birds', matWoodD);
    f2.position.set(0.16, 0.5, 0.05);
    f2.rotation.set(-0.03, -0.14, -0.03);
    // 前：最矮，海浪（奶白框）——抬高一点，别被箱沿吃掉
    var f3 = makeFrame(0.36, 0.44, 'waves', lam(0xdcccab));
    f3.position.set(-0.17, 0.47, 0.15);
    f3.rotation.set(0.06, 0.14, 0.04);

    [f1, f2, f3].forEach(function(f){
      f.userData.baseY = f.position.y;
      root.add(f);
      frames.push(f);
    });

    // 箱口两缕奶油色刨花衬垫（藏在箱口内侧角落，只露一点）
    function shavings(x, z, ry, sc){
      var pts = [];
      for (var k = 0; k <= 6; k++){
        var a = k / 6 * Math.PI * 1.6;
        pts.push(new THREE.Vector3(Math.cos(a) * 0.045 * sc, Math.sin(a) * 0.024 * sc + k * 0.003, k * 0.011));
      }
      var tube = mesh('shaving', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.0075, 6), matCream, x, CH + 0.02, z);
      tube.rotation.y = ry;
    }
    shavings(0.3, 0.16, 0.6, 1);
    shavings(-0.31, -0.1, 2.4, 0.85);

    /* ================= 点击热区 ================= */
    var proxy = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 1.05, 0.72),
      new THREE.MeshBasicMaterial({visible: false})
    );
    proxy.name = 'hit-proxy';
    proxy.position.set(0, 0.525, 0);
    root.add(proxy);

    /* ================= 交互：三幅画依次跳起打招呼 ================= */
    var busy = false;
    root.userData.fx = {
      tap: function(){
        if (busy) return;
        busy = true;
        var tl = gsap.timeline({
          onComplete: function(){
            busy = false;
            // 兜底归位
            frames.forEach(function(f){ f.position.y = f.userData.baseY; });
          }
        });
        frames.forEach(function(f, idx){
          var t0 = idx * 0.16;
          var jump = 0.13 - idx * 0.015;
          tl.to(f.position, {y: f.userData.baseY + jump, duration: 0.26, ease: 'power2.out'}, t0);
          tl.to(f.position, {y: f.userData.baseY, duration: 0.55, ease: 'bounce.out'}, t0 + 0.26);
          // 起跳时轻轻歪头，落地摆正
          tl.to(f.rotation, {z: f.rotation.z + (idx % 2 ? -0.09 : 0.09), duration: 0.26, ease: 'power2.out'}, t0);
          tl.to(f.rotation, {z: f.rotation.z, duration: 0.5, ease: 'elastic.out(1, 0.45)'}, t0 + 0.26);
        });
      }
    };

    return root;
  };
})();
