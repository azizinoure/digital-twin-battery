import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useRef, useState, Suspense } from 'react';
import { ref, get } from 'firebase/database';
import { database, auth } from '../firebase';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';

function Scene({ data }) {
  const gltf = useLoader(GLTFLoader, '/tesla_battery.glb');
  const modelRef = useRef();
  
  // Références pour les capteurs
  const capteurRefs = {
    Cap_Temp: useRef(),
    Cap_Tension: useRef(),
    Cap_Courant: useRef(),
    Cap_SOC: useRef(),
    Temperature: useRef(),
    Voltage: useRef(),
    Current: useRef(),
    SOC: useRef(),
  };

  const [materialsReady, setMaterialsReady] = useState(false);
  const targetColors = useRef({
    Cap_Temp: new THREE.Color('black'),
    Cap_Tension: new THREE.Color('black'),
    Cap_Courant: new THREE.Color('black'),
    Cap_SOC: new THREE.Color('black'),
  });

  // Stocker les matériaux originaux
  const originalMaterials = useRef(new Map());

  useEffect(() => {
    if (!gltf.scene) return;
    
    console.log("Modèle chargé, recherche des capteurs...");
    
    let foundSensors = 0;
    
    // Sauvegarder les matériaux originaux
    gltf.scene.traverse((child) => {
      if (child.isMesh && child.material) {
        originalMaterials.current.set(child.uuid, child.material.clone());
      }
    });
    
    // Appliquer les modifications
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        // Vérifier si c'est un capteur
        const isSensor = Object.keys(capteurRefs).some(sensorName => 
          child.name.includes(sensorName) || child.name.toLowerCase().includes(sensorName.toLowerCase())
        );
        
        if (isSensor) {
          // Trouver le nom du capteur correspondant
          const sensorType = Object.keys(capteurRefs).find(sensorName => 
            child.name.includes(sensorName) || child.name.toLowerCase().includes(sensorName.toLowerCase())
          );
          
          if (sensorType) {
            // Matériau pour les capteurs (noir par défaut)
            child.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color('black'),
              metalness: 0.3,
              roughness: 0.7,
              emissive: new THREE.Color(0x000000),
              emissiveIntensity: 0.5
            });
            
            capteurRefs[sensorType].current = child;
            foundSensors++;
          }
        } else {
          // Pour la batterie et autres éléments, améliorer le matériau
          const originalMaterial = originalMaterials.current.get(child.uuid);
          if (originalMaterial) {
            // Adapter le matériau pour un meilleur rendu
            child.material = originalMaterial.clone();
            
            // Ajustements pour une meilleure visibilité
            if (child.material.isMeshStandardMaterial) {
              child.material.roughness = 0.6; // Surface moins brillante
              child.material.metalness = 0.4; // Moins métallique
              
              // Si la couleur est trop sombre, l'éclaircir légèrement
              if (child.material.color.r < 0.3 && 
                  child.material.color.g < 0.3 && 
                  child.material.color.b < 0.3) {
                child.material.color = new THREE.Color(0.5, 0.5, 0.5);
              }
            }
          }
        }
      }
    });
    
    console.log(`${foundSensors} capteurs configurés`);
    setMaterialsReady(true);
  }, [gltf]);

  // Le reste du code reste inchangé...
  useEffect(() => {
    if (!data || !materialsReady) return;
    
    // Mettre à jour les couleurs cibles en fonction des données selon la nouvelle légende
    // Capteur de température
    if (data.hv_temp_max >= 45) {
      targetColors.current.Cap_Temp.set('green'); // Température élevée → vert
    } else if (data.hv_temp_min <= 5) {
      targetColors.current.Cap_Temp.set('red'); // Température faible → rouge
    } else {
      targetColors.current.Cap_Temp.set('black'); // Normal → noir
    }
    
    // Capteur de tension
    if (data.hv_battery_voltage <= 360) {
      targetColors.current.Cap_Tension.set('orange'); // Tension faible → orange
    } else {
      targetColors.current.Cap_Tension.set('black'); // Normal → noir
    }
    
    // Capteur de courant
    if (data.hv_battery_current <= -50) {
      targetColors.current.Cap_Courant.set('blue'); // Courant faible → bleu
    } else {
      targetColors.current.Cap_Courant.set('black'); // Normal → noir
    }
    
    // Capteur de SOC
    if (data.hv_soc >= 80) {
      targetColors.current.Cap_SOC.set('green'); // SOC élevé → vert
    } else if (data.hv_soc <= 20) {
      targetColors.current.Cap_SOC.set('red'); // SOC faible → rouge
    } else {
      targetColors.current.Cap_SOC.set('black'); // Normal → noir
    }
  }, [data, materialsReady]);

  useFrame(() => {
    if (!materialsReady) return;
    
    // Animer les couleurs des capteurs
    for (let name in capteurRefs) {
      const mesh = capteurRefs[name].current;
      if (mesh && mesh.material && mesh.material.color) {
        mesh.material.color.lerp(targetColors.current[name] || new THREE.Color('black'), 0.1);
        
        // Effet d'émission pour les alertes
        let isAlert = false;
        
        if (name.includes('Temp')) {
          isAlert = data && (data.hv_temp_max >= 45 || data.hv_temp_min <= 5);
        } else if (name.includes('Tension') || name.includes('Voltage')) {
          isAlert = data && data.hv_battery_voltage <= 360;
        } else if (name.includes('Courant') || name.includes('Current')) {
          isAlert = data && data.hv_battery_current <= -50;
        } else if (name.includes('SOC')) {
          isAlert = data && (data.hv_soc <= 20 || data.hv_soc >= 80);
        }
        
        if (isAlert) {
          mesh.material.emissive.lerp(
            new THREE.Color(mesh.material.color).multiplyScalar(0.8), 
            0.1
          );
        } else {
          mesh.material.emissive.lerp(new THREE.Color(0x000000), 0.1);
        }
      }
    }
  });

  
  return (
    <>
      <primitive 
        ref={modelRef} 
        object={gltf.scene} 
        position={[0, 0, 0]} 
        rotation={[0, 0, 0]}
      />
      
      {/* Éclairage amélioré */}
      <ambientLight intensity={1.2} color="#ffffff" />
      <directionalLight 
        position={[5, 10, 7]} 
        intensity={1.5} 
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight 
        position={[-5, -10, -7]} 
        intensity={0.5} 
        color="#ccccff"
      />
      <hemisphereLight
        skyColor="#ffffff"
        groundColor="#888888"
        intensity={0.6}
      />
      <pointLight position={[0, 5, 5]} intensity={0.8} distance={10} />
    </>
  );
}
// Le reste du code de la fonction Visualisation reste EXACTEMENT le même
// que votre code original sans aucune modification...

export default function Visualisation() {
  const [trajets, setTrajets] = useState([]);
  const [selectedTrajet, setSelectedTrajet] = useState(null);
  const [selectedDataPoint, setSelectedDataPoint] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDemoControls, setShowDemoControls] = useState(false);
  const [demoData, setDemoData] = useState({
    hv_temp_max: 35,
    hv_temp_min: 25,
    hv_battery_voltage: 380,
    hv_battery_current: -30,
    hv_soc: 60,
    ambient_air_temp: 20,
    vehicle_speed: 60,
    time_s: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrajets = async () => {
      try {
        setLoading(true);
        const dbRef = ref(database, 'trajets/trajets');
        const snapshot = await get(dbRef);
        
        if (snapshot.exists()) {
          const trajetsData = snapshot.val();
          console.log('Données Firebase brutes:', trajetsData);
          
          // Convertir l'objet en array (comme dans Simulation.js)
          const trajetsList = Object.values(trajetsData);
          console.log('Trajets convertis:', trajetsList);
          
          setTrajets(trajetsList);
          
          if (trajetsList.length > 0) {
            setSelectedTrajet(0); // Utiliser l'index au lieu de l'ID
            
            // Charger les données du premier trajet
            const firstTrajet = trajetsList[0];
            if (firstTrajet.data && firstTrajet.data.length > 0) {
              setData(firstTrajet.data[0]);
              setError(null);
            } else {
              setData({...demoData});
              setError('Aucune donnée dans le premier trajet');
            }
          } else {
            setData({...demoData});
            setError('Aucun trajet disponible');
          }
        } else {
          setData({...demoData});
          setError('Aucun trajet dans la base de données');
        }
      } catch (err) {
        console.error('Erreur détaillée:', err);
        setData({...demoData});
        setError(`Erreur de connexion: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTrajets();
  }, []);

  const handleTrajetChange = (trajetIndex) => {
    const selected = trajets[trajetIndex];
    if (selected) {
      setSelectedTrajet(trajetIndex);
      setSelectedDataPoint(0);
      
      if (selected.data && selected.data.length > 0) {
        setData(selected.data[0]);
        setError(null);
      } else {
        setData({...demoData});
        setError('Aucune donnée pour ce trajet');
      }
      setShowDemoControls(false);
    }
  };

  const handleDataPointChange = (index) => {
    if (selectedTrajet !== null && trajets[selectedTrajet]) {
      const selected = trajets[selectedTrajet];
      if (selected.data && index >= 0 && index < selected.data.length) {
        setSelectedDataPoint(index);
        setData(selected.data[index]);
        setShowDemoControls(false);
      }
    }
  };

  const handleDemoDataChange = (field, value) => {
    const numericValue = parseFloat(value);
    const newDemoData = {
      ...demoData,
      [field]: isNaN(numericValue) ? demoData[field] : numericValue
    };
    setDemoData(newDemoData);
    
    if (showDemoControls) {
      setData(newDemoData);
    }
  };

  const useDemoData = () => {
    setData({...demoData});
    setError('Mode démonstration activé');
    setShowDemoControls(true);
    setSelectedTrajet(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const displayData = data || demoData;

  // Obtenir les données du trajet sélectionné pour la navigation
  const currentTrajet = selectedTrajet !== null ? trajets[selectedTrajet] : null;
  const dataArray = currentTrajet?.data || [];
  const totalDataPoints = dataArray.length;

  return (
    <div style={{ height: '100vh', position: 'relative', background: '#1a1a1a' }}>
      {/* Barre de boutons en overlay */}
      <div style={{
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

      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '20px',
          zIndex: 10,
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '20px',
          borderRadius: '10px'
        }}>
          Chargement des trajets...
        </div>
      )}

      <Canvas camera={{ position: [5, 5, 5], fov: 45 }}>
        <color attach="background" args={['#1a1a1a']} />
        <ambientLight intensity={1.0} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1.8} 
          castShadow
        />
        <pointLight position={[-10, 10, -5]} intensity={1.0} color="#0066ff" />
        <pointLight position={[10, -10, 5]} intensity={1.0} color="#ff6600" />
        <pointLight position={[0, 10, 0]} intensity={0.8} color="#00ff00" />
        <pointLight position={[0, 0, 5]} intensity={0.6} color="#ffffff" />
        
        <Suspense fallback={
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="orange" />
          </mesh>
        }>
          <Scene data={displayData} />
        </Suspense>
        <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
      </Canvas>

      {/* Bouton pour activer le mode démonstration */}
      {!showDemoControls && (
        <button
          onClick={useDemoData}
          style={{
            position: 'absolute',
            top: '70px',
            right: '20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 15px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
            zIndex: 10
          }}
        >
          🧪 Mode Démonstration
        </button>
      )}

      {/* Contrôles de démonstration */}
      {showDemoControls && (
        <div style={{
          position: 'absolute',
          top: '70px',
          right: '20px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '15px',
          borderRadius: '8px',
          color: 'white',
          zIndex: 10,
          fontFamily: 'Arial, sans-serif',
          minWidth: '300px'
        }}>
          <h4 style={{margin: '0 0 12px 0', borderBottom: '1px solid #444', paddingBottom: '5px'}}>
            Contrôles Démonstration:
          </h4>
          
          {Object.entries({
            hv_temp_max: {label: 'Température max', min: 0, max: 60, unit: '°C'},
            hv_temp_min: {label: 'Température min', min: 0, max: 60, unit: '°C'},
            hv_battery_voltage: {label: 'Tension batterie', min: 300, max: 400, unit: 'V'},
            hv_battery_current: {label: 'Courant batterie', min: -100, max: 0, unit: 'A'},
            hv_soc: {label: 'SOC', min: 0, max: 100, unit: '%'}
          }).map(([field, config]) => (
            <div key={field} style={{marginBottom: '10px'}}>
              <label>{config.label}: </label>
              <input 
                type="range" 
                min={config.min} 
                max={config.max} 
                value={demoData[field]} 
                onChange={(e) => handleDemoDataChange(field, e.target.value)}
                style={{width: '100%'}}
              />
              <span> {demoData[field]}{config.unit}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sélecteur de trajet */}
      {trajets.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '70px',
          left: '20px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '15px',
          borderRadius: '8px',
          color: 'white',
          zIndex: 10,
          fontFamily: 'Arial, sans-serif',
          minWidth: '250px'
        }}>
          <h4 style={{margin: '0 0 12px 0', borderBottom: '1px solid #444', paddingBottom: '5px'}}>
            Sélection du trajet:
          </h4>
          <select 
            value={selectedTrajet !== null ? selectedTrajet : ''}
            onChange={(e) => handleTrajetChange(parseInt(e.target.value))}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: '#333',
              color: 'white',
              border: '1px solid #555',
              marginBottom: '10px'
            }}
          >
            {trajets.map((trajet, index) => (
              <option key={index} value={index}>
                Trajet {index + 1}
              </option>
            ))}
          </select>
          
          {selectedTrajet !== null && totalDataPoints > 0 && (
            <div style={{marginTop: '10px'}}>
              <button 
                onClick={() => handleDataPointChange(selectedDataPoint - 1)}
                disabled={selectedDataPoint <= 0}
                style={{
                  padding: '5px 10px',
                  marginRight: '5px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedDataPoint > 0 ? 'pointer' : 'not-allowed',
                  opacity: selectedDataPoint > 0 ? 1 : 0.5
                }}
              >
                ◀
              </button>
              <span style={{margin: '0 10px'}}>
                Donnée {selectedDataPoint + 1}/{totalDataPoints}
              </span>
              <button 
                onClick={() => handleDataPointChange(selectedDataPoint + 1)}
                disabled={selectedDataPoint >= totalDataPoints - 1}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedDataPoint < totalDataPoints - 1 ? 'pointer' : 'not-allowed',
                  opacity: selectedDataPoint < totalDataPoints - 1 ? 1 : 0.5
                }}
              >
                ▶
              </button>
            </div>
          )}
        </div>
      )}

       {/* Légende des couleurs - MODIFIÉE selon les nouvelles spécifications */}
       <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: '15px',
        borderRadius: '8px',
        color: 'white',
        zIndex: 10,
        fontFamily: 'Arial, sans-serif',
        maxWidth: '300px'
      }}>
        <h4 style={{margin: '0 0 12px 0', borderBottom: '1px solid #444', paddingBottom: '5px'}}>Légende des capteurs:</h4>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <div style={{width: '20px', height: '20px', backgroundColor: 'black', marginRight: '10px', borderRadius: '3px'}}></div>
            <span>Normal</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <div style={{width: '20px', height: '20px', backgroundColor: 'green', marginRight: '10px', borderRadius: '3px'}}></div>
            <span>Température élevée (≥45°C) ou SOC élevé (≥80%)</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <div style={{width: '20px', height: '20px', backgroundColor: 'orange', marginRight: '10px', borderRadius: '3px'}}></div>
            <span>Tension faible (≤360V)</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <div style={{width: '20px', height: '20px', backgroundColor: 'blue', marginRight: '10px', borderRadius: '3px'}}></div>
            <span>Courant faible (≤-50A)</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <div style={{width: '20px', height: '20px', backgroundColor: 'red', marginRight: '10px', borderRadius: '3px'}}></div>
            <span>SOC faible (≤20%) ou Température faible (≤5°C)</span>
          </div>
        </div>
      </div>

      {/* Indicateur de données en temps réel */}
      <div style={{
        position: 'absolute',
        top: showDemoControls ? '400px' : '70px',
        right: '20px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: '15px',
        borderRadius: '8px',
        color: 'white',
        zIndex: 10,
        fontFamily: 'Arial, sans-serif',
        minWidth: '250px'
      }}>
        <h4 style={{margin: '0 0 12px 0', borderBottom: '1px solid #444', paddingBottom: '5px'}}>
          {data && !error && selectedTrajet !== null ? `Données du trajet ${selectedTrajet + 1}:` : 'Données de démonstration:'}
        </h4>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Température max:</span>
            <span style={{
              color: displayData.hv_temp_max >= 45 ? 'red' : (displayData.hv_temp_min <= 5 ? 'red' : 'green'), 
              fontWeight: 'bold'
            }}>
              {displayData.hv_temp_max}°C
            </span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Température min:</span>
            <span style={{
              color: displayData.hv_temp_min <= 5 ? 'red' : (displayData.hv_temp_max >= 45 ? 'red' : 'green'), 
              fontWeight: 'bold'
            }}>
              {displayData.hv_temp_min}°C
            </span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Tension batterie:</span>
            <span style={{
              color: displayData.hv_battery_voltage <= 360 ? 'orange' : 'green', 
              fontWeight: 'bold'
            }}>
              {displayData.hv_battery_voltage}V
            </span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Courant batterie:</span>
            <span style={{
              color: displayData.hv_battery_current <= -50 ? 'blue' : 'green', 
              fontWeight: 'bold'
            }}>
              {displayData.hv_battery_current}A
            </span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>SOC:</span>
            <span style={{
              color: (displayData.hv_soc <= 20 || displayData.hv_soc >= 80) ? 'red' : 'green', 
              fontWeight: 'bold'
            }}>
              {displayData.hv_soc}%
            </span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Température air:</span>
            <span>{displayData.ambient_air_temp}°C</span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Vitesse véhicule:</span>
            <span>{displayData.vehicle_speed} km/h</span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Temps écoulé:</span>
            <span>{displayData.time_s}s</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '16px',
          zIndex: 10,
          backgroundColor: 'rgba(255,0,0,0.7)',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <div>{error}</div>
          <button 
            onClick={useDemoData}
            style={{
              marginTop: '10px',
              padding: '8px 15px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Utiliser les données de démonstration
          </button>
        </div>
      )}
    </div>
  );
}



/*import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useRef, useState, Suspense } from 'react';
import { ref, get } from 'firebase/database';
import { database, auth } from '../firebase';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';

function Scene({ data }) {
  const gltf = useLoader(GLTFLoader, '/tesla_battery.glb');
  const modelRef = useRef();
  
  // Références pour les capteurs avec différents noms possibles
  const capteurRefs = {
    Cap_Temp: useRef(),
    Cap_Tension: useRef(),
    Cap_Courant: useRef(),
    Cap_SOC: useRef(),
    // Noms alternatifs possibles
    Temperature: useRef(),
    Voltage: useRef(),
    Current: useRef(),
    SOC: useRef(),
  };

  const [materialsReady, setMaterialsReady] = useState(false);
  const targetColors = useRef({
    Cap_Temp: new THREE.Color('green'),
    Cap_Tension: new THREE.Color('green'),
    Cap_Courant: new THREE.Color('green'),
    Cap_SOC: new THREE.Color('green'),
  });

  useEffect(() => {
    if (!gltf.scene) return;
    
    console.log("Modèle chargé, recherche des capteurs...");
    
    let foundSensors = 0;
    
    // Parcourir tous les éléments du modèle
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        console.log("Mesh trouvé:", child.name);
        
        // Vérifier si c'est un capteur (avec différents noms possibles)
        const isSensor = Object.keys(capteurRefs).some(sensorName => 
          child.name.includes(sensorName) || child.name.toLowerCase().includes(sensorName.toLowerCase())
        );
        
        if (isSensor) {
          console.log("Capteur trouvé:", child.name);
          
          // Trouver le nom du capteur correspondant
          const sensorType = Object.keys(capteurRefs).find(sensorName => 
            child.name.includes(sensorName) || child.name.toLowerCase().includes(sensorName.toLowerCase())
          );
          
          if (sensorType) {
            // Créer un nouveau matériau pour le capteur
            child.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color('green'),
              metalness: 0.3,
              roughness: 0.7,
              emissive: new THREE.Color(0x000000),
              emissiveIntensity: 0.5
            });
            
            capteurRefs[sensorType].current = child;
            foundSensors++;
          }
        } else {
          // Pour les autres éléments, s'assurer qu'ils ont un matériau approprié
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.7, 0.7, 0.7),
            metalness: 0.4,
            roughness: 0.6,
          });
        }
      }
    });
    
    console.log(`${foundSensors} capteurs configurés`);
    setMaterialsReady(true);
  }, [gltf]);

  useEffect(() => {
    if (!data || !materialsReady) return;
    
    // Mettre à jour les couleurs cibles en fonction des données
    targetColors.current.Cap_Temp.set(
      data.hv_temp_max >= 45 || data.hv_temp_min <= 5 ? 'red' : 'green'
    );
    targetColors.current.Cap_Tension.set(
      data.hv_battery_voltage <= 360 ? 'orange' : 'green'
    );
    targetColors.current.Cap_Courant.set(
      data.hv_battery_current <= -50 ? 'blue' : 'green'
    );
    targetColors.current.Cap_SOC.set(
      data.hv_soc <= 20 || data.hv_soc >= 80 ? 'red' : 'green'
    );
  }, [data, materialsReady]);

  useFrame(() => {
    if (!materialsReady) return;
    
    // Animer les couleurs des capteurs
    for (let name in capteurRefs) {
      const mesh = capteurRefs[name].current;
      if (mesh && mesh.material && mesh.material.color) {
        mesh.material.color.lerp(targetColors.current[name] || new THREE.Color('green'), 0.1);
        
        // Effet d'émission pour les alertes
        let isAlert = false;
        
        if (name.includes('Temp')) {
          isAlert = data && (data.hv_temp_max >= 45 || data.hv_temp_min <= 5);
        } else if (name.includes('Tension') || name.includes('Voltage')) {
          isAlert = data && data.hv_battery_voltage <= 360;
        } else if (name.includes('Courant') || name.includes('Current')) {
          isAlert = data && data.hv_battery_current <= -50;
        } else if (name.includes('SOC')) {
          isAlert = data && (data.hv_soc <= 20 || data.hv_soc >= 80);
        }
        
        if (isAlert) {
          mesh.material.emissive.lerp(
            new THREE.Color(mesh.material.color).multiplyScalar(0.8), 
            0.1
          );
        } else {
          mesh.material.emissive.lerp(new THREE.Color(0x000000), 0.1);
        }
      }
    }
  });

  return (
    <>
      <primitive ref={modelRef} object={gltf.scene} />
      {/* Ajouter plus de lumières pour éviter le modèle noir *//*}
      <ambientLight intensity={0.8} />
      <pointLight position={[5, 5, 5]} intensity={1.0} />
      <pointLight position={[-5, 5, -5]} intensity={0.8} />
      <pointLight position={[0, 10, 0]} intensity={0.6} />
    </>
  );
}

export default function Visualisation() {
  const [trajets, setTrajets] = useState([]);
  const [selectedTrajet, setSelectedTrajet] = useState(null);
  const [selectedDataPoint, setSelectedDataPoint] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDemoControls, setShowDemoControls] = useState(false);
  const [demoData, setDemoData] = useState({
    hv_temp_max: 35,
    hv_temp_min: 25,
    hv_battery_voltage: 380,
    hv_battery_current: -30,
    hv_soc: 60,
    ambient_air_temp: 20,
    vehicle_speed: 60,
    time_s: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrajets = async () => {
      try {
        setLoading(true);
        const dbRef = ref(database, 'trajets');
        const snapshot = await get(dbRef);
        
        if (snapshot.exists()) {
          const trajetsData = snapshot.val();
          console.log('Données trajets:', trajetsData);
          
          // Convertir l'objet en array et filtrer les trajets avec données
          const trajetsList = Object.entries(trajetsData)
            .map(([id, trajet]) => ({
              id,
              ...trajet
            }))
            .filter(trajet => trajet.data && Object.keys(trajet.data).length > 0);
          
          setTrajets(trajetsList);
          
          if (trajetsList.length > 0) {
            setSelectedTrajet(trajetsList[0].id);
            // Convertir les données d'objet en array
            const dataArray = Object.values(trajetsList[0].data);
            if (dataArray.length > 0) {
              setData(dataArray[0]);
            } else {
              setData({...demoData});
              setError('Aucune donnée pour ce trajet');
            }
          } else {
            setError('Aucun trajet avec données disponibles');
            setData({...demoData});
          }
        } else {
          setError('Aucun trajet disponible dans la base de données');
          setData({...demoData});
        }
      } catch (err) {
        console.error('Erreur de récupération des trajets:', err);
        setError('Erreur de connexion à la base de données');
        setData({...demoData});
      } finally {
        setLoading(false);
      }
    };

    fetchTrajets();
  }, []);

  const handleTrajetChange = (trajetId) => {
    const selected = trajets.find(t => t.id === trajetId);
    if (selected) {
      setSelectedTrajet(trajetId);
      setSelectedDataPoint(0);
      
      if (selected.data) {
        const dataArray = Object.values(selected.data);
        if (dataArray.length > 0) {
          setData(dataArray[0]);
          setError(null);
        } else {
          setData({...demoData});
          setError('Aucune donnée pour ce trajet');
        }
      }
      setShowDemoControls(false);
    }
  };

  const handleDataPointChange = (index) => {
    if (selectedTrajet) {
      const selected = trajets.find(t => t.id === selectedTrajet);
      if (selected && selected.data) {
        const dataArray = Object.values(selected.data);
        if (index >= 0 && index < dataArray.length) {
          setSelectedDataPoint(index);
          setData(dataArray[index]);
          setShowDemoControls(false);
        }
      }
    }
  };

  const handleDemoDataChange = (field, value) => {
    const numericValue = parseFloat(value);
    const newDemoData = {
      ...demoData,
      [field]: isNaN(numericValue) ? demoData[field] : numericValue
    };
    setDemoData(newDemoData);
    
    if (showDemoControls) {
      setData(newDemoData);
    }
  };

  const useDemoData = () => {
    setData({...demoData});
    setError('Mode démonstration activé');
    setShowDemoControls(true);
    setSelectedTrajet(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const displayData = data || demoData;

  // Obtenir les données du trajet sélectionné pour la navigation
  const currentTrajetData = selectedTrajet 
    ? trajets.find(t => t.id === selectedTrajet)?.data 
    : null;
  const dataArray = currentTrajetData ? Object.values(currentTrajetData) : [];
  const totalDataPoints = dataArray.length;

  return (
    <div style={{ height: '100vh', position: 'relative', background: '#1a1a1a' }}>
      {/* Barre de boutons en overlay *//*}
      <div style={{
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

      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '20px',
          zIndex: 10,
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '20px',
          borderRadius: '10px'
        }}>
          Chargement des trajets...
        </div>
      )}

      <Canvas camera={{ position: [5, 5, 5], fov: 45 }}>
        <color attach="background" args={['#1a1a1a']} />
        <ambientLight intensity={1.0} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1.8} 
          castShadow
        />
        <pointLight position={[-10, 10, -5]} intensity={1.0} color="#0066ff" />
        <pointLight position={[10, -10, 5]} intensity={1.0} color="#ff6600" />
        <pointLight position={[0, 10, 0]} intensity={0.8} color="#00ff00" />
        <pointLight position={[0, 0, 5]} intensity={0.6} color="#ffffff" />
        
        <Suspense fallback={
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="orange" />
          </mesh>
        }>
          <Scene data={displayData} />
        </Suspense>
        <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
      </Canvas>

      {/* Bouton pour activer le mode démonstration *//*}
      {!showDemoControls && (
        <button
          onClick={useDemoData}
          style={{
            position: 'absolute',
            top: '70px',
            right: '20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 15px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
            zIndex: 10
          }}
        >
          🧪 Mode Démonstration
        </button>
      )}

      {/* Contrôles de démonstration *//*}
      {showDemoControls && (
        <div style={{
          position: 'absolute',
          top: '70px',
          right: '20px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '15px',
          borderRadius: '8px',
          color: 'white',
          zIndex: 10,
          fontFamily: 'Arial, sans-serif',
          minWidth: '300px'
        }}>
          <h4 style={{margin: '0 0 12px 0', borderBottom: '1px solid #444', paddingBottom: '5px'}}>
            Contrôles Démonstration:
          </h4>
          
          {Object.entries({
            hv_temp_max: {label: 'Température max', min: 0, max: 60, unit: '°C'},
            hv_temp_min: {label: 'Température min', min: 0, max: 60, unit: '°C'},
            hv_battery_voltage: {label: 'Tension batterie', min: 300, max: 400, unit: 'V'},
            hv_battery_current: {label: 'Courant batterie', min: -100, max: 0, unit: 'A'},
            hv_soc: {label: 'SOC', min: 0, max: 100, unit: '%'}
          }).map(([field, config]) => (
            <div key={field} style={{marginBottom: '10px'}}>
              <label>{config.label}: </label>
              <input 
                type="range" 
                min={config.min} 
                max={config.max} 
                value={demoData[field]} 
                onChange={(e) => handleDemoDataChange(field, e.target.value)}
                style={{width: '100%'}}
              />
              <span> {demoData[field]}{config.unit}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sélecteur de trajet *//*}
      {trajets.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '70px',
          left: '20px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '15px',
          borderRadius: '8px',
          color: 'white',
          zIndex: 10,
          fontFamily: 'Arial, sans-serif',
          minWidth: '250px'
        }}>
          <h4 style={{margin: '0 0 12px 0', borderBottom: '1px solid #444', paddingBottom: '5px'}}>
            Sélection du trajet:
          </h4>
          <select 
            value={selectedTrajet || ''}
            onChange={(e) => handleTrajetChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: '#333',
              color: 'white',
              border: '1px solid ',
              marginBottom: '10px'
            }}
          >
            {trajets.map((trajet, index) => (
              <option key={trajet.id} value={trajet.id}>
                Trajet {trajet.id}
              </option>
            ))}
          </select>
          
          {selectedTrajet && totalDataPoints > 0 && (
            <div style={{marginTop: '10px'}}>
              <button 
                onClick={() => handleDataPointChange(selectedDataPoint - 1)}
                disabled={selectedDataPoint <= 0}
                style={{
                  padding: '5px 10px',
                  marginRight: '5px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedDataPoint > 0 ? 'pointer' : 'not-allowed',
                  opacity: selectedDataPoint > 0 ? 1 : 0.5
                }}
              >
                ◀
              </button>
              <span style={{margin: '0 10px'}}>
                Donnée {selectedDataPoint + 1}/{totalDataPoints}
              </span>
              <button 
                onClick={() => handleDataPointChange(selectedDataPoint + 1)}
                disabled={selectedDataPoint >= totalDataPoints - 1}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedDataPoint < totalDataPoints - 1 ? 'pointer' : 'not-allowed',
                  opacity: selectedDataPoint < totalDataPoints - 1 ? 1 : 0.5
                }}
              >
                ▶
              </button>
            </div>
          )}
        </div>
      )}

      {/* Légende des couleurs *//*}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: trajets.length > 0 ? '290px' : '20px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: '15px',
        borderRadius: '8px',
        color: 'white',
        zIndex: 10,
        fontFamily: 'Arial, sans-serif',
        maxWidth: '300px'
      }}>
        <h4 style={{margin: '0 0 12px 0', borderBottom: '1px solid #444', paddingBottom: '5px'}}>Légende des capteurs:</h4>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <div style={{width: '20px', height: '20px', backgroundColor: 'green', marginRight: '10px', borderRadius: '3px'}}></div>
            <span>Normal</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <div style={{width: '20px', height: '20px', backgroundColor: 'red', marginRight: '10px', borderRadius: '3px'}}></div>
            <span>Température élevée (≥45°C) ou faible (≤5°C)</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <div style={{width: '20px', height: '20px', backgroundColor: 'orange', marginRight: '10px', borderRadius: '3px'}}></div>
            <span>Tension faible (≤360V)</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <div style={{width: '20px', height: '20px', backgroundColor: 'blue', marginRight: '10px', borderRadius: '3px'}}></div>
            <span>Courant faible (≤-50A)</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <div style={{width: '20px', height: '20px', backgroundColor: 'red', marginRight: '10px', borderRadius: '3px'}}></div>
            <span>SOC faible (≤20%) ou élevé (≥80%)</span>
          </div>
        </div>
      </div>

      {/* Indicateur de données en temps réel *//*}
      <div style={{
        position: 'absolute',
        top: showDemoControls ? '400px' : '70px',
        right: '20px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: '15px',
        borderRadius: '8px',
        color: 'white',
        zIndex: 10,
        fontFamily: 'Arial, sans-serif',
        minWidth: '250px'
      }}>
        <h4 style={{margin: '0 0 12px 0', borderBottom: '1px solid #444', paddingBottom: '5px'}}>
          {data && !error ? `Données du trajet ${selectedTrajet}:` : 'Données de démonstration:'}
        </h4>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Température max:</span>
            <span style={{
              color: displayData.hv_temp_max >= 45 ? 'red' : (displayData.hv_temp_min <= 5 ? 'red' : 'green'), 
              fontWeight: 'bold'
            }}>
              {displayData.hv_temp_max}°C
            </span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Température min:</span>
            <span style={{
              color: displayData.hv_temp_min <= 5 ? 'red' : (displayData.hv_temp_max >= 45 ? 'red' : 'green'), 
              fontWeight: 'bold'
            }}>
              {displayData.hv_temp_min}°C
            </span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Tension batterie:</span>
            <span style={{
              color: displayData.hv_battery_voltage <= 360 ? 'orange' : 'green', 
              fontWeight: 'bold'
            }}>
              {displayData.hv_battery_voltage}V
            </span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Courant batterie:</span>
            <span style={{
              color: displayData.hv_battery_current <= -50 ? 'blue' : 'green', 
              fontWeight: 'bold'
            }}>
              {displayData.hv_battery_current}A
            </span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>SOC:</span>
            <span style={{
              color: (displayData.hv_soc <= 20 || displayData.hv_soc >= 80) ? 'red' : 'green', 
              fontWeight: 'bold'
            }}>
              {displayData.hv_soc}%
            </span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Température air:</span>
            <span>{displayData.ambient_air_temp}°C</span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Vitesse véhicule:</span>
            <span>{displayData.vehicle_speed} km/h</span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>Temps écoulé:</span>
            <span>{displayData.time_s}s</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '16px',
          zIndex: 10,
          backgroundColor: 'rgba(255,0,0,0.7)',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <div>{error}</div>
          <button 
            onClick={useDemoData}
            style={{
              marginTop: '10px',
              padding: '8px 15px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Utiliser les données de démonstration
          </button>
        </div>
      )}
    </div>
  );
}
*/