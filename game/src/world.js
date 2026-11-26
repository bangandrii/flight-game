import { PHYSICS, GAME_RULES } from './config.js';

export const EVENT_RING_PASSED = 'ringPassed';
export const EVENT_LEG_COMPLETE = 'legComplete';
export const EVENT_CRASH = 'crash';
export const EVENT_RUN_OVER = 'runOver';

export function mulberry32(seed) {
    return function() {
        seed |= 0;
        seed = seed + 0x6d2b79f5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export class World {
    constructor(seed = 42) {
        this.reset(seed);
    }

    reset(seed = 42) {
        this.seed = seed;
        this.rng = mulberry32(seed);

        this.plane = {
            x: 0,
            y: 300,
            z: 0,
            speed: PHYSICS.BASE_SPEED,
            throttle: 1.0,
            heading: 0,
            bank: 0,
            lives: GAME_RULES.INITIAL_LIVES,
            score: 0,
            ringsPassed: 0,
            ringsRemaining: 10,
            elapsedTime: 0,
            timeLeft: GAME_RULES.RUN_TIMER_SECONDS,
            state: 'playing',
            leg: 1,
        };

        this.eventRingPassed = false;
        this.eventLegComplete = false;
        this.eventCrash = false;
        this.eventRunOver = false;

        this.generateArchipelago();
        this.generateRings();
    }

    generateArchipelago() {
        this.islands = [];
        let rng = mulberry32(this.seed + 1);
        for (let z = 200; z < 60000; z += 1200 + rng() * 800) {
            let x = (rng() - 0.5) * 3500;
            let rx = 300 + rng() * 600;
            let rz = 300 + rng() * 600;
            let height = 40 + rng() * 180;
            let hasVillage = rng() < 0.4;
            let hasRiver = rng() < 0.3 && (rx > 500 || rz > 500);
            
            this.islands.push({
                x, z, rx, rz, height, hasVillage, hasRiver,
                trees: Math.floor(5 + rng() * 15)
            });
        }

        this.mountains = [];
        for (let i = 0; i < 30; i++) {
            this.mountains.push({
                x: (i - 15) * 2000 + (rng() - 0.5) * 500,
                z: 40000 + i * 1500,
                height: 800 + rng() * 1200,
                width: 2500 + rng() * 2000
            });
        }
    }

    generateRings() {
        this.rings = [];
        let rng = mulberry32(this.seed + 2);
        let curZ = 400;
        let curX = 0;
        let curY = 300;

        for (let i = 0; i < 50; i++) {
            curZ += 600 + (this.plane.leg * 50) + rng() * 300;
            curX += (rng() - 0.5) * 600;
            curY = Math.max(150, Math.min(600, curY + (rng() - 0.5) * 200));
            let terrainH = this.getTerrainHeight(curX, curZ);
            curY = Math.max(curY, terrainH + 100);

            this.rings.push({
                x: curX,
                y: curY,
                z: curZ,
                radius: 80,
                passed: false
            });
        }

        this.activeRingIndex = 0;
        this.runway = null;
    }

    getTerrainHeight(x, z) {
        let maxH = 0;
        for (let island of this.islands) {
            let dx = (x - island.x) / island.rx;
            let dz = (z - island.z) / island.rz;
            let distSq = dx * dx + dz * dz;
            if (distSq < 1.0) {
                let factor = 1.0 - Math.sqrt(distSq);
                let h = island.height * Math.sin(factor * Math.PI * 0.5);
                if (h > maxH) maxH = h;
            }
        }
        return maxH;
    }

    step(dt, input) {
        this.eventRingPassed = false;
        this.eventLegComplete = false;
        this.eventCrash = false;
        this.eventRunOver = false;

        if (this.plane.state !== 'playing') {
            return;
        }

        this.plane.timeLeft -= dt;
        if (this.plane.timeLeft <= 0) {
            this.plane.timeLeft = 0;
            this.plane.state = 'gameover';
            this.eventRunOver = true;
            return;
        }
        this.plane.elapsedTime += dt;

        if (input.throttleUp) {
            this.plane.throttle = Math.min(PHYSICS.MAX_THROTTLE, this.plane.throttle + PHYSICS.THROTTLE_STEP * dt);
        } else if (input.throttleDown) {
            this.plane.throttle = Math.max(PHYSICS.MIN_THROTTLE, this.plane.throttle - PHYSICS.THROTTLE_STEP * dt);
        }

        let targetSpeed = this.plane.throttle * PHYSICS.BASE_SPEED;
        this.plane.speed += (targetSpeed - this.plane.speed) * 2.0 * dt;

        let targetBank = 0;
        if (input.left) {
            targetBank = -0.7;
            this.plane.heading -= PHYSICS.TURN_RATE * dt;
            this.plane.x -= 250 * dt;
        } else if (input.right) {
            targetBank = 0.7;
            this.plane.heading += PHYSICS.TURN_RATE * dt;
            this.plane.x += 250 * dt;
        }
        this.plane.bank += (targetBank - this.plane.bank) * 5.0 * dt;

        this.plane.x = Math.max(-PHYSICS.MAX_LATERAL, Math.min(PHYSICS.MAX_LATERAL, this.plane.x));

        if (input.climb) {
            this.plane.y += PHYSICS.CLIMB_RATE * dt;
        } else if (input.descend) {
            this.plane.y -= PHYSICS.CLIMB_RATE * dt;
        }

        if (this.plane.speed < PHYSICS.STALL_SPEED) {
            this.plane.y -= PHYSICS.GRAVITY_PULL * dt;
        }

        this.plane.y = Math.max(PHYSICS.MIN_ALTITUDE, Math.min(PHYSICS.MAX_ALTITUDE, this.plane.y));
        this.plane.z += this.plane.speed * dt;

        let groundH = this.getTerrainHeight(this.plane.x, this.plane.z);
        if (this.plane.y < groundH + PHYSICS.MIN_ALTITUDE) {
            this.plane.lives--;
            this.eventCrash = true;
            this.plane.y = groundH + PHYSICS.SAFE_ALTITUDE;
            this.plane.bank = 0;
            this.plane.speed = PHYSICS.BASE_SPEED;

            if (this.plane.lives <= 0) {
                this.plane.state = 'gameover';
                this.eventRunOver = true;
                return;
            }
        }

        if (this.activeRingIndex < this.rings.length) {
            let ring = this.rings[this.activeRingIndex];
            if (this.plane.z >= ring.z) {
                let dx = this.plane.x - ring.x;
                let dy = this.plane.y - ring.y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= ring.radius + 40) {
                    ring.passed = true;
                    this.plane.score += GAME_RULES.RING_SCORE;
                    this.plane.timeLeft += GAME_RULES.RING_TIME_BONUS;
                    this.plane.ringsPassed++;
                    this.plane.ringsRemaining--;
                    this.eventRingPassed = true;

                    this.activeRingIndex++;

                    if (this.plane.ringsPassed % 10 === 0) {
                        this.plane.score += GAME_RULES.LEG_COMPLETE_SCORE;
                        this.plane.timeLeft += GAME_RULES.LEG_TIME_BONUS;
                        this.plane.leg++;
                        this.eventLegComplete = true;

                        this.runway = {
                            x: ring.x,
                            z: ring.z + 100,
                            length: 600,
                            width: 120
                        };
                    }
                } else {
                    this.activeRingIndex++;
                    this.plane.ringsRemaining = Math.max(0, this.plane.ringsRemaining - 1);
                }
            }
        }

        if (this.activeRingIndex >= this.rings.length) {
            this.plane.state = 'victory';
            this.eventRunOver = true;
        }
    }
}
