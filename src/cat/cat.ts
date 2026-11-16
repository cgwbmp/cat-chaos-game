// Cat controller: a kinematic character on a capsule. Walk, run, jump (with coyote time, jump
// buffer and variable height), swat, pounce, push and zoomies.
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import {
  CharacterSupportedState,
  PhysicsCharacterController,
  type CharacterSurfaceInfo,
} from '@babylonjs/core/Physics/v2/characterController';
import { PhysicsShapeCapsule } from '@babylonjs/core/Physics/v2/physicsShape';
import { findCosmetic } from '../core/cosmetics';
import { readExtras } from '../core/extras';
import type { Services, System } from '../core/services';
import type { CatAction } from '../core/types';
import {
  confine,
  headLean,
  moveSpeed,
  pounceImpulse,
  standsIn,
  swatImpulse,
  turnTowards,
} from './abilities';
import { createCatAnimator } from './animation';
import { createCatModel } from './model';
import {
  AIR_ACCELERATION,
  BOUNCE_JUMP_SPEED,
  BUMP_HOP,
  BUMP_SPEED,
  CAPSULE_HEIGHT,
  CAPSULE_RADIUS,
  CONTACT_TOLERANCE,
  COYOTE_SEC,
  GRAVITY,
  GROUND_RESPONSE,
  JUMP_BUFFER_SEC,
  JUMP_CUT_SPEED,
  JUMP_SPEED,
  LAND_MIN_SPEED,
  LIFT_OFF_SEC,
  MASS_KG,
  MAX_STEP_HEIGHT,
  MIN_JUMP_SEC,
  POUNCE_LEAP_FORWARD,
  POUNCE_LEAP_UP,
  POUNCE_SLAM_SPEED,
  PUSH_STRENGTH,
  QUERY_RADIUS,
  RESPAWN_Y,
  SWAT_COOLDOWN_SEC,
  TERMINAL_SPEED,
  TURN_RATE,
  WET_RESPONSE,
  ZOOMIES_COOLDOWN_SEC,
  ZOOMIES_SEC,
} from './tuning';

const UP = Vector3.Up();
const DOWN = Vector3.Down();
const GRAVITY_VECTOR = new Vector3(0, GRAVITY, 0);
const DEFAULT_STEP_MS = 1000 / 60;
const FOOT_OFFSET = CAPSULE_HEIGHT / 2;
/** The controller keeps the capsule about this far above what it stands on (measured). */
const FLOAT_GAP = 0.03;

interface Zone {
  min: Vector3;
  max: Vector3;
}

/** World-space box of a zone marker: a unit cube scaled to the zone. */
function zoneBox(node: TransformNode): Zone {
  const half = node.absoluteScaling.scale(0.5);
  const center = node.getAbsolutePosition();
  return { min: center.subtract(half), max: center.add(half) };
}

export function createCat(services: Services): System {
  const { bus, input, physics } = services;
  const { scene, engine } = services.scene;

  const model = createCatModel(services);
  model.root.setEnabled(false);
  const animator = createCatAnimator();

  /** The capsule, with its top `lean` meters ahead of its bottom in the direction `yaw`. */
  function capsule(lean: number, yaw: number): PhysicsShapeCapsule {
    const half = CAPSULE_HEIGHT / 2 - CAPSULE_RADIUS;
    return new PhysicsShapeCapsule(
      new Vector3(Math.sin(yaw) * lean, half, Math.cos(yaw) * lean),
      new Vector3(0, -half, 0),
      CAPSULE_RADIUS,
      scene,
    );
  }

  let shape = capsule(0, 0);
  const controller = new PhysicsCharacterController(
    new Vector3(0, 1, 0),
    { shape, capsuleHeight: CAPSULE_HEIGHT },
    scene,
  );
  controller.characterMass = MASS_KG;
  controller.characterStrength = PUSH_STRENGTH;
  controller.maxStepHeight = MAX_STEP_HEIGHT;
  // Share of the gap to the wanted velocity closed per step (the default 0.05 feels sluggish).
  controller.acceleration = GROUND_RESPONSE;
  // With the default 0.1 a contact with an edge the cat has already passed is kept, and props
  // the capsule up to 10 cm above thin surfaces such as shelves.
  controller.keepContactTolerance = CONTACT_TOLERANCE;

  let active = false;
  let time = 0;
  let yaw = 0;
  const facing = new Vector3(0, 0, 1);
  /** The capsule's lean over the head, and the yaw the capsule was made for. */
  let lean = 0;
  let leanYaw = 0;
  const spawn = new Vector3(0, 0, 0);
  let masses = new Map<string, number>();
  /** Wet floor zones (`trigger:zone_wet...` markers): boxes where the cat slides. */
  let wetZones: Zone[] = [];
  /** Springy surfaces (`trigger:zone_bounce...` markers): a jump from one goes much higher. */
  let bounceZones: Zone[] = [];
  /**
   * Invisible walls and ceiling (`trigger:zone_room` marker), as the box the capsule's center
   * may be in. Keeps the cat from walking off the open side of the room or jumping over a wall.
   */
  let roomZone: Zone | undefined;

  let grounded = false;
  let lastGroundedAt = -Infinity;
  let liftOffUntil = 0;
  let fallSpeed = 0;

  let jumpPressedAt = -Infinity;
  let jumpStartedAt = -Infinity;
  let jumping = false; // rising from a jump whose height can still be cut
  let swatRequested = false;
  let swatReadyAt = 0;
  let pouncePressedAt = -Infinity;
  let pouncing = false;
  let zoomiesUntil = 0;
  let zoomiesReadyAt = 0;
  /** Where the walker that just bumped into the cat stands, until the next step throws the cat. */
  let bumpedFrom: Vector3 | undefined;

  function emit(action: CatAction): void {
    const { x, y, z } = controller.getPosition();
    bus.emit('cat/action', { action, position: { x, y: y - FOOT_OFFSET, z } });
  }

  function placeAtSpawn(): void {
    controller.setPosition(spawn.add(new Vector3(0, FOOT_OFFSET + 0.05, 0)));
    controller.setVelocity(Vector3.Zero());
    grounded = false;
    jumping = false;
    pouncing = false;
    swatRequested = false;
    pouncePressedAt = -Infinity;
    jumpPressedAt = -Infinity;
  }

  /**
   * Leans the capsule `next` meters over the head. The controller cannot turn a shape, so a new
   * capsule is made whenever the lean or the facing changes.
   */
  function leanTo(next: number): void {
    if (next === lean && (next === 0 || yaw === leanYaw)) return;
    lean = next;
    leanYaw = yaw;
    const previous = shape;
    shape = capsule(lean, yaw);
    controller.shape = shape;
    previous.dispose();
  }

  function liftOff(): void {
    liftOffUntil = time + LIFT_OFF_SEC;
    lastGroundedAt = -Infinity;
  }

  /** Movement input turned into a world direction relative to the camera, length 0..1. */
  function wishDirection(): Vector3 {
    const move = input.getMove();
    const camera = scene.activeCamera;
    if (!camera || (move.x === 0 && move.y === 0)) return Vector3.Zero();
    const forward = camera.getDirection(Vector3.Forward());
    forward.y = 0;
    if (forward.lengthSquared() < 1e-6) forward.copyFrom(camera.getDirection(UP)).y = 0;
    forward.normalize();
    const right = new Vector3(forward.z, 0, -forward.x);
    return right.scaleInPlace(move.x).addInPlace(forward.scaleInPlace(move.y));
  }

  function swat(): void {
    if (time < swatReadyAt) return;
    swatReadyAt = time + SWAT_COOLDOWN_SEC;
    animator.play('swat');

    const position = controller.getPosition();
    let hits = 0;
    for (const target of physics.objectsInRadius(position, QUERY_RADIUS)) {
      const mass = masses.get(target.defId) ?? 1;
      const impulse = swatImpulse(position, facing, target, mass);
      if (!impulse) continue;
      physics.applyImpulse(target.objectId, impulse);
      hits++;
    }
    emit('swat');
    if (hits > 0) bus.emit('juice/hitPause', { durationMs: 40 });
  }

  /** Pounce landing: everything around the cat is thrown away from it. */
  function slam(landingSpeed: number): void {
    const { x, y, z } = controller.getPosition();
    const feet = { x, y: y - FOOT_OFFSET, z };
    for (const target of physics.objectsInRadius(feet, QUERY_RADIUS)) {
      const mass = masses.get(target.defId) ?? 1;
      const impulse = pounceImpulse(feet, target, mass, landingSpeed);
      if (impulse) physics.applyImpulse(target.objectId, impulse);
    }
    emit('pounce');
    bus.emit('juice/shake', {
      intensity: Math.min(0.5, 0.15 + landingSpeed * 0.03),
      durationMs: 180,
    });
  }

  function land(): void {
    jumping = false;
    if (pouncing) {
      pouncing = false;
      slam(fallSpeed);
      animator.play('land');
    } else if (fallSpeed >= LAND_MIN_SPEED) {
      emit('land');
      animator.play('land');
    }
  }

  function groundVelocity(
    dt: number,
    support: CharacterSurfaceInfo,
    current: Vector3,
    desired: Vector3,
  ): Vector3 {
    const normal = support.averageSurfaceNormal;
    const surface = support.averageSurfaceVelocity;
    let velocity = controller.calculateMovement(dt, facing, normal, current, surface, desired, UP);
    // Keep the speed along the ground the same on slopes (as in the Babylon controller sample).
    velocity.subtractInPlace(surface);
    if (Vector3.Dot(velocity, UP) > 1e-3) {
      const length = velocity.length();
      velocity.normalizeFromLength(length);
      const horizontalLength = length / Vector3.Dot(normal, UP);
      velocity = normal.cross(velocity).cross(UP).scaleInPlace(horizontalLength);
    }
    velocity.addInPlace(surface);
    // Stepping up onto an edge leaves the capsule hovering by up to the step height, and nothing
    // else pulls a supported character down, so let gravity settle it onto the surface.
    velocity.y += GRAVITY * dt;
    return velocity;
  }

  function airVelocity(dt: number, current: Vector3, desired: Vector3, steering: boolean): Vector3 {
    const velocity = current.clone();
    if (steering) {
      const gapX = desired.x - velocity.x;
      const gapZ = desired.z - velocity.z;
      const gap = Math.hypot(gapX, gapZ);
      const reach = AIR_ACCELERATION * dt;
      if (gap <= reach) {
        velocity.x = desired.x;
        velocity.z = desired.z;
      } else {
        velocity.x += (gapX / gap) * reach;
        velocity.z += (gapZ / gap) * reach;
      }
    }

    velocity.y += GRAVITY * dt;
    // Variable jump height: letting go of the button early cuts the rise short.
    const canCut = jumping && time - jumpStartedAt >= MIN_JUMP_SEC && !input.isPressed('jump');
    if (canCut && velocity.y > JUMP_CUT_SPEED) velocity.y = JUMP_CUT_SPEED;
    if (velocity.y <= 0) jumping = false;
    velocity.y = Math.max(velocity.y, -TERMINAL_SPEED);
    return velocity;
  }

  /** One physics step. */
  function step(): void {
    if (!active) return;
    const dt = (scene.getPhysicsEngine()?.getSubTimeStep() || DEFAULT_STEP_MS) / 1000;
    time += dt;

    const support = controller.checkSupport(dt, DOWN);
    const current = controller.getVelocity().clone();
    const here = controller.getPosition();
    const feet = { x: here.x, y: here.y - FOOT_OFFSET, z: here.z };
    const wet = wetZones.some((zone) => standsIn(zone, feet));
    controller.acceleration = wet ? WET_RESPONSE : GROUND_RESPONSE;
    const supported = support.supportedState === CharacterSupportedState.SUPPORTED;
    const wasGrounded = grounded;
    grounded = supported && time >= liftOffUntil;
    if (grounded) {
      lastGroundedAt = time;
      if (!wasGrounded) land();
    } else {
      fallSpeed = Math.max(0, -current.y);
    }

    const wish = wishDirection();
    const tilt = Math.min(1, wish.length());
    if (tilt > 0.05) yaw = turnTowards(yaw, Math.atan2(wish.x, wish.z), TURN_RATE * dt);
    facing.set(Math.sin(yaw), 0, Math.cos(yaw));
    const desired =
      tilt > 0 ? wish.normalize().scaleInPlace(moveSpeed(tilt, time < zoomiesUntil)) : wish;

    // A swat in the air is a pounce (touch has no pounce button).
    let airSwat = false;
    if (swatRequested) {
      swatRequested = false;
      if (grounded) swat();
      else airSwat = true;
    }

    const canJump = time - lastGroundedAt <= COYOTE_SEC;
    let velocity: Vector3 | undefined;
    // Bumped by a walker: thrown away from it, which also gets the cat clear of its body.
    if (bumpedFrom) {
      const away = here.subtract(bumpedFrom);
      away.y = 0;
      if (away.lengthSquared() < 1e-6) away.copyFrom(facing).negateInPlace();
      velocity = away.normalize().scaleInPlace(BUMP_SPEED);
      velocity.y = BUMP_HOP;
      bumpedFrom = undefined;
      pouncing = false;
      jumping = false;
      liftOff();
    }
    // A pounce runs to its landing: pressing again in the air does not cut it short. Like a jump,
    // a press just before the landing starts the next one.
    if (!velocity && !pouncing && (airSwat || time - pouncePressedAt <= JUMP_BUFFER_SEC)) {
      pouncePressedAt = -Infinity;
      if (canJump) {
        // From the ground: leap forward and up, the slam happens on landing.
        velocity = facing.scale(POUNCE_LEAP_FORWARD);
        velocity.y = POUNCE_LEAP_UP;
        pouncing = true;
        jumping = false;
        liftOff();
      } else if (!grounded) {
        // In the air: dive straight down.
        velocity = current.clone();
        velocity.y = -POUNCE_SLAM_SPEED;
        pouncing = true;
        jumping = false;
      }
    }
    if (!velocity && canJump && time - jumpPressedAt <= JUMP_BUFFER_SEC) {
      velocity = desired.clone();
      const springy = bounceZones.some((zone) => standsIn(zone, feet));
      velocity.y = springy ? BOUNCE_JUMP_SPEED : JUMP_SPEED;
      jumping = true;
      jumpStartedAt = time;
      jumpPressedAt = -Infinity;
      liftOff();
      emit('jump');
    }
    velocity ??= grounded
      ? groundVelocity(dt, support, current, desired)
      : airVelocity(dt, current, desired, tilt > 0);

    // A jump that starts in this step is in the air already.
    leanTo(headLean(lean, grounded && time >= liftOffUntil, dt));
    controller.setVelocity(velocity);
    controller.integrate(dt, support, GRAVITY_VECTOR);

    const position = controller.getPosition();
    if (roomZone && confine(position, controller.getVelocity(), roomZone)) {
      controller.setPosition(position);
    }
    if (position.y < RESPAWN_Y) placeAtSpawn();
  }

  /** Once per rendered frame: move the model to the capsule and animate it. */
  function render(): void {
    if (!active) return;
    const dt = engine.getDeltaTime() / 1000;
    const position = controller.getPosition();
    const velocity = controller.getVelocity();
    model.root.position.set(position.x, position.y - FOOT_OFFSET - FLOAT_GAP, position.z);
    model.root.rotation.y = yaw;
    const speed = Math.hypot(velocity.x, velocity.z);
    const clip = animator.update(dt, { grounded, speed, pouncing });
    model.update(clip, speed);
  }

  const afterPhysics = scene.onAfterPhysicsObservable.add(step);
  const beforeRender = scene.onBeforeRenderObservable.add(render);

  const unsubscribe = [
    bus.on('input/action', ({ action, pressed }) => {
      if (!active || !pressed) return;
      if (action === 'jump') jumpPressedAt = time;
      if (action === 'swat') swatRequested = true;
      if (action === 'pounce') pouncePressedAt = time;
      if (action === 'zoomies' && time >= zoomiesReadyAt) {
        zoomiesUntil = time + ZOOMIES_SEC;
        zoomiesReadyAt = zoomiesUntil + ZOOMIES_COOLDOWN_SEC;
        emit('zoomies');
      }
    }),
    bus.on('level/loaded', ({ objects }) => {
      masses = new Map(objects.map((def) => [def.id, def.massKg]));
      spawn.setAll(0);
      wetZones = [];
      bounceZones = [];
      roomZone = undefined;
      for (const node of scene.transformNodes) {
        const { marker } = readExtras(node);
        if (!marker) continue;
        node.computeWorldMatrix(true);
        if (marker === 'cat_spawn') spawn.copyFrom(node.getAbsolutePosition());
        if (marker.startsWith('trigger:zone_wet')) wetZones.push(zoneBox(node));
        if (marker.startsWith('trigger:zone_bounce')) bounceZones.push(zoneBox(node));
        if (marker === 'trigger:zone_room') {
          roomZone = zoneBox(node);
          roomZone.min.addInPlaceFromFloats(CAPSULE_RADIUS, 0, CAPSULE_RADIUS);
          roomZone.max.addInPlaceFromFloats(-CAPSULE_RADIUS, -FOOT_OFFSET, -CAPSULE_RADIUS);
        }
      }
      const { equipped } = services.save.get().cosmetics;
      model.setCosmetics({
        fur: findCosmetic(equipped.fur)?.color,
        collar: findCosmetic(equipped.collar)?.color,
        hat: equipped.hat,
      });
      yaw = 0;
      zoomiesUntil = 0;
      zoomiesReadyAt = 0;
      placeAtSpawn();
      model.root.setEnabled(true);
      active = true;
    }),
    bus.on('walker/caught', ({ id }) => {
      bumpedFrom = scene.getMeshByName(`walker-${id}`)?.position.clone();
    }),
    bus.on('level/quit', () => {
      active = false;
      bumpedFrom = undefined;
      model.root.setEnabled(false);
    }),
    bus.on('level/ended', ({ result }) => {
      if (result.stars > 0) animator.play('celebrate');
    }),
  ];

  return {
    dispose() {
      for (const off of unsubscribe) off();
      scene.onAfterPhysicsObservable.remove(afterPhysics);
      scene.onBeforeRenderObservable.remove(beforeRender);
      controller.dispose();
      shape.dispose();
      model.dispose();
    },
  };
}
