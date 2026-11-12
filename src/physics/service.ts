// Physics service: Havok bodies for a room, the four break rules, special behaviors, wobble at
// edges, chain causality and debris.
//
// Audio cues emitted on `audio/play`: `hit_<material>` (swat), `impact_<material>` (lands without
// breaking), `break_<material>`, `splash` (liquid) and `spark` (electronic).
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import {
  PhysicsEventType,
  PhysicsShapeType,
  type IPhysicsCollisionEvent,
} from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import type { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import type { PhysicsEngine } from '@babylonjs/core/Physics/v2/physicsEngine';
// Side-effect imports: Scene.enablePhysics and TransformNode.physicsBody.
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent';
import '@babylonjs/core/Physics/v2/physicsEngineComponent';
import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import HavokPhysics from '@babylonjs/havok';
import havokWasmUrl from '@babylonjs/havok/lib/esm/HavokPhysics.wasm?url';
import { readExtras } from '../core/extras';
import type { PhysicsObjectInfo, PhysicsService, ServiceFactory } from '../core/services';
import type { ObjectDef, RoomAssets, Vec3 } from '../core/types';
import {
  breaksOnBlow,
  breaksOnHit,
  breaksOnImpact,
  breaksOnTrigger,
  createBreakState,
  trackHeight,
  type BreakState,
} from './break-rules';
import { createDebris, type DebrisSystem } from './debris';
import { LIQUID_COLOR, MATERIALS, SHARDS_PER_TIER, SPARK_COLOR } from './materials';

const GRAVITY = new Vector3(0, -9.81, 0);
const STEP_MS = 1000 / 60;
const MAX_FRAME_SEC = 0.1;

// An object counts as resting below these speeds.
const REST_SPEED = 0.05; // m/s
const REST_SPIN = 0.3; // rad/s
const AWAKE_SPEED = 0.01; // m/s

// Wobble: an object pushed past an edge teeters before it drops.
const WOBBLE_SEC = 0.3;
const WOBBLE_MAX_SPEED = 1.2; // m/s; faster objects fly off without teetering
const WOBBLE_MAX_FALL_SPEED = 0.6; // m/s
const WOBBLE_ROCK = 0.7; // rad/s
const WOBBLE_HZ = 3.3;
const WOBBLE_RELEASE_SPEED = 0.5; // m/s over the edge
const SUPPORT_PROBE = 0.06; // m below the object's underside

// Chain causality: a break within this time of being touched by another moving breakable.
const CHAIN_WINDOW_SEC = 1;
const CHAIN_MIN_SPEED = 0.3; // m/s

const THUD_GAP_SEC = 0.2;
const OUT_OF_ROOM_Y = -5; // m

interface Breakable {
  id: string;
  def: ObjectDef;
  mesh: AbstractMesh;
  aggregate: PhysicsAggregate;
  state: BreakState;
  broken: boolean;
  breakQueued: boolean;
  lastTouch?: { by: string; at: number };
  lastSwatAt: number;
  lastThudAt: number;
  /** Linear velocity before the current physics step, to measure collision impulses. */
  velocityBefore: Vector3;
  /** Re-armed each time the object rests, so it teeters at most once per push. */
  wobbleUsed: boolean;
  wobble?: { until: number; startedAt: number; axis: Vector3; release: Vector3 };
}

function toVec3({ x, y, z }: Vector3): Vec3 {
  return { x, y, z };
}

export const createPhysicsService: ServiceFactory<PhysicsService> = (services) => {
  const { bus } = services;
  const breakables = new Map<string, Breakable>();
  const byBody = new Map<PhysicsBody, Breakable>();
  const statics: PhysicsAggregate[] = [];
  const breakQueue: { target: Breakable; causedBy?: string }[] = [];
  const fractureSets = new Map<string, AbstractMesh[]>();
  const triggerMarkers = new Map<string, Vector3>();

  let engine: PhysicsEngine | undefined;
  let debris: DebrisSystem | undefined;
  let time = 0;

  // Scratch values, reused every frame.
  const center = new Vector3();
  const velocity = new Vector3();
  const spin = new Vector3();
  const rayFrom = new Vector3();
  const rayTo = new Vector3();
  const rayResult = new PhysicsRaycastResult();

  function isSupported(target: Breakable, x: number, underside: number, z: number): boolean {
    rayFrom.set(x, underside + 0.02, z);
    rayTo.set(x, underside - SUPPORT_PROBE, z);
    engine?.raycastToRef(rayFrom, rayTo, rayResult, { ignoreBody: target.aggregate.body });
    return rayResult.hasHit;
  }

  function releaseWobble(target: Breakable): void {
    if (!target.wobble) return;
    const { body } = target.aggregate;
    body.setGravityFactor(1);
    body.setLinearVelocity(target.wobble.release);
    body.setAngularVelocity(target.wobble.axis.scale(2));
    target.velocityBefore.copyFrom(target.wobble.release);
    target.wobble = undefined;
  }

  /** Runs before every physics step. */
  function recordVelocities(): void {
    for (const target of breakables.values()) {
      if (!target.broken) target.aggregate.body.getLinearVelocityToRef(target.velocityBefore);
    }
  }

  /** Starts a teeter when the object's center has passed an edge but part of it is still held up. */
  function tryStartWobble(target: Breakable): void {
    const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
    if (horizontalSpeed > WOBBLE_MAX_SPEED || Math.abs(velocity.y) > WOBBLE_MAX_FALL_SPEED) return;

    target.mesh.computeWorldMatrix(true);
    const { minimumWorld: min, maximumWorld: max } = target.mesh.getBoundingInfo().boundingBox;
    if (isSupported(target, center.x, min.y, center.z)) return;

    const reachX = ((max.x - min.x) / 2) * 0.8;
    const reachZ = ((max.z - min.z) / 2) * 0.8;
    const probes: [x: number, z: number][] = [
      [reachX, 0],
      [-reachX, 0],
      [0, reachZ],
      [0, -reachZ],
    ];
    const held = probes.find(([x, z]) => isSupported(target, center.x + x, min.y, center.z + z));
    if (!held) return;

    // Outward points from the part still on the surface toward the unsupported center.
    const outward = new Vector3(-held[0], 0, -held[1]).normalize();
    target.wobbleUsed = true;
    target.wobble = {
      until: time + WOBBLE_SEC,
      startedAt: time,
      axis: Vector3.Up().cross(outward),
      release: outward.scale(Math.max(horizontalSpeed, WOBBLE_RELEASE_SPEED)),
    };
    target.aggregate.body.setGravityFactor(0);
  }

  function queueBreak(target: Breakable, causedBy?: string): void {
    if (target.broken || target.breakQueued) return;
    target.breakQueued = true;
    breakQueue.push({ target, causedBy });
  }

  /** The breakable that knocked `target` just now, if any (not counting the cat's own swats). */
  function chainCause(target: Breakable): string | undefined {
    const touch = target.lastTouch;
    if (!touch || time - touch.at > CHAIN_WINDOW_SEC || touch.at < target.lastSwatAt) {
      return undefined;
    }
    return touch.by;
  }

  /**
   * Impulse (N·s) of a new contact: closing speed just before the step times the mass involved
   * (the reduced mass when both bodies move). Havok's own `event.impulse` is per contact point
   * and spread over several steps, so it comes out well below mass x speed and is not used.
   */
  function impactImpulse(
    target: Breakable,
    other: Breakable | undefined,
    event: IPhysicsCollisionEvent,
  ): number {
    velocity.copyFrom(target.velocityBefore);
    if (other) velocity.subtractInPlace(other.velocityBefore);
    const closing = event.normal
      ? Math.abs(Vector3.Dot(velocity, event.normal))
      : velocity.length();
    const mass = target.def.massKg;
    const involved = other ? (mass * other.def.massKg) / (mass + other.def.massKg) : mass;
    return closing * involved;
  }

  function onCollision(target: Breakable, event: IPhysicsCollisionEvent): void {
    if (target.broken || event.type !== PhysicsEventType.COLLISION_STARTED) return;

    const other = byBody.get(event.collidedAgainst);
    if (other && !other.broken) {
      other.aggregate.body.getLinearVelocityToRef(velocity);
      if (velocity.length() > CHAIN_MIN_SPEED) target.lastTouch = { by: other.id, at: time };
    }

    const impulse = impactImpulse(target, other, event);
    const y = target.aggregate.body.getObjectCenterWorldToRef(center).y;
    if (breaksOnImpact(target.def.break, target.state, impulse, y)) {
      queueBreak(target, chainCause(target));
      return;
    }

    // A thud for landings that do not break: an impulse as if dropped from about 5 cm or more.
    if (impulse > target.def.massKg && time - target.lastThudAt > THUD_GAP_SEC) {
      target.lastThudAt = time;
      const volume = Math.min(1, impulse / (target.def.massKg * 4));
      bus.emit('audio/play', {
        cue: `impact_${target.def.material}`,
        position: toVec3(center),
        volume,
      });
    }
  }

  function shardColor(target: Breakable): Color3 {
    // Code-built rooms color their meshes per vertex; the first part is the prop's body.
    const colors = target.mesh.getVerticesData(VertexBuffer.ColorKind);
    if (colors && colors.length >= 3) {
      return new Color3(colors[0] ?? 1, colors[1] ?? 1, colors[2] ?? 1);
    }
    const material = target.mesh.material;
    if (material && 'diffuseColor' in material && material.diffuseColor instanceof Color3) {
      return material.diffuseColor;
    }
    return MATERIALS[target.def.material].color;
  }

  /** Tablecloth pull: everything standing on the cloth is yanked toward the trigger marker. */
  function pullTablecloth(cloth: Breakable, min: Vector3, max: Vector3): void {
    const marker = cloth.def.break.kind === 'trigger' ? cloth.def.break.triggerId : undefined;
    const toward = marker ? triggerMarkers.get(marker) : undefined;
    const pull = toward ? toward.subtract(center) : Vector3.Right();
    pull.y = 0;
    pull.normalize();

    for (const other of breakables.values()) {
      if (other === cloth || other.broken) continue;
      const position = other.aggregate.body.getObjectCenterWorld();
      const onCloth =
        position.x > min.x - 0.05 &&
        position.x < max.x + 0.05 &&
        position.z > min.z - 0.05 &&
        position.z < max.z + 0.05 &&
        position.y > min.y &&
        position.y < max.y + 0.6;
      if (!onCloth) continue;
      releaseWobble(other);
      // Enough to carry an object about 0.6 m, clear of a desk or table edge.
      const impulse = pull
        .scale(2.2)
        .addInPlaceFromFloats(0, 1.4, 0)
        .scaleInPlace(other.def.massKg);
      other.aggregate.body.applyImpulse(impulse, position.addInPlaceFromFloats(0, 0.03, 0));
      other.aggregate.body.getLinearVelocityToRef(other.velocityBefore);
    }
  }

  function breakNow(target: Breakable, causedBy?: string): void {
    const { def, mesh, aggregate } = target;
    const { body } = aggregate;
    body.getObjectCenterWorldToRef(center);
    body.getLinearVelocityToRef(velocity);
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    const extent = box.maximumWorld.subtract(box.minimumWorld).scaleInPlace(0.5);
    const position = box.centerWorld.clone();

    target.broken = true;
    target.wobble = undefined;
    byBody.delete(body);
    aggregate.dispose();
    mesh.setEnabled(false);

    const size = Math.min(0.12, Math.max(0.03, Math.max(extent.x, extent.y, extent.z) * 0.5));
    const pieces = def.fractureSet ? fractureSets.get(def.fractureSet) : undefined;
    if (pieces) {
      debris?.pieces(pieces, mesh.getWorldMatrix(), velocity, def.massKg);
    } else {
      debris?.burst({
        position,
        extent,
        velocity,
        count: SHARDS_PER_TIER[def.tier],
        color: shardColor(target),
        size,
        speed: 1.5,
      });
    }

    switch (def.special) {
      case 'liquid':
        debris?.burst({
          position,
          extent,
          velocity,
          count: 6,
          color: LIQUID_COLOR,
          size: 0.03,
          speed: 2,
          lift: 1.5,
          lifeSec: 1.5,
        });
        bus.emit('audio/play', { cue: 'splash', position: toVec3(position) });
        break;
      case 'electronic_spark':
        debris?.burst({
          position,
          extent,
          velocity,
          count: 8,
          color: SPARK_COLOR,
          size: 0.02,
          speed: 3,
          lift: 3,
          lifeSec: 0.5,
        });
        bus.emit('audio/play', { cue: 'spark', position: toVec3(position) });
        break;
      case 'tablecloth':
        pullTablecloth(target, box.minimumWorld, box.maximumWorld);
        break;
    }

    bus.emit('audio/play', { cue: `break_${def.material}`, position: toVec3(position) });
    if (def.tier === 'heavy') bus.emit('juice/shake', { intensity: 0.3, durationMs: 150 });
    if (def.tier === 'treasure') bus.emit('juice/shake', { intensity: 0.6, durationMs: 300 });
    bus.emit('object/broken', {
      objectId: target.id,
      defId: def.id,
      coins: def.coins,
      isTreasure: def.tier === 'treasure',
      position: toVec3(position),
      ...(causedBy ? { causedBy } : {}),
    });
  }

  function update(): void {
    const { scene, engine: renderEngine } = services.scene;
    if (!scene.physicsEnabled) return; // paused
    const dt = Math.min(renderEngine.getDeltaTime() / 1000, MAX_FRAME_SEC);
    time += dt;

    for (const target of breakables.values()) {
      if (target.broken) continue;
      const { body } = target.aggregate;

      if (target.wobble) {
        if (time >= target.wobble.until) {
          releaseWobble(target);
        } else {
          // Hold in place and rock about the edge.
          const phase = (time - target.wobble.startedAt) * WOBBLE_HZ * Math.PI * 2;
          body.setLinearVelocity(Vector3.ZeroReadOnly);
          body.setAngularVelocity(target.wobble.axis.scale(Math.cos(phase) * WOBBLE_ROCK));
        }
        continue;
      }

      body.getObjectCenterWorldToRef(center);
      if (center.y < OUT_OF_ROOM_Y) {
        // Fell out of the room: break it so its coins still count and Free Soul can end.
        queueBreak(target);
        continue;
      }
      body.getLinearVelocityToRef(velocity);
      body.getAngularVelocityToRef(spin);
      const resting = velocity.length() < REST_SPEED && spin.length() < REST_SPIN;
      trackHeight(target.state, center.y, resting);

      if (resting) target.wobbleUsed = false;
      else if (!target.wobbleUsed) tryStartWobble(target);
    }

    for (const { target, causedBy } of breakQueue.splice(0)) {
      if (!target.broken) breakNow(target, causedBy);
    }
    debris?.update(dt);
  }

  function addBreakable(mesh: AbstractMesh, def: ObjectDef): void {
    if (breakables.has(mesh.name)) throw new Error(`Duplicate breakable mesh name '${mesh.name}'`);
    const props = MATERIALS[def.material];
    const aggregate = new PhysicsAggregate(
      mesh,
      PhysicsShapeType.CONVEX_HULL,
      { mass: def.massKg, friction: props.friction, restitution: props.restitution },
      services.scene.scene,
    );
    const { body } = aggregate;
    body.setLinearDamping(0.05);
    // Rolling objects keep spinning; everything else settles quickly.
    body.setAngularDamping(def.special === 'rolling' ? 0.02 : 0.4);
    body.setCollisionCallbackEnabled(true);

    const target: Breakable = {
      id: mesh.name,
      def,
      mesh,
      aggregate,
      state: createBreakState(body.getObjectCenterWorld().y),
      broken: false,
      breakQueued: false,
      lastSwatAt: -Infinity,
      lastThudAt: -Infinity,
      velocityBefore: new Vector3(),
      wobbleUsed: false,
    };
    body.getCollisionObservable().add((event) => onCollision(target, event));
    breakables.set(target.id, target);
    byBody.set(body, target);
  }

  function unloadRoom(): void {
    for (const target of breakables.values()) {
      if (!target.broken) target.aggregate.dispose();
    }
    for (const aggregate of statics) aggregate.dispose();
    breakables.clear();
    byBody.clear();
    statics.length = 0;
    breakQueue.length = 0;
    fractureSets.clear();
    triggerMarkers.clear();
    debris?.clear();
  }

  function loadRoom(room: RoomAssets): number {
    unloadRoom();
    const { scene } = services.scene;
    const defs = new Map(room.objects.map((def) => [def.id, def]));

    for (const { marker, node } of room.markers) {
      if (marker.startsWith('trigger:')) {
        triggerMarkers.set(marker.slice('trigger:'.length), node.getAbsolutePosition().clone());
      }
    }

    // Pre-fractured pieces are templates: hidden, no collider, cloned when their object breaks.
    const templates = new Set<AbstractMesh>();
    const fractureNames = new Set(room.objects.map((def) => def.fractureSet));
    for (const node of room.root.getChildTransformNodes(false)) {
      if (!fractureNames.has(node.name)) continue;
      const pieces = node.getChildMeshes(false);
      fractureSets.set(node.name, pieces);
      for (const piece of pieces) templates.add(piece);
      node.setEnabled(false);
    }

    for (const mesh of room.meshes) {
      if (templates.has(mesh)) continue;
      const defId = readExtras(mesh).obj;
      if (defId === undefined) {
        statics.push(new PhysicsAggregate(mesh, PhysicsShapeType.MESH, { mass: 0 }, scene));
        continue;
      }
      const def = defs.get(defId);
      if (!def) throw new Error(`Mesh '${mesh.name}' refers to unknown object '${defId}'`);
      addBreakable(mesh, def);
    }
    return breakables.size;
  }

  return {
    async init() {
      const { scene } = services.scene;
      const havok = await HavokPhysics({ locateFile: () => havokWasmUrl });
      if (!scene.enablePhysics(GRAVITY, new HavokPlugin(true, havok))) {
        throw new Error('Could not enable Havok physics on the scene');
      }
      engine = scene.getPhysicsEngine() as PhysicsEngine;
      // Fixed 60 Hz steps: a slow frame (up to 100 ms) otherwise moves a falling object far
      // enough in one step to sink into thin static geometry.
      engine.setSubTimeStep(STEP_MS);

      debris = createDebris(scene, engine, () => services.quality.settings.debrisCap);
      scene.onBeforePhysicsObservable.add(recordVelocities);
      scene.onBeforeRenderObservable.add(update);
      bus.on('game/paused', ({ paused }) => {
        scene.physicsEnabled = !paused;
      });
    },

    loadRoom,
    unloadRoom,

    applyImpulse(objectId, impulse, at) {
      const target = breakables.get(objectId);
      if (!target || target.broken) return;
      releaseWobble(target);

      const { body } = target.aggregate;
      const force = new Vector3(impulse.x, impulse.y, impulse.z);
      const point = at ? new Vector3(at.x, at.y, at.z) : body.getObjectCenterWorld();
      if (!at && target.def.special === 'stack') {
        // Stacks are hit near the top, so they topple instead of sliding.
        target.mesh.computeWorldMatrix(true);
        point.y = target.mesh.getBoundingInfo().boundingBox.maximumWorld.y;
      }
      body.applyImpulse(force, point);
      // The swat itself is not a collision: do not let it count toward the impact rule.
      body.getLinearVelocityToRef(target.velocityBefore);
      target.lastSwatAt = time;

      const strength = force.length();
      bus.emit('object/hit', { objectId, force: strength });
      bus.emit('audio/play', {
        cue: `hit_${target.def.material}`,
        position: toVec3(point),
        volume: Math.min(1, Math.max(0.2, strength / 5)),
      });
      const { def, state } = target;
      if (breaksOnHit(def.break, state, def.tier) || breaksOnBlow(def.break, strength)) {
        queueBreak(target);
      }
    },

    objectsInRadius(origin, radius) {
      const found: PhysicsObjectInfo[] = [];
      for (const target of breakables.values()) {
        if (target.broken) continue;
        // A cheap first pass on the body's origin, then the exact center from the bounds (a
        // prop's origin is at its base, not its middle).
        target.aggregate.body.getObjectCenterWorldToRef(center);
        const rough = Math.hypot(center.x - origin.x, center.y - origin.y, center.z - origin.z);
        if (rough > radius + 1) continue;
        target.mesh.computeWorldMatrix(true);
        const box = target.mesh.getBoundingInfo().boundingBox;
        const middle = box.centerWorld;
        const distance = Math.hypot(middle.x - origin.x, middle.y - origin.y, middle.z - origin.z);
        if (distance <= radius) {
          found.push({
            objectId: target.id,
            defId: target.def.id,
            position: toVec3(middle),
            halfHeight: box.extendSizeWorld.y,
          });
        }
      }
      return found;
    },

    fireTrigger(triggerId) {
      for (const target of breakables.values()) {
        if (breaksOnTrigger(target.def.break, triggerId)) queueBreak(target);
      }
    },

    remainingBreakables() {
      let remaining = 0;
      for (const target of breakables.values()) {
        if (!target.broken) remaining++;
      }
      return remaining;
    },

    awakeBodyCount() {
      let awake = 0;
      for (const target of breakables.values()) {
        if (target.broken) continue;
        target.aggregate.body.getLinearVelocityToRef(velocity);
        if (velocity.length() > AWAKE_SPEED) awake++;
      }
      return awake;
    },
  };
};
