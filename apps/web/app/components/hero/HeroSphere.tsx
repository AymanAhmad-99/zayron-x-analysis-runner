"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Palette locked to reference image: dark navy background, burnt-orange nodes/edges.
const NODE_COUNT = 700;
const LINK_DISTANCE = 0.62; // fixed threshold: only nearby nodes connect (neural mesh, not uniform wireframe)
const ROTATION_SPEED = 0.07; // rad/s — ambient, frame-rate independent via delta-time (unchanged by rescale)
const SPHERE_RADIUS = 1.32; // 2.2 × 0.6 = 40% reduction in rendered size

type PulseState = { period: number; phase: number };
type Signal = { edge: number; start: number; duration: number };

function fibonacciSphere(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // 1 → -1, even density, no clustering
    const radius = Math.sqrt(1 - y * y);
    const theta = golden * i;
    positions[i * 3] = Math.cos(theta) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * radius;
  }
  return positions;
}

function NeuralSphere() {
  const pointsRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const { nodePositions, linkIndices, pulses, baseColors } = useMemo(() => {
    const nodePositions = fibonacciSphere(NODE_COUNT);
    const radius = 2.2;

    // Edges: connect nodes within a fixed distance threshold.
    const linkIndices: number[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dx = nodePositions[i * 3] - nodePositions[j * 3];
        const dy = nodePositions[i * 3 + 1] - nodePositions[j * 3 + 1];
        const dz = nodePositions[i * 3 + 2] - nodePositions[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < LINK_DISTANCE * LINK_DISTANCE) {
          linkIndices.push(i, j);
        }
      }
    }

    // Per-node asynchronous pulse parameters (independent sine cycles, 2–5s).
    const pulses: PulseState[] = Array.from({ length: NODE_COUNT }, () => ({
      period: 2 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2,
    }));

    const baseColors = new Float32Array(NODE_COUNT * 3);
    const orange = new THREE.Color("#e8622c");
    for (let i = 0; i < NODE_COUNT; i++) {
      baseColors[i * 3] = orange.r;
      baseColors[i * 3 + 1] = orange.g;
      baseColors[i * 3 + 2] = orange.b;
    }

    return { nodePositions, linkIndices, pulses, baseColors };
  }, []);

  const linkGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(nodePositions.slice(), 3));
    const scaled = new Float32Array(nodePositions.length);
    for (let i = 0; i < nodePositions.length; i++) scaled[i] = nodePositions[i] * SPHERE_RADIUS;
    geo.setAttribute("position", new THREE.BufferAttribute(scaled, 3));
    geo.setIndex(linkIndices);
    return geo;
  }, [nodePositions, linkIndices]);

  const signalState = useRef<{ next: number; active: Signal[] }>({ next: 0, active: [] });
  const lineMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const elapsed = useRef(0);
  const scratchColor = useMemo(() => new THREE.Color("#e8622c"), []);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const t = elapsed.current;

    if (groupRef.current) groupRef.current.rotation.y += ROTATION_SPEED * delta; // delta-time normalized

    if (pointsRef.current) {
      const m = pointsRef.current;
      const dummy = m.userData.dummy as THREE.Object3D;
      for (let i = 0; i < NODE_COUNT; i++) {
        const { period, phase } = pulses[i];
        const glow = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((t / period) * Math.PI * 2 + phase)); // 0.35..1.0, phase-offset
        dummy.position.set(
          nodePositions[i * 3] * SPHERE_RADIUS,
          nodePositions[i * 3 + 1] * SPHERE_RADIUS,
          nodePositions[i * 3 + 2] * SPHERE_RADIUS,
        );
        // radial edge fade: scale falls off for nodes near the sphere boundary (view-space silhouette)
        const edgeFade = 0.35 + 0.65 * (1 - Math.abs(nodePositions[i * 3 + 2]) * 0.5); // soft depth-based falloff
        dummy.scale.setScalar((0.5 + glow * 0.9) * edgeFade);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        // radial edge fade: brightness falls toward 0 near the sphere boundary (soft blend into page background)
        const shadeFade = 0.3 + 0.7 * Math.max(0, 1 - (dummy.position.y / (SPHERE_RADIUS * 1.15)) ** 2 * 0.55);
        scratchColor.setRGB(0.91, 0.38, 0.17).multiplyScalar((0.55 + glow * 0.45) * shadeFade); // locked hue, brightness varies
        m.setColorAt(i, scratchColor);
      }
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }

    // Signal traversal: brightness pulse travels along a random edge every 3–6s.
    const sig = signalState.current;
    if (t >= sig.next) {
      sig.next = t + 3 + Math.random() * 3;
      if (linkIndices.length) {
        sig.active.push({
          edge: Math.floor(Math.random() * (linkIndices.length / 2)) * 2,
          start: t,
          duration: 0.15 + Math.random() * 0.15,
        });
        if (sig.active.length > 4) sig.active.shift();
      }
    }
    if (lineMaterialRef.current && sig.active.length) {
      let boost = 0;
      sig.active = sig.active.filter((s) => t - s.start < s.duration);
      for (const s of sig.active) {
        const p = (t - s.start) / s.duration;
        boost = Math.max(boost, Math.sin(p * Math.PI));
      }
      lineMaterialRef.current.opacity = 0.16 + boost * 0.55;
    }
  });

  const dummy = useMemo(() => new THREE.Object3D(), []);

  return (
    <group ref={groupRef} position={[0, 0.05, 0]}>
      <instancedMesh
        ref={(m) => {
          if (m && !m.userData.dummy) {
            m.userData.dummy = dummy;
            m.userData.baseColor = new THREE.Color("#e8622c");
            const colors = new Float32Array(NODE_COUNT * 3);
            for (let i = 0; i < NODE_COUNT; i++) {
              colors[i * 3] = 0.91;
              colors[i * 3 + 1] = 0.38;
              colors[i * 3 + 2] = 0.17;
            }
            m.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
          }
          pointsRef.current = m;
        }}
        args={[undefined, undefined, NODE_COUNT]}
      >
        <sphereGeometry args={[0.024, 6, 6]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <lineSegments geometry={linkGeometry}>
        <lineBasicMaterial ref={lineMaterialRef} color="#e8622c" transparent opacity={0.22} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

export function HeroSphere() {
  return (
    <div className="hero-sphere" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 5.4], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <NeuralSphere />
      </Canvas>
    </div>
  );
}
