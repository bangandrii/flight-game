import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER } from './render.js';

/**
 * Stages a deterministic scene for screenshots by running the world simulation 
 * with a simple autopilot.
 * 
 * @param {string} name - The name of the scene ('start', 'play', 'ring', 'end')
 * @param {World} world - The world instance to manipulate
 * @returns {object} - { screen, best }
 */
export function stageShot(name, world) {
    const dt = 1/60;
    const seed = 42;
    world.reset(seed);

    if (name === 'play') {
        runAutopilot(world, 26, true);
        return { screen: SCREEN_PLAY, best: world.plane.score };
    } else if (name === 'ring') {
        let lastDist = Infinity;
        for (let t = 0; t < 60; t += dt) {
            const ring = world.rings[world.activeRingIndex];
            if (!ring) break;
            const dist = ring.z - world.plane.z;
            if (dist < 120 && dist < lastDist && dist > 0) {
                break;
            }
            lastDist = dist;
            const input = getAutopilotInput(world, true);
            world.step(dt, input);
            if (world.plane.state !== 'playing') break;
        }
        return { screen: SCREEN_PLAY, best: world.plane.score };
    } else if (name === 'end') {
        // Run for up to 600 seconds or until game over
        runAutopilot(world, 600, false);
        if (world.plane.state === 'playing') {
            world.plane.state = 'gameover';
        }
        return { screen: SCREEN_OVER, best: world.plane.score };
    } else {
        // "start" or default
        for (let t = 0; t < 5; t += dt) {
            world.step(dt, {
                throttleUp: false,
                throttleDown: false,
                left: false,
                right: false,
                climb: false,
                descend: false
            });
        }
        return { screen: SCREEN_TITLE, best: 0 };
    }
}

function runAutopilot(world, duration, careful) {
    const dt = 1/60;
    for (let t = 0; t < duration; t += dt) {
        const input = getAutopilotInput(world, careful);
        world.step(dt, input);
        if (world.plane.state !== 'playing') break;
    }
}

function getAutopilotInput(world, careful) {
    const plane = world.plane;
    const input = {
        throttleUp: true,
        throttleDown: false,
        left: false,
        right: false,
        climb: false,
        descend: false
    };

    const ring = world.rings[world.activeRingIndex];
    if (ring) {
        if (ring.x < plane.x - 10) {
            input.left = true;
        } else if (ring.x > plane.x + 10) {
            input.right = true;
        }
    }

    if (careful) {
        // Climb when terrain ahead is close below the plane
        // Look 150 units ahead (approx 0.75s at base speed)
        const terrainAhead = world.getTerrainHeight(plane.x, plane.z + 150);
        if (terrainAhead > plane.y - 60) {
            input.climb = true;
        }
    }

    return input;
}
