import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/* ===================== STARFIELD ===================== */
function Starfield({ numStars = 4500 }) {
  const starsRef = useRef();

  const starGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(numStars * 3);
    const colors = new Float32Array(numStars * 3);

    for (let i = 0; i < numStars; i++) {
      const i3 = i * 3;
      const radius = Math.random() * 500 + 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const c = new THREE.Color();
      c.setHSL(0.6, 0.2, Math.random());
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, [numStars]);

  return (
    <points ref={starsRef} geometry={starGeometry}>
      <pointsMaterial size={1.5} vertexColors transparent opacity={0.8} />
    </points>
  );
}

/* ===================== EARTH ===================== */
function InteractiveVertexEarth() {
  const globeGroupRef = useRef();
  const globeRef = useRef();
  const pointsRef = useRef();
  const [mouseUV] = useState(() => new THREE.Vector2(0.0, 0.0));
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  
  const { camera, size } = useThree();
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);

  // Load textures
  const otherMap = useMemo(() => textureLoader.load("/textures/04_rainbow1k.jpg"), [textureLoader]);
  const colorMap = useMemo(() => textureLoader.load("/textures/00_earthmap1k.jpg"), [textureLoader]);
  const elevMap = useMemo(() => textureLoader.load("/textures/01_earthbump1k.jpg"), [textureLoader]);
  const alphaMap = useMemo(() => textureLoader.load("/textures/02_earthspec1k.jpg"), [textureLoader]);

  // Geometries
  const wireframeGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 16), []);
  const pointsGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 120), []);

  // Shader uniforms
  const uniforms = useMemo(() => ({
    size: { value: 4.0 },
    colorTexture: { value: colorMap },
    otherTexture: { value: otherMap },
    elevTexture: { value: elevMap },
    alphaTexture: { value: alphaMap },
    mouseUV: { value: mouseUV }
  }), [colorMap, otherMap, elevMap, alphaMap, mouseUV]);

  // Vertex shader with mouse interaction
  const vertexShader = `
    uniform float size;
    uniform sampler2D elevTexture;
    uniform vec2 mouseUV;

    varying vec2 vUv;
    varying float vVisible;
    varying float vDist;

    void main() {
      vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
      float elv = texture2D(elevTexture, vUv).r;
      vec3 vNormal = normalMatrix * normal;
      vVisible = step(0.0, dot( -normalize(mvPosition.xyz), normalize(vNormal)));
      mvPosition.z += 0.35 * elv;

      float dist = distance(mouseUV, vUv);
      float zDisp = 0.0;
      float thresh = 0.04;
      if (dist < thresh) {
        zDisp = (thresh - dist) * 10.0;
      }
      vDist = dist;
      mvPosition.z += zDisp;

      gl_PointSize = size;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  // Fragment shader with color mixing
  const fragmentShader = `
    uniform sampler2D colorTexture;
    uniform sampler2D alphaTexture;
    uniform sampler2D otherTexture;

    varying vec2 vUv;
    varying float vVisible;
    varying float vDist;

    void main() {
      if (floor(vVisible + 0.1) == 0.0) discard;
      float alpha = 1.0 - texture2D(alphaTexture, vUv).r;
      vec3 color = texture2D(colorTexture, vUv).rgb;
      vec3 other = texture2D(otherTexture, vUv).rgb;
      float thresh = 0.04;
      if (vDist < thresh) {
        color = mix(color, other, (thresh - vDist) * 50.0);
      }
      gl_FragColor = vec4(color, alpha);
    }
  `;

  // Handle raycasting and mouse interaction
  const handleRaycast = () => {
    if (globeRef.current && pointsRef.current) {
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects([globeRef.current], false);
      if (intersects.length > 0 && intersects[0].uv) {
        mouseUV.copy(intersects[0].uv);
      }
    }
  };

  // Handle mouse movement
  const handlePointerMove = (event) => {
    pointer.x = (event.clientX / size.width) * 2 - 1;
    pointer.y = -(event.clientY / size.height) * 2 + 1;
  };

  // Animate rotation and raycasting
  useFrame(() => {
    if (globeGroupRef.current) {
      globeGroupRef.current.rotation.y += 0.002;
    }
    handleRaycast();
  });

  // Add mouse move listener
  useMemo(() => {
    window.addEventListener('mousemove', handlePointerMove);
    return () => window.removeEventListener('mousemove', handlePointerMove);
  }, [size]);

  return (
    <group ref={globeGroupRef}>
      {/* Wireframe globe for raycasting */}
      <mesh ref={globeRef} geometry={wireframeGeo}>
        <meshBasicMaterial
          color={0x0099ff}
          wireframe={true}
          transparent={true}
          opacity={0.1}
        />
      </mesh>
      
      {/* Point cloud with interactive shaders */}
      <points ref={pointsRef} geometry={pointsGeo}>
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent={true}
        />
      </points>
    </group>
  );
}



/* ===================== HERO + SEARCH ===================== */
function HeroWithSearch({ onSubmitQuery, onError }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });

      if (!res.ok) {
        throw new Error("Server error");
      }

      const data = await res.json();
      onSubmitQuery(data);
    } catch (err) {
      console.error(err);
      onError("Failed to fetch results. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10,
        textAlign: "center",
        width: "100%",
        maxWidth: 720,
        padding: "0 16px",
        animation: "fadeIn 0.6s ease-out",
      }}
    >
      <h1 style={{ fontSize: "3rem", color: "#fff", marginBottom: 10 }}>
        Find the right climate scenario data
      </h1>

      <p style={{ color: "#cbd5f5", marginBottom: 26 }}>
        Search across global climate data providers
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(14px)",
          borderRadius: 14,
          padding: "12px 14px",
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="population india ssp2 2020 2050"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#fff",
            fontSize: 16,
          }}
        />

        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            background: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            fontWeight: 600,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -46%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </div>
  );
}


/* ===================== PAGE ===================== */
export default function QueryPage({ onSubmitQuery }) {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
        <hemisphereLight args={[0xffffff, 0x080820, 3]} />
        <Starfield />
        <InteractiveVertexEarth />
        <OrbitControls enableZoom={false} />
      </Canvas>

      <HeroWithSearch onSubmitQuery={onSubmitQuery} />
    </div>
  );
}
