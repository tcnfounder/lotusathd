// The pond: a living water surface with a lotus at its heart.
// - Moving the pointer stirs the water (restlessness).
// - Holding still lets the water settle and the lotus glow (focus reveals).
// - Scrolling opens the bud into a full bloom (the coaching journey).
import { Renderer } from '../vendor/ogl/core/Renderer.js';
import { Program } from '../vendor/ogl/core/Program.js';
import { Mesh } from '../vendor/ogl/core/Mesh.js';
import { Triangle } from '../vendor/ogl/extras/Triangle.js';
import { Flowmap } from '../vendor/ogl/extras/Flowmap.js';
import { Vec2 } from '../vendor/ogl/math/Vec2.js';

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uBloom;   // 0 bud → 1 open
  uniform float uStill;   // 0 restless → 1 settled
  uniform vec2  uRes;
  uniform vec2  uCenter;  // lotus center in uv
  uniform float uScale;
  uniform sampler2D tFlow;
  varying vec2 vUv;

  #define PI 3.14159265

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y);
  }
  float fbm(vec2 p){
    float v=0.0, a=0.5;
    for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; }
    return v;
  }

  // a single petal along angle ang. returns (mask, t along 0..1, across -1..1)
  vec3 petal(vec2 p, float ang, float L, float W){
    vec2 d = vec2(cos(ang), sin(ang));
    float x = dot(p, d);
    float y = dot(p, vec2(-d.y, d.x));
    float t = x / L;
    float tc = clamp(t, 0.0, 1.0);
    // ogive outline: full belly, pointed tip (Nelumbo petal)
    float hw = W * 2.55 * sqrt(tc) * pow(1.0 - tc, 0.85);
    float across = y / max(hw, 1e-4);
    float aa = 1.5 / uRes.y / uScale / max(hw, 1e-3);
    float m = (1.0 - smoothstep(1.0 - aa*1.2, 1.0, abs(across))) * step(0.0, t) * step(t, 1.0);
    return vec3(m, tc, across);
  }

  vec3 shadePetal(vec3 pt, vec3 baseC, vec3 tipC){
    vec3 c = mix(baseC, tipC, smoothstep(0.25, 1.0, pt.y));
    // fine veins running along the petal
    float veins = sin(pt.z * 9.0) * 0.5 + 0.5;
    c *= 1.0 - veins * 0.05 * smoothstep(0.1, 0.6, pt.y);
    // cupped petal: lit along its spine, shaded at the rims
    c *= mix(1.04, 0.74, pow(abs(pt.z), 2.2));
    // soft dark rim reads as overlap
    c *= mix(1.0, 0.82, smoothstep(0.86, 1.0, abs(pt.z)));
    return c;
  }

  // a ring of overlapping petals; alternating petals sit on top
  vec4 ring(vec2 p, float count, float rot, float L, float W, vec3 baseC, vec3 tipC){
    float seg = 6.2831853 / count;
    float a = atan(p.y, p.x) - rot;
    float k = floor(a / seg + 0.5);
    vec3 col = vec3(0.0);
    float mask = 0.0;
    // pass 0: odd petals (under), pass 1: even petals (over)
    for (int pass = 0; pass < 2; pass++) {
      for (int j = -1; j <= 1; j++) {
        float id = k + float(j);
        float isEven = 1.0 - mod(abs(id), 2.0);
        if ((pass == 0 && isEven > 0.5) || (pass == 1 && isEven < 0.5)) continue;
        vec3 pt = petal(p, rot + id * seg, L, W);
        if (pt.x <= 0.0) continue;
        vec3 c = shadePetal(pt, baseC, tipC);
        col = mix(col * mix(1.0, 0.7, pt.x * mask), c, pt.x);
        mask = max(mask, pt.x);
      }
    }
    return vec4(col, mask);
  }

  void main(){
    vec2 uv = vUv;
    vec3 flow = texture2D(tFlow, uv).rgb;
    float aspect = uRes.x / uRes.y;

    // ---- water ----
    float settle = mix(1.0, 0.35, uStill);
    vec2 w = uv * vec2(aspect, 1.0) * 2.2;
    w += flow.xy * 0.35;
    float t = uTime;
    float n  = fbm(w + vec2(t*0.020, t*0.014));
    float n2 = fbm(w*1.7 - vec2(t*0.016, -t*0.011) + n);

    vec3 deep = vec3(0.055, 0.150, 0.153);
    vec3 mid  = vec3(0.086, 0.208, 0.212);
    vec3 silt = vec3(0.170, 0.160, 0.120);
    vec3 col = mix(silt, deep, smoothstep(0.0, 0.55, uv.y));
    col = mix(col, mid, smoothstep(0.35, 0.9, n2) * 0.55);

    // caustic glints — calmer when still
    float caust = pow(1.0 - abs(sin((n2*6.0 + n*3.0) + t*0.22)), 5.0);
    col += vec3(0.62, 0.86, 0.80) * caust * 0.022 * settle * smoothstep(0.1, 0.8, uv.y);

    // ---- lotus ----
    vec2 p = (uv - uCenter) * vec2(aspect, 1.0) / uScale;
    p -= flow.xy * 0.05;                         // the stirred water bends the flower
    p.y *= 1.0;
    float r = length(p);
    float open = smoothstep(0.0, 1.0, uBloom);
    float breath = sin(t*0.6) * 0.004 * (1.0 - uStill*0.5);
    float glowAmt = mix(0.35, 1.0, uStill);

    // ripples around the flower
    float ripple = sin(r*46.0 - t*1.4) * exp(-r*2.6) * smoothstep(0.24, 0.42, r);
    col += vec3(0.62, 0.86, 0.80) * ripple * 0.035 * settle;

    // pad shadow & halo
    col = mix(col, col*0.55, smoothstep(0.62, 0.15, r) * 0.55);
    col += vec3(0.94, 0.65, 0.73) * exp(-r*r*14.0) * 0.18 * glowAmt * (0.4 + open*0.6);

    vec3 cream    = vec3(0.985, 0.945, 0.935);
    vec3 blush    = vec3(0.965, 0.835, 0.865);
    vec3 pinkTip  = vec3(0.900, 0.520, 0.620);
    vec3 pinkDeep = vec3(0.780, 0.360, 0.470);

    float L = 0.50 + breath;
    vec4 o  = ring(p, 8.0, 0.0,        L*mix(0.70, 1.00, open), L*mix(0.10, 0.20, open), blush*0.92, pinkDeep);
    vec4 mR = ring(p, 8.0, 0.3927,     L*mix(0.62, 0.82, open), L*mix(0.09, 0.19, open), cream*0.97, pinkTip);
    vec4 iR = ring(p, 6.0, 0.25,       L*mix(0.42, 0.56, open), L*mix(0.08, 0.17, open), cream, blush);

    vec3 lotus = o.rgb;
    float mask = o.a;
    // each inner ring casts a soft shadow onto the ring below
    float shM = smoothstep(L*0.95, L*0.55, r) * 0.0;
    lotus = mix(lotus * (1.0 - 0.25*smoothstep(0.0, 0.08, L*0.82 - r)), mR.rgb, mR.a);
    mask = max(mask, mR.a);
    lotus = mix(lotus * (1.0 - 0.22*smoothstep(0.0, 0.06, L*0.56 - r)), iR.rgb, iR.a);
    mask = max(mask, iR.a);

    // golden stamens fringing the seed pod
    float sa = atan(p.y, p.x);
    float fil = smoothstep(0.35, 1.0, sin(sa*54.0 + sin(sa*7.0)*0.6) * 0.5 + 0.5);
    float stamRing = smoothstep(0.055, 0.075, r) * (1.0 - smoothstep(0.095, 0.125, r));
    float stam = fil * stamRing * (0.35 + open*0.65);
    lotus = mix(lotus, vec3(0.950, 0.780, 0.360), stam);
    mask = max(mask, stam);

    // seed pod: flat, yellow-green, with seed holes
    float pod = 1.0 - smoothstep(0.058, 0.066, r);
    vec3 podC = mix(vec3(0.780, 0.760, 0.380), vec3(0.900, 0.860, 0.500), smoothstep(0.06, 0.0, r));
    vec2 sp = p * 40.0;
    float seeds = (1.0 - smoothstep(0.16, 0.24, length(fract(sp) - 0.5))) * (1.0 - smoothstep(0.035, 0.05, r));
    podC = mix(podC, vec3(0.50, 0.46, 0.20), seeds * 0.6);
    lotus = mix(lotus, podC, pod);
    mask = max(mask, pod);

    // stillness: the flower brightens
    lotus *= mix(0.86, 1.06, uStill);
    col = mix(col, lotus, mask);

    // vignette + grain
    vec2 vq = uv - 0.5;
    col *= 1.0 - dot(vq, vq) * 0.55;
    col += (hash(uv * uRes + t) - 0.5) * 0.018;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createPond(canvas, hero, opts = {}) {
  let renderer;
  try {
    renderer = new Renderer({ canvas, dpr: Math.min(window.devicePixelRatio || 1, 1.6), alpha: false, antialias: false });
  } catch (e) {
    return null;
  }
  const gl = renderer.gl;
  if (!gl) return null;

  const flowmap = new Flowmap(gl, { falloff: 0.28, dissipation: 0.94, alpha: 0.6 });
  const geometry = new Triangle(gl);
  const program = new Program(gl, {
    vertex, fragment,
    uniforms: {
      uTime: { value: 0 },
      uBloom: { value: 0 },
      uStill: { value: 0 },
      uRes: { value: new Vec2(1, 1) },
      uCenter: { value: new Vec2(0.7, 0.52) },
      uScale: { value: 0.85 },
      tFlow: flowmap.uniform,
    },
  });
  const mesh = new Mesh(gl, { geometry, program });

  const state = {
    bloom: 0, targetBloom: 0,
    still: 0, targetStill: 0,
    calm: !!opts.calm,
    visible: true,
    time: 0,
    lastMove: performance.now(),
    raf: 0,
    onStill: opts.onStill || (() => {}),
  };

  const mouse = new Vec2(-1);
  const velocity = new Vec2();
  let lastPos = null, lastT = 0;

  function layout() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h);
    flowmap.aspect = w / h;
    program.uniforms.uRes.value.set(w, h);
    const mobile = w < 720;
    // desktop: flower sits right of the headline; mobile: high, above the text
    if (mobile) { program.uniforms.uCenter.value.set(0.5, 0.79); program.uniforms.uScale.value = h / w > 1.9 ? 0.5 : 0.44; }
    else if (w < 1100) { program.uniforms.uCenter.value.set(0.72, 0.56); program.uniforms.uScale.value = 0.78; }
    else { program.uniforms.uCenter.value.set(0.71, 0.53); program.uniforms.uScale.value = 0.9; }
    if (state.calm) draw(0);
  }

  function onMove(e) {
    const rect = hero.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    const now = performance.now();
    if (lastPos) {
      const dt = Math.max(14, now - lastT);
      velocity.x = (x - lastPos.x) / dt * 16;
      velocity.y = (y - lastPos.y) / dt * 16;
      const speed = Math.hypot(velocity.x, velocity.y);
      if (speed > 0.0015) state.lastMove = now;
    }
    mouse.set(x, y);
    lastPos = { x, y }; lastT = now;
  }
  hero.addEventListener('pointermove', onMove, { passive: true });

  function draw(dtMs) {
    const dt = Math.min(dtMs, 50) / 1000;
    const now = performance.now();

    // stillness: 1.4 s without real movement
    state.targetStill = (now - state.lastMove > 1400) ? 1 : 0;
    const prev = state.still;
    state.still += (state.targetStill - state.still) * (state.targetStill ? 0.025 : 0.12);
    if (prev < 0.5 && state.still >= 0.5) state.onStill(true);
    if (prev >= 0.5 && state.still < 0.5) state.onStill(false);

    state.bloom += (state.targetBloom - state.bloom) * 0.06;

    if (!state.calm) {
      state.time += dt;
      flowmap.mouse.copy(mouse);
      flowmap.velocity.lerp(velocity, velocity.len() ? 0.5 : 0.1);
      flowmap.update();
      velocity.set(0, 0);
    }

    program.uniforms.uTime.value = state.time;
    program.uniforms.uBloom.value = state.bloom + state.still * 0.06;
    program.uniforms.uStill.value = state.calm ? 1 : state.still;
    renderer.render({ scene: mesh });
  }

  // adaptive quality: if frames are slow, lower resolution; if still slow, hold a single still frame
  let dpr = renderer.dpr, slowFrames = 0, sampled = 0;
  function adapt(dtMs) {
    if (sampled > 240) return;
    sampled++;
    if (dtMs > 34) slowFrames++;
    if (sampled % 40 === 0) {
      if (slowFrames > 24) {
        if (dpr > 0.6) { dpr = Math.max(0.6, dpr * 0.7); renderer.dpr = dpr; layout(); }
        else { state.frozen = true; }
      }
      slowFrames = 0;
    }
  }

  let last = performance.now();
  function loop(now) {
    state.raf = requestAnimationFrame(loop);
    if (!state.visible) { last = now; return; }
    const dt = now - last;
    last = now;
    if (state.frozen) { if (Math.abs(state.targetBloom - state.bloom) > 0.01) draw(dt); return; }
    draw(dt);
    adapt(dt);
  }

  const io = new IntersectionObserver(([entry]) => { state.visible = entry.isIntersecting; }, { threshold: 0 });
  io.observe(hero);

  window.addEventListener('resize', layout);
  layout();

  if (state.calm) { state.bloom = state.targetBloom = 0.85; draw(16); }
  else state.raf = requestAnimationFrame(loop);

  return {
    setBloom(v) {
      state.targetBloom = v;
      if (state.calm) { state.bloom = v; draw(16); }
    },
    setCalm(on) {
      state.calm = on;
      cancelAnimationFrame(state.raf);
      if (on) { state.bloom = state.targetBloom = Math.max(state.targetBloom, 0.85); draw(16); }
      else { last = performance.now(); state.raf = requestAnimationFrame(loop); }
    },
  };
}
