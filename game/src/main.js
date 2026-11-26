import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config.js';
import { World } from './world.js';
import { render, SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const urlParams = new URLSearchParams(window.location.search);
const seedParam = urlParams.get('seed');
const seed = seedParam ? parseInt(seedParam, 10) : 42;

let world = new World(seed);
let screenState = SCREEN_TITLE;
let bestScore = 0;
let muted = false;
let isPaused = false;

try {
    const saved = localStorage.getItem('langit_nusantara_best');
    if (saved) bestScore = parseInt(saved, 10) || 0;
} catch (e) {
    // Ignore localStorage errors in restricted environments
}

const shotParam = urlParams.get('shot');
let isFrozenShot = false;

if (shotParam) {
    const shotResult = stageShot(shotParam, world);
    if (shotResult) {
        screenState = shotResult.screen;
        if (shotResult.best > bestScore) {
            bestScore = shotResult.best;
        }
    }
    isFrozenShot = true;
}

// Input state
const input = {
    left: false,
    right: false,
    climb: false,
    descend: false,
    throttleUp: false,
    throttleDown: false
};

// Web Audio setup
let audioCtx = null;
let engineOsc = null;
let engineGain = null;

function initAudio() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Engine hum
        engineOsc = audioCtx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.setValueAtTime(80, audioCtx.currentTime);
        
        engineGain = audioCtx.createGain();
        engineGain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        
        engineOsc.connect(engineGain);
        engineGain.connect(audioCtx.destination);
        engineOsc.start();
    } catch (e) {
        // Audio not allowed or supported
    }
}

function playChime() {
    if (muted || !audioCtx) return;
    try {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2); // A5
        
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {}
}

function playThud() {
    if (muted || !audioCtx) return;
    try {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.25);
        
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {}
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        input.climb = true;
        input.throttleUp = true;
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        input.descend = true;
        input.throttleDown = true;
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.climb = true;
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') input.descend = true;

    if (e.code === 'KeyP') {
        isPaused = !isPaused;
    }
    if (e.code === 'KeyM') {
        muted = !muted;
        if (engineGain && audioCtx) {
            engineGain.gain.setValueAtTime(muted ? 0 : 0.05, audioCtx.currentTime);
        }
    }
    if (e.code === 'KeyR') {
        if (!isFrozenShot) {
            world.reset(seed);
            screenState = SCREEN_PLAY;
        }
    }
    if (e.code === 'Enter') {
        if (screenState === SCREEN_TITLE || screenState === SCREEN_OVER || world.plane.state === 'gameover' || world.plane.state === 'victory') {
            world.reset(seed);
            screenState = SCREEN_PLAY;
            isFrozenShot = false;
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        input.climb = false;
        input.throttleUp = false;
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        input.descend = false;
        input.throttleDown = false;
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.climb = false;
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') input.descend = false;
});

canvas.addEventListener('click', () => {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    if (screenState === SCREEN_TITLE || screenState === SCREEN_OVER || world.plane.state === 'gameover' || world.plane.state === 'victory') {
        world.reset(seed);
        screenState = SCREEN_PLAY;
        isFrozenShot = false;
    }
});

let isDragging = false;
let lastMouseX = 0;

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    input.left = false;
    input.right = false;
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    let dx = e.clientX - lastMouseX;
    lastMouseX = e.clientX;
    if (dx < -5) {
        input.left = true;
        input.right = false;
    } else if (dx > 5) {
        input.right = true;
        input.left = false;
    } else {
        input.left = false;
        input.right = false;
    }
});

// Fixed timestep game loop (1/60s)
const dt = 1 / 60;
let accumulator = 0;
let lastTime = performance.now();

function gameLoop(timestamp) {
    let frameTime = (timestamp - lastTime) / 1000;
    if (frameTime > 0.25) frameTime = 0.25;
    lastTime = timestamp;
    
    if (!isFrozenShot) {
        accumulator += frameTime;
        
        while (accumulator >= dt) {
            if (screenState === SCREEN_PLAY && !isPaused && world.plane.state === 'playing') {
                world.step(dt, input);
                
                if (world.eventRingPassed || world.eventLegComplete) {
                    playChime();
                }
                if (world.eventCrash || world.eventRunOver) {
                    playThud();
                }
                
                if (world.plane.score > bestScore) {
                    bestScore = world.plane.score;
                    try {
                        localStorage.setItem('langit_nusantara_best', bestScore.toString());
                    } catch (e) {}
                }
                
                if (world.plane.state === 'gameover' || world.plane.state === 'victory') {
                    screenState = SCREEN_OVER;
                }
            }
            accumulator -= dt;
        }
    }
    
    // Engine sound modulation following throttle
    if (engineOsc && engineGain && audioCtx && !muted && !isFrozenShot) {
        try {
            let targetFreq = 60 + world.plane.throttle * 80;
            engineOsc.frequency.setValueAtTime(targetFreq, audioCtx.currentTime);
        } catch (e) {}
    }
    
    // Render
    render(ctx, world, screenState, bestScore);
    
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
