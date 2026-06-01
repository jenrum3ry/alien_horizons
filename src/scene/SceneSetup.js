import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Owns the renderer, camera, lights and bloom post-processing pipeline.
export class SceneSetup {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.camera = new THREE.PerspectiveCamera(
      62,
      window.innerWidth / window.innerHeight,
      0.1,
      200000
    );
    this.camera.position.set(0, 40, 160);

    // Lighting: a hard "sun" key light + soft fill so the dark sides read.
    this.sun = new THREE.DirectionalLight(0xfff4e6, 3.2);
    this.sun.position.set(-1, 0.4, 0.6).multiplyScalar(10000);
    this.scene.add(this.sun);

    this.fill = new THREE.HemisphereLight(0x223355, 0x050308, 0.5);
    this.scene.add(this.fill);

    this.ambient = new THREE.AmbientLight(0x101018, 0.6);
    this.scene.add(this.ambient);

    // Post-processing: subtle but punchy bloom for engines/lasers/atmosphere.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.85, // strength
      0.6, // radius
      0.85 // threshold
    );
    this.composer.addPass(this.bloom);

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
  }

  add(obj) {
    this.scene.add(obj);
  }

  remove(obj) {
    this.scene.remove(obj);
  }

  render() {
    this.composer.render();
  }
}
