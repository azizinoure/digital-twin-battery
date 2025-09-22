import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../firebase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, ComposedChart, Scatter, ReferenceArea, Cell
} from 'recharts';
import './Simulation.css';

// Couleurs pour les différents types de conduite
const DRIVING_TYPE_COLORS = {
  urban: '#3498db',
  interurban: "#9b59b6",
  highway: '#e74c3c'
};

// Ticks fixes pour l'axe Y
const Y_AXIS_TICKS = [0, 50, 100, 150, 200, 250];
const CURRENT_TICKS = [-600, -400, -200, 0, 200, 400, 600];
const VOLTAGE_TICKS = [280, 300, 320, 340, 360, 380];

// Composant d'analyse des types de conduite
const DrivingTypeAnalysis = ({ data, isAllTrips = false }) => {
  const [analysis, setAnalysis] = useState(null);
  const [speedData, setSpeedData] = useState([]);
  const [temperatureData, setTemperatureData] = useState([]);
  const [socData, setSocData] = useState([]);
  const [energyData, setEnergyData] = useState([]);
  const [currentVoltageData, setCurrentVoltageData] = useState([]);
  const [energySummary, setEnergySummary] = useState(null);

  useEffect(() => {
    if (data && data.length > 0) {
      analyzeDrivingTypes(data);
      prepareSpeedData(data);
      prepareTemperatureData(data);
      prepareSocData(data);
      prepareEnergyData(data);
      prepareCurrentVoltageData(data);
    }
  }, [data]);

  // Analyser les types de conduite
  const analyzeDrivingTypes = (tripData) => {
    let urban = { distance: 0, duration: 0, energy: 0, points: 0, tempMax: 0, tempMin: 0, tempAmbient: 0, soc: 0 };
    let interurban = { distance: 0, duration: 0, energy: 0, points: 0, tempMax: 0, tempMin: 0, tempAmbient: 0, soc: 0 };
    let highway = { distance: 0, duration: 0, energy: 0, points: 0, tempMax: 0, tempMin: 0, tempAmbient: 0, soc: 0 };
    
    // Analyser chaque segment du trajet
    for (let i = 1; i < tripData.length; i++) {
      const prevPoint = tripData[i-1];
      const point = tripData[i];
      
      // S'assurer que le temps est croissant
      if (point.time <= prevPoint.time) continue;
      
      const timeDiff = (point.time - prevPoint.time) / 3600; // en heures
      const avgSpeed = Math.max(0, (point.vehicle_speed + prevPoint.vehicle_speed) / 2); // Éviter les vitesses négatives
      const distanceSegment = avgSpeed * timeDiff;
      const energySegment = Math.abs(point.hv_battery_current * point.hv_battery_voltage * timeDiff) / 1000; // kWh
      
      // Classifier par vitesse
      if (avgSpeed <= 55) {
        urban.distance += distanceSegment;
        urban.duration += timeDiff; // en heures
        urban.energy += energySegment;
        urban.tempMax += point.hv_temp_max;
        urban.tempMin += point.hv_temp_min;
        urban.tempAmbient += point.ambient_air_temp;
        urban.soc += point.hv_soc;
        urban.points++;
      } else if (avgSpeed <= 110) {
        interurban.distance += distanceSegment;
        interurban.duration += timeDiff;
        interurban.energy += energySegment;
        interurban.tempMax += point.hv_temp_max;
        interurban.tempMin += point.hv_temp_min;
        interurban.tempAmbient += point.ambient_air_temp;
        interurban.soc += point.hv_soc;
        interurban.points++;
      } else {
        highway.distance += distanceSegment;
        highway.duration += timeDiff;
        highway.energy += energySegment;
        highway.tempMax += point.hv_temp_max;
        highway.tempMin += point.hv_temp_min;
        highway.tempAmbient += point.ambient_air_temp;
        highway.soc += point.hv_soc;
        highway.points++;
      }
    }
    
    // Convertir les durées en minutes pour l'affichage
    const urbanDurationMinutes = urban.duration * 60;
    const interurbanDurationMinutes = interurban.duration * 60;
    const highwayDurationMinutes = highway.duration * 60;
    
    // Calculer les moyennes
    const urbanTempMaxAvg = urban.points > 0 ? urban.tempMax / urban.points : 0;
    const urbanTempMinAvg = urban.points > 0 ? urban.tempMin / urban.points : 0;
    const urbanTempAmbientAvg = urban.points > 0 ? urban.tempAmbient / urban.points : 0;
    const urbanSocAvg = urban.points > 0 ? urban.soc / urban.points : 0;
    
    const interurbanTempMaxAvg = interurban.points > 0 ? interurban.tempMax / interurban.points : 0;
    const interurbanTempMinAvg = interurban.points > 0 ? interurban.tempMin / interurban.points : 0;
    const interurbanTempAmbientAvg = interurban.points > 0 ? interurban.tempAmbient / interurban.points : 0;
    const interurbanSocAvg = interurban.points > 0 ? interurban.soc / interurban.points : 0;
    
    const highwayTempMaxAvg = highway.points > 0 ? highway.tempMax / highway.points : 0;
    const highwayTempMinAvg = highway.points > 0 ? highway.tempMin / highway.points : 0;
    const highwayTempAmbientAvg = highway.points > 0 ? highway.tempAmbient / highway.points : 0;
    const highwaySocAvg = highway.points > 0 ? highway.soc / highway.points : 0;
    
    // Calculer les pourcentages
    const totalPoints = urban.points + interurban.points + highway.points;
    const urbanPercentage = totalPoints > 0 ? Math.round((urban.points / totalPoints) * 100) : 0;
    const interurbanPercentage = totalPoints > 0 ? Math.round((interurban.points / totalPoints) * 100) : 0;
    const highwayPercentage = totalPoints > 0 ? Math.round((highway.points / totalPoints) * 100) : 0;
    
    // Calculer la consommation (Wh/km)
    const urbanConsumption = urban.distance > 0 ? (urban.energy * 1000) / urban.distance : 0;
    const interurbanConsumption = interurban.distance > 0 ? (interurban.energy * 1000) / interurban.distance : 0;
    const highwayConsumption = highway.distance > 0 ? (highway.energy * 1000) / highway.distance : 0;
    
    setAnalysis({
      urban: {
        ...urban,
        duration: urbanDurationMinutes,
        consumption: Math.round(urbanConsumption),
        percentage: urbanPercentage,
        tempMax: Math.round(urbanTempMaxAvg),
        tempMin: Math.round(urbanTempMinAvg),
        tempAmbient: Math.round(urbanTempAmbientAvg),
        soc: Math.round(urbanSocAvg)
      },
      interurban: {
        ...interurban,
        duration: interurbanDurationMinutes,
        consumption: Math.round(interurbanConsumption),
        percentage: interurbanPercentage,
        tempMax: Math.round(interurbanTempMaxAvg),
        tempMin: Math.round(interurbanTempMinAvg),
        tempAmbient: Math.round(interurbanTempAmbientAvg),
        soc: Math.round(interurbanSocAvg)
      },
      highway: {
        ...highway,
        duration: highwayDurationMinutes,
        consumption: Math.round(highwayConsumption),
        percentage: highwayPercentage,
        tempMax: Math.round(highwayTempMaxAvg),
        tempMin: Math.round(highwayTempMinAvg),
        tempAmbient: Math.round(highwayTempAmbientAvg),
        soc: Math.round(highwaySocAvg)
      },
      total: {
        distance: urban.distance + interurban.distance + highway.distance,
        duration: urbanDurationMinutes + interurbanDurationMinutes + highwayDurationMinutes
      }
    });
  };

  // Préparer les données de vitesse pour le graphique
  const prepareSpeedData = (tripData) => {
    // Échantillonner les données pour un affichage plus lisible
    const sampleFactor = Math.max(1, Math.floor(tripData.length / 500));
    const sampledData = [];
    
    for (let i = 0; i < tripData.length; i += sampleFactor) {
      const point = tripData[i];
      let drivingType;
      
      // Éviter les vitesses négatives
      const speed = Math.max(0, point.vehicle_speed);
      
      if (speed <= 55) {
        drivingType = 'urban';
      } else if (speed <= 110) {
        drivingType = 'interurban';
      } else {
        drivingType = 'highway';
      }
      
      sampledData.push({
        time: point.time,
        speed: speed,
        drivingType: drivingType,
        color: DRIVING_TYPE_COLORS[drivingType]
      });
    }
    
    setSpeedData(sampledData);
  };

  // Préparer les données de température pour le graphique
  const prepareTemperatureData = (tripData) => {
    const sampleFactor = Math.max(1, Math.floor(tripData.length / 500));
    const sampledData = [];
    
    for (let i = 0; i < tripData.length; i += sampleFactor) {
      const point = tripData[i];
      let drivingType;
      
      const speed = Math.max(0, point.vehicle_speed);
      
      if (speed <= 55) {
        drivingType = 'urban';
      } else if (speed <= 110) {
        drivingType = 'interurban';
      } else {
        drivingType = 'highway';
      }
      
      sampledData.push({
        time: point.time,
        tempMax: point.hv_temp_max,
        tempMin: point.hv_temp_min,
        tempAmbient: point.ambient_air_temp,
        drivingType: drivingType,
        color: DRIVING_TYPE_COLORS[drivingType]
      });
    }
    
    setTemperatureData(sampledData);
  };

  // Préparer les données de SOC pour le graphique
  const prepareSocData = (tripData) => {
    const sampleFactor = Math.max(1, Math.floor(tripData.length / 500));
    const sampledData = [];
    
    for (let i = 0; i < tripData.length; i += sampleFactor) {
      const point = tripData[i];
      let drivingType;
      
      const speed = Math.max(0, point.vehicle_speed);
      
      if (speed <= 55) {
        drivingType = 'urban';
      } else if (speed <= 110) {
        drivingType = 'interurban';
      } else {
        drivingType = 'highway';
      }
      
      sampledData.push({
        time: point.time,
        soc: point.hv_soc,
        drivingType: drivingType,
        color: DRIVING_TYPE_COLORS[drivingType]
      });
    }
    
    setSocData(sampledData);
  };

  // Préparer les données d'énergie pour le graphique (VERSION CORRIGÉE)
  const prepareEnergyData = (tripData) => {
    if (!tripData || tripData.length === 0) {
      setEnergyData([]);
      setEnergySummary(null);
      return;
    }
    
    // Vérification plus flexible des données d'énergie
    const hasEnergyData = tripData.some(point => 
      point.total_energy_charge !== undefined && 
      point.total_energy_discharge !== undefined
    );
    
    if (!hasEnergyData) {
      console.warn("Les données d'énergie cumulative ne sont pas disponibles");
      setEnergyData([]);
      setEnergySummary(null);
      return;
    }
    
    const sampleFactor = Math.max(1, Math.floor(tripData.length / 500));
    const sampledData = [];
    
    // Trouver le premier point avec des données d'énergie valides
    let firstValidPoint = null;
    for (let i = 0; i < tripData.length; i++) {
      if (tripData[i].total_energy_charge !== undefined && 
          tripData[i].total_energy_discharge !== undefined) {
        firstValidPoint = tripData[i];
        break;
      }
    }
    
    if (!firstValidPoint) {
      console.warn("Aucune donnée d'énergie valide trouvée");
      setEnergyData([]);
      setEnergySummary(null);
      return;
    }
    
    const initialCharge = firstValidPoint.total_energy_charge;
    const initialDischarge = firstValidPoint.total_energy_discharge;
    
    for (let i = 0; i < tripData.length; i += sampleFactor) {
      const point = tripData[i];
      
      // Vérifier que les données d'énergie existent pour ce point
      if (point.total_energy_charge === undefined || 
          point.total_energy_discharge === undefined) {
        continue;
      }
      
      // CALCUL CORRECT comme dans le code Python des chercheurs
      const chargeRecale = point.total_energy_charge - initialCharge;
      const dischargeRecale = point.total_energy_discharge - initialDischarge;
      
      sampledData.push({
        time: point.time,
        chargeCumulative: chargeRecale,
        dischargeCumulative: dischargeRecale
      });
    }
    
    // Calculer le résumé énergétique
    if (sampledData.length > 0) {
      const lastPoint = sampledData[sampledData.length - 1];
      
      setEnergySummary({
        charge: lastPoint.chargeCumulative.toFixed(6),
        discharge: lastPoint.dischargeCumulative.toFixed(6),
        time: lastPoint.time,
        isValid: lastPoint.dischargeCumulative < lastPoint.chargeCumulative
      });
    } else {
      setEnergySummary(null);
    }
    
    setEnergyData(sampledData);
  };

  // Préparer les données de courant et tension pour le graphique
  const prepareCurrentVoltageData = (tripData) => {
    const sampleFactor = Math.max(1, Math.floor(tripData.length / 500));
    const sampledData = [];
    
    for (let i = 0; i < tripData.length; i += sampleFactor) {
      const point = tripData[i];
      let drivingType;
      
      const speed = Math.max(0, point.vehicle_speed);
      
      if (speed <= 55) {
        drivingType = 'urban';
      } else if (speed <= 110) {
        drivingType = 'interurban';
      } else {
        drivingType = 'highway';
      }
      
      sampledData.push({
        time: point.time,
        current: point.hv_battery_current || 0,
        voltage: point.hv_battery_voltage || 0,
        drivingType: drivingType,
        color: DRIVING_TYPE_COLORS[drivingType]
      });
    }
    
    setCurrentVoltageData(sampledData);
  };

  // Générer les ticks pour l'axe X (VERSION CORRIGÉE)
  const getXAxisTicks = () => {
    if (!energyData || energyData.length === 0) return [];
    
    const maxTime = Math.max(...energyData.map(d => d.time));
    const ticks = [];
    
    // Générer des ticks cohérents pour tous les trajets
    const tickStep = maxTime > 10000 ? 2000 : 
                    maxTime > 5000 ? 1000 :
                    maxTime > 2000 ? 500 : 100;
    
    for (let i = 0; i <= maxTime; i += tickStep) {
      ticks.push(i);
    }
    
    // S'assurer d'avoir le temps maximum
    if (!ticks.includes(maxTime)) {
      ticks.push(maxTime);
    }
    
    return ticks;
  };

  if (!analysis) return <div>Chargement de l'analyse...</div>;

  return (
    <div className="driving-analysis">
      <h2>Analyse des Types de Conduite</h2>
      
      <div className="analysis-summary">
        <h3>Résumé Global</h3>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="value">{analysis.total.distance.toFixed(1)} km</span>
            <span className="label">Distance totale</span>
          </div>
          <div className="summary-stat">
            <span className="value">{analysis.total.duration.toFixed(0)} min</span>
            <span className="label">Durée totale</span>
          </div>
        </div>
      </div>
      
      <div className="analysis-cards">
        <div className="analysis-card" style={{borderLeftColor: DRIVING_TYPE_COLORS.urban}}>
          <h3>Conduite Urbaine</h3>
          <div className="analysis-stats">
            <div className="stat">
              <span className="value">{analysis.urban.percentage}%</span>
              <span className="label">Pourcentage</span>
            </div>
            <div className="stat">
              <span className="value">{analysis.urban.distance.toFixed(1)} km</span>
              <span className="label">Distance</span>
            </div>
            <div className="stat">
              <span className="value">{analysis.urban.duration.toFixed(0)} min</span>
              <span className="label">Durée</span>
            </div>
            <div className="stat">
              <span className="value">{analysis.urban.consumption} Wh/km</span>
              <span className="label">Consommation</span>
            </div>
          </div>
        </div>
        
        <div className="analysis-card" style={{borderLeftColor: DRIVING_TYPE_COLORS.interurban}}>
          <h3>Conduite Interurbaine</h3>
          <div className="analysis-stats">
            <div className="stat">
              <span className="value">{analysis.interurban.percentage}%</span>
              <span className="label">Pourcentage</span>
            </div>
            <div className="stat">
              <span className="value">{analysis.interurban.distance.toFixed(1)} km</span>
              <span className="label">Distance</span>
            </div>
            <div className="stat">
              <span className="value">{analysis.interurban.duration.toFixed(0)} min</span>
              <span className="label">Durée</span>
            </div>
            <div className="stat">
              <span className="value">{analysis.interurban.consumption} Wh/km</span>
              <span className="label">Consommation</span>
            </div>
          </div>
        </div>
        
        <div className="analysis-card" style={{borderLeftColor: DRIVING_TYPE_COLORS.highway}}>
          <h3>Conduite Autoroutière</h3>
          <div className="analysis-stats">
            <div className="stat">
              <span className="value">{analysis.highway.percentage}%</span>
              <span className="label">Pourcentage</span>
            </div>
            <div className="stat">
              <span className="value">{analysis.highway.distance.toFixed(1)} km</span>
              <span className="label">Distance</span>
            </div>
            <div className="stat">
              <span className="value">{analysis.highway.duration.toFixed(0)} min</span>
              <span className="label">Durée</span>
            </div>
            <div className="stat">
              <span className="value">{analysis.highway.consumption} Wh/km</span>
              <span className="label">Consommation</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="charts-container">
        <div className="chart-wrapper">
          <h3>Vitesse et Classification du Trajet</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={speedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                type="number"
                ticks={getXAxisTicks()}
                domain={[0, 'dataMax']}
                label={{ value: 'Temps (secondes)', position: 'insideBottom', offset: -5 }} 
              />
              <YAxis 
                ticks={Y_AXIS_TICKS}
                domain={[0, 250]}
                label={{ value: 'Vitesse (km/h)', angle: -90, position: 'insideLeft' }} 
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === "Vitesse") return [value, "Vitesse (km/h)"];
                  return [value, name];
                }}
                labelFormatter={(value) => `Temps: ${value}s`}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="speed" 
                stroke="#8884d8" 
                fill="#8884d8" 
                fillOpacity={0.3} 
                name="Vitesse" 
              />
              <Scatter 
                dataKey="speed" 
                fill="#ff7300" 
                name="Points de mesure" 
              />
              <ReferenceArea y1={0} y2={55} fill={DRIVING_TYPE_COLORS.urban} fillOpacity={0.1} label="Urbain" />
              <ReferenceArea y1={55} y2={110} fill={DRIVING_TYPE_COLORS.interurban} fillOpacity={0.1} label="Interurbain" />
              <ReferenceArea y1={110} y2={250} fill={DRIVING_TYPE_COLORS.highway} fillOpacity={0.1} label="Autoroutier" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-wrapper">
          <h3>Répartition des Types de Conduite</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { name: 'Urbain', value: analysis.urban.percentage, color: DRIVING_TYPE_COLORS.urban },
                { name: 'Interurbain', value: analysis.interurban.percentage, color: DRIVING_TYPE_COLORS.interurban },
                { name: 'Autoroutier', value: analysis.highway.percentage, color: DRIVING_TYPE_COLORS.highway }
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: 'Pourcentage (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="value">
                {[
                  DRIVING_TYPE_COLORS.urban,
                  DRIVING_TYPE_COLORS.interurban,
                  DRIVING_TYPE_COLORS.highway
                ].map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Nouveau graphique pour le courant et la tension */}
        <div className="chart-wrapper">
          <h3>Courant et Tension de la Batterie</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={currentVoltageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                type="number"
                ticks={getXAxisTicks()}
                domain={[0, 'dataMax']}
                label={{ value: 'Temps (secondes)', position: 'insideBottom', offset: -5 }} 
              />
              <YAxis 
                yAxisId="current"
                ticks={CURRENT_TICKS}
                domain={[-600, 600]}
                label={{ value: 'Courant (A)', angle: -90, position: 'insideLeft' }} 
              />
              <YAxis 
                yAxisId="voltage"
                orientation="right"
                ticks={VOLTAGE_TICKS}
                domain={[280, 380]}
                label={{ value: 'Tension (V)', angle: -90, position: 'insideRight' }} 
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === "Courant") return [value, "Courant (A)"];
                  if (name === "Tension") return [value, "Tension (V)"];
                  return [value, name];
                }}
                labelFormatter={(value) => `Temps: ${value}s`}
              />
              <Legend />
              <Line 
                yAxisId="current"
                type="monotone" 
                dataKey="current" 
                stroke="#ff7300" 
                strokeWidth={2} 
                dot={false} 
                name="Courant" 
              />
              <Line 
                yAxisId="voltage"
                type="monotone" 
                dataKey="voltage" 
                stroke="#8884d8" 
                strokeWidth={2} 
                dot={false} 
                name="Tension" 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section: Analyse énergétique */}
      <div className="energy-analysis">
        <h2>Analyse Énergétique</h2>
        
        {energySummary && (
          <div className="energy-summary">
            <h3>Résumé Énergétique</h3>
            <div className="summary-stats">
              <div className="summary-stat">
                <span className="value">{energySummary.charge} kWh</span>
                <span className="label">Énergie totale de charge</span>
              </div>
              <div className="summary-stat">
                <span className="value">{energySummary.discharge} kWh</span>
                <span className="label">Énergie totale de décharge </span>
              </div>
              <div className="summary-stat">
                <span className="value">{energySummary.time}s</span>
                <span className="label">Temps total</span>
              </div>
              {energySummary.isValid && (
                <div className="summary-stat validation">
                  <span className="value">✅</span>
                  <span className="label">Décharge {'<'} Charge</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="charts-container">
          <div className="chart-wrapper">
            <h3>Énergie Totale Charge / Décharge</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={energyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  type="number"
                  ticks={getXAxisTicks()}
                  domain={[0, 'dataMax']}
                  label={{ value: 'Temps global (s)', position: 'insideBottom', offset: -5 }} 
                />
                <YAxis 
                  label={{ value: 'Énergie (kWh)', angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "chargeCumulative") return [value.toFixed(6), "Énergie totale de charge (kWh)"];
                    if (name === "dischargeCumulative") return [value.toFixed(6), "Énergie totale de décharge (kWh)"];
                    return [value, name];
                  }}
                  labelFormatter={(value) => `Temps: ${value}s`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="chargeCumulative" 
                  stroke="#4caf50" 
                  strokeWidth={2} 
                  dot={false} 
                  name="Énergie totale de charge" 
                />
                <Line 
                  type="monotone" 
                  dataKey="dischargeCumulative" 
                  stroke="#f44336" 
                  strokeWidth={2} 
                  dot={false} 
                  name="Énergie totale de décharge" 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section: Analyse des performances */}
      <div className="performance-analysis">
        <h2>Analyse des Performances par Type de Conduite</h2>
        
        <div className="performance-cards">
          <div className="performance-card">
            <h3>Températures Moyennes par Type de Conduite</h3>
            <div className="performance-stats">
              <div className="performance-stat">
                <span className="label">Urbain:</span>
                <span className="value">Max: {analysis.urban.tempMax}°C, Min: {analysis.urban.tempMin}°C, Ambiante: {analysis.urban.tempAmbient}°C</span>
              </div>
              <div className="performance-stat">
                <span className="label">Interurbain:</span>
                <span className="value">Max: {analysis.interurban.tempMax}°C, Min: {analysis.interurban.tempMin}°C, Ambiante: {analysis.interurban.tempAmbient}°C</span>
              </div>
              <div className="performance-stat">
                <span className="label">Autoroutier:</span>
                <span className="value">Max: {analysis.highway.tempMax}°C, Min: {analysis.highway.tempMin}°C, Ambiante: {analysis.highway.tempAmbient}°C</span>
              </div>
            </div>
          </div>
          
          <div className="performance-card">
            <h3>SOC Moyen par Type de Conduite</h3>
            <div className="performance-stats">
              <div className="performance-stat">
                <span className="label">Urbain:</span>
                <span className="value">{analysis.urban.soc}%</span>
              </div>
              <div className="performance-stat">
                <span className="label">Interurbain:</span>
                <span className="value">{analysis.interurban.soc}%</span>
              </div>
              <div className="performance-stat">
                <span className="label">Autoroutier:</span>
                <span className="value">{analysis.highway.soc}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="charts-container">
          <div className="chart-wrapper">
            <h3>Évolution des Températures</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={temperatureData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  type="number"
                  ticks={getXAxisTicks()}
                  domain={[0, 'dataMax']}
                  label={{ value: 'Temps (secondes)', position: 'insideBottom', offset: -5 }} 
                />
                <YAxis 
                  label={{ value: 'Température (°C)', angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "tempMax") return [value, "Température Max (°C)"];
                    if (name === "tempMin") return [value, "Température Min (°C)"];
                    if (name === "tempAmbient") return [value, "Température Ambiante (°C)"];
                    return [value, name];
                  }}
                  labelFormatter={(value) => `Temps: ${value}s`}
                />
                <Legend />
                <Line type="monotone" dataKey="tempMax" stroke="#e74c3c" dot={false} name="Température Max" />
                <Line type="monotone" dataKey="tempMin" stroke="#3498db" dot={false} name="Température Min" />
                <Line type="monotone" dataKey="tempAmbient" stroke="#2ecc71" dot={false} name="Température Ambiante" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div className="chart-wrapper">
            <h3>Évolution du State of Charge (SOC)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={socData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  type="number"
                  ticks={getXAxisTicks()}
                  domain={[0, 'dataMax']}
                  label={{ value: 'Temps (secondes)', position: 'insideBottom', offset: -5 }} 
                />
                <YAxis 
                  domain={[0, 100]}
                  label={{ value: 'SOC (%)', angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "soc") return [value, "SOC (%)"];
                    return [value, name];
                  }}
                  labelFormatter={(value) => `Temps: ${value}s`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="soc" 
                  stroke="#9b59b6" 
                  fill="#9b59b6" 
                  fillOpacity={0.3} 
                  name="SOC" 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// Page principale d'analyse
export default function CompleteAnalysisPage() {
  const [trajets, setTrajets] = useState([]);
  const [currentTrajet, setCurrentTrajet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState("all");
  const [allTripsData, setAllTripsData] = useState([]);

  // Charger les données depuis Firebase
  useEffect(() => {
    const fetchTrajets = async () => {
      setIsLoading(true);
      try {
        const dbRef = ref(database, '/trajets/trajets');
        const snapshot = await get(dbRef);
        
        if (snapshot.exists()) {
          const trajetsData = snapshot.val();
          const trajetsArray = Object.entries(trajetsData).map(([key, trajet]) => ({
            id: parseInt(key),
            ...trajet
          }));
          
          setTrajets(trajetsArray);
          
          // Préparer les données combinées de tous les trajets
          if (trajetsArray.length > 0) {
            let cumulativeTime = 0;
            const combinedData = [];
            let chargeOffset = 0;
            let dischargeOffset = 0;
            
            trajetsArray.forEach(trajet => {
              if (trajet.data && trajet.data.length > 0) {
                const sortedTrajetData = [...trajet.data].sort((a, b) => a.time_s - b.time_s);
                
                // Recalage cumulatif comme dans le code Python
                const initialCharge = sortedTrajetData[0]?.total_energy_charge || 0;
                const initialDischarge = sortedTrajetData[0]?.total_energy_discharge || 0;
                
                sortedTrajetData.forEach(point => {
                  const chargeRecale = (point.total_energy_charge || 0) - initialCharge + chargeOffset;
                  const dischargeRecale = (point.total_energy_discharge || 0) - initialDischarge + dischargeOffset;
                  
                  combinedData.push({
                    ...point,
                    time: point.time_s + cumulativeTime,
                    vehicle_speed: Math.max(0, point.vehicle_speed),
                    hv_temp_max: point.hv_temp_max || 0,
                    hv_temp_min: point.hv_temp_min || 0,
                    ambient_air_temp: point.ambient_air_temp || 0,
                    hv_soc: point.hv_soc || 0,
                    hv_battery_current: point.hv_battery_current || 0,
                    hv_battery_voltage: point.hv_battery_voltage || 0,
                    total_energy_charge: chargeRecale,
                    total_energy_discharge: dischargeRecale
                  });
                });
                
                // Mettre à jour les offsets pour le prochain trajet
                if (sortedTrajetData.length > 0) {
                  const lastPoint = sortedTrajetData[sortedTrajetData.length - 1];
                  chargeOffset = (lastPoint.total_energy_charge || 0) - initialCharge + chargeOffset;
                  dischargeOffset = (lastPoint.total_energy_discharge || 0) - initialDischarge + dischargeOffset;
                  cumulativeTime += lastPoint.time_s;
                }
              }
            });
            
            setAllTripsData(combinedData);
            setSelectedTrip("all");
            setCurrentTrajet({ 
              id: "all", 
              data: combinedData, 
              name: "Tous les trajets combinés" 
            });
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrajets();
  }, []);

  const handleTripChange = (event) => {
    const selectedValue = event.target.value;
    setSelectedTrip(selectedValue);
    
    if (selectedValue === "all") {
      setCurrentTrajet({ 
        id: "all", 
        data: allTripsData, 
        name: "Tous les trajets combinés" 
      });
    } else {
      const tripId = parseInt(selectedValue);
      const selectedTrajet = trajets.find(t => t.id === tripId);
      if (selectedTrajet && selectedTrajet.data) {
        const sortedData = [...selectedTrajet.data].sort((a, b) => a.time_s - b.time_s);
        const dataWithTime = sortedData.map(point => ({ 
          ...point, 
          time: point.time_s,
          vehicle_speed: Math.max(0, point.vehicle_speed),
          hv_temp_max: point.hv_temp_max || 0,
          hv_temp_min: point.hv_temp_min || 0,
          ambient_air_temp: point.ambient_air_temp || 0,
          hv_soc: point.hv_soc || 0,
          hv_battery_current: point.hv_battery_current || 0,
          hv_battery_voltage: point.hv_battery_voltage || 0
        }));
        setCurrentTrajet({ ...selectedTrajet, data: dataWithTime });
      } else {
        setCurrentTrajet(selectedTrajet);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="analysis-container">
        <div className="loading">Chargement des données...</div>
      </div>
    );
  }

  return (
    <div className="analysis-container">
      <header className="analysis-header">
        <h1>Analyse Complète des Données de Trajets</h1>
        
        <div className="trip-selector">
          <label>Sélectionner un trajet: </label>
          <select value={selectedTrip} onChange={handleTripChange}>
            <option value="all">Tous les trajets combinés</option>
            {trajets.map(trajet => (
              <option key={trajet.id} value={trajet.id}>
                Trajet {trajet.id} ({trajet.data?.length || 0} points de données)
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="analysis-content">
        {currentTrajet && currentTrajet.data ? (
          <>
            <div className="trip-info">
              <h2>{currentTrajet.id === "all" ? "Tous les trajets combinés" : `Trajet ${currentTrajet.id}`}</h2>
              <p>
                {currentTrajet.data.length} points de données | 
                {currentTrajet.data.length > 0 && (
                  <> Durée totale: {Math.round((currentTrajet.data[currentTrajet.data.length - 1].time - currentTrajet.data[0].time) / 60)} minutes</>
                )}
              </p>
            </div>
            
            <DrivingTypeAnalysis 
              data={currentTrajet.data} 
              isAllTrips={currentTrajet.id === "all"} 
            />
          </>
        ) : (
          <div className="no-data">Aucune donnée disponible pour l'analyse</div>
        )}
      </main>
    </div>
  );
}




/*import React, { useState, useEffect, useRef } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../firebase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  Play, Pause, RotateCcw, Zap, Battery, Thermometer, BarChart2, 
  AlertTriangle, Download, Settings, Clock, Activity, Cpu,
  TrendingUp, Calendar, Shield, ArrowUpCircle, ArrowDownCircle,
  Navigation, RefreshCw
} from 'react-feather';
import './Simulation.css';

// Couleurs Tesla pour le design
const TESLA_COLORS = {
  primary: '#e82127', // Rouge Tesla
  secondary: '#3e6ae1', // Bleu Tesla
  accent: '#00d664', // Vert Tesla
  dark: '#191e1f', // Noir Tesla
  light: '#f5f5f5', // Blanc
  warning: '#fbb81b', // Orange
  danger: '#e82127', // Rouge
  success: '#00d664' // Vert
};

// Composant KPI Card
const KPICard = ({ icon, title, value, unit, trend, subtitle, color }) => (
  <div className="kpi-card">
    <div className="kpi-header">
      <div className="kpi-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="kpi-title">
        <h4>{title}</h4>
        {subtitle && <span>{subtitle}</span>}
      </div>
    </div>
    <div className="kpi-value">
      <h2>{value}</h2>
      <span className="kpi-unit">{unit}</span>
    </div>
    {trend && (
      <div className={`kpi-trend ${trend}`}>
        {trend === 'up' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
        <span>5.2%</span>
      </div>
    )}
  </div>
);

// Composant de contrôle de simulation
const SimulationControls = ({ isPlaying, onPlayPause, onReset, speed, onSpeedChange }) => (
  <div className="simulation-controls">
    <button 
      className={`control-btn ${isPlaying ? 'pause' : 'play'}`}
      onClick={onPlayPause}
    >
      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
      {isPlaying ? 'Pause' : 'Démarrer'}
    </button>
    
    <button className="control-btn reset" onClick={onReset}>
      <RotateCcw size={18} />
      Réinitialiser
    </button>
    
    <div className="speed-control">
      <label>Vitesse:</label>
      <select value={speed} onChange={(e) => onSpeedChange(Number(e.target.value))}>
        <option value={0.5}>0.5x</option>
        <option value={1}>1x</option>
        <option value={2}>2x</option>
        <option value={5}>5x</option>
      </select>
    </div>
  </div>
);

// Composant de scénario
const ScenarioCard = ({ title, description, icon, onRun, active }) => (
  <div className={`scenario-card ${active ? 'active' : ''}`} onClick={onRun}>
    <div className="scenario-icon">{icon}</div>
    <div className="scenario-content">
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  </div>
);

// Composant d'alerte
const AlertItem = ({ type, message, timestamp, severity }) => (
  <div className={`alert-item ${severity}`}>
    <div className="alert-icon">
      <AlertTriangle size={16} />
    </div>
    <div className="alert-content">
      <span className="alert-type">{type}</span>
      <p>{message}</p>
      <span className="alert-time">{timestamp}</span>
    </div>
  </div>
);

// Page principale de simulation
export default function SimulationPage() {
  const [trajets, setTrajets] = useState([]);
  const [currentTrajet, setCurrentTrajet] = useState(null);
  const [currentDataPoint, setCurrentDataPoint] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [selectedScenario, setSelectedScenario] = useState('normal');
  const [simulationStats, setSimulationStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState(null);
  const [analysisMode, setAnalysisMode] = useState('all'); // 'all' ou 'single'
  const [selectedTrajetId, setSelectedTrajetId] = useState('0');
  
  const simulationInterval = useRef(null);

  // Charger les données depuis Firebase
  useEffect(() => {
    const fetchTrajets = async () => {
      setIsLoading(true);
      setFirebaseError(null);
      
      try {
        console.log("🔄 Tentative de connexion à Firebase...");
        
        // CORRECTION: Accéder à '/trajets/trajets' au lieu de '/trajets'
        const dbRef = ref(database, '/trajets/trajets');
        const snapshot = await get(dbRef);
        
        if (snapshot.exists()) {
          const trajetsData = snapshot.val();
          console.log("Données brutes Firebase:", trajetsData);
          
          // Structure: { "0": { data: [...] }, "1": { data: [...] }, ... }
          const trajetsArray = Object.entries(trajetsData).map(([key, trajet]) => {
            return {
              id: parseInt(key),
              ...trajet
            };
          });
          
          console.log("Trajets formatés:", trajetsArray);
          
          setTrajets(trajetsArray);
          if (trajetsArray.length > 0) {
            setCurrentTrajet(trajetsArray[0]);
            setSelectedTrajetId('0');
            calculateStats(trajetsArray[0].data[0]);
            console.log(`📊 ${trajetsArray.length} trajets chargés avec succès`);
          }
        } else {
          console.log('Aucun trajet trouvé dans Firebase');
          setFirebaseError("Aucune donnée trouvée dans Firebase");
        }
      } catch (error) {
        console.error('Erreur lors du chargement:', error);
        setFirebaseError(error.message);
        
        // Données de démonstration en cas d'erreur
        const demoData = generateDemoData();
        setTrajets(demoData);
        setCurrentTrajet(demoData[0]);
        setSelectedTrajetId('0');
        calculateStats(demoData[0].data[0]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrajets();
  }, []);

  // Mettre à jour le trajet courant quand la sélection change
  useEffect(() => {
    if (selectedTrajetId && trajets.length > 0) {
      const selected = trajets.find(t => t.id == selectedTrajetId);
      if (selected) {
        setCurrentTrajet(selected);
        setCurrentDataPoint(0);
        calculateStats(selected.data[0]);
        stopSimulation();
      }
    }
  }, [selectedTrajetId, trajets]);

  // Générer des données de démonstration
  const generateDemoData = () => {
    console.log("📋 Utilisation des données de démonstration");
    return [
      {
        id: 0,
        data: Array.from({length: 100}, (_, i) => ({
          time_s: i,
          hv_battery_voltage: 350 + Math.sin(i/10) * 10,
          hv_battery_current: -5 + Math.cos(i/5) * 3,
          hv_soc: 60 + Math.sin(i/20) * 10,
          hv_temp_max: 25 + Math.sin(i/15) * 5,
          hv_temp_min: 20 + Math.cos(i/15) * 3,
          ambient_air_temp: 30 + Math.sin(i/25) * 5,
          vehicle_speed: Math.abs(Math.sin(i/10)) * 120,
          total_energy_charge: 2681.82 + i * 0.5,
          total_energy_discharge: 2528.48 + i * 0.7
        }))
      },
      {
        id: 1,
        data: Array.from({length: 80}, (_, i) => ({
          time_s: i,
          hv_battery_voltage: 355 + Math.sin(i/8) * 8,
          hv_battery_current: -6 + Math.cos(i/4) * 4,
          hv_soc: 70 + Math.sin(i/15) * 8,
          hv_temp_max: 28 + Math.sin(i/12) * 6,
          hv_temp_min: 22 + Math.cos(i/12) * 4,
          ambient_air_temp: 32 + Math.sin(i/20) * 4,
          vehicle_speed: Math.abs(Math.sin(i/8)) * 100,
          total_energy_charge: 2700 + i * 0.6,
          total_energy_discharge: 2550 + i * 0.8
        }))
      },
      // Ajouter d'autres trajets de démonstration si nécessaire
      ...Array.from({length: 13}, (_, idx) => ({
        id: idx + 2,
        data: Array.from({length: 90 + Math.floor(Math.random() * 20)}, (_, i) => ({
          time_s: i,
          hv_battery_voltage: 345 + Math.sin(i/(8 + idx)) * (12 - idx),
          hv_battery_current: -4.5 + Math.cos(i/(4 + idx)) * (3 + idx/2),
          hv_soc: 65 + Math.sin(i/(18 + idx)) * (15 - idx),
          hv_temp_max: 26 + Math.sin(i/(13 + idx)) * (6 - idx/3),
          hv_temp_min: 21 + Math.cos(i/(14 + idx)) * (4 - idx/4),
          ambient_air_temp: 29 + Math.sin(i/(22 + idx)) * (6 - idx/3),
          vehicle_speed: Math.abs(Math.sin(i/(9 + idx))) * (110 - idx * 2),
          total_energy_charge: 2650 + i * (0.4 + idx/20),
          total_energy_discharge: 2500 + i * (0.6 + idx/15)
        }))
      }))
    ];
  };

  // Démarrer/arrêter la simulation
  const toggleSimulation = () => {
    if (isPlaying) {
      stopSimulation();
    } else {
      startSimulation();
    }
  };

  const startSimulation = () => {
    setIsPlaying(true);
    simulationInterval.current = setInterval(advanceSimulation, 1000 / simulationSpeed);
  };

  const stopSimulation = () => {
    setIsPlaying(false);
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
    }
  };

  const advanceSimulation = () => {
    if (!currentTrajet) return;
    
    const nextIndex = (currentDataPoint + 1) % currentTrajet.data.length;
    setCurrentDataPoint(nextIndex);
    calculateStats(currentTrajet.data[nextIndex]);
    checkForAlerts(currentTrajet.data[nextIndex]);
  };

  const resetSimulation = () => {
    stopSimulation();
    setCurrentDataPoint(0);
    if (currentTrajet) {
      calculateStats(currentTrajet.data[0]);
    }
  };

  // Calculer les statistiques
  const calculateStats = (dataPoint) => {
    const stats = {
      soc: dataPoint.hv_soc,
      voltage: dataPoint.hv_battery_voltage,
      current: dataPoint.hv_battery_current,
      tempMax: dataPoint.hv_temp_max,
      tempMin: dataPoint.hv_temp_min,
      ambientTemp: dataPoint.ambient_air_temp,
      speed: dataPoint.vehicle_speed,
      energyCharge: dataPoint.total_energy_charge,
      energyDischarge: dataPoint.total_energy_discharge,
      energyNet: dataPoint.total_energy_charge - dataPoint.total_energy_discharge,
      efficiency: dataPoint.total_energy_charge > 0 ? 
        (dataPoint.total_energy_discharge / dataPoint.total_energy_charge) * 100 : 0
    };
    
    setSimulationStats(stats);
  };

  // Vérifier les alertes
  const checkForAlerts = (dataPoint) => {
    const newAlerts = [];
    const now = new Date().toLocaleTimeString();

    if (dataPoint.hv_temp_max >= 45) {
      newAlerts.push({
        type: 'Température',
        message: 'Température élevée détectée',
        timestamp: now,
        severity: 'high'
      });
    }

    if (dataPoint.hv_battery_voltage <= 340) {
      newAlerts.push({
        type: 'Tension',
        message: 'Tension batterie faible',
        timestamp: now,
        severity: 'medium'
      });
    }

    if (dataPoint.hv_soc <= 20) {
      newAlerts.push({
        type: 'SOC',
        message: 'SOC faible - Recharge recommandée',
        timestamp: now,
        severity: 'medium'
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev.slice(0, 4)]);
    }
  };

  // Exporter les données
  const exportData = () => {
    if (!currentTrajet) return;
    
    const dataStr = JSON.stringify(currentTrajet.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trajet-${currentTrajet.id}-simulation.json`;
    link.click();
  };

  // Données pour les graphiques
  const chartData = currentTrajet ? currentTrajet.data.slice(0, 100).map((point, index) => ({
    time: point.time_s,
    soc: point.hv_soc,
    voltage: point.hv_battery_voltage,
    current: point.hv_battery_current,
    temp: point.hv_temp_max,
    speed: point.vehicle_speed
  })) : [];

  const radarData = [
    { subject: 'Performance', A: 85, fullMark: 100 },
    { subject: 'Efficacité', A: 78, fullMark: 100 },
    { subject: 'Sécurité', A: 92, fullMark: 100 },
    { subject: 'Durabilité', A: 88, fullMark: 100 },
    { subject: 'Charge', A: 75, fullMark: 100 },
    { subject: 'Décharge', A: 82, fullMark: 100 }
  ];

  if (isLoading) {
    return (
      <div className="simulation-container">
        <div className="loading">Chargement des données de simulation...</div>
      </div>
    );
  }

  return (
    <div className="simulation-container">
      {/* Header *//*}
      <header className="simulation-header">
        <h1><Activity size={32} /> Simulation Avancée</h1>
        <div className="header-actions">
          {firebaseError && (
            <div className="error-badge">
              Mode démo: {firebaseError}
            </div>
          )}
          <button className="export-btn" onClick={exportData}>
            <Download size={16} /> Exporter
          </button>
        </div>
      </header>

      <div className="simulation-content">
        {/* Sidebar *//*}
        <aside className="simulation-sidebar">
          <div className="sidebar-section">
            <h3>Scénarios de Simulation</h3>
            <ScenarioCard
              title="Conduite Normale"
              description="Conditions de conduite standard"
              icon={<Navigation size={20} />}
              onRun={() => setSelectedScenario('normal')}
              active={selectedScenario === 'normal'}
            />
            <ScenarioCard
              title="Haute Performance"
              description="Conduite sportive et accélérations"
              icon={<Zap size={20} />}
              onRun={() => setSelectedScenario('performance')}
              active={selectedScenario === 'performance'}
            />
            <ScenarioCard
              title="Conditions Extrêmes"
              description="Températures élevées et charge rapide"
              icon={<Thermometer size={20} />}
              onRun={() => setSelectedScenario('extreme')}
              active={selectedScenario === 'extreme'}
            />
          </div>

          <div className="sidebar-section">
            <h3>Mode d'Analyse</h3>
            <div className="analysis-mode-selector">
              <div 
                className={`mode-option ${analysisMode === 'all' ? 'active' : ''}`}
                onClick={() => setAnalysisMode('all')}
              >
                Tous les trajets
              </div>
              <div 
                className={`mode-option ${analysisMode === 'single' ? 'active' : ''}`}
                onClick={() => setAnalysisMode('single')}
              >
                Trajet spécifique
              </div>
            </div>

            {analysisMode === 'single' && (
              <div className="trajet-selector">
                <label>Sélectionner un trajet:</label>
                <select 
                  value={selectedTrajetId} 
                  onChange={(e) => setSelectedTrajetId(e.target.value)}
                >
                  {trajets.map(trajet => (
                    <option key={trajet.id} value={trajet.id}>
                      Trajet {trajet.id} ({trajet.data.length} points)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <h3>Alertes en Temps Réel</h3>
            <div className="alerts-container">
              {alerts.length > 0 ? (
                alerts.map((alert, index) => (
                  <AlertItem key={index} {...alert} />
                ))
              ) : (
                <p className="no-alerts">Aucune alerte</p>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content *//*}
        <main className="simulation-main">
          {/* Controls *//*}
          <div className="controls-section">
            <div className="analysis-info">
              {analysisMode === 'all' ? (
                <span className="info-badge">Analyse de tous les trajets</span>
              ) : (
                <span className="info-badge">Analyse du Trajet {selectedTrajetId}</span>
              )}
            </div>
            
            <SimulationControls
              isPlaying={isPlaying}
              onPlayPause={toggleSimulation}
              onReset={resetSimulation}
              speed={simulationSpeed}
              onSpeedChange={setSimulationSpeed}
            />
          </div>

          {/* KPI Dashboard *//*}
          <div className="kpi-dashboard">
            <KPICard
              icon={<Battery size={20} />}
              title="State of Charge"
              value={simulationStats.soc ? simulationStats.soc.toFixed(1) : 0}
              unit="%"
              trend="stable"
              color={TESLA_COLORS.primary}
            />
            <KPICard
              icon={<Zap size={20} />}
              title="Tension Batterie"
              value={simulationStats.voltage ? simulationStats.voltage.toFixed(1) : 0}
              unit="V"
              trend="up"
              color={TESLA_COLORS.secondary}
            />
            <KPICard
              icon={<RefreshCw size={20} />}
              title="Efficacité"
              value={simulationStats.efficiency ? simulationStats.efficiency.toFixed(1) : 0}
              unit="%"
              trend="up"
              color={TESLA_COLORS.success}
            />
            <KPICard
              icon={<Thermometer size={20} />}
              title="Température Max"
              value={simulationStats.tempMax ? simulationStats.tempMax.toFixed(1) : 0}
              unit="°C"
              trend="stable"
              color={TESLA_COLORS.warning}
            />
          </div>

          {/* Charts Grid *//*}
          <div className="charts-grid">
            <div className="chart-card">
              <h4>Évolution du SOC</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="soc" stroke={TESLA_COLORS.primary} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h4>Performance Batterie</h4>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar name="Performance" dataKey="A" stroke={TESLA_COLORS.secondary} fill={TESLA_COLORS.secondary} fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h4>Tension et Courant</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData.slice(-10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="voltage" fill={TESLA_COLORS.primary} name="Tension (V)" />
                  <Bar yAxisId="right" dataKey="current" fill={TESLA_COLORS.secondary} name="Courant (A)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h4>Température et Vitesse</h4>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="temp" stroke={TESLA_COLORS.warning} fill={TESLA_COLORS.warning} fillOpacity={0.3} name="Température (°C)" />
                  <Area yAxisId="right" type="monotone" dataKey="speed" stroke={TESLA_COLORS.success} fill={TESLA_COLORS.success} fillOpacity={0.3} name="Vitesse (km/h)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Metrics *//*}
          <div className="metrics-section">
            <h3>Métriques Détaillées</h3>
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-label">Température Min</span>
                <span className="metric-value">{simulationStats.tempMin ? simulationStats.tempMin.toFixed(1) : 0}°C</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Température Ambiance</span>
                <span className="metric-value">{simulationStats.ambientTemp ? simulationStats.ambientTemp.toFixed(1) : 0}°C</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Vitesse Véhicule</span>
                <span className="metric-value">{simulationStats.speed ? simulationStats.speed.toFixed(1) : 0} km/h</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Énergie Chargée</span>
                <span className="metric-value">{simulationStats.energyCharge ? simulationStats.energyCharge.toFixed(1) : 0} kWh</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Énergie Déchargée</span>
                <span className="metric-value">{simulationStats.energyDischarge ? simulationStats.energyDischarge.toFixed(1) : 0} kWh</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Énergie Nette</span>
                <span className="metric-value">{simulationStats.energyNet ? simulationStats.energyNet.toFixed(1) : 0} kWh</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 
*/














/*import { useState, useEffect } from 'react'
import { ref, get } from 'firebase/database'
import { database } from '../firebase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

export default function Simulation() {
  const [trajet, setTrajet] = useState(0)
  const [mesures, setMesures] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = (trajetId) => {
    setLoading(true)
    const dbRef = ref(database, `/trajets/${trajetId}/data`)

    get(dbRef)
      .then(snapshot => {
        const raw = snapshot.val()
        if (!raw) {
          setMesures([])
          setLoading(false)
          return
        }

        const arrayData = Object.values(raw).map((m, i) => ({
          index: i,
          time: m.time_s,
          soc: m.hv_soc,
          temperature: m.hv_temp_min,
          max_temperature: m.hv_temp_max,
          voltage: m.hv_battery_voltage,
          current: m.hv_battery_current,
          speed: m.speed,
          cycle: Math.floor(m.time_s / 60) // cycle basé sur le temps réel
        }))

        setMesures(arrayData)
        setLoading(false)
      })
      .catch(err => {
        console.error('Erreur chargement données:', err)
        setMesures([])
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchData(trajet)
  }, [trajet])

  if (loading) return <p>Chargement…</p>
  if (mesures.length === 0) return <p>❌ Aucune donnée disponible pour le trajet {trajet}</p>

  // Tooltip générique pour tous les graphes
  const tooltipLabelFormatter = (label, payload) => {
    if (!payload || payload.length === 0) return ''
    const point = payload[0].payload
    return `Cycle ${point.cycle}, t=${point.time}s`
  }

  // Générer des ticks tous les 60 s dynamiquement selon la durée du trajet
  const maxTime = mesures[mesures.length - 1].time
  const ticks = Array.from({ length: Math.ceil(maxTime / 60) + 1 }, (_, i) => i * 60)

  return (
    <div style={{ padding: 40, fontFamily: 'Arial, sans-serif' }}>
      <h1>📊 Simulation — Trajet {trajet}</h1>

      {/* Sélection du trajet */
      /*<div style={{ marginBottom: 30 }}>
        <button onClick={() => setTrajet(prev => Math.max(prev - 1, 0))} style={{ marginRight: 10 }}>
          ◀ Précédent
        </button>
        <button onClick={() => setTrajet(prev => Math.min(prev + 1, 227))} style={{ marginRight: 20 }}>
          Suivant ▶
        </button>

        <label>Trajet manuel : </label>
        <input
          type="number"
          min="0"
          max="227"
          value={trajet}
          onChange={e => setTrajet(Number(e.target.value))}
          style={{ width: 60, marginLeft: 10 }}
        />
      </div>

      {/* SOC réel */
     /* <section style={{ marginBottom: 60 }}>
        <h2>🔋 SOC réel</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              type="number"
              ticks={ticks}
              label={{ value: "Temps (s)", position: "insideBottomRight", offset: -5 }}
            />
            <YAxis domain={[0, 110]} label={{ value: '% SOC', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value, name) => [value, name]} labelFormatter={tooltipLabelFormatter} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="soc" stroke="#27ae60" name="SOC réel" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Température et Température max */
     /* <section style={{ marginBottom: 60 }}>
        <h2>🌡️ Température et Température max</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" type="number" ticks={ticks} label={{ value: "Temps (s)", position: "insideBottomRight", offset: -5 }} />
            <YAxis label={{ value: '°C', angle: -90, position: 'insideLeft' }} />
            <Tooltip labelFormatter={tooltipLabelFormatter} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="temperature" stroke="#e74c3c" name="Température min" dot={false} />
            <Line type="monotone" dataKey="max_temperature" stroke="#c0392b" name="Température max" dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Tension */
     /* <section style={{ marginBottom: 60 }}>
        <h2>🔌 Tension (Voltage)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" type="number" ticks={ticks} label={{ value: "Temps (s)", position: "insideBottomRight", offset: -5 }} />
            <YAxis label={{ value: 'Volts', angle: -90, position: 'insideLeft' }} />
            <Tooltip labelFormatter={tooltipLabelFormatter} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="voltage" stroke="#9b59b6" name="Tension" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Courant */
     /* <section style={{ marginBottom: 60 }}>
        <h2>⚡ Courant (Ampères)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" type="number" ticks={ticks} label={{ value: "Temps (s)", position: "insideBottomRight", offset: -5 }} />
            <YAxis label={{ value: 'Ampères', angle: -90, position: 'insideLeft' }} />
            <Tooltip labelFormatter={tooltipLabelFormatter} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="current" stroke="#2980b9" name="Courant" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Vitesse */
     /* <section style={{ marginBottom: 60 }}>
        <h2>🏎️ Vitesse (km/h)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" type="number" ticks={ticks} label={{ value: "Temps (s)", position: "insideBottomRight", offset: -5 }} />
            <YAxis label={{ value: 'km/h', angle: -90, position: 'insideLeft' }} />
            <Tooltip labelFormatter={tooltipLabelFormatter} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="speed" stroke="#9c27b0" name="Vitesse" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}
*/











/*import { useEffect, useState } from 'react'
import { ref, get } from 'firebase/database'
import { database } from '../firebase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

export default function Simulation() {
  const [mesures, setMesures] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const dbRef = ref(database, 'trajets/6/data') // Chemin du trajet 6

    get(dbRef)
      .then(snapshot => {
        const raw = snapshot.val()
        if (!raw) {
          setMesures([])
          setLoading(false)
          return
        }

        const arrayData = Object.values(raw)
          .filter(m =>
            m.time_s !== undefined &&
            (m.hv_soc !== undefined || m.displayed_soc !== undefined) &&
            m.hv_temp_min !== undefined &&
            m.hv_temp_max !== undefined &&
            m.hv_battery_voltage !== undefined &&
            m.hv_battery_current !== undefined &&
            m.speed !== undefined
          )

        setMesures(arrayData)
        setLoading(false)
      })
      .catch(err => {
        console.error('Erreur chargement données:', err)
        setMesures([])
        setLoading(false)
      })
  }, [])

  if (loading) return <p>Chargement des données…</p>
  if (mesures.length === 0) return <p>❌ Aucune donnée disponible pour le trajet 6.</p>

  // Créer les ticks tous les 60 secondes
  const ticks60s = mesures
    .filter(m => m.time_s % 60 === 0)
    .map(m => m.time_s)

  // Fonction pour formatter en mm:ss
  const formatTime = (t) => `${Math.floor(t/60)}:${t%60 < 10 ? '0' : ''}${t%60}`

  return (
    <div style={{ padding: 40, fontFamily: 'Arial, sans-serif' }}>
      <h1>📊 Simulation — Batterie EV (Trajet 6, Temps comme axe X)</h1>

      {/* SOC réel vs SOC affiché */
      /*<section style={{ marginBottom: 60 }}>
        <h2>🔋 SOC réel </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time_s"
              ticks={ticks60s}
              tickFormatter={formatTime}
              name="Temps"
            />
            <YAxis domain={[0, 110]} label={{ value: '% SOC', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value, name) => [value, name]} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="hv_soc" stroke="#27ae60" name="SOC réel" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>*/

      {/* Température */}
      /*<section style={{ marginBottom: 60 }}>
        <h2>🌡️ Température et Température max</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time_s"
              ticks={ticks60s}
              tickFormatter={formatTime}
            />
            <YAxis label={{ value: '°C', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value, name) => [value, name]} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="hv_temp_min" stroke="#e74c3c" name="Température min" dot={false} />
            <Line type="monotone" dataKey="hv_temp_max" stroke="#c0392b" name="Température max" dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Tension */ /*}
      <section style={{ marginBottom: 60 }}>
        <h2>🔌 Tension (Voltage)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time_s"
              ticks={ticks60s}
              tickFormatter={formatTime}
            />
            <YAxis label={{ value: 'Volts', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value, name) => [value, name]} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="hv_battery_voltage" stroke="#9b59b6" name="Tension" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Courant */ /*}
      <section style={{ marginBottom: 60 }}>
        <h2>⚡ Courant (Ampères)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time_s"
              ticks={ticks60s}
              tickFormatter={formatTime}
            />
            <YAxis label={{ value: 'Ampères', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value, name) => [value, name]} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="hv_battery_current" stroke="#2980b9" name="Courant" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Vitesse */ /*}
      <section style={{ marginBottom: 60 }}>
        <h2>🏎️ Vitesse (km/h)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time_s"
              ticks={ticks60s}
              tickFormatter={formatTime}
            />
            <YAxis label={{ value: 'km/h', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value, name) => [value, name]} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="speed" stroke="#9c27b0" name="Vitesse" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
} */
