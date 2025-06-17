import * as THREE from 'three';

const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    varying vec2 vUv;
    uniform float u_time;
    uniform vec2 u_resolution;

    // --- Configurable parameters
    const int NUM_BLOBS = 16;
    const float BASE_RADIUS = 0.45; // Base size of the lava shape
    const float THRESHOLD = 1.0;
    
    vec3 LAVA_COLOR = vec3(0.776, 0.157, 0.157); // #c62828
    vec3 GLOW_COLOR = vec3(0.96, 0.486, 0.0); // #f57c00
    const float GLOW_FALLOFF = 15.0;


    // --- Noise function for more organic movement
    vec2 random2(vec2 p) {
        return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
    }

    void main() {
        vec2 uv = vUv - 0.5;
        float aspect = u_resolution.x / u_resolution.y;
        uv.x *= aspect;
        
        float sum = 0.0;
        
        // Add a central, static blob to ensure the middle is always filled
        float d_center = length(uv);
        sum += smoothstep(BASE_RADIUS, BASE_RADIUS - 0.2, d_center) * 1.5;

        // --- Animated blobs for the lava effect
        for (int i = 0; i < NUM_BLOBS; i++) {
            float i_float = float(i);
            
            // Each blob gets a unique, slow-changing "seed" for its movement
            vec2 seed = vec2(i_float * 2.1, i_float * 3.5);
            
            // Time-driven angle for circular motion
            float angle = u_time * 0.2 + i_float * 2.5;

            // Base circular path
            vec2 base_pos = vec2(cos(angle), sin(angle));
            
            // Add noise for irregularity. The random2 call provides an offset vector.
            vec2 noise_offset = (random2(seed + floor(u_time * 0.1)) - 0.5) * 2.0;
            float noise_speed = 0.2 + mod(i_float, 4.0) * 0.1;
            base_pos += noise_offset * sin(u_time * noise_speed + i_float) * 0.2;

            // Distance from center determines blob's path radius
            float path_radius = BASE_RADIUS * 0.7 + sin(u_time * 0.1 + i_float) * 0.1;
            vec2 pos = base_pos * path_radius;

            // Individual blob size also pulsates
            float radius = 0.08 + (sin(u_time * 0.5 + i_float * 2.0) * 0.5 + 0.5) * 0.08;

            // This is the metaball formula
            float d = length(uv - pos);
            sum += radius / d;
        }

        // --- Coloring
        // When sum > THRESHOLD, we are "inside" the lava
        float t = smoothstep(THRESHOLD - 0.01, THRESHOLD + 0.01, sum);
        
        vec3 color = mix(vec3(0.0), LAVA_COLOR, t);
        
        // Add glow outside the main shape
        float glow = pow(sum / THRESHOLD, GLOW_FALLOFF) * (1.0 - t);
        color += glow * GLOW_COLOR;

        gl_FragColor = vec4(color, 1.0);
    }
`;

class LavaBackground {
    constructor(canvas) {
        this.canvas = canvas;
        this.container = canvas.parentElement;

        this.init();
        this.createMesh();
        this.addEventListeners();
        this.animate();
    }

    init() {
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        this.camera.position.z = 1;
        this.clock = new THREE.Clock();
        this.updateSize();
    }
    
    createMesh() {
        this.geometry = new THREE.PlaneGeometry(2, 2);
        this.material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(this.width, this.height) }
            }
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);
    }
    
    updateSize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        if (this.material) {
            this.material.uniforms.u_resolution.value.set(this.width, this.height);
        }
    }

    addEventListeners() {
        window.addEventListener('resize', () => this.updateSize());
    }

    animate() {
        this.material.uniforms.u_time.value = this.clock.getElapsedTime();
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('shader-canvas');
    new LavaBackground(canvas);
});