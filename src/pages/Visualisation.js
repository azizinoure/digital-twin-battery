import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useRef, useState, Suspense } from 'react'
import { ref, query, limitToLast, onValue } from 'firebase/database'
import { database } from '../firebase'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'

function Scene({ data }) {
  const gltf = useLoader(GLTFLoader, '/batterie.glb')
  const capteurRefs = {
    Cap_Temp: useRef(),
    Cap_Tension: useRef(),
    Cap_Courant: useRef(),
    Cap_SOC: useRef(),
  }

  const targetColors = useRef({
    Cap_Temp: new THREE.Color('green'),
    Cap_Tension: new THREE.Color('green'),
    Cap_Courant: new THREE.Color('green'),
    Cap_SOC: new THREE.Color('green'),
  })

  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child.isMesh && capteurRefs[child.name]) {
        capteurRefs[child.name].current = child
        child.material = child.material.clone() // important pour éviter d'altérer toute la scène
      }
    })
  }, [gltf])

  // Définir la couleur cible selon les données
  useEffect(() => {
    if (!data) return

    targetColors.current.Cap_Temp.set(data.temp >= 50 ? 'red' : 'green')
    targetColors.current.Cap_Tension.set(data.voltage <= 360 ? 'orange' : 'green')
    targetColors.current.Cap_Courant.set(data.current <= -50 ? 'blue' : 'green')
    targetColors.current.Cap_SOC.set(data.soc <= 20 ? 'red' : 'green')
  }, [data])

  // Animation douce vers la couleur cible
  useFrame(() => {
    for (let name in capteurRefs) {
      const mesh = capteurRefs[name].current
      if (mesh && mesh.material && mesh.material.color) {
        mesh.material.color.lerp(targetColors.current[name], 0.1) // interpolation douce
      }
    }
  })

  return <primitive object={gltf.scene} />
}

export default function Visualisation() {
  const [data, setData] = useState(null)

  useEffect(() => {
    const dbRef = query(ref(database, '/'), limitToLast(1))
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const val = snapshot.val()
      const values = val ? Object.values(val) : []
      if (values.length > 0) {
        setData(values[0])
      }
    })
    return () => unsubscribe()
  }, [])

  return (
    <div style={{ height: '100vh' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <Suspense fallback={null}>
          <Scene data={data} />
        </Suspense>
        <OrbitControls />
      </Canvas>
    </div>
  )
}
