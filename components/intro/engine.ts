// Intro particle engine. One THREE.Points cloud; every position is computed in the
// vertex shader from a handful of progress numbers, so nothing is recalculated per
// particle per frame on the CPU. Decoration only: it shows no data.
import * as THREE from "three";

/** Progress numbers the timeline drives. Each runs 0 to 1. */
export type IntroState = {
  spark: number; // the single spark and its embers appear
  burst: number; // the spark erupts outward
  vortex: number; // particles lose their outward speed and wind into a turning sphere
  cool: number; // orange to blue
  form: number; // particles fly to their place in the word
  sweep: number; // a band of light crosses the word
  out: number; // particles leave outward and fade
};

export const initialState = (): IntroState => ({ spark: 0, burst: 0, vortex: 0, cool: 0, form: 0, sweep: 0, out: 0 });

const VERT = /* glsl */ `
  attribute vec4 aSeed;
  attribute vec3 aDir;
  attribute vec3 aTarget;
  uniform float uTime, uSpark, uBurst, uVortex, uCool, uForm, uSweep, uOut, uScale, uAspect;
  varying vec3 vColor;
  varying float vAlpha;

  vec3 rotY(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  }

  void main() {
    // Scene 1: a few embers drift out of the spark.
    float ember = step(aSeed.w, 0.012);
    vec3 emberPos = aDir * (0.05 + 0.5 * aSeed.x) * uSpark;
    emberPos.y += 0.12 * uSpark * aSeed.y;

    // Scene 2: the burst. Fast at first, then drag wins: an ease-out per particle.
    float b = 1.0 - pow(1.0 - uBurst, 3.0);
    vec3 burstPos = aDir * b * (0.9 + 2.6 * aSeed.x);

    // Weightless: the cloud settles onto a shell and turns about the vertical axis,
    // faster near the equator, with a slow breathing turbulence.
    float shell = 1.05 + 0.4 * aSeed.y;
    vec3 onShell = aDir * shell;
    onShell += 0.06 * vec3(sin(uTime * 0.9 + aSeed.x * 40.0), cos(uTime * 0.7 + aSeed.y * 40.0), sin(uTime * 0.8 + aSeed.z * 40.0));
    vec3 vortexPos = rotY(onShell, uTime * (0.35 + 0.9 * (1.0 - abs(aDir.y))) + aSeed.z * 1.5);

    float v = smoothstep(0.0, 1.0, clamp(uVortex * 1.3 - aSeed.x * 0.3, 0.0, 1.0));
    vec3 p = mix(burstPos, vortexPos, v);
    p = mix(emberPos, p, step(0.0001, uBurst));

    // Scene 3: fly to the word, each particle on its own delay, with a small overshoot.
    float f = clamp((uForm - aSeed.y * 0.35) / 0.65, 0.0, 1.0);
    float fe = f * f * (3.0 - 2.0 * f);
    fe += sin(f * 3.14159) * 0.07 * (1.0 - f);
    vec3 target = aTarget + 0.012 * vec3(sin(uTime * 1.7 + aSeed.x * 50.0), cos(uTime * 1.3 + aSeed.z * 50.0), 0.0);
    p = mix(p, target, fe);

    // Scene 5: leave outward.
    vec3 away = normalize(vec3(p.xy + aDir.xy * 0.4, aDir.z * 0.6) + 0.0001);
    float o = uOut * uOut;
    p += away * o * (2.5 + 5.0 * aSeed.x);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // Colour: ember orange cooling to flame blue, outermost first.
    vec3 hot = vec3(1.0, 0.56, 0.2);
    vec3 cold = vec3(0.34, 0.6, 1.0);
    float c = smoothstep(0.0, 1.0, clamp(uCool * 1.6 - (1.0 - aSeed.x) * 0.6, 0.0, 1.0));
    vColor = mix(hot, cold, c);
    // The light sweep: a bright band travelling left to right across the word.
    float band = exp(-pow((aTarget.x - mix(-uAspect * 1.6, uAspect * 1.6, uSweep)) * 3.0, 2.0));
    vColor += vec3(0.5, 0.7, 1.0) * band * uForm * step(0.001, uSweep) * (1.0 - step(0.999, uSweep));

    float shown = mix(ember * uSpark, 1.0, step(0.0001, uBurst));
    float twinkle = 0.75 + 0.25 * sin(uTime * 3.0 + aSeed.w * 80.0);
    vAlpha = shown * twinkle * (1.0 - smoothstep(0.35, 1.0, uOut)) * mix(0.9, 0.75, fe);

    float size = mix(1.0, 2.6, aSeed.z * aSeed.z) * mix(1.0, 0.62, fe);
    gl_PointSize = size * uScale / -mv.z;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    // A bright core with a soft halo, so points glow without a post-processing pass.
    float a = smoothstep(0.5, 0.0, d);
    a = a * a * 0.55 + smoothstep(0.16, 0.0, d) * 0.6;
    gl_FragColor = vec4(vColor * a * vAlpha, 1.0);
  }
`;

const SPARK_FRAG = /* glsl */ `
  uniform float uGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 col = vec3(1.0, 0.5, 0.16) * pow(a, 3.0) * 1.4 + vec3(1.0, 0.9, 0.75) * smoothstep(0.07, 0.0, d);
    gl_FragColor = vec4(col * uGlow, 1.0);
  }
`;

export type IntroEngine = {
  state: IntroState;
  /** World-space half width and half height visible at the word's depth. */
  frame: () => { halfW: number; halfH: number };
  setTargets: (xyz: Float32Array) => void;
  count: number;
  start: () => void;
  stop: () => void;
  dispose: () => void;
};

/** Particle budget: fewer on small or low-powered screens. */
export function particleCount(width: number, cores: number): number {
  if (width < 640) return 5000;
  return cores <= 4 ? 8000 : 12000;
}

export function createEngine(canvas: HTMLCanvasElement, count: number): IntroEngine {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.set(0, 0, 6);

  const seed = new Float32Array(count * 4);
  const dir = new Float32Array(count * 3);
  const target = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    // Uniform direction on the sphere.
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    dir.set([r * Math.cos(a), u, r * Math.sin(a)], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
  geometry.setAttribute("aDir", new THREE.BufferAttribute(dir, 3));
  const targetAttr = new THREE.BufferAttribute(target, 3);
  geometry.setAttribute("aTarget", targetAttr);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);

  const uniforms = {
    uTime: { value: 0 }, uSpark: { value: 0 }, uBurst: { value: 0 }, uVortex: { value: 0 }, uCool: { value: 0 },
    uForm: { value: 0 }, uSweep: { value: 0 }, uOut: { value: 0 }, uScale: { value: 1 }, uAspect: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERT, fragmentShader: FRAG,
    blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // The first spark: one large soft point at the centre.
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
  const sparkMat = new THREE.ShaderMaterial({
    uniforms: { uGlow: { value: 0 }, uSize: { value: 1 } },
    vertexShader: "uniform float uSize; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_PointSize = uSize; }",
    fragmentShader: SPARK_FRAG,
    blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false,
  });
  scene.add(new THREE.Points(sparkGeo, sparkMat));

  const state = initialState();
  const frame = () => {
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    return { halfW: halfH * camera.aspect, halfH };
  };

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Narrow screens: pull the camera back so the sphere and the word still fit.
    camera.position.z = camera.aspect < 1 ? 6 / Math.max(camera.aspect, 0.45) * 0.72 : 6;
    camera.updateProjectionMatrix();
    uniforms.uScale.value = renderer.getPixelRatio() * h * 0.028;
    uniforms.uAspect.value = frame().halfW / 1.6;
  };

  let raf = 0;
  let running = false;
  const t0 = performance.now();
  const render = () => {
    if (!running) return;
    raf = requestAnimationFrame(render);
    if (document.hidden) return;
    const t = (performance.now() - t0) / 1000;
    uniforms.uTime.value = t;
    uniforms.uSpark.value = state.spark;
    uniforms.uBurst.value = state.burst;
    uniforms.uVortex.value = state.vortex;
    uniforms.uCool.value = state.cool;
    uniforms.uForm.value = state.form;
    uniforms.uSweep.value = state.sweep;
    uniforms.uOut.value = state.out;
    // The spark breathes until the burst, flares as it erupts, then is gone.
    const pulse = 0.75 + 0.25 * Math.sin(t * 5.2);
    const flare = state.burst > 0 ? Math.max(0, 1 - state.burst * 2.2) * 2.4 : 1;
    sparkMat.uniforms.uGlow.value = state.spark * pulse * flare * (state.burst > 0.5 ? 0 : 1);
    sparkMat.uniforms.uSize.value = renderer.getPixelRatio() * canvas.clientHeight * (0.09 + 0.5 * Math.min(state.burst * 2, 1));
    points.rotation.y = Math.sin(t * 0.25) * 0.12 * (1 - state.form);
    renderer.render(scene, camera);
  };

  window.addEventListener("resize", resize);
  resize();

  return {
    state,
    frame,
    count,
    setTargets(xyz) {
      target.set(xyz.subarray(0, target.length));
      targetAttr.needsUpdate = true;
    },
    start() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(render);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
      renderer.dispose();
    },
  };
}
