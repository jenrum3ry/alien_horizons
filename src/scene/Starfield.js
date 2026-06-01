import * as THREE from 'three';

// A large inverted sphere of star Points plus a faint nebula gradient backdrop.
// Rendered "infinitely" far by following the camera position each frame.
export class Starfield {
  constructor(count = 6000, radius = 90000) {
    this.group = new THREE.Group();

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xbcd0ff),
      new THREE.Color(0xfff2cc),
      new THREE.Color(0xffd0c0),
    ];

    for (let i = 0; i < count; i++) {
      // Uniform on a sphere shell.
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (0.8 + Math.random() * 0.2);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const c = palette[(Math.random() * palette.length) | 0];
      const b = 0.6 + Math.random() * 0.4;
      colors[i * 3] = c.r * b;
      colors[i * 3 + 1] = c.g * b;
      colors[i * 3 + 2] = c.b * b;
      sizes[i] = 120 + Math.random() * 360;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main() {
          vec2 d = gl_PointCoord - vec2(0.5);
          float a = smoothstep(0.5, 0.0, length(d));
          gl_FragColor = vec4(vColor, a);
        }
      `,
    });
    // ShaderMaterial needs vertexColors flagged via this:
    mat.vertexColors = true;

    this.stars = new THREE.Points(geo, mat);
    this.stars.frustumCulled = false;
    this.group.add(this.stars);

    // Distant nebula glow shell (very dim) for depth.
    const nebGeo = new THREE.SphereGeometry(radius * 1.05, 32, 32);
    const nebMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {},
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          float t = vDir.y * 0.5 + 0.5;
          vec3 top = vec3(0.02, 0.01, 0.05);
          vec3 bot = vec3(0.05, 0.02, 0.08);
          vec3 col = mix(bot, top, t);
          // faint purple band
          float band = exp(-pow((vDir.x + vDir.z) * 1.5, 2.0)) * 0.06;
          col += vec3(0.15, 0.05, 0.2) * band;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.nebula = new THREE.Mesh(nebGeo, nebMat);
    this.nebula.frustumCulled = false;
    this.group.add(this.nebula);
  }

  // Keep the backdrop centered on the camera so it feels infinitely far.
  update(cameraPosition) {
    this.group.position.copy(cameraPosition);
  }
}
