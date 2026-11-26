import { CANVAS_WIDTH, CANVAS_HEIGHT, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

export function render(ctx, world, screenState = SCREEN_PLAY, bestScore = 0) {
    ctx.save();
    
    // 1. Sky & Sun & Clouds
    drawSky(ctx, world);
    
    // 2. Mountains (Parallax)
    drawMountains(ctx, world);
    
    // 3. Ground / Sea / Islands / Runway
    drawTerrain(ctx, world);
    
    // 4. Target Rings
    drawRings(ctx, world);
    
    // 5. Aircraft (in chase view, centre screen) - drawn AFTER terrain and rings so it's always on top
    drawAircraft(ctx, world);
    
    // 6. HUD (Top)
    drawHUD(ctx, world);
    
    // 7. Instrument Panel (Bottom)
    drawInstruments(ctx, world);
    
    // 8. Overlays (Title / Game Over / Victory)
    if (screenState === SCREEN_TITLE) {
        drawTitleScreen(ctx, bestScore);
    } else if (screenState === SCREEN_OVER || world.plane.state === 'gameover' || world.plane.state === 'victory') {
        drawGameOverScreen(ctx, world, bestScore);
    }
    
    ctx.restore();
}

function drawSky(ctx, world) {
    // Brighter tropical daytime sky gradient: clear sky blue at top fading to pale warm near-white at horizon
    let gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT * 0.55);
    gradient.addColorStop(0, '#0ea5e9');
    gradient.addColorStop(0.6, '#38bdf8');
    gradient.addColorStop(1, '#fef9c3');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Sun in upper right with soft glow (pale yellow disc with larger translucent halo)
    let sunX = CANVAS_WIDTH * 0.80 - (world.plane.heading * 30) % (CANVAS_WIDTH * 0.2);
    let sunY = 130 - world.plane.y * 0.03;
    
    let haloGrad = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 120);
    haloGrad.addColorStop(0, 'rgba(254, 240, 138, 0.6)');
    haloGrad.addColorStop(0.5, 'rgba(253, 224, 71, 0.25)');
    haloGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 120, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 16, 0, Math.PI * 2);
    ctx.fill();
    
    // Soft rounded white blobs: cluster of 5 overlapping filled ellipses in translucent white (alpha ~0.85)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    let cloudOffset = (world.plane.z * 0.08) % (CANVAS_WIDTH * 2);
    for (let i = 0; i < 6; i++) {
        let cx = (i * 350 - cloudOffset + CANVAS_WIDTH * 2) % (CANVAS_WIDTH + 400) - 200;
        let cy = 80 + (i * 43) % 180;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 80, 30, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 45, cy - 8, 55, 25, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - 45, cy + 5, 50, 22, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 20, cy + 10, 60, 20, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - 25, cy - 10, 45, 22, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawMountains(ctx, world) {
    let horizonY = CANVAS_HEIGHT * 0.55;
    
    // Far ridge: pale hazy blue
    let farHeadingOffset = world.plane.heading * 90;
    let farPeaks = world.mountains.map(m => {
        let mx = (m.x - farHeadingOffset) % (CANVAS_WIDTH * 2.5);
        if (mx < -500) mx += CANVAS_WIDTH * 2.5;
        if (mx > CANVAS_WIDTH * 2) mx -= CANVAS_WIDTH * 2.5;
        return {
            x: mx,
            h: Math.min(130, m.height * 0.04),
            w: Math.min(260, m.width * 0.05)
        };
    }).sort((a, b) => a.x - b.x);

    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let p of farPeaks) {
        if (p.x + p.w / 2 < 0 || p.x - p.w / 2 > CANVAS_WIDTH) continue;
        ctx.lineTo(p.x - p.w / 2, horizonY);
        ctx.lineTo(p.x, horizonY - p.h);
        ctx.lineTo(p.x + p.w / 2, horizonY);
    }
    ctx.lineTo(CANVAS_WIDTH, horizonY);
    ctx.closePath();
    ctx.fill();

    // Near ridge: slightly deeper hazy blue-green
    let nearHeadingOffset = world.plane.heading * 180;
    let nearPeaks = world.mountains.map(m => {
        let mx = (m.x - nearHeadingOffset) % (CANVAS_WIDTH * 2.5);
        if (mx < -500) mx += CANVAS_WIDTH * 2.5;
        if (mx > CANVAS_WIDTH * 2) mx -= CANVAS_WIDTH * 2.5;
        return {
            x: mx,
            h: Math.min(130, m.height * 0.06),
            w: Math.min(260, m.width * 0.06)
        };
    }).sort((a, b) => a.x - b.x);

    ctx.fillStyle = '#99f6e4';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let p of nearPeaks) {
        if (p.x + p.w / 2 < 0 || p.x - p.w / 2 > CANVAS_WIDTH) continue;
        ctx.lineTo(p.x - p.w / 2, horizonY);
        ctx.lineTo(p.x, horizonY - p.h);
        ctx.lineTo(p.x + p.w / 2, horizonY);
    }
    ctx.lineTo(CANVAS_WIDTH, horizonY);
    ctx.closePath();
    ctx.fill();

    // Snow caps on the three tallest peaks of the near ridge
    let visibleTallest = nearPeaks
        .filter(p => p.x > -20 && p.x < CANVAS_WIDTH + 20)
        .sort((a, b) => b.h - a.h)
        .slice(0, 3);
    
    ctx.fillStyle = '#ffffff';
    for (let p of visibleTallest) {
        let capH = Math.min(14, p.h * 0.3);
        let capW = Math.min(36, p.w * 0.3);
        ctx.beginPath();
        ctx.moveTo(p.x, horizonY - p.h);
        ctx.lineTo(p.x - capW / 2, horizonY - p.h + capH);
        ctx.lineTo(p.x + capW / 2, horizonY - p.h + capH);
        ctx.closePath();
        ctx.fill();
    }
}

function drawTerrain(ctx, world) {
    let horizonY = CANVAS_HEIGHT * 0.55;
    
    // Sea
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, horizonY, CANVAS_WIDTH, CANVAS_HEIGHT - horizonY);
    
    // Islands projection
    let sortedIslands = [...world.islands].sort((a, b) => (b.z - world.plane.z) - (a.z - world.plane.z));
    
    for (let island of sortedIslands) {
        let dz = island.z - world.plane.z;
        if (dz < -200 || dz > 15000) continue;
        
        let scale = 800 / (dz + 800);
        let ix = CANVAS_WIDTH / 2 + (island.x - world.plane.x) * scale * 1.5;
        let iy = horizonY + (800 - world.plane.y * 0.5) * scale;
        
        let rx = island.rx * scale;
        let rz = island.rz * scale;
        if (rx < 2) continue;
        
        // Draw sand rim
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(ix, iy, rx + 8, rz + 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw island green body
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.ellipse(ix, iy, rx, rz, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // River if present
        if (island.hasRiver) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = Math.max(2, 6 * scale);
            ctx.beginPath();
            ctx.moveTo(ix - rx * 0.5, iy);
            ctx.quadraticCurveTo(ix, iy - rz * 0.3, ix + rx * 0.6, iy + rz * 0.4);
            ctx.stroke();
        }
        
        // Village / trees detail if close enough
        if (scale > 0.1) {
            ctx.fillStyle = '#991b1b';
            if (island.hasVillage) {
                ctx.fillRect(ix - 5, iy - 5, 10, 8);
                ctx.fillRect(ix + 8, iy + 3, 8, 6);
            }
        }
    }
    
    // Runway if active
    if (world.runway) {
        let rz = world.runway.z - world.plane.z;
        if (rz > -100 && rz < 12000) {
            let scale = 800 / (rz + 800);
            let rx = CANVAS_WIDTH / 2 + (world.runway.x - world.plane.x) * scale * 1.5;
            let ry = horizonY + (800 - world.plane.y * 0.5) * scale;
            let rw = world.runway.width * scale;
            let rh = world.runway.length * scale;
            
            ctx.fillStyle = '#334155';
            ctx.fillRect(rx - rw / 2, ry, rw, rh);
            
            // White dashes
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = Math.max(2, 4 * scale);
            ctx.setLineDash([15 * scale, 10 * scale]);
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx, ry + rh);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Runway edge lights
            ctx.fillStyle = '#fbbf24';
            for (let ly = ry; ly < ry + rh; ly += 40 * scale) {
                ctx.beginPath();
                ctx.arc(rx - rw / 2 - 4, ly, 3 * scale, 0, Math.PI * 2);
                ctx.arc(rx + rw / 2 + 4, ly, 3 * scale, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function drawRings(ctx, world) {
    let horizonY = CANVAS_HEIGHT * 0.55;
    
    for (let i = 0; i < world.rings.length; i++) {
        let ring = world.rings[i];
        let dz = ring.z - world.plane.z;
        if (dz < -50 || dz > 10000) continue;
        
        let scale = 800 / (dz + 800);
        let rx = CANVAS_WIDTH / 2 + (ring.x - world.plane.x) * scale * 1.5;
        let ry = horizonY + (ring.y - world.plane.y) * scale * 1.2;
        let radius = ring.radius * scale;
        
        if (radius < 2) continue;
        
        let isActive = (i === world.activeRingIndex);
        
        ctx.strokeStyle = ring.passed ? '#22c55e' : (isActive ? '#f59e0b' : 'rgba(245, 158, 11, 0.4)');
        ctx.lineWidth = isActive ? Math.max(5, 12 * scale) : Math.max(2, 6 * scale);
        
        if (isActive) {
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 25;
        }
        
        ctx.beginPath();
        ctx.arc(rx, ry, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Centre marker for active ring
        if (isActive) {
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(rx, ry, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawAircraft(ctx, world) {
    let cx = CANVAS_WIDTH / 2;
    let cy = CANVAS_HEIGHT * 0.65;
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(world.plane.bank);
    
    // Soft shadow ellipse on the ground below when plane is low
    let groundH = world.getTerrainHeight(world.plane.x, world.plane.z);
    let alt = world.plane.y - groundH;
    if (alt < 350) {
        ctx.save();
        let shadowScale = Math.max(0.25, 1 - alt / 350);
        ctx.scale(shadowScale, shadowScale * 0.35);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.arc(0, 280 / shadowScale, 75, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    // Aircraft made about 25% larger, clear silhouette (white fuselage, red wings, blue tail fin, spinning propeller disc)
    ctx.scale(1.25, 1.25);
    
    // Wings (Red)
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-85, 12);
    ctx.lineTo(-65, 22);
    ctx.lineTo(0, 10);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(85, 12);
    ctx.lineTo(65, 22);
    ctx.lineTo(0, 10);
    ctx.closePath();
    ctx.fill();
    
    // Fuselage body (White)
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(0, -55);
    ctx.bezierCurveTo(-18, -25, -18, 25, 0, 65);
    ctx.bezierCurveTo(18, 25, 18, -25, 0, -55);
    ctx.fill();
    
    // Red accent stripe on fuselage
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-12, 5, 24, 30);
    
    // Cockpit glass (Blue)
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(0, -12, 8, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Tail fin (Blue)
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(0, 45);
    ctx.lineTo(-28, 75);
    ctx.lineTo(0, 65);
    ctx.closePath();
    ctx.fill();
    
    // Spinning propeller disc
    if (world.plane.throttle > 0.1) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        let propW = 45 + Math.sin(Date.now() * 0.08) * 12;
        ctx.ellipse(0, -60, propW, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-propW, -60);
        ctx.lineTo(propW, -60);
        ctx.stroke();
    }
    
    ctx.restore();
}

function drawHUD(ctx, world) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.fillRect(16, 16, CANVAS_WIDTH - 32, 56);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, CANVAS_WIDTH - 32, 56);
    
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 16px system-ui, sans-serif';
    
    let alt = Math.round(world.plane.y);
    let speed = Math.round(world.plane.speed);
    let hdg = Math.round((world.plane.heading * 180 / Math.PI) % 360 + 360) % 360;
    let mins = Math.floor(world.plane.timeLeft / 60);
    let secs = Math.floor(world.plane.timeLeft % 60).toString().padStart(2, '0');
    
    let textY = 50;
    ctx.fillText(`ALT: ${alt} ft`, 36, textY);
    ctx.fillText(`SPD: ${speed} kt`, 170, textY);
    ctx.fillText(`HDG: ${hdg}°`, 305, textY);
    ctx.fillText(`TIME: ${mins}:${secs}`, 430, textY);
    ctx.fillText(`SCORE: ${world.plane.score}`, 590, textY);
    ctx.fillText(`LIVES: ${'❤️'.repeat(Math.max(0, world.plane.lives))}`, 770, textY);
    ctx.fillText(`RINGS: ${world.plane.ringsRemaining}`, 960, textY);
    ctx.fillText(`LEG: ${world.plane.leg}`, 1130, textY);
}

function drawInstruments(ctx, world) {
    let panelY = 704;
    
    ctx.fillStyle = 'rgba(11, 19, 41, 0.95)';
    ctx.fillRect(0, panelY, CANVAS_WIDTH, 96);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, panelY, CANVAS_WIDTH, 96);
    
    drawAttitudeIndicator(ctx, 180, 746, world.plane.bank, world.plane.y);
    drawDial(ctx, 500, 746, 'ALTIMETER', Math.round(world.plane.y), 'ft', 1200);
    drawDial(ctx, 800, 746, 'AIRSPEED', Math.round(world.plane.speed), 'kt', 300);
    drawCompass(ctx, 1100, 746, world.plane.heading);
}

function drawAttitudeIndicator(ctx, x, y, bank, alt) {
    ctx.save();
    ctx.translate(x, y);
    
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    ctx.save();
    ctx.rotate(-bank);
    let pitchShift = (alt % 100) * 0.15;
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(-40, -40, 80, 40 + pitchShift);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-40, pitchShift, 80, 40 - pitchShift);
    ctx.restore();
    
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.lineTo(-6, 0); ctx.lineTo(-3, 6);
    ctx.moveTo(16, 0); ctx.lineTo(6, 0); ctx.lineTo(3, 6);
    ctx.moveTo(0, -3); ctx.lineTo(0, 3);
    ctx.stroke();
    
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ATTITUDE', 0, 42);
    
    ctx.restore();
}

function drawDial(ctx, x, y, label, val, unit, maxVal) {
    ctx.save();
    ctx.translate(x, y);
    
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    let angle = -Math.PI * 0.75 + (Math.min(val, maxVal) / maxVal) * (Math.PI * 1.5);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 24, -Math.PI * 0.75, angle);
    ctx.stroke();
    
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${val}`, 0, 4);
    
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText(`${label} (${unit})`, 0, 42);
    
    ctx.restore();
}

function drawCompass(ctx, x, y, heading) {
    ctx.save();
    ctx.translate(x, y);
    
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    let deg = Math.round((heading * 180 / Math.PI) % 360 + 360) % 360;
    
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${deg}°`, 0, 4);
    
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('COMPASS', 0, 42);
    
    ctx.restore();
}

function drawTitleScreen(ctx, bestScore) {
    ctx.fillStyle = 'rgba(11, 19, 41, 0.90)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 58px system-ui, sans-serif';
    ctx.fillText('LANGIT NUSANTARA', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.28);
    
    ctx.fillStyle = '#fef3c7';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('Nusantara Skies — Flight Adventure across the Archipelago', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.38);
    
    ctx.fillStyle = '#93c5fd';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('Controls: W/S or Up/Down throttle, A/D or Left/Right steer, Shift/Ctrl climb/descend, P pause, M mute', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.48);
    
    ctx.fillStyle = '#34d399';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('Steer through golden rings and conquer the Indonesian skies!', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.55);
    
    if (bestScore > 0) {
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.fillText(`Best Score: ${bestScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.63);
    }
    
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('Press Enter or click to fly', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.74);
}

function drawGameOverScreen(ctx, world, bestScore) {
    ctx.fillStyle = 'rgba(11, 19, 41, 0.92)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.textAlign = 'center';
    let isVictory = world.plane.state === 'victory';
    
    ctx.fillStyle = isVictory ? '#22c55e' : '#ef4444';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillText(isVictory ? 'VICTORY! NUSANTARA CONQUERED' : 'MISSION ENDED', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.32);
    
    ctx.fillStyle = '#fef3c7';
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText(`Final Score: ${world.plane.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.45);
    ctx.fillText(`Rings Passed: ${world.plane.ringsPassed}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.52);
    
    ctx.fillStyle = '#22c55e';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText(`Best Score: ${Math.max(world.plane.score, bestScore)}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.61);
    
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('Press ENTER to Fly Again', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.73);
}
