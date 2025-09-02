// src/pages/Visualisation.js
import React, { useRef, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { database } from "../firebase"; // Assure-toi que database est exporté depuis firebase.js
import { ref, onValue } from "firebase/database";

function Capteur({ name, color }) {
  const meshRef = useRef();
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.material.color.set(color);
    }
  }, [color]);
  return <mesh ref={meshRef} name={name}><boxGeometry args={[0.1, 0.1, 0.1]} /><meshStandardMaterial color={color} /></mesh>;
}

function Batterie() {
  const { scene, nodes } = useGLTF("/batterie.glb"); // mettre le fichier .glb dans public/
  const capteurRefs = useRef({});

  const [couleurs, setCouleurs] = useState({
    Cap_Temp: "blue",
    Cap_Tension: "green",
    Cap_Courant: "orange",
    Cap_SOC: "red",
  });

  // Lecture Firebase
  useEffect(() => {
    const dataRef = ref(database, "trajet/0/data"); // adapter le chemin Firebase
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const dernier = data[data.length - 1];
      if (!dernier) return;

      setCouleurs({
        Cap_Temp: dernier.hv_temp_min > 30 ? "red" : "blue",
        Cap_Tension: dernier.hv_battery_voltage > 400 ? "red" : "green",
        Cap_Courant: dernier.hv_battery_current > 50 ? "red" : "orange",
        Cap_SOC: dernier.hv_soc < 20 ? "red" : "red",
      });
    });

    return () => unsubscribe();
  }, []);

  // Assignation des refs aux capteurs du GLB
  useEffect(() => {
    ["Cap_Temp", "Cap_Tension", "Cap_Courant", "Cap_SOC"].forEach((name) => {
      const obj = scene.getObjectByName(name);
      if (obj) capteurRefs.current[name] = obj;
    });

    Object.entries(couleurs).forEach(([name, color]) => {
      if (capteurRefs.current[name]) {
        capteurRefs.current[name].material.color.set(color);
      }
    });
  }, [scene, couleurs]);

  return <primitive object={scene} />;
}

export default function Visualisation() {
  return (
    <Canvas camera={{ position: [2, 2, 5], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} />
      <Suspense fallback={null}>
        <Batterie />
      </Suspense>
      <OrbitControls />
    </Canvas>
  );
}




/*import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useRef, useState, Suspense } from 'react';
import { ref, query, limitToLast, onValue } from 'firebase/database';
import { database, auth } from '../firebase';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';

function Scene({ data }) {
  const gltf = useLoader(GLTFLoader, '/batterie.glb');
  const capteurRefs = {
    Cap_Temp: useRef(),
    Cap_Tension: useRef(),
    Cap_Courant: useRef(),
    Cap_SOC: useRef(),
  };

  const targetColors = useRef({
    Cap_Temp: new THREE.Color('green'),
    Cap_Tension: new THREE.Color('green'),
    Cap_Courant: new THREE.Color('green'),
    Cap_SOC: new THREE.Color('green'),
  });

  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child.isMesh && capteurRefs[child.name]) {
        capteurRefs[child.name].current = child;
        child.material = child.material.clone();
      }
    });
  }, [gltf]);

  useEffect(() => {
    if (!data) return;
    targetColors.current.Cap_Temp.set(data.temp >= 50 ? 'red' : 'green');
    targetColors.current.Cap_Tension.set(data.voltage <= 360 ? 'orange' : 'green');
    targetColors.current.Cap_Courant.set(data.current <= -50 ? 'blue' : 'green');
    targetColors.current.Cap_SOC.set(data.soc <= 20 ? 'red' : 'green');
  }, [data]);

  useFrame(() => {
    for (let name in capteurRefs) {
      const mesh = capteurRefs[name].current;
      if (mesh && mesh.material && mesh.material.color) {
        mesh.material.color.lerp(targetColors.current[name], 0.1);
      }
    }
  });

  return <primitive object={gltf.scene} />;
}

export default function Visualisation() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const dbRef = query(ref(database, '/'), limitToLast(1));
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const val = snapshot.val();
      const values = val ? Object.values(val) : [];
      if (values.length > 0) {
        setData(values[0]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      {/* Barre de boutons en overlay */
     /* <div style={{
        position: 'absolute',
        top: '15px',
        left: '15px',
        right: '15px',
        display: 'flex',
        justifyContent: 'space-between',
        zIndex: 10
      }}>
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '8px 15px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🚪 Déconnexion
        </button>

        <button
          onClick={handleBack}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 15px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          ⬅ Retour
        </button>
      </div>

      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <Suspense fallback={null}>
          <Scene data={data} />
        </Suspense>
        <OrbitControls />
      </Canvas>
    </div>
  );
}
*/