// Debris pool, capped by the quality tier; the oldest piece is recycled first. Pieces live for a
// few seconds, then shrink away.
//
// Generic shards are instances of one mesh (one draw call) and are not rigid bodies: each one
// flies on its own and bounces off the physics world with a raycast along its path. That cannot
// tunnel through thin geometry the way a tiny fast body does, costs far less than 150 bodies on a
// phone, and never wakes a sleeping body. Pre-fractured pieces are bigger, so they are real bodies.
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Space } from '@babylonjs/core/Maths/math.axis';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/instancedMesh';
import type { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import type { PhysicsEngine } from '@babylonjs/core/Physics/v2/physicsEngine';
import type { Scene } from '@babylonjs/core/scene';

export const DEBRIS_LIFE_SEC = 4;
const SHRINK_SEC = 0.35;
const KILL_Y = -10; // anything that leaves the room downward is removed

const GRAVITY = -9.81;
const BOUNCE = 0.3;
const SLIDE = 0.6; // share of the speed along the surface kept on a bounce
const REST_SPEED = 0.5; // m/s; slower than this on a floor-like surface, the shard stays put
const FLOOR_NORMAL_Y = 0.7;
const THICKNESS = 0.45; // shard height relative to its edge length
const SPAWN_LIFT = 0.03; // m

export interface BurstOptions {
  /** Center of the burst and the half-size of the box the shards start in. */
  position: Vector3;
  extent: Vector3;
  /** Velocity of the broken object, inherited by the shards. */
  velocity: Vector3;
  count: number;
  color: Color3;
  /** Shard edge length in meters. */
  size: number;
  /** Extra speed away from the center, m/s. */
  speed: number;
  /** Extra upward speed, m/s. */
  lift?: number;
  lifeSec?: number;
}

export interface DebrisSystem {
  /** Spawns generic shards. */
  burst(options: BurstOptions): void;
  /**
   * Spawns clones of pre-fractured pieces. `pieces` are templates placed relative to the object's
   * origin; `world` is the broken object's world matrix.
   */
  pieces(pieces: AbstractMesh[], world: Matrix, velocity: Vector3, massKg: number): void;
  update(dt: number): void;
  clear(): void;
  dispose(): void;
  readonly activeCount: number;
}

interface Entry {
  node: AbstractMesh;
  scale: Vector3;
  age: number;
  life: number;
  /** Pre-fractured piece: a real body; the clone is disposed when it expires. */
  aggregate?: PhysicsAggregate;
  /** Generic shard: moved by `update`; the instance returns to the pool when it expires. */
  flight?: { velocity: Vector3; spinAxis: Vector3; spin: number; resting: boolean };
}

const random = (min: number, max: number) => min + Math.random() * (max - min);

export function createDebris(
  scene: Scene,
  physics: PhysicsEngine,
  getCap: () => number,
): DebrisSystem {
  // A triangular prism reads as a chunky shard.
  const source = CreateCylinder(
    'debris-shard',
    { height: 1, diameter: 1.4, tessellation: 3 },
    scene,
  );
  source.convertToFlatShadedMesh();
  const material = new StandardMaterial('debris', scene);
  material.specularColor = Color3.Black();
  source.material = material;
  source.registerInstancedBuffer('color', 4);
  source.instancedBuffers.color = new Color4(1, 1, 1, 1);
  source.isVisible = false;

  const active: Entry[] = []; // oldest first
  const free: InstancedMesh[] = [];
  let created = 0;

  const step = new Vector3();
  const target = new Vector3();
  const hit = new PhysicsRaycastResult();

  function expire(entry: Entry): void {
    if (entry.aggregate) {
      entry.aggregate.dispose();
      entry.node.dispose();
    } else {
      entry.node.setEnabled(false);
      free.push(entry.node as InstancedMesh);
    }
  }

  function makeRoom(): void {
    const cap = Math.max(1, getCap());
    while (active.length >= cap) {
      const oldest = active.shift();
      if (oldest) expire(oldest);
    }
  }

  function fly(entry: Entry, flight: NonNullable<Entry['flight']>, dt: number): void {
    const { node } = entry;
    const { velocity } = flight;
    velocity.y += GRAVITY * dt;
    velocity.scaleToRef(dt, step);

    // Look ahead by half the shard's thickness so it stops on the surface, not in it.
    const reach = entry.scale.y / 2;
    const distance = step.length();
    if (distance === 0) return;
    target
      .copyFrom(step)
      .scaleInPlace((distance + reach) / distance)
      .addInPlace(node.position);
    physics.raycastToRef(node.position, target, hit);

    if (!hit.hasHit) {
      node.position.addInPlace(step);
    } else {
      const normal = hit.hitNormalWorld;
      node.position.copyFrom(hit.hitPointWorld).addInPlace(normal.scale(reach));
      const into = Vector3.Dot(velocity, normal);
      if (into < 0) {
        // Split into the part along the normal (bounces) and along the surface (slides).
        const along = velocity.subtract(normal.scale(into)).scaleInPlace(SLIDE);
        velocity.copyFrom(along).addInPlace(normal.scale(-into * BOUNCE));
      }
      flight.spin *= 0.5;
      if (normal.y > FLOOR_NORMAL_Y && velocity.length() < REST_SPEED) flight.resting = true;
    }
    node.rotate(flight.spinAxis, flight.spin * dt, Space.WORLD);
  }

  return {
    burst({ position, extent, velocity, count, color, size, speed, lift = 1, lifeSec }) {
      for (let index = 0; index < count; index++) {
        makeRoom();
        const node = free.pop() ?? source.createInstance(`debris-${created++}`);
        node.setEnabled(true);

        // Start in the upper half of the object, clear of whatever it is lying on.
        const offset = new Vector3(random(-1, 1), random(0, 1), random(-1, 1));
        node.position.copyFrom(position).addInPlace(offset.multiply(extent));
        node.position.y += size * THICKNESS;
        node.rotationQuaternion = Quaternion.FromEulerAngles(
          random(0, Math.PI * 2),
          random(0, Math.PI * 2),
          random(0, Math.PI * 2),
        );
        const edge = size * random(0.7, 1.3);
        node.scaling.set(edge, edge * THICKNESS, edge);
        node.instancedBuffers.color = new Color4(color.r, color.g, color.b, 1);

        const away = offset.normalize().scaleInPlace(speed * random(0.5, 1));
        away.y = Math.abs(away.y) + lift * random(0.5, 1);
        active.push({
          node,
          scale: node.scaling.clone(),
          age: 0,
          life: lifeSec ?? DEBRIS_LIFE_SEC,
          flight: {
            velocity: away.addInPlace(velocity),
            spinAxis: new Vector3(random(-1, 1), random(-1, 1), random(-1, 1)).normalize(),
            spin: random(4, 12),
            resting: false,
          },
        });
      }
    },

    pieces(pieces, world, velocity, massKg) {
      for (const template of pieces) {
        makeRoom();
        const node = template.clone(`${template.name}-debris-${created++}`, null);
        if (!node) continue;
        node.parent = null; // a clone keeps the template's parent, which is disabled
        node.setEnabled(true);
        // Local transform of the template (relative to the object's origin) into world space.
        const local = Matrix.Compose(
          template.scaling,
          template.rotationQuaternion ?? Quaternion.FromEulerVector(template.rotation),
          template.position,
        );
        node.rotationQuaternion = new Quaternion();
        local.multiply(world).decompose(node.scaling, node.rotationQuaternion, node.position);
        // A body that starts touching static geometry can be pushed out through its far side.
        node.position.y += SPAWN_LIFT;

        const aggregate = new PhysicsAggregate(
          node,
          PhysicsShapeType.CONVEX_HULL,
          { mass: massKg / pieces.length, friction: 0.7, restitution: 0.2 },
          scene,
        );
        const away = new Vector3(random(-1, 1), random(0.2, 1), random(-1, 1));
        aggregate.body.setLinearVelocity(away.addInPlace(velocity));
        aggregate.body.setAngularVelocity(new Vector3(random(-6, 6), random(-6, 6), random(-6, 6)));
        active.push({
          node,
          scale: node.scaling.clone(),
          age: 0,
          life: DEBRIS_LIFE_SEC,
          aggregate,
        });
      }
    },

    update(dt) {
      for (let index = active.length - 1; index >= 0; index--) {
        const entry = active[index];
        if (!entry) continue;
        if (entry.flight && !entry.flight.resting) fly(entry, entry.flight, dt);

        entry.age += dt;
        const fade = (entry.age - entry.life) / SHRINK_SEC;
        if (fade >= 1 || entry.node.position.y < KILL_Y) {
          expire(entry);
          active.splice(index, 1);
        } else if (fade > 0) {
          entry.scale.scaleToRef(1 - fade, entry.node.scaling);
        }
      }
    },

    clear() {
      for (const entry of active) expire(entry);
      active.length = 0;
    },

    dispose() {
      this.clear();
      for (const node of free) node.dispose();
      free.length = 0;
      source.dispose(false, true);
    },

    get activeCount() {
      return active.length;
    },
  };
}
