import * as THREE from 'three';
import { CONFIG, SHAPES_ORDER } from './config.js';
import { initScene } from './scene.js';
import { hideLoader, toggleFullScreen, updateActiveShapeButton, updateModeUI } from './ui.js';
import { createParticles, updateParticlesShaderUniforms, rotateParticles, changeShape, updateBaseColor } from './particles.js';
import {
    initCamera,
    initHandDetector,
    startHandTracking,
    isHandDetected,
    handInfluence,
    rotationVelocity,
    setSlapCallback
} from './tracking.js';

let scene, camera, renderer, composer, controls, clock;
let particlesMesh;
let currentShape = 'sphere';
let stats; // For FPS testing via CDN payload
let isCameraVisible = true;

async function init() {
    const sceneSetup = initScene();
    scene = sceneSetup.scene;
    camera = sceneSetup.camera;
    renderer = sceneSetup.renderer;
    composer = sceneSetup.composer;
    controls = sceneSetup.controls;
    clock = sceneSetup.clock;

    // Optional Stats for testing natively via CDN
    stats = new window.Stats();
    stats.showPanel(0);
    stats.dom.style.cssText = 'position:fixed;top:0;right:0;cursor:pointer;opacity:0.6;z-index:10000';
    document.body.appendChild(stats.dom);

    // Load async services
    await initCamera();
    await initHandDetector();

    // Start initial mode
    particlesMesh = createParticles();
    scene.add(particlesMesh);

    setupEventListeners();

    hideLoader();

    // Show Onboarding natively in simple HTTP server
    const onboarding = document.getElementById('onboarding-overlay');
    if (onboarding) onboarding.classList.remove('hidden');

    const videoEl = document.getElementById('video');
    if (videoEl) {
        videoEl.className = 'video-pip';
        videoEl.style.display = 'block';
    }

    // Wait for user to click start
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            onboarding.style.opacity = '0';
            setTimeout(() => onboarding.style.display = 'none', 500);
            startHandTracking();
            animate();
        });
    } else {
        startHandTracking();
        animate();
    }
}

function setupEventListeners() {
    // Slap gesture next shape
    setSlapCallback(() => {
        const idx = SHAPES_ORDER.indexOf(currentShape);
        const next = SHAPES_ORDER[(idx + 1) % SHAPES_ORDER.length];
        currentShape = next;
        changeShape(currentShape, camera);
        updateActiveShapeButton(currentShape);
    });

    // Button Listeners
    document.querySelectorAll('[data-shape]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentShape = e.target.dataset.shape;
            changeShape(currentShape, camera);
            updateActiveShapeButton(currentShape);
        });
    });

    document.getElementById('color-picker').addEventListener('input', (e) => {
        updateBaseColor(e.target.value);
    });

    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullScreen);

    document.getElementById('mode-switch-btn').addEventListener('click', () => {
        isCameraVisible = !isCameraVisible;
        const videoEl = document.getElementById('video');
        if (videoEl) {
            videoEl.style.display = isCameraVisible ? 'block' : 'none';
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    if (stats) stats.begin();
    const time = clock.getElapsedTime();

    if (particlesMesh && particlesMesh.visible) {
        updateParticlesShaderUniforms(time, isHandDetected, handInfluence);

        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();

        rotateParticles(camUp, camRight, camForward, rotationVelocity);

        // Decay rotation
        rotationVelocity.x = THREE.MathUtils.clamp(rotationVelocity.x, -0.06, 0.06) * 0.92;
        rotationVelocity.y = THREE.MathUtils.clamp(rotationVelocity.y, -0.06, 0.06) * 0.92;
        rotationVelocity.z = THREE.MathUtils.clamp(rotationVelocity.z, -0.035, 0.035) * 0.96;

        controls.autoRotate = !isHandDetected;
        controls.autoRotateSpeed = isHandDetected ? 0 : 1.0;
        controls.update();
    }

    composer.render();
    if (stats) stats.end();
}

// Start
init();
