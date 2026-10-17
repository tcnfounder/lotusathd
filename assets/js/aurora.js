// Hero backdrop: a soft, living field of the brand's violet and green.
// Moving the pointer stirs it (restlessness). Holding still lets it settle
// and the light gathers (focus reveals). Low-cost shader, adaptive quality.
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
  uniform float uStill;
  uniform float uScroll;
  uniform vec2 uRes;
  uniform sampler2D tFlow;
  varying vec2 vUv;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p=p*2.02+3.1; a*=0.5; } return v; }

  float blob(vec2 p, vec2 c, float r){ return exp(-dot(p-c, p-c) / (r*r)); }

  void main(){
    vec2 uv = vUv;
    vec3 flow = texture2D(tFlow, uv).rgb;
    float aspect = uRes.x / uRes.y;
    vec2 p = vec2(uv.x * aspect, uv.y);
    p += flow.xy * 0.18;

    float t = uTime * mix(1.0, 0.45, uStill);
    float n = fbm(p * 1.6 + vec2(t*0.04, -t*0.03));
    p += (n - 0.5) * 0.25;

    vec3 base   = vec3(0.969, 0.953, 0.992);  // lilac
    vec3 violet = vec3(0.416, 0.267, 0.722);
    vec3 soft   = vec3(0.725, 0.627, 0.949);
    vec3 green  = vec3(0.373, 0.824, 0.478);

    float ax = aspect;
    vec2 c1 = vec2(ax*0.78 + sin(t*0.21)*0.08, 0.72 + cos(t*0.17)*0.06);
    vec2 c2 = vec2(ax*0.62 + cos(t*0.15)*0.10, 0.22 + sin(t*0.19)*0.05 - uScroll*0.2);
    vec2 c3 = vec2(ax*0.12 + sin(t*0.13)*0.06, 0.88 + cos(t*0.11)*0.04);
    vec2 c4 = vec2(ax*0.95 + cos(t*0.12)*0.05, 0.35 + sin(t*0.14)*0.08);

    vec3 col = base;
    col = mix(col, soft,   blob(p, c1, 0.42) * 0.55);
    col = mix(col, violet, blob(p, c4, 0.30) * 0.28);
    col = mix(col, green,  blob(p, c2, 0.30) * 0.22);
    col = mix(col, soft,   blob(p, c3, 0.35) * 0.30);

    // stillness: the light gathers
    col += vec3(1.0, 0.98, 1.0) * blob(p, c1, 0.25) * 0.10 * uStill;

    // fine grain keeps the gradient from banding
    col += (hash(uv * uRes + fract(uTime)) - 0.5) * 0.02;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createAurora(canvas, host, opts = {}) {
  let renderer;
  try { renderer = new Renderer({ canvas, dpr: Math.min(window.devicePixelRatio || 1, 1.25), alpha: false, antialias: false }); }
  catch (e) { return null; }
  const gl = renderer.gl;
  if (!gl) return null;

  const flowmap = new Flowmap(gl, { falloff: 0.3, dissipation: 0.95, alpha: 0.7 });
  const program = new Program(gl, {
    vertex, fragment,
    uniforms: {
      uTime: { value: 0 }, uStill: { value: 0 }, uScroll: { value: 0 },
      uRes: { value: new Vec2(1, 1) }, tFlow: flowmap.uniform,
    },
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  const st = { calm: !!opts.calm, visible: true, frozen: false, time: Math.random() * 50, still: 0, lastMove: performance.now(), raf: 0, scroll: 0 };
  const mouse = new Vec2(-1), velocity = new Vec2();
  let lastPos = null, lastT = 0;

  function layout() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h);
    flowmap.aspect = w / h;
    program.uniforms.uRes.value.set(w, h);
    if (st.calm || st.frozen) draw(0);
  }

  host.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
    const now = performance.now();
    if (lastPos) {
      const dt = Math.max(14, now - lastT);
      velocity.set((x - lastPos.x) / dt * 16, (y - lastPos.y) / dt * 16);
      if (Math.hypot(velocity.x, velocity.y) > 0.0015) st.lastMove = now;
    }
    mouse.set(x, y); lastPos = { x, y }; lastT = now;
  }, { passive: true });

  function draw(dtMs) {
    const dt = Math.min(dtMs, 50) / 1000;
    const now = performance.now();
    const target = now - st.lastMove > 1400 ? 1 : 0;
    const prev = st.still;
    st.still += (target - st.still) * (target ? 0.03 : 0.14);
    if (opts.onStill && (prev < 0.5) !== (st.still < 0.5)) opts.onStill(st.still >= 0.5);
    if (!st.calm) {
      st.time += dt;
      flowmap.mouse.copy(mouse);
      flowmap.velocity.lerp(velocity, velocity.len() ? 0.5 : 0.1);
      flowmap.update();
      velocity.set(0, 0);
    }
    program.uniforms.uTime.value = st.time;
    program.uniforms.uStill.value = st.calm ? 1 : st.still;
    program.uniforms.uScroll.value = st.scroll;
    renderer.render({ scene: mesh });
  }

  let dpr = renderer.dpr, slow = 0, sampled = 0;
  function adapt(dt) {
    if (sampled > 240) return;
    sampled++; if (dt > 34) slow++;
    if (sampled % 40 === 0) {
      if (slow > 24) { if (dpr > 0.5) { dpr = Math.max(0.5, dpr * 0.7); renderer.dpr = dpr; layout(); } else st.frozen = true; }
      slow = 0;
    }
  }

  let last = performance.now();
  function loop(now) {
    st.raf = requestAnimationFrame(loop);
    const dt = now - last; last = now;
    if (!st.visible || st.frozen) return;
    draw(dt); adapt(dt);
  }

  new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; }).observe(host);
  window.addEventListener('resize', layout);
  layout();
  if (st.calm) draw(16); else st.raf = requestAnimationFrame(loop);

  return {
    setScroll(v) { st.scroll = v; },
    setCalm(on) {
      st.calm = on; cancelAnimationFrame(st.raf);
      if (on) draw(16); else { last = performance.now(); st.raf = requestAnimationFrame(loop); }
    },
  };
}
