"use client";
// The rotating Earth behind the landing headline. Decoration only: it carries no data.
// Texture: NASA Blue Marble Next Generation, January 2004 (NASA Earth Observatory,
// public domain), resized from world.200401.3x5400x2700.jpg on science.nasa.gov.
import { useEffect, useRef } from "react";

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;
  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EARTH_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uSun;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;
  void main() {
    vec3 day = texture2D(uMap, vUv).rgb;
    float light = dot(normalize(vWorldNormal), uSun);
    // A soft terminator: the night side falls to near black, as it does from orbit.
    float diff = smoothstep(-0.12, 0.55, light);
    vec3 col = day * (0.015 + 1.25 * diff);
    // Air glow along the limb, stronger on the sunlit side.
    float rim = pow(1.0 - max(dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)), 0.0), 2.6);
    col += vec3(0.24, 0.5, 1.0) * rim * (0.08 + 0.7 * diff);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const AIR_FRAG = /* glsl */ `
  uniform vec3 uSun;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;
  void main() {
    float glow = pow(max(0.62 - dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)), 0.0), 4.0);
    float lit = smoothstep(-0.5, 0.6, dot(normalize(vWorldNormal), uSun));
    gl_FragColor = vec4(vec3(0.22, 0.5, 1.0) * glow * (0.15 + 2.2 * lit), 1.0);
    #include <colorspace_fragment>
  }
`;

export function HeroEarth({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    void import("three").then((THREE) => {
      if (disposed) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      } catch {
        return; // No WebGL: the starfield alone stays behind the headline.
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);
      renderer.domElement.style.cssText = "width:100%;height:100%;display:block;opacity:0;transition:opacity 1.2s ease-out";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
      camera.position.set(0, 0, 4.4);

      const sun = new THREE.Vector3(-0.72, 0.38, 0.58).normalize();
      const geometry = new THREE.SphereGeometry(1, 96, 64);
      const texture = new THREE.TextureLoader().load("/earth/blue-marble.jpg", () => {
        renderer.domElement.style.opacity = "1";
        draw();
      });
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

      const earthMat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: texture }, uSun: { value: sun } },
        vertexShader: VERT,
        fragmentShader: EARTH_FRAG,
      });
      const airMat = new THREE.ShaderMaterial({
        uniforms: { uSun: { value: sun } },
        vertexShader: VERT,
        fragmentShader: AIR_FRAG,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      });
      const earth = new THREE.Mesh(geometry, earthMat);
      const air = new THREE.Mesh(geometry, airMat);
      air.scale.setScalar(1.09);
      // Axial tilt, 23.4 degrees.
      const tilt = new THREE.Group();
      tilt.rotation.z = THREE.MathUtils.degToRad(-23.4);
      tilt.add(earth);
      scene.add(tilt, air);
      earth.rotation.y = 4.2; // start with the Atlantic and the Americas in view

      const resize = () => {
        const s = el.clientWidth;
        if (s > 0) renderer.setSize(s, s, false);
        draw();
      };
      function draw() {
        if (!disposed) renderer.render(scene, camera);
      }

      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let raf = 0;
      let last = 0;
      let visible = true;
      const tick = (t: number) => {
        raf = requestAnimationFrame(tick);
        // 30 frames a second is plenty for a slow turn, and halves the GPU work.
        if (!visible || document.hidden || t - last < 33) return;
        const dt = Math.min(0.1, (t - last) / 1000);
        last = t;
        earth.rotation.y += dt * 0.045;
        draw();
      };
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
      io.observe(el);
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      resize();
      if (!still) raf = requestAnimationFrame(tick);

      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        geometry.dispose();
        texture.dispose();
        earthMat.dispose();
        airMat.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={host} aria-hidden className={className} />;
}
