// Cat feel constants. Distances in meters, speeds in m/s, times in seconds.

export const CAPSULE_RADIUS = 0.14;
export const CAPSULE_HEIGHT = 0.4;
export const MASS_KG = 4;
/** Push force in newtons: slides light and medium objects, not the heavy ones. */
export const PUSH_STRENGTH = 25;
export const MAX_STEP_HEIGHT = 0.12; // low ledges are stepped onto without jumping
export const CONTACT_TOLERANCE = 0.02;

export const WALK_SPEED = 1.6;
export const RUN_SPEED = 3.4;
/** Stick tilt (0..1) where walking turns into running. Keyboard is always a full tilt. */
export const RUN_TILT = 0.6;
/** Share of the gap to the wanted ground velocity closed in each physics step (0..1). */
export const GROUND_RESPONSE = 0.3;
/** Ground response on a wet floor: the cat keeps sliding and turns late. */
export const WET_RESPONSE = 0.035;
export const AIR_ACCELERATION = 14;
export const TURN_RATE = 14; // rad/s

// The cat falls faster than the room's objects, which makes jumps snappy.
export const GRAVITY = -24;
export const TERMINAL_SPEED = 14;
/** Full jump (button held) clears the 1.7 m graybox shelf; a tap reaches about 1 m. */
export const JUMP_HEIGHT = 1.95;
export const JUMP_SPEED = Math.sqrt(2 * -GRAVITY * JUMP_HEIGHT);
/** Releasing the button caps the upward speed at this, after MIN_JUMP_SEC. */
export const JUMP_CUT_SPEED = 3;
export const MIN_JUMP_SEC = 0.09;
export const COYOTE_SEC = 0.1;
export const JUMP_BUFFER_SEC = 0.12;
/** After a jump starts, ground contact is ignored this long so the cat can leave the floor. */
export const LIFT_OFF_SEC = 0.1;

export const ZOOMIES_SEC = 2;
export const ZOOMIES_COOLDOWN_SEC = 6;
export const ZOOMIES_MULTIPLIER = 1.8;

export const SWAT_COOLDOWN_SEC = 0.3;
export const SWAT_REACH = 0.3; // center of the swat area in front of the cat
export const SWAT_RADIUS = 0.55; // horizontal
/** Radius used to collect candidates for swat and pounce before the exact checks. */
export const QUERY_RADIUS = 2;
export const SWAT_HEIGHT = 0.4; // how far above or below the cat's middle a swat reaches
export const SWAT_CLOSE = 0.2; // anything this close is hit whatever the angle
export const SWAT_CONE_COS = Math.cos((75 * Math.PI) / 180);
export const SWAT_SPEED = 3.2; // speed given to an object light enough
export const SWAT_MAX_IMPULSE = 6; // N·s; heavier objects move slower

export const POUNCE_LEAP_UP = 5.5;
export const POUNCE_LEAP_FORWARD = 3;
export const POUNCE_SLAM_SPEED = 12;
export const POUNCE_RADIUS = 0.8;
export const POUNCE_HEIGHT = 0.3; // how far above or below the cat's feet a landing reaches
export const POUNCE_SPEED = 4;
export const POUNCE_BASE_IMPULSE = 8; // N·s, plus POUNCE_IMPULSE_PER_SPEED x landing speed
export const POUNCE_IMPULSE_PER_SPEED = 1.2;

export const LAND_MIN_SPEED = 2; // slower landings make no sound or squash
export const RESPAWN_Y = -5; // fell out of the room
