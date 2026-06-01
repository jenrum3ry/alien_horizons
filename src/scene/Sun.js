import * as THREE from 'three';

// A distant, bright star placed along the scene's key-light direction so the
// lighting on Earth/Moon/ships reads as coming from it. A hot emissive core
// plus an additive corona halo that blooms in post.
export class Sun {
  constructor(direction = new THREE.Vector3(-1, 0.4, 0.6), distance = 70000) {
    this.group = new THREE.Group();
    const dir = direction.clone().normalize();
    this.group.position.copy(dir.multiplyScalar(distance));

    // Bright core — pushed above 1.0 so the bloom threshold catches it hard.
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(4200, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xfff0c8, toneMapped: false })
    );
    this.group.add(core);
    this.core = core;

    // Corona: a larger back-facing shell with a soft radial falloff, additive.
    const coronaMat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vView;
        uniform float uTime;
        void main() {
          float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
          float flicker = 0.92 + 0.08 * sin(uTime * 2.0);
          vec3 col = mix(vec3(1.0, 0.75, 0.35), vec3(1.0, 0.45, 0.2), rim) * rim * flicker;
          gl_FragColor = vec4(col, rim);
        }
      `,
    });
    this.corona = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 48), coronaMat);
    this.group.add(this.corona);
    this.coronaMat = coronaMat;

    // Keep the star effectively "at infinity" — never culled by the far plane.
    this.group.traverse((o) => (o.frustumCulled = false));
  }

  update(dt) {
    this.coronaMat.uniforms.uTime.value += dt;
  }
}
