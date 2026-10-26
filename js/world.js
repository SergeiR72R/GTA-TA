// Рендер, небо, солнце, тени, туман, смена дня и ночи (1 игровая минута = 1 секунда).
'use strict';
(() => {
  const W = G.world = {};
  const SKY = [   // [час, верх неба, горизонт, туман, солнце, окружение, сила солнца]
    [0, 0x060a18, 0x15203a, 0x111a30, 0x6a7aa8, 0x1e2840, 0.15],
    [5, 0x10183a, 0x3a3550, 0x2c2c44, 0x8070a0, 0x2c3048, 0.2],
    [6.5, 0x3a5a90, 0xf0a070, 0xd09a80, 0xffb070, 0x806860, 0.8],
    [8, 0x4a8ad0, 0xbfd8ea, 0xb8cfe0, 0xfff0d8, 0xa8b4c0, 1.6],
    [13, 0x3d7fd0, 0xc6dcec, 0xc2d6e6, 0xfffaf0, 0xb4bec8, 1.9],
    [17.5, 0x4a7cc0, 0xe8c6a0, 0xdcc0a8, 0xffd8a8, 0xa8a098, 1.5],
    [19, 0x2a3a70, 0xf08850, 0xb07060, 0xff9050, 0x705858, 0.7],
    [20.5, 0x0e1630, 0x3a3048, 0x262436, 0x7080b0, 0x262c44, 0.2],
    [24, 0x060a18, 0x15203a, 0x111a30, 0x6a7aa8, 0x1e2840, 0.15],
  ];
  const col = h => new THREE.Color(h);
  W.init = () => {
    const r = G.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, G.quality.ratio));
    r.setSize(innerWidth, innerHeight);
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = G.quality.shadows;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game').appendChild(r.domElement);
    G.texInit(r);
    const scene = G.scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xc2d6e6, 120, 460);
    const camera = G.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.15, 1400);
    addEventListener('resize', () => { r.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
    // свет
    W.hemi = new THREE.HemisphereLight(0xbfd8ea, 0x6b6250, 0.55); scene.add(W.hemi);
    W.amb = new THREE.AmbientLight(0xffffff, 0.12); scene.add(W.amb);
    const sun = W.sun = new THREE.DirectionalLight(0xfff4e0, 1.6);
    sun.castShadow = G.quality.shadows;
    sun.shadow.mapSize.set(G.quality.shadowSize, G.quality.shadowSize);
    const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 400;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    scene.add(sun); scene.add(sun.target);
    // небо: сфера с градиентом
    const skyMat = W.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: col(0x3d7fd0) }, hor: { value: col(0xc6dcec) }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: col(0xffffff) }, night: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
      fragmentShader: `uniform vec3 top, hor, sunCol, sunDir; uniform float night; varying vec3 vP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
        void main(){
          float y = max(vP.y, 0.0);
          vec3 c = mix(hor, top, pow(y, 0.55));
          float s = max(dot(vP, normalize(sunDir)), 0.0);
          c += sunCol * (pow(s, 600.0) * 3.0 + pow(s, 12.0) * 0.25);
          if (vP.y < 0.0) c = hor * 0.9;
          // звёзды
          vec3 q = floor(vP * 300.0);
          float st = step(0.9975, h(q)) * night * smoothstep(0.05, 0.3, vP.y);
          c += vec3(st);
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`,
    });
    W.sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), skyMat);
    W.sky.renderOrder = -1; W.sky.frustumCulled = false;
    scene.add(W.sky);
    G.clock = 10 * 60;   // 10:00
  };
  const tmp = new THREE.Color(), tmp2 = new THREE.Color();
  function sample(hour, k) {
    for (let i = 0; i < SKY.length - 1; i++) {
      const a = SKY[i], b = SKY[i + 1];
      if (hour >= a[0] && hour <= b[0]) {
        const t = (hour - a[0]) / (b[0] - a[0]);
        if (k === 6) return G.lerp(a[6], b[6], t);
        return tmp.set(a[k]).lerp(tmp2.set(b[k]), t).clone();
      }
    }
    return k === 6 ? 1 : col(SKY[0][k]);
  }
  W.update = (dt, center) => {
    G.clock = (G.clock + dt * G.timeScale) % 1440;
    const hour = G.clock / 60;
    // солнце: восход 6:00, закат 19:30; ночью тот же свет — луна
    const t = (hour - 6) / 13.5;
    const el = Math.sin(Math.PI * G.clamp(t, 0, 1));
    const az = Math.PI * (0.15 + t);
    const day = G.clamp((hour - 5.6) / 1.4, 0, 1) * G.clamp((20.3 - hour) / 1.4, 0, 1);
    G.night = 1 - day;
    const dir = new THREE.Vector3(Math.cos(az) * 0.9, Math.max(0.12, el), Math.sin(az) * 0.45 + 0.35).normalize();
    if (day < 0.3) dir.set(-0.4, 0.8, 0.3).normalize();        // луна
    const sun = W.sun;
    sun.position.set(center.x + dir.x * 200, dir.y * 200, center.z + dir.z * 200);
    sun.target.position.set(center.x, 0, center.z);
    // тень — на сетке, чтобы не дрожала
    const sunI = sample(hour, 6);
    sun.intensity = sunI;
    sun.color.copy(sample(hour, 4));
    W.hemi.color.copy(sample(hour, 1)).lerp(col(0xffffff), 0.3 * day);
    W.hemi.groundColor.copy(sample(hour, 5)).multiplyScalar(0.7);
    W.hemi.intensity = 0.25 + day * 0.4;
    W.amb.color.setRGB(0.55 + day * 0.45, 0.6 + day * 0.4, 0.85 + day * 0.15);
    W.amb.intensity = 0.05 + day * 0.07 + G.night * 0.05;
    G.renderer.toneMappingExposure = 1.05 - G.night * 0.15;
    G.scene.fog.color.copy(sample(hour, 3));
    G.scene.fog.near = 110; G.scene.fog.far = 430 - G.night * 120;
    W.skyMat.uniforms.top.value.copy(sample(hour, 1));
    W.skyMat.uniforms.hor.value.copy(sample(hour, 2));
    W.skyMat.uniforms.sunDir.value.copy(dir);
    W.skyMat.uniforms.sunCol.value.copy(sample(hour, 4)).multiplyScalar(day);
    W.skyMat.uniforms.night.value = G.night;
    W.sky.position.copy(G.camera.position);
    for (const n of G.nightMats) n.mat.emissiveIntensity = n.max * G.smooth(0.25, 0.85, G.night);
  };
})();
