import * as THREE from 'three';

// A procedural cratered moon, lit by the same key-light direction as Earth so
// it shows a matching day/night terminator. Sits far enough out to read as a
// backdrop body rather than something you can reach in a mission.
export class Moon {
  constructor(position = new THREE.Vector3(11000, 2200, -13000), radius = 1100) {
    this.group = new THREE.Group();
    this.group.position.copy(position);

    const mat = new THREE.ShaderMaterial({
      uniforms: { uLightDir: { value: new THREE.Vector3(-1, 0.4, 0.6).normalize() } },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          // World-space normal so the sun-lit terminator stays fixed in the
          // world (uLightDir is world-space), not rotating with the camera.
          vNormal = normalize(vec3(modelMatrix * vec4(normal, 0.0)));
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vPos;
        uniform vec3 uLightDir;

        float hash(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        float noise(vec3 x){
          vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
          return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                         mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                         mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
        }
        float fbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.0; a*=0.5;} return s; }

        // Cheap crater field: distance to scattered pits darkens the surface.
        float craters(vec3 p){
          float c = 0.0;
          for (int i = 0; i < 3; i++){
            float sc = 3.0 + float(i) * 4.0;
            vec3 cell = floor(p * sc);
            float r = hash(cell);
            vec3 center = (cell + 0.5 + (vec3(hash(cell+1.0), hash(cell+2.0), hash(cell+3.0)) - 0.5)) / sc;
            float d = length(p - center) * sc;
            float rim = smoothstep(0.55, 0.35, d) - smoothstep(0.35, 0.0, d) * 0.6;
            c += rim * (0.4 + r * 0.6);
          }
          return c;
        }

        void main(){
          vec3 n = normalize(vNormal);
          vec3 sp = normalize(vPos);
          float base = 0.55 + fbm(sp * 4.0) * 0.25;
          float cr = craters(sp);
          float albedo = clamp(base + cr * 0.3, 0.18, 0.95);
          vec3 surface = vec3(albedo) * vec3(0.86, 0.87, 0.92);

          float diff = clamp(dot(n, uLightDir), 0.0, 1.0);
          vec3 col = surface * (0.04 + diff * 1.1);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 64), mat);
    this.group.add(this.mesh);
  }

  update(dt) {
    this.mesh.rotation.y += dt * 0.01;
  }
}
