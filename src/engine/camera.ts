// Third-person follow camera: trails the cat with a gentle lag, pulls in front of walls, zooms
// out when the cat is high and stays inside the room's `camera_bounds` marker. Rooms are open
// toward -z, so the camera looks toward +z by default. Desktop players orbit with the mouse:
// while a level plays the cursor is locked to the game and moving the mouse turns the camera
// (dragging still works where the browser refuses the lock). There is no manual camera on touch.
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import type { PhysicsEngine } from '@babylonjs/core/Physics/v2/physicsEngine';
import { readExtras } from '../core/extras';
import type { Services } from '../core/services';

const FOCUS_HEIGHT = 0.35; // m above the cat's feet
const BASE_DISTANCE = 3.6;
const DISTANCE_PER_HEIGHT = 0.6; // extra distance per meter the cat is above the floor
const MIN_DISTANCE = 0.8;
const WALL_MARGIN = 0.25;
const DEFAULT_PITCH = 0.62; // rad above the horizon
const MIN_PITCH = 0.2;
const MAX_PITCH = 1.3;
const FOCUS_RATE = 8; // 1/s; higher follows the cat more tightly
const POSITION_RATE = 6;
const ORBIT_SPEED = 0.005; // rad per pixel
// With no cat (menus), frame the middle of the room from here.
const IDLE_FOCUS = new Vector3(0, 0.8, 0);

export interface FollowCamera {
  update(dt: number): void;
  /** Shakes the view; `intensity` is 0..1. */
  shake(intensity: number, durationMs: number): void;
  /** Re-reads the cat and the bounds marker after a room loads, and snaps to the cat. */
  reset(): void;
  /**
   * Mouse look while a level plays: locks the cursor (now, and on a click on the game). Losing
   * the lock some other way, such as Esc or switching windows, calls `onLost`.
   */
  setMouseLook(enabled: boolean): void;
  dispose(): void;
}

/** Pure helper: offset from the focus point to the camera for a yaw, pitch and distance. */
export function orbitOffset(
  yaw: number,
  pitch: number,
  distance: number,
): {
  x: number;
  y: number;
  z: number;
} {
  const flat = Math.cos(pitch) * distance;
  return { x: -Math.sin(yaw) * flat, y: Math.sin(pitch) * distance, z: -Math.cos(yaw) * flat };
}

export function createFollowCamera(services: Services, onLost: () => void): FollowCamera {
  const { scene, canvas } = services.scene;
  const camera = new FreeCamera('follow-camera', new Vector3(0, 3, -5), scene);
  camera.minZ = 0.1;
  camera.maxZ = 60;
  camera.fov = 0.8;
  scene.activeCamera = camera;

  let cat: TransformNode | null = null;
  let bounds: { min: Vector3; max: Vector3 } | undefined;
  let yaw = 0;
  let pitch = DEFAULT_PITCH;
  let snap = true;
  const focus = IDLE_FOCUS.clone();
  const position = new Vector3(0, 3, -5);
  const desired = new Vector3();
  const rayStart = new Vector3();
  const ray = new PhysicsRaycastResult();
  let shakeLeft = 0;
  let shakeTotal = 0;
  let shakeIntensity = 0;

  function reset(): void {
    cat = scene.getTransformNodeByName('cat');
    bounds = undefined;
    for (const node of scene.transformNodes) {
      if (readExtras(node).marker !== 'camera_bounds') continue;
      // The marker is a unit cube scaled to the volume the camera may occupy.
      node.computeWorldMatrix(true);
      const center = node.getAbsolutePosition();
      const half = node.absoluteScaling.scale(0.5);
      bounds = { min: center.subtract(half), max: center.add(half) };
    }
    yaw = 0;
    pitch = DEFAULT_PITCH;
    snap = true;
  }

  // Mouse orbit on desktop: locked mouse look during play, or a drag.
  let mouseLook = false;
  let orbiting = false;
  const locked = () => document.pointerLockElement === canvas;
  /** Asks for the lock during play; false when it does not ask. */
  function lock(): boolean {
    if (!mouseLook || locked() || !canvas.requestPointerLock) return false;
    // Refused when there was no recent click or key press, or right after Esc left the lock;
    // the next click on the game tries again.
    Promise.resolve(canvas.requestPointerLock()).catch(() => undefined);
    return true;
  }
  function onPointerLockChange(): void {
    // A lock asked for just before play stopped can arrive after it; let the cursor go.
    if (locked() && !mouseLook) document.exitPointerLock();
    else if (!locked() && mouseLook) onLost();
  }
  function onPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || locked()) return;
    orbiting = true;
    // The browser refuses pointer capture while a lock request is pending.
    if (!lock()) canvas.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: PointerEvent): void {
    if (!orbiting && !locked()) return;
    yaw += event.movementX * ORBIT_SPEED;
    pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, pitch + event.movementY * ORBIT_SPEED));
  }
  function onPointerUp(): void {
    orbiting = false;
  }
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  document.addEventListener('pointerlockchange', onPointerLockChange);

  return {
    reset,

    setMouseLook(enabled) {
      mouseLook = enabled;
      if (enabled) lock();
      else if (locked()) document.exitPointerLock();
    },

    shake(intensity, durationMs) {
      shakeIntensity = Math.max(shakeIntensity, intensity);
      shakeLeft = shakeTotal = durationMs / 1000;
    },

    update(dt) {
      const following = cat?.isEnabled() ?? false;
      const target = following && cat ? cat.position : IDLE_FOCUS;
      const height = following && cat ? Math.max(0, cat.position.y) : 0;

      const ease = snap ? 1 : 1 - Math.exp(-FOCUS_RATE * dt);
      focus.x += (target.x - focus.x) * ease;
      focus.y += (target.y + (following ? FOCUS_HEIGHT : 0) - focus.y) * ease;
      focus.z += (target.z - focus.z) * ease;

      let distance = BASE_DISTANCE + Math.min(height, 3) * DISTANCE_PER_HEIGHT;
      const offset = orbitOffset(yaw, pitch, 1);
      desired.set(
        focus.x + offset.x * distance,
        focus.y + offset.y * distance,
        focus.z + offset.z * distance,
      );

      // Walls: if static geometry sits between the cat and the camera, move in front of it.
      const physics = scene.getPhysicsEngine() as PhysicsEngine | null;
      // The ray starts just outside the cat's own capsule.
      rayStart.set(focus.x + offset.x * 0.3, focus.y + offset.y * 0.3, focus.z + offset.z * 0.3);
      physics?.raycastToRef(rayStart, desired, ray);
      if (ray.hasHit && ray.body?.getMotionType() === PhysicsMotionType.STATIC) {
        distance = Math.max(MIN_DISTANCE, ray.hitDistance + 0.3 - WALL_MARGIN);
        desired.set(
          focus.x + offset.x * distance,
          focus.y + offset.y * distance,
          focus.z + offset.z * distance,
        );
      }
      if (bounds) {
        desired.x = Math.min(bounds.max.x, Math.max(bounds.min.x, desired.x));
        desired.y = Math.min(bounds.max.y, Math.max(bounds.min.y, desired.y));
        desired.z = Math.min(bounds.max.z, Math.max(bounds.min.z, desired.z));
      }

      const follow = snap ? 1 : 1 - Math.exp(-POSITION_RATE * dt);
      position.x += (desired.x - position.x) * follow;
      position.y += (desired.y - position.y) * follow;
      position.z += (desired.z - position.z) * follow;
      snap = false;

      camera.position.copyFrom(position);
      if (shakeLeft > 0) {
        shakeLeft -= dt;
        const strength = shakeIntensity * 0.12 * Math.max(0, shakeLeft / shakeTotal);
        camera.position.x += (Math.random() - 0.5) * strength;
        camera.position.y += (Math.random() - 0.5) * strength;
        if (shakeLeft <= 0) shakeIntensity = 0;
      }
      camera.setTarget(focus);
    },

    dispose() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      mouseLook = false;
      if (locked()) document.exitPointerLock();
      camera.dispose();
    },
  };
}
