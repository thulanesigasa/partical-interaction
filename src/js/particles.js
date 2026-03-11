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

    generateShapePositions('sphere', positions);
    generateShapeColors('sphere', colors);

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
    if (!particlesMesh || currentShape === 'saturn') return;

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
        if (type === 'sphere') {
            const r = 10 + Math.random() * 2;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            x = r * Math.sin(phi) * Math.cos(theta);
            y = r * Math.sin(phi) * Math.sin(theta);
            z = r * Math.cos(phi);
            if (i < CONFIG.PARTICLE_COUNT * 0.2) { x *= 0.3; y *= 0.3; z *= 0.3; }
        } else if (type === 'heart') {
            const t = Math.PI - 2 * Math.PI * Math.random();
            const u = 2 * Math.PI * Math.random();
            x = 16 * Math.pow(Math.sin(t), 3);
            y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            z = 6 * Math.cos(t) * Math.sin(u) * Math.sin(t);
            const scale = 0.6;
            x *= scale; y *= scale; z *= scale;
        } else if (type === 'saturn') {
            if (i < CONFIG.PARTICLE_COUNT * CONFIG.SATURN_BODY_RATIO) {
                const r = 5.5;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                x = r * Math.sin(phi) * Math.cos(theta);
                y = r * 0.9 * Math.sin(phi) * Math.sin(theta);
                z = r * Math.cos(phi);
            } else {
                const angle = Math.random() * Math.PI * 2;
                const r = 7 + Math.random() * 10;
                x = r * Math.cos(angle);
                y = (Math.random() - 0.5) * 0.3;
                z = r * Math.sin(angle);
            }
        } else if (type === 'lotus') {
            const u = Math.random() * Math.PI * 2;
            const v = Math.random();
            const petals = 7;
            const rBase = 8 * (0.5 + 0.5 * Math.pow(Math.sin(petals * u * 0.5), 2)) * v;
            x = rBase * Math.cos(u);
            z = rBase * Math.sin(u);
            y = 4 * Math.pow(v, 2) - 2;
        } else if (type === 'galaxy') {
            const arms = 3;
            const spin = i % arms;
            const angleOffset = (spin / arms) * Math.PI * 2;
            const dist = Math.pow(Math.random(), 0.5);
            const r = dist * 20;
            const angle = dist * 10 + angleOffset;
            x = r * Math.cos(angle);
            z = r * Math.sin(angle);
            y = (Math.random() - 0.5) * (15 - r) * 0.2;
        } else if (type === 'jellyfish') {
            // 伞状身体部分 (25%的粒子)
            if (i < CONFIG.PARTICLE_COUNT * 0.25) {
                const u = Math.random() * Math.PI * 2;
                const v = Math.random();
                const r = 5 * Math.sqrt(v);
                x = r * Math.cos(u);
                z = r * Math.sin(u);
                // 扁平钟形伞顶，顶部较平，边缘下垂
                const centerFlatness = Math.pow(1 - v, 2); // 中心更平坦
                const edgeCurve = Math.pow(v, 1.5); // 边缘弧度
                y = 6 + centerFlatness * 2 - edgeCurve * 5.5;
            } else {
                // 触手部分 (75%的粒子) - 16条触手，密集向下垂落
                const tentacleCount = 16;
                const particlesPerTentacle = (CONFIG.PARTICLE_COUNT * 0.75) / tentacleCount;
                const tentacleIndex = Math.floor((i - CONFIG.PARTICLE_COUNT * 0.25) / particlesPerTentacle);
                const posInTentacle = ((i - CONFIG.PARTICLE_COUNT * 0.25) % particlesPerTentacle) / particlesPerTentacle;

                // 均匀分布在圆周上，稍有变化
                const baseAngle = (tentacleIndex / tentacleCount) * Math.PI * 2;
                const angleVariation = (Math.random() - 0.5) * 0.15;
                const angle = baseAngle + angleVariation;

                // 触手长度变化
                const tentacleLengthVariation = 0.8 + Math.random() * 0.4;
                const length = Math.pow(posInTentacle, 0.8) * tentacleLengthVariation;

                // 很小的起始半径，让触手紧密聚拢
                const radiusVariation = Math.random();
                const startRadius = 2.5 + radiusVariation * 1;

                // 微小的螺旋和弯曲效果
                const spiral = Math.sin(length * Math.PI * 2 + tentacleIndex * 1.5) * (0.2 + length * 0.3);
                const bendPhase = tentacleIndex * 0.5;
                const bend = Math.sin(length * Math.PI * 1.2 + bendPhase) * (0.4 + length * 0.4);

                // 触手几乎垂直向下，只略微向外
                const radiusExpansion = startRadius + length * 0.15 + Math.abs(bend) * 0.05;

                x = radiusExpansion * Math.cos(angle) + bend * Math.cos(angle + Math.PI / 4) + spiral * Math.cos(angle + Math.PI / 2);
                z = radiusExpansion * Math.sin(angle) + bend * Math.sin(angle + Math.PI / 4) + spiral * Math.sin(angle + Math.PI / 2);
                // 触手从伞体底部开始，主要向下延伸
                y = 2 - radiusVariation * 0.3 - length * 20 - Math.abs(bend) * 0.2;

                // 很小的随机扰动
                x += (Math.random() - 0.5) * 0.4 * length;
                z += (Math.random() - 0.5) * 0.4 * length;
            }
        } else if (type === 'torus') {
            const R = 10;
            const r = 2;
            const u = Math.random() * Math.PI * 2;
            const v = Math.random() * Math.PI * 2;
            x = (R + r * Math.cos(v)) * Math.cos(u);
            z = (R + r * Math.cos(v)) * Math.sin(u);
            y = r * Math.sin(v);
        } else if (type === 'tornado') {
            const h = Math.random();
            const baseY = 8 - h * 24;
            const rad = 0.5 + h * 8 + Math.random() * 0.3;
            const turns = 10;
            const theta = h * turns * Math.PI * 2 + Math.random() * 0.5;
            x = rad * Math.cos(theta);
            z = rad * Math.sin(theta);
            y = baseY;
        } else if (type === 'doublehelix') {
            const t = Math.random();
            const height = -12 + t * 24;
            const radius = 3 + Math.sin(t * Math.PI * 4) * 0.6;
            const phase = (i % 2 === 0) ? 0 : Math.PI;
            const angle = t * Math.PI * 10 + phase;
            x = radius * Math.cos(angle);
            z = radius * Math.sin(angle);
            y = height + (Math.random() - 0.5) * 0.4;
        } else if (type === 'cube') {
            const s = 12;
            const face = Math.floor(Math.random() * 6);
            const a = (Math.random() - 0.5) * 2 * s;
            const b = (Math.random() - 0.5) * 2 * s;
            if (face === 0) { x = s; y = a; z = b; }
            else if (face === 1) { x = -s; y = a; z = b; }
            else if (face === 2) { x = a; y = s; z = b; }
            else if (face === 3) { x = a; y = -s; z = b; }
            else if (face === 4) { x = a; y = b; z = s; }
            else { x = a; y = b; z = -s; }
        } else if (type === 'butterfly') {
            const t = Math.random() * Math.PI * 2;
            const r = Math.exp(Math.sin(t)) - 2 * Math.cos(4 * t) + Math.pow(Math.sin((2 * t - Math.PI) / 24), 5);
            const scale = 8;
            x = scale * r * Math.cos(t);
            y = scale * r * Math.sin(t) * 0.6;
            z = (Math.random() - 0.5) * 2;
        } else if (type === 'peachblossom') {
            const petals = 5;
            const coreRatio = 0.12;
            const petalRatio = 0.70;
            const coreCount = Math.floor(CONFIG.PARTICLE_COUNT * coreRatio);
            const petalCountAll = Math.floor(CONFIG.PARTICLE_COUNT * petalRatio);
            if (i < coreCount) {
                const r = 1.6 + Math.random() * 0.6;
                const a = Math.random() * Math.PI * 2;
                const b = Math.acos(2 * Math.random() - 1);
                x = r * Math.sin(b) * Math.cos(a);
                z = r * Math.sin(b) * Math.sin(a);
                y = (Math.random() - 0.5) * 1.2;
            } else if (i < coreCount + petalCountAll) {
                const perPetal = petalCountAll / petals;
                const petalIndex = Math.floor((i - coreCount) / perPetal);
                const angleCenter = (petalIndex / petals) * Math.PI * 2;
                const width = 0.65;
                const phi = (Math.random() - 0.5) * width;
                const t = Math.pow(Math.random(), 0.6);
                const inner = 3.0 + Math.random() * 0.6;
                const length = 7.5 + (petalIndex % 2) * 0.8 + Math.random() * 1.2;
                const lateralTaper = 1 - Math.pow(phi / (width * 0.5), 2);
                const r = inner + length * t * lateralTaper;
                x = r * Math.cos(angleCenter + phi);
                z = r * Math.sin(angleCenter + phi);
                const dome = Math.sin(t * Math.PI) * 0.9 - 0.45;
                y = dome + (Math.random() - 0.5) * 0.12;
                x += 0.25 * t * Math.cos(angleCenter);
                z += 0.25 * t * Math.sin(angleCenter);
            } else {
                const theta = Math.random() * Math.PI * 2;
                const r = 4.8 + Math.random() * 1.2;
                x = r * Math.cos(theta);
                z = r * Math.sin(theta);
                y = -0.8 + (Math.random() - 0.5) * 0.2;
            }
        }
        array[i * 3] = x;
        array[i * 3 + 1] = y;
        array[i * 3 + 2] = z;
    }
}

function generateShapeColors(type, array) {
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        const brightness = 0.2 + Math.random() * 0.8;
        if (type === 'saturn' && i < CONFIG.PARTICLE_COUNT * CONFIG.SATURN_BODY_RATIO) {
            array[i * 3] = 1.0 * brightness;
            array[i * 3 + 1] = 0.7 * brightness;
            array[i * 3 + 2] = 0.3 * brightness;
        } else {
            array[i * 3] = brightness;
            array[i * 3 + 1] = brightness;
            array[i * 3 + 2] = brightness;
        }
    }
}
