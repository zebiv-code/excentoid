// Excentoid Explorer — main entry point
// Based on "Excentoidok – Egy új geometriai alakzatcsalád" by Zsák Zoltán

import { createRenderer } from './renderer.js';
import { SHAPE_NAMES } from './geometry.js';

const canvas = document.getElementById('gl-canvas');
const renderer = createRenderer(canvas);
if (!renderer) throw new Error('WebGL 2 not available');

// ─── State ──────────────────────────────────────────────────────────────────

const state = {
    n: 2, psi: 1.5, anti: false,
    displayMode: 'solid', showCircles: true, autoRotate: true, resolution: 64,
    rotX: -0.4, rotY: 0.6, distance: 5.0, panX: 0, panY: 0,
    dragging: false, panning: false, lastMX: 0, lastMY: 0,
};

// ─── Math Info Panel ────────────────────────────────────────────────────────

function updateMathPanel() {
    const { n, psi, anti } = state;
    const name = SHAPE_NAMES[n] || `${n}-oid`;
    const prefix = anti ? 'Anti-' : '';
    const r = (psi * 1).toFixed(3);
    const s = anti ? -1 : 1;
    const sp = s > 0 ? '+' : '-';
    const sn = s > 0 ? '-' : '+';

    let circleEqs = '';
    if (n <= 3) {
        const eqs = [
            `(x${sp}1)² + (y${sn}1)² = ${r}², z=0`,
            `(x${sn}1)² + (z${sp}1)² = ${r}², y=0`,
            `(y${sp}1)² + (z${sn}1)² = ${r}², x=0`,
        ];
        for (let k = 0; k < n; k++) circleEqs += `<div class="equation">C${k+1}: ${eqs[k]}</div>`;
    } else {
        circleEqs = `<div class="equation">${n} circles, normals rotated by π/${n} around (1,1,1)</div>`;
    }

    document.getElementById('math-content').innerHTML = `
        <div class="label">${prefix}${name} — ${n} generator circles</div>
        ${circleEqs}
        <div class="param">ψ = r/e = <span>${psi.toFixed(3)}</span> &nbsp; r = <span>${r}</span> &nbsp; e = <span>1</span></div>
        <div class="param">Surface: ruled (linear interpolation between circles)</div>
    `;
}

function rebuild() {
    renderer.rebuildGeometry(state);
    updateMathPanel();
}

// ─── Input Handling ─────────────────────────────────────────────────────────

canvas.addEventListener('mousedown', (e) => {
    state.dragging = true;
    state.panning = e.button !== 0 || e.shiftKey;
    state.lastMX = e.clientX;
    state.lastMY = e.clientY;
});
window.addEventListener('mouseup', () => { state.dragging = false; state.panning = false; });
canvas.addEventListener('mousemove', (e) => {
    if (!state.dragging) return;
    const dx = e.clientX - state.lastMX, dy = e.clientY - state.lastMY;
    state.lastMX = e.clientX; state.lastMY = e.clientY;
    if (state.panning) {
        state.panX -= dx * 0.005 * state.distance;
        state.panY += dy * 0.005 * state.distance;
    } else {
        state.rotY += dx * 0.005;
        state.rotX = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, state.rotX - dy*0.005));
    }
});
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.distance = Math.max(1, Math.min(20, state.distance * (1 + e.deltaY * 0.001)));
}, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Touch
let lastTouchDist = 0;
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
        state.dragging = true; state.panning = false;
        state.lastMX = e.touches[0].clientX; state.lastMY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        const dx = e.touches[1].clientX-e.touches[0].clientX, dy = e.touches[1].clientY-e.touches[0].clientY;
        lastTouchDist = Math.sqrt(dx*dx+dy*dy);
    }
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && state.dragging) {
        const dx = e.touches[0].clientX-state.lastMX, dy = e.touches[0].clientY-state.lastMY;
        state.lastMX = e.touches[0].clientX; state.lastMY = e.touches[0].clientY;
        state.rotY += dx*0.005;
        state.rotX = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, state.rotX-dy*0.005));
    } else if (e.touches.length === 2) {
        const dx = e.touches[1].clientX-e.touches[0].clientX, dy = e.touches[1].clientY-e.touches[0].clientY;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (lastTouchDist > 0) state.distance = Math.max(1, Math.min(20, state.distance*lastTouchDist/dist));
        lastTouchDist = dist;
    }
}, { passive: false });
canvas.addEventListener('touchend', () => { state.dragging = false; lastTouchDist = 0; });

// ─── UI Controls ────────────────────────────────────────────────────────────

document.querySelectorAll('.shape-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.n = parseInt(btn.dataset.n);
        rebuild();
    });
});

document.querySelectorAll('.display-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.display-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.displayMode = btn.dataset.mode;
    });
});

const psiSlider = document.getElementById('psi-slider');
const psiValue = document.getElementById('psi-value');
psiSlider.addEventListener('input', () => {
    state.psi = parseFloat(psiSlider.value);
    const sqrt10 = Math.sqrt(10);
    psiValue.textContent = Math.abs(state.psi - sqrt10) < 0.02
        ? (state.psi = sqrt10, `√10 ≈ ${sqrt10.toFixed(3)}`)
        : state.psi.toFixed(3);
    rebuild();
});

const resSlider = document.getElementById('resolution-slider');
const resValue = document.getElementById('resolution-value');
resSlider.addEventListener('input', () => {
    state.resolution = parseInt(resSlider.value);
    resValue.textContent = state.resolution;
    rebuild();
});

document.getElementById('anti-toggle').addEventListener('change', (e) => { state.anti = e.target.checked; rebuild(); });
document.getElementById('circles-toggle').addEventListener('change', (e) => { state.showCircles = e.target.checked; });
document.getElementById('rotate-toggle').addEventListener('change', (e) => { state.autoRotate = e.target.checked; });

// ─── Init ───────────────────────────────────────────────────────────────────

rebuild();
function animate() { renderer.render(state); requestAnimationFrame(animate); }
requestAnimationFrame(animate);
