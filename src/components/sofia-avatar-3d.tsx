"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { type Group, type Mesh, MathUtils } from "three";

export type AvatarMood = "idle" | "listen" | "talk";

function SofiaRig({ mood, level }: { mood: AvatarMood; level: number }) {
  const root = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const head = useRef<Group>(null);
  const jaw = useRef<Mesh>(null);
  const lidL = useRef<Mesh>(null);
  const lidR = useRef<Mesh>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const forearmR = useRef<Group>(null);
  const handR = useRef<Group>(null);
  const glow = useRef<Mesh>(null);
  const tBlink = useRef(2.4);

  const skin = useMemo(() => ({ color: "#e6c2ae", roughness: 0.45, metalness: 0.04 }), []);
  const hair = useMemo(() => ({ color: "#2a1c16", roughness: 0.55, metalness: 0.08 }), []);
  const cloth = useMemo(() => ({ color: "#141c2c", roughness: 0.35, metalness: 0.25 }), []);
  const gold = useMemo(() => ({ color: "#d4a84b", roughness: 0.28, metalness: 0.7 }), []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const talk = mood === "talk" ? 1 : 0;
    const listen = mood === "listen" ? 1 : 0;
    const amp = talk ? 0.35 + level * 0.85 : 0;

    if (root.current) {
      root.current.rotation.y = Math.sin(t * 0.35) * 0.08 + Math.sin(t * 2.2) * talk * 0.05;
      root.current.position.y = Math.sin(t * 1.4) * 0.02;
    }
    if (torso.current) {
      torso.current.rotation.x = Math.sin(t * 1.5) * 0.03 + listen * 0.08 + Math.sin(t * 6) * talk * 0.02;
      torso.current.position.y = Math.sin(t * 1.6) * 0.015;
    }
    if (head.current) {
      head.current.rotation.x = listen * 0.12 + Math.sin(t * 3.1) * talk * 0.08 - 0.04;
      head.current.rotation.z = Math.sin(t * 1.1) * 0.04 + Math.sin(t * 5) * talk * 0.05;
      head.current.rotation.y = Math.sin(t * 0.9) * 0.06;
    }
    if (jaw.current) {
      const open = amp * (0.55 + 0.45 * Math.abs(Math.sin(t * 14)));
      jaw.current.position.y = -0.14 - open * 0.07;
      jaw.current.scale.y = 0.55 + open * 0.7;
    }
    tBlink.current -= delta;
    const blink = tBlink.current < 0.12 ? Math.max(0.08, tBlink.current / 0.12) : 1;
    if (tBlink.current < 0) tBlink.current = 2.1 + Math.random() * 3;
    if (lidL.current) lidL.current.scale.y = blink;
    if (lidR.current) lidR.current.scale.y = blink;

    if (armR.current) {
      armR.current.rotation.z = -0.25 - talk * 0.85 - Math.sin(t * 4.5) * talk * 0.35;
      armR.current.rotation.x = talk * 0.35 + Math.sin(t * 3.2) * talk * 0.25;
    }
    if (forearmR.current) {
      forearmR.current.rotation.x = 0.25 + talk * 0.7 + Math.sin(t * 5.5) * talk * 0.4;
    }
    if (handR.current) {
      handR.current.rotation.z = Math.sin(t * 8) * talk * 0.5;
    }
    if (armL.current) {
      armL.current.rotation.z = 0.28 + listen * 0.15 + Math.sin(t * 2.4) * talk * 0.12;
      armL.current.rotation.x = listen * -0.1;
    }
    if (glow.current) {
      const s = 1.05 + talk * 0.25 + Math.sin(t * 3) * 0.08 + level * 0.35;
      glow.current.scale.setScalar(s);
      const mat = glow.current.material as { opacity: number };
      mat.opacity = 0.18 + talk * 0.28 + listen * 0.12;
    }
  });

  return (
    <group ref={root} position={[0, -1.15, 0]}>
      <mesh ref={glow} position={[0, 1.15, -0.55]}>
        <sphereGeometry args={[1.15, 32, 32]} />
        <meshBasicMaterial color="#d4a84b" transparent opacity={0.2} />
      </mesh>

      <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.42, 0.55, 0.7, 20]} />
        <meshStandardMaterial {...cloth} />
      </mesh>
      <mesh position={[0, 0.52, 0.02]}>
        <sphereGeometry args={[0.34, 24, 24]} />
        <meshStandardMaterial {...cloth} />
      </mesh>
      <mesh position={[0, 0.62, 0.22]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.42, 0.08, 0.08]} />
        <meshStandardMaterial {...gold} />
      </mesh>

      <group ref={torso}>
        <group ref={armL} position={[-0.38, 0.72, 0]}>
          <mesh position={[0, -0.22, 0]}>
            <capsuleGeometry args={[0.07, 0.28, 6, 12]} />
            <meshStandardMaterial {...skin} />
          </mesh>
          <mesh position={[0, -0.48, 0.04]}>
            <capsuleGeometry args={[0.06, 0.24, 6, 12]} />
            <meshStandardMaterial {...skin} />
          </mesh>
        </group>
        <group ref={armR} position={[0.38, 0.72, 0]}>
          <mesh position={[0, -0.22, 0]}>
            <capsuleGeometry args={[0.07, 0.28, 6, 12]} />
            <meshStandardMaterial {...skin} />
          </mesh>
          <group ref={forearmR} position={[0, -0.38, 0]}>
            <mesh position={[0, -0.16, 0]}>
              <capsuleGeometry args={[0.06, 0.22, 6, 12]} />
              <meshStandardMaterial {...skin} />
            </mesh>
            <group ref={handR} position={[0, -0.32, 0.02]}>
              <mesh>
                <sphereGeometry args={[0.07, 12, 12]} />
                <meshStandardMaterial {...skin} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      <group ref={head} position={[0, 1.08, 0]}>
        <mesh>
          <sphereGeometry args={[0.28, 32, 32]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        <mesh position={[0, 0.12, -0.02]}>
          <sphereGeometry args={[0.29, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
          <meshStandardMaterial {...hair} />
        </mesh>
        <mesh position={[0.2, 0.02, -0.05]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial {...hair} />
        </mesh>
        <mesh position={[-0.2, 0.02, -0.05]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial {...hair} />
        </mesh>
        <mesh position={[0, 0.06, -0.16]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial {...hair} />
        </mesh>

        <mesh position={[-0.09, 0.04, 0.22]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color="#f5efe8" />
        </mesh>
        <mesh position={[0.09, 0.04, 0.22]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color="#f5efe8" />
        </mesh>
        <mesh position={[-0.09, 0.04, 0.25]}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshStandardMaterial color="#1b3a4a" />
        </mesh>
        <mesh position={[0.09, 0.04, 0.25]}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshStandardMaterial color="#1b3a4a" />
        </mesh>
        <mesh ref={lidL} position={[-0.09, 0.055, 0.23]}>
          <sphereGeometry args={[0.038, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        <mesh ref={lidR} position={[0.09, 0.055, 0.23]}>
          <sphereGeometry args={[0.038, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial {...skin} />
        </mesh>

        <mesh position={[0, -0.02, 0.26]} rotation={[0.2, 0, 0]}>
          <coneGeometry args={[0.035, 0.08, 10]} />
          <meshStandardMaterial color="#d7a090" />
        </mesh>
        <mesh ref={jaw} position={[0, -0.14, 0.2]}>
          <capsuleGeometry args={[0.05, 0.04, 6, 12]} />
          <meshStandardMaterial color="#b45c5c" />
        </mesh>
      </group>
    </group>
  );
}

export function SofiaAvatar3D({
  mood,
  level = 0,
}: {
  mood: AvatarMood;
  level?: number;
}) {
  const amp = MathUtils.clamp(level, 0, 1);
  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-t-[1.6rem] bg-gradient-to-b from-[#0b1220] to-[#101827]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,168,75,0.22),transparent_58%)]" />
      <Canvas camera={{ position: [0, 0.35, 3.15], fov: 32 }} dpr={[1, 1.8]}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[2.5, 3, 2]} intensity={1.35} color="#fff6e8" />
        <directionalLight position={[-2, 1, 1]} intensity={0.35} color="#7dd3fc" />
        <pointLight position={[0, 0.2, 1.4]} intensity={mood === "talk" ? 1.2 : 0.4} color="#d4a84b" />
        <SofiaRig mood={mood} level={amp} />
      </Canvas>
    </div>
  );
}
