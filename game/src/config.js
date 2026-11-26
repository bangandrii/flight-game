export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 800;

export const PHYSICS = {
    BASE_SPEED: 180,
    MIN_THROTTLE: 0.2,
    MAX_THROTTLE: 1.5,
    THROTTLE_STEP: 0.5,
    TURN_RATE: 2.0,
    CLIMB_RATE: 120,
    GRAVITY_PULL: 40,
    STALL_SPEED: 80,
    SAFE_ALTITUDE: 150,
    MAX_LATERAL: 900,
    MIN_ALTITUDE: 20,
    MAX_ALTITUDE: 1200,
};

export const GAME_RULES = {
    INITIAL_LIVES: 3,
    RUN_TIMER_SECONDS: 120,
    RING_SCORE: 100,
    RING_TIME_BONUS: 5,
    LEG_COMPLETE_SCORE: 500,
    LEG_TIME_BONUS: 20,
};

export const PALETTE = {
    SKY_TOP: '#0ea5e9',
    SKY_BOTTOM: '#38bdf8',
    SEA_DEEP: '#0369a1',
    SEA_SHALLOW: '#0284c7',
    ISLAND_GREEN: '#15803d',
    ISLAND_DEEP: '#166534',
    SAND: '#fef08a',
    RUNWAY_GREY: '#475569',
    RUNWAY_LINE: '#f8fafc',
    RING_GOLD: '#f59e0b',
    RING_GLOW: '#fbbf24',
    HUD_AMBER: '#fbbf24',
    HUD_TEXT: '#fef3c7',
    MOUNTAIN: '#1e293b',
    ROOF: '#991b1b',
    TREE_TRUNK: '#78350f',
};

export const SCREENSHOT_SCENES = {
    START: 'start',
    PLAY: 'play',
    RING: 'ring',
    END: 'end',
};
