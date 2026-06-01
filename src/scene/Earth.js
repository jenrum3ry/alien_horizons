import * as THREE from 'three';

// Procedural Earth: a shaded ocean/land sphere with a fresnel atmosphere shell
// and a slow rotation. Holds mission-level health that the HUD reads.
export class Earth {
  constructor(radius = 2200) {
    this.radius = radius;
    this.group = new THREE.Group();
    this.maxHealth = 100;
    this.health = 100;

    // Surface: cheap procedural continents via fbm noise in the fragment shader.
    const surfMat = new THREE.ShaderMaterial({
      uniforms: {
        uLightDir: { value: new THREE.Vector3(-1, 0.4, 0.6).normalize() },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vPos;
        uniform vec3 uLightDir;
        uniform float uTime;

        // hash / value noise / fbm
        float hash(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        float noise(vec3 x){
          vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
          return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                         mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                         mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
        }
        float fbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.0; a*=0.5;} return s; }

        void main(){
          vec3 n = normalize(vNormal);
          vec3 sp = normalize(vPos);
          float h = fbm(sp*2.5);
          float land = smoothstep(0.52, 0.56, h);
          vec3 ocean = mix(vec3(0.02,0.12,0.32), vec3(0.05,0.25,0.5), fbm(sp*8.0));
          vec3 grass = mix(vec3(0.10,0.30,0.08), vec3(0.35,0.30,0.15), fbm(sp*10.0));
          vec3 ice = vec3(0.9,0.95,1.0);
          float polar = smoothstep(0.7,0.9, abs(sp.y));
          vec3 surface = mix(ocean, grass, land);
          surface = mix(surface, ice, polar*0.8);

          float diff = clamp(dot(n, uLightDir), 0.0, 1.0);
          float night = clamp(-dot(n, uLightDir), 0.0, 1.0);
          vec3 cityGlow = vec3(0.9,0.7,0.3) * land * night * 0.4;
          vec3 col = surface * (0.08 + diff) + cityGlow;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.surface = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 96), surfMat);
    this.group.add(this.surface);
    this.surfMat = surfMat;

    // Atmosphere: additive fresnel rim.
    const atmoMat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uLightDir: { value: new THREE.Vector3(-1, 0.4, 0.6).normalize() } },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vView;
        void main(){
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vView;
        void main(){
          float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.5);
          vec3 col = vec3(0.3,0.6,1.0) * rim;
          gl_FragColor = vec4(col, rim);
        }
      `,
    });
    this.atmosphere = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.06, 64, 64), atmoMat);
    this.group.add(this.atmosphere);

    // Damage flash overlay (turns reddish as Earth takes hits).
    this._damageFlash = 0;

    // Earth sits "below" the play area.
    this.group.position.set(0, -radius - 1400, -600);
    this.center = this.group.position.clone();
  }

  damage(amount) {
    this.health = Math.max(0, this.health - amount);
    this._damageFlash = Math.min(1, this._damageFlash + 0.5);
  }

  reset() {
    this.health = this.maxHealth;
    this._damageFlash = 0;
  }

  get alive() {
    return this.health > 0;
  }

  update(dt) {
    this.surface.rotation.y += dt * 0.02;
    this.surfMat.uniforms.uTime.value += dt;
    this._damageFlash = Math.max(0, this._damageFlash - dt * 1.5);
  }
}
