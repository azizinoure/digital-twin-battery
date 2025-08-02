import { useGLTF } from '@react-three/drei';

function BatteryModel() {
  const { scene } = useGLTF('/models/batterie.glb');
  return <primitive object={scene} scale={0.5} />;
}

export default BatteryModel;