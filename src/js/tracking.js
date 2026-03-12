import { CONFIG } from './config.js';
import { updateStatus } from './ui.js';
import * as THREE from 'three';

export let video, hands;
export let isHandDetected = false;
export let handInfluence = 0;
export let rotationVelocity = { x: 0, y: 0, z: 0 };

let currentStableMode = 'scale';
let modeFrameCounter = 0;
let isTrackingRotation = false;
let isTrackingRoll = false;
let smoothedFingerPos = { x: 0, y: 0 };
let previousFingerPos = { x: 0, y: 0 };
let smoothedIndexTip = { x: 0, y: 0 };
let smoothedMiddleTip = { x: 0, y: 0 };
let previousRollAngle = 0;
let lastTimeHandDetected = 0;
let previousPalmPos = { x: 0, y: 0 };
let lastSlapTime = 0;

// Callback when a "slap" gesture is detected to change shape
let onSlapGesture = null;
let onGestureStableModeChange = null;

export function setSlapCallback(callback) {
    onSlapGesture = callback;
}

export function setStableModeCallback(callback) {
    onGestureStableModeChange = callback;
}

export async function initCamera() {
    try {
        video = document.getElementById('video');
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: CONFIG.VIDEO_WIDTH }, height: { ideal: CONFIG.VIDEO_HEIGHT } }
        });
        video.srcObject = stream;
        video.width = CONFIG.VIDEO_WIDTH;
        video.height = CONFIG.VIDEO_HEIGHT;
        await new Promise(r => { video.onloadedmetadata = () => { video.play(); r(); }; });

        // Start global camera loop that passes frames to active trackers
        const globalCamera = new window.Camera(video, {
            onFrame: async () => {
                if (hands) {
                    await hands.send({ image: video });
                }
            },
            width: CONFIG.VIDEO_WIDTH,
            height: CONFIG.VIDEO_HEIGHT
        });
        await globalCamera.start();

        return true;
    } catch (e) {
        console.error('Camera error:', e);
        updateStatus('CAMERA_ERROR', 'red');
        return false;
    }
}

export async function initHandDetector() {
    try {
        hands = new window.Hands({
            locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
        });
        hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        hands.onResults(onHandResults);
    } catch (e) {
        console.error('Hand detector error:', e);
    }
}

export async function startHandTracking() {
    // The camera loop is now global. We just need to make sure hands exist.
    if (!hands || !video) {
        setTimeout(startHandTracking, 100);
        return;
    }
    // The globalCamera onFrame callback in initCamera already handles hands.send().
}

function onHandResults(results) {

    const now = Date.now();

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        if (now - lastTimeHandDetected > 800) {
            isHandDetected = false;
            updateStatus('HAND_LOST', 'yellow');
            handInfluence = THREE.MathUtils.lerp(handInfluence, 0.5, 0.02);
            updateActiveGestureMode('');
        }
        return;
    }

    isHandDetected = true;
    lastTimeHandDetected = now;
    updateStatus('HAND_TRACKING', 'cyan');

    const landmarks = results.multiHandLandmarks[0];
    const getDist = (i, j) => {
        const dx = landmarks[i].x - landmarks[j].x;
        const dy = landmarks[i].y - landmarks[j].y;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const isIndexOpen = getDist(8, 0) > getDist(6, 0) * 1.1;
    const isMiddleOpen = getDist(12, 0) > getDist(10, 0) * 1.1;
    const isRingOpen = getDist(16, 0) > getDist(14, 0) * 1.1;
    const isPinkyOpen = getDist(20, 0) > getDist(18, 0) * 1.1;

    const openCount = [isIndexOpen, isMiddleOpen, isRingOpen, isPinkyOpen].filter(Boolean).length;
    const isPinch = getDist(8, 4) < 0.08 && !isMiddleOpen && !isRingOpen && !isPinkyOpen;
    const isFist = openCount === 0;
    const isThreeFingers = openCount === 3 && isIndexOpen && isMiddleOpen && isRingOpen;
    const openPalm = openCount === 4;

    let detectedMode = 'none';

    // Assign higher priority to motions to avoid accidental shape triggers while moving fingers
    if (isPinch) {
        detectedMode = 'rotate';
    } else if (isFist) {
        detectedMode = 'roll';
    } else if (isThreeFingers) {
        detectedMode = 'scale';
    } else if (openCount === 1 && isIndexOpen) {
        detectedMode = 'shape_i';
    } else if (openCount === 2 && isIndexOpen && isMiddleOpen) {
        detectedMode = 'shape_love';
    } else if (openCount >= 3 && isPinkyOpen) {
        detectedMode = 'shape_success';
    }

    if (detectedMode !== currentStableMode) {
        modeFrameCounter++;
        if (modeFrameCounter > 4) {
            currentStableMode = detectedMode;
            modeFrameCounter = 0;
            isTrackingRotation = false;
            isTrackingRoll = false;
            if (onGestureStableModeChange) onGestureStableModeChange(currentStableMode);
        }
    } else {
        modeFrameCounter = 0;
    }

    updateActiveGestureMode(currentStableMode);

    if (currentStableMode === 'roll') {
        const idxKnuckle = landmarks[5]; // Index MCP
        const pinkyKnuckle = landmarks[17]; // Pinky MCP

        if (!isTrackingRoll) {
            smoothedIndexTip = { x: idxKnuckle.x, y: idxKnuckle.y };
            smoothedMiddleTip = { x: pinkyKnuckle.x, y: pinkyKnuckle.y };
            previousRollAngle = Math.atan2(idxKnuckle.y - pinkyKnuckle.y, idxKnuckle.x - pinkyKnuckle.x);
            isTrackingRoll = true;
        } else {
            smoothedIndexTip.x = THREE.MathUtils.lerp(smoothedIndexTip.x, idxKnuckle.x, 0.2);
            smoothedIndexTip.y = THREE.MathUtils.lerp(smoothedIndexTip.y, idxKnuckle.y, 0.2);
            smoothedMiddleTip.x = THREE.MathUtils.lerp(smoothedMiddleTip.x, pinkyKnuckle.x, 0.2);
            smoothedMiddleTip.y = THREE.MathUtils.lerp(smoothedMiddleTip.y, pinkyKnuckle.y, 0.2);
        }
        const currentAngle = Math.atan2(smoothedIndexTip.y - smoothedMiddleTip.y, smoothedIndexTip.x - smoothedMiddleTip.x);
        let deltaAngle = currentAngle - previousRollAngle;
        if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
        if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
        rotationVelocity.z = THREE.MathUtils.lerp(rotationVelocity.z, -deltaAngle * 1.5, 0.3);
        previousRollAngle = currentAngle;
    } else if (currentStableMode === 'rotate') {
        const rawFingerX = landmarks[8].x;
        const rawFingerY = landmarks[8].y;
        if (!isTrackingRotation) {
            smoothedFingerPos = { x: rawFingerX, y: rawFingerY };
            previousFingerPos = { x: rawFingerX, y: rawFingerY };
            isTrackingRotation = true;
        }
        smoothedFingerPos.x = THREE.MathUtils.lerp(smoothedFingerPos.x, rawFingerX, 0.2);
        smoothedFingerPos.y = THREE.MathUtils.lerp(smoothedFingerPos.y, rawFingerY, 0.2);
        const deltaX = smoothedFingerPos.x - previousFingerPos.x;
        const deltaY = smoothedFingerPos.y - previousFingerPos.y;
        if (Math.abs(deltaX) > 0.005 || Math.abs(deltaY) > 0.005) {
            const sensitivity = 3.5;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                rotationVelocity.y -= deltaX * sensitivity;
            } else {
                rotationVelocity.x += deltaY * sensitivity;
            }
        }
        previousFingerPos = { x: smoothedFingerPos.x, y: smoothedFingerPos.y };
    } else {
        isTrackingRotation = false;
        isTrackingRoll = false;
        const tips = [4, 8, 12, 16, 20];
        let totalDist = 0;
        tips.forEach(i => totalDist += getDist(i, 0));
        const avgDist = totalDist / 5;
        handInfluence = THREE.MathUtils.lerp(handInfluence, Math.max(0, Math.min(1, (avgDist - 0.08) / 0.32)), 0.2);
    }

    // Slap detection
    const palm = {
        x: (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5,
        y: (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5
    };
    const dxPalm = palm.x - previousPalmPos.x;
    const dyPalm = palm.y - previousPalmPos.y;
    const speed = Math.sqrt(dxPalm * dxPalm + dyPalm * dyPalm);
    const horizontalDominant = Math.abs(dxPalm) > Math.abs(dyPalm) * 1.6;
    const cooldownOk = (now - lastSlapTime) > 700;

    if (openPalm && horizontalDominant && speed > 0.08 && cooldownOk) {
        lastSlapTime = now;
        if (onSlapGesture) onSlapGesture();
    }
    previousPalmPos = palm;
}

function updateActiveGestureMode(mode) {
    if (!document.getElementById(`mode-${mode}`)) return;
    ['mode-scale', 'mode-rotate', 'mode-roll', 'mode-shape_i', 'mode-shape_love', 'mode-shape_success'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });

    if (mode) {
        const activeEl = document.getElementById(`mode-${mode}`);
        if (activeEl) activeEl.classList.add('active');
    }
}
