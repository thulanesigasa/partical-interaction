import * as THREE from 'three';
import { CONFIG } from './config.js';

let particlesMesh = null;
let currentShape = 'sphere';
let targetPositions = new Float32Array(CONFIG.PARTICLE_COUNT * 3);
let targetColors = new Float32Array(CONFIG.PARTICLE_COUNT * 3);

// Advanced Particle Shader
const particleVertexShader = `
    uniform float uTime;
    uniform float uScaleBase;
    uniform float uTurbulence;
    uniform float uHandInfluence;
    
    attribute vec3 targetPosition;
    attribute vec3 targetColor;
    
    varying vec3 vColor;
    varying float vDist;
    
    void main() {
        vColor = targetColor;
        
        // Morphing: move current position towards target
        vec3 tPos = targetPosition;
        
        // Turbulence applied directly in shader
        tPos.x += sin(uTime * 2.0 + float(gl_VertexID)) * uTurbulence;
        tPos.y += cos(uTime * 3.0 + float(gl_VertexID)) * uTurbulence;
        tPos.z += sin(uTime * 4.0 + float(gl_VertexID)) * uTurbulence;
        
        // Hand Expansion
        float dist = length(tPos);
        vDist = dist;
        float normalizedDist = min(dist / 20.0, 1.0);
        float expansionBoost = 1.0 + (uHandInfluence * pow(normalizedDist, 1.5) * 2.0);
        
        tPos *= uScaleBase * expansionBoost;

        vec4 mvPosition = modelViewMatrix * vec4(tPos, 1.0);
        
        // Size attenuation based on distance
        gl_PointSize = ${CONFIG.PARTICLE_SIZE.toFixed(2)} * (300.0 / -mvPosition.z) * (0.8 + uHandInfluence * 2.5);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const particleFragmentShader = `
    uniform sampler2D map;
    varying vec3 vColor;
    varying float vDist;
    
    void main() {
        vec4 texColor = texture2D(map, gl_PointCoord);
        if (texColor.a < 0.1) discard;
        
        // Random brightness flicker simulation
        float alpha = texColor.a * 0.8;
        gl_FragColor = vec4(vColor, alpha);
    }
`;


export function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(CONFIG.PARTICLE_COUNT * 3);
    const colors = new Float32Array(CONFIG.PARTICLE_COUNT * 3);

    generateShapePositions('I', positions);
    generateShapeColors('I', colors);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('targetPosition', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('targetColor', new THREE.BufferAttribute(colors, 3));

    const sprite = createParticleTexture();

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uScaleBase: { value: 1.0 },
            uTurbulence: { value: 0.05 },
            uHandInfluence: { value: 0.0 },
            map: { value: sprite }
        },
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particlesMesh = new THREE.Points(geometry, material);

    // Copy initially
    targetPositions = new Float32Array(positions);
    targetColors = new Float32Array(colors);

    return particlesMesh;
}

export function updateParticlesShaderUniforms(time, isHandDetected, handInfluence) {
    if (!particlesMesh) return;

    const u = particlesMesh.material.uniforms;
    u.uTime.value = time;
    u.uHandInfluence.value = THREE.MathUtils.lerp(u.uHandInfluence.value, handInfluence, 0.2);

    if (isHandDetected) {
        u.uScaleBase.value = THREE.MathUtils.lerp(u.uScaleBase.value, 0.2 + handInfluence * 2.3, 0.1);
        u.uTurbulence.value = THREE.MathUtils.lerp(u.uTurbulence.value, 0.02 + handInfluence * 0.3, 0.1);
    } else {
        u.uScaleBase.value = THREE.MathUtils.lerp(u.uScaleBase.value, 1.0 + Math.sin(time * 1.5) * 0.05, 0.1);
        u.uTurbulence.value = THREE.MathUtils.lerp(u.uTurbulence.value, 0.05, 0.1);
    }
}

export function rotateParticles(camUp, camRight, camForward, rotationVelocity) {
    if (!particlesMesh) return;
    particlesMesh.rotateOnWorldAxis(camUp, rotationVelocity.y);
    particlesMesh.rotateOnWorldAxis(camRight, rotationVelocity.x);
    particlesMesh.rotateOnWorldAxis(camForward, rotationVelocity.z);
}

export function resetParticlesRotation(camera) {
    if (!particlesMesh || !camera) return;
    particlesMesh.setRotationFromEuler(new THREE.Euler(0, 0, 0));
    particlesMesh.lookAt(camera.position);
}


export function changeShape(shape, camera) {
    currentShape = shape;
    if (!particlesMesh) return;

    generateShapePositions(shape, targetPositions);
    generateShapeColors(shape, targetColors);

    particlesMesh.geometry.attributes.targetPosition.array.set(targetPositions);
    particlesMesh.geometry.attributes.targetColor.array.set(targetColors);

    particlesMesh.geometry.attributes.targetPosition.needsUpdate = true;
    particlesMesh.geometry.attributes.targetColor.needsUpdate = true;

    resetParticlesRotation(camera);
}

export function updateBaseColor(hex) {
    const color = new THREE.Color(hex);
    if (!particlesMesh) return;

    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        const brightness = 0.2 + Math.random() * 0.8;
        targetColors[i * 3] = color.r * brightness;
        targetColors[i * 3 + 1] = color.g * brightness;
        targetColors[i * 3 + 2] = color.b * brightness;
    }

    particlesMesh.geometry.attributes.targetColor.array.set(targetColors);
    particlesMesh.geometry.attributes.targetColor.needsUpdate = true;
}

function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
}

function generateShapePositions(type, array) {
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        let x, y, z;
        let textToRender = 'I';
        if (type === 'Love') textToRender = 'Love';
        else if (type === 'success') textToRender = 'Success';

        const pixels = getTextPixels(textToRender);
        const p = pixels[i % pixels.length];
        x = p.x + (Math.random() - 0.5) * 0.4;
        y = p.y + (Math.random() - 0.5) * 0.4;
        z = (Math.random() - 0.5) * 1.5;
        array[i * 3] = x;
        array[i * 3 + 1] = y;
        array[i * 3 + 2] = z;
    }
}

function generateShapeColors(type, array) {
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        const brightness = 0.2 + Math.random() * 0.8;
        array[i * 3] = 1.0 * brightness;
        array[i * 3 + 1] = 0.596 * brightness; // ~152/255 for orange
        array[i * 3 + 2] = 0.0 * brightness;
    }
}

const textCache = {};
function getTextPixels(text) {
    if (textCache[text]) return textCache[text];
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 160px "Outfit", sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const pixels = [];
    for (let y = 0; y < canvas.height; y += 3) {
        for (let x = 0; x < canvas.width; x += 3) {
            const i = (y * canvas.width + x) * 4;
            if (data[i] > 128) {
                pixels.push({ x: (x - canvas.width / 2) / 10, y: -(y - canvas.height / 2) / 10 });
            }
        }
    }
    if (pixels.length === 0) pixels.push({ x: 0, y: 0 });
    textCache[text] = pixels;
    return pixels;
}
