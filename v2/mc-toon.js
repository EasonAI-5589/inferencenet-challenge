/* mc-toon.js — the shared toy look of the homepage's 3D chapters: soft matte
 * materials and one post pass that adds a gentle glow to bright surfaces and light,
 * a soft vignette and, optionally, depth outlines. Local Three.js r170 only. */
import * as THREE from '../assets/vendor/three/three.module.js';

let gradient;
// Four flat tones: shadow, core, light and a narrow highlight.
export function toonGradient() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([72, 72, 72, 255, 150, 150, 150, 255, 220, 220, 220, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.generateMipmaps = false;
    gradient.needsUpdate = true;
  }
  return gradient;
}
export function toon(color, { emissive = 0x000000, emissiveIntensity = 1, map = null, opacity = 1 } = {}) {
  return new THREE.MeshStandardMaterial({
    color, emissive, emissiveIntensity, map, roughness: .78, metalness: 0,
    transparent: opacity < 1, opacity, depthWrite: opacity >= 1,
  });
}
// Converts any lit material (for example a loaded GLB) to the matte toy finish, keeping colour, map and glow.
export function toonify(object) {
  object.traverse(node => {
    if (!node.isMesh) return;
    const convert = m => {
      if (!m || !(m.isMeshStandardMaterial || m.isMeshPhongMaterial || m.isMeshLambertMaterial)) return m;
      const next = toon(m.color, { emissive: m.emissive || 0, emissiveIntensity: m.emissiveIntensity ?? 1, map: m.map, opacity: m.opacity });
      m.dispose();
      return next;
    };
    node.material = Array.isArray(node.material) ? node.material.map(convert) : convert(node.material);
  });
}

const VERTEX = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';

/* Scene → HDR target with depth → bright pass and blur at a third of the size →
 * composite: base + bloom, depth-edge ink lines, vignette, tone mapping. */
export function createPost(renderer, { bloom = 0.3, threshold = .9, ink = 0x0a0f1f, inkStrength = 0, inkWidth = 1, vignette = 0.28 } = {}) {
  const depthTexture = new THREE.DepthTexture(1, 1);
  depthTexture.type = THREE.UnsignedIntType;
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthTexture, samples: 4 });
  const options = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  const blurA = new THREE.WebGLRenderTarget(1, 1, options), blurB = new THREE.WebGLRenderTarget(1, 1, options);
  const blur = new THREE.ShaderMaterial({
    uniforms: { source: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: threshold } },
    vertexShader: VERTEX,
    fragmentShader: `varying vec2 vUv;uniform sampler2D source;uniform vec2 texel;uniform float threshold;
      vec3 pick(vec2 uv){vec3 c=texture2D(source,uv).rgb;float l=max(c.r,max(c.g,c.b));return c*smoothstep(threshold,threshold+.6,l);}
      void main(){vec3 s=pick(vUv)*.227;
        s+=(pick(vUv+texel*1.385)+pick(vUv-texel*1.385))*.316;
        s+=(pick(vUv+texel*3.231)+pick(vUv-texel*3.231))*.07;
        s+=(pick(vUv+texel*5.4)+pick(vUv-texel*5.4))*.035;
        gl_FragColor=vec4(s,1.);}`,
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  const compose = new THREE.ShaderMaterial({
    uniforms: {
      base: { value: sceneTarget.texture }, depth: { value: depthTexture }, glow: { value: blurB.texture },
      texel: { value: new THREE.Vector2() }, near: { value: .1 }, far: { value: 100 },
      bloom: { value: bloom }, ink: { value: new THREE.Color(ink) }, inkStrength: { value: inkStrength }, vignette: { value: vignette },
    },
    vertexShader: VERTEX,
    fragmentShader: `varying vec2 vUv;uniform sampler2D base;uniform sampler2D depth;uniform sampler2D glow;uniform vec2 texel;
      uniform float near;uniform float far;uniform float bloom;uniform vec3 ink;uniform float inkStrength;uniform float vignette;
      float lin(vec2 uv){float z=texture2D(depth,uv).x*2.-1.;return 2.*near*far/(far+near-z*(far-near));}
      void main(){
        vec3 c=texture2D(base,vUv).rgb;
        float d=lin(vUv);
        float dx=abs(lin(vUv+vec2(texel.x,0.))-d)+abs(lin(vUv-vec2(texel.x,0.))-d);
        float dy=abs(lin(vUv+vec2(0.,texel.y))-d)+abs(lin(vUv-vec2(0.,texel.y))-d);
        float edge=smoothstep(.035,.09,(dx+dy)/max(d,.001));
        edge*=1.-smoothstep(far*.45,far*.9,d);
        c=mix(c,ink,edge*inkStrength);
        c+=texture2D(glow,vUv).rgb*bloom;
        c*=1.-vignette*pow(length((vUv-.5)*vec2(1.1,1.)),1.6);
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blur);
  const postScene = new THREE.Scene(), postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(quad);
  let bw = 1, bh = 1, widthPx = 1, heightPx = 1;
  return {
    setSize(width, height) {
      const ratio = renderer.getPixelRatio();
      widthPx = Math.max(1, Math.round(width * ratio)); heightPx = Math.max(1, Math.round(height * ratio));
      sceneTarget.setSize(widthPx, heightPx);
      bw = Math.max(1, Math.round(widthPx / 3)); bh = Math.max(1, Math.round(heightPx / 3));
      blurA.setSize(bw, bh); blurB.setSize(bw, bh);
      compose.uniforms.texel.value.set(inkWidth * Math.max(1, ratio * .75) / widthPx, inkWidth * Math.max(1, ratio * .75) / heightPx);
    },
    set(values) { for (const [key, value] of Object.entries(values)) if (compose.uniforms[key]) compose.uniforms[key].value = value; },
    // view: optional { x, y, w, h, sx, sy, sw, sh } in CSS pixels from the bottom left,
    // to composite into one region of a shared canvas (viewport x/y/w/h, scissor s*).
    render(scene, camera, view) {
      compose.uniforms.near.value = camera.near; compose.uniforms.far.value = camera.far;
      renderer.setRenderTarget(sceneTarget); renderer.clear(); renderer.render(scene, camera);
      quad.material = blur;
      blur.uniforms.source.value = sceneTarget.texture; blur.uniforms.threshold.value = threshold; blur.uniforms.texel.value.set(1 / bw, 0);
      renderer.setRenderTarget(blurA); renderer.render(postScene, postCamera);
      blur.uniforms.source.value = blurA.texture; blur.uniforms.threshold.value = -1; blur.uniforms.texel.value.set(0, 1 / bh);
      renderer.setRenderTarget(blurB); renderer.render(postScene, postCamera);
      quad.material = compose;
      renderer.setRenderTarget(null);
      if (view) { renderer.setViewport(view.x, view.y, view.w, view.h); renderer.setScissor(view.sx, view.sy, view.sw, view.sh); renderer.setScissorTest(true); }
      renderer.render(postScene, postCamera);
      if (view) renderer.setScissorTest(false);
    },
    dispose() { [sceneTarget, blurA, blurB].forEach(t => t.dispose()); depthTexture.dispose(); blur.dispose(); compose.dispose(); quad.geometry.dispose(); },
  };
}
