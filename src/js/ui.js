export function updateStatus(status, color) {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    if (!statusDot || !statusText) return;

    const colorMap = { red: 'bg-red-500', yellow: 'bg-yellow-500', cyan: 'bg-cyan-400', green: 'bg-green-500' };

    // Clear previous colors
    Object.values(colorMap).forEach(c => statusDot.classList.remove(c));

    statusDot.classList.add(colorMap[color] || 'bg-red-500');
    statusText.textContent = status.replace('_', ' ');
}

export function hideLoader() {
    const loader = document.getElementById('loader-overlay');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 700);
    }
}

export function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }
}

export function updateModeUI(mode) {
    if (mode === 'face') {
        document.getElementById('mode-title').textContent = 'Emotion Orb';
        document.getElementById('particle-controls').classList.add('hidden');
        document.getElementById('gesture-modes').classList.add('hidden');
    } else {
        document.getElementById('mode-title').textContent = 'Particle Flow';
        document.getElementById('particle-controls').classList.remove('hidden');
        document.getElementById('gesture-modes').classList.remove('hidden');
    }
}

export function updateActiveShapeButton(shape) {
    const buttons = document.querySelectorAll('[data-shape]');
    buttons.forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`[data-shape="${shape}"]`);
    if (btn) btn.classList.add('active');
}

export function updateActiveGestureMode(mode) {
    ['mode-scale', 'mode-rotate', 'mode-roll'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });

    const activeEl = document.getElementById(`mode-${mode}`);
    if (activeEl) activeEl.classList.add('active');
}
