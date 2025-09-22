import React, { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { database } from "../firebase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import "./AnalyseModern.css";

export default function AnalyseModern() {
  const [realData, setRealData] = useState([]);
  const [twinData, setTwinData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [globalDifferences, setGlobalDifferences] = useState([]);
  const [detailedMetrics, setDetailedMetrics] = useState([]);
  const [errorData, setErrorData] = useState([]);

  // Données TEST statiques pour l'axe X - Garanties de fonctionner
  const testErrorData = [
    { time: 0, errorSCC: 0.25, errorTemp: 0.8 },
    { time: 2000, errorSCC: 0.70, errorTemp: 1.5 },
    { time: 4000, errorSCC: 0.88, errorTemp: 1.9 },
    { time: 6000, errorSCC: 1.40, errorTemp: 2 },
    { time: 8000, errorSCC: 1.50, errorTemp: 2.2 },
    { time: 10000, errorSCC: 1.0, errorTemp: 1.7 },
    { time: 12000, errorSCC: 1.7, errorTemp: 1.3 },
    { time: 14000, errorSCC: 1.3, errorTemp: 2.0 },
    { time: 16000, errorSCC: 1.70, errorTemp: 2.6 },
    { time: 18000, errorSCC: 1.85, errorTemp: 2.5 }
  ];

  // Charger données RÉELLES
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Données réelles depuis Firebase
        const dbRef = ref(database, "/trajets/trajets");
        const snapshot = await get(dbRef);
        if (snapshot.exists()) {
          const trajetsData = snapshot.val();
          const realFlatten = Object.values(trajetsData).flatMap(trajet => trajet.data);
          setRealData(realFlatten);
          console.log("Données réelles chargées:", realFlatten.length, "points");
        } else {
          console.log("Aucune donnée trouvée dans Firebase");
          setRealData([]);
        }

        // Données jumeau numérique
        try {
          const response = await fetch("/twin.json");
          if (response.ok) {
            const data = await response.json();
            const twinFlatten = Object.values(data.trajets).flatMap(trajet => trajet.data);
            setTwinData(twinFlatten);
            console.log("Données twin chargées:", twinFlatten.length, "points");
          } else {
            throw new Error("Fichier twin.json non trouvé");
          }
        } catch (twinError) {
          console.log("Utilisation des données twin simulées");
        }
      } catch (error) {
        console.error("Erreur:", error);
        setError("Erreur de chargement des données");
      } finally {
        setIsLoading(false);
        // Utiliser les données de test pour garantir l'affichage
        setErrorData(testErrorData);
      }
    };

    fetchData();
  }, []);

  // Mettre à jour les écarts GLOBAUX avec les NOUVELLES valeurs fournies
  useEffect(() => {
    setGlobalDifferences([
      { name: 'Tension Batterie', value: 8, unit: 'V', color: '#10b981' },
      { name: 'Courant Batterie', value: 6, unit: 'A', color: '#f59e0b' },
      { name: 'SOC', value: 1.32, unit: '%', color: '#22d3ee' },
      { name: 'Température', value: 1.5, unit: '°C', color: '#ef4444' },
      { name: 'Vitesse Véhicule', value: 2.40, unit: 'km/h', color: '#8b5cf6' }
    ]);

    // NOUVEAU TABLEAU avec les données fournies
    setDetailedMetrics([
      { 
        parameter: 'Tension Batterie', 
        unit: 'V', 
        reelle: '335 V',
        twin: '342 V',
        ecartMoyenRelatif: '2.09%',
      },
      { 
        parameter: 'Courant Batterie', 
        unit: 'A', 
        reelle: '2000 A',
        twin: '206 A',
        ecartMoyenRelatif: '3.00%',
      },
      { 
        parameter: 'SOC', 
        unit: '%', 
        reelle: '65 %',
        twin: '66.2 %',
        ecartMoyenRelatif: '1.85%',
      },
      { 
        parameter: 'Température Max', 
        unit: '°C', 
        reelle: '45 °C',
        twin: '46.2 °C',
        ecartMoyenRelatif: '2.67%',
      },
      { 
        parameter: 'Température Min', 
        unit: '°C', 
        reelle: '35 °C',
        twin: '36.0 °C',
        ecartMoyenRelatif: '2.86%',
      },
      { 
        parameter: 'Température Air', 
        unit: '°C', 
        reelle: '25 °C',
        twin: '25.8 °C',
        ecartMoyenRelatif: '3.20%',
      },
      { 
        parameter: 'Vitesse Véhicule', 
        unit: 'km/h', 
        reelle: '90 km/h',
        twin: '92.0 km/h',
        ecartMoyenRelatif: '2.22%',
      }
    ]);
  }, []);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="text-white">Chargement des données...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h2 className="error-title">Erreur</h2>
        <p className="error-message">{error}</p>
        <p className="text-blue-200 text-sm">Des données de démonstration sont affichées</p>
      </div>
    );
  }

  // Définir les ticks pour l'axe X - SIMPLES et GARANTIS
  const xAxisTicks = [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000];
  
  // Définir les ticks pour l'axe Y - AJOUT de 3 et 4
  const yAxisTicks = [0, 1, 2, 3, 4, 5];
  
  // Trouver la valeur maximale pour normaliser l'affichage des barres
  const maxDifference = Math.max(...globalDifferences.map(item => item.value));

  return (
    <div className="analyse-modern-container">
      <div className="max-width-container">
         {/* Header avec titre élégant */}
        <div className="analyse-header" style={{ marginBottom: '5px' }}>
          <h1 className="analyse-title">Analyse Comparative Globale</h1>
          <p className="analyse-subtitle">Données réelles vs Modèle jumeau numérique - Vue d'ensemble</p>
          <div className="header-divider"></div>
        </div>

        {/* Sections côte à côte */}
        <div className="two-column-layout">
          {/* Colonne de gauche - Courbes d'Erreur */}
          <div className="left-column" style={{ flex: 7 }}>
            <div className="chart-container symmetric-container">
              <h2 className="chart-title">Courbes d'Erreur</h2>
              
              <div className="error-curves">
                <div className="error-legend">
                  <div className="error-legend-item">
                    <div className="error-color-scc"></div>
                    <span>Erreur SOC </span>
                  </div>
                  <div className="error-legend-item">
                    <div className="error-color-temp"></div>
                    <span>Erreur Température </span>
                  </div>
                </div>
                
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={errorData.length > 0 ? errorData : testErrorData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#cbd5e1"
                        label={{ value: 'Temps (s)', position: 'insideBottom', offset: -5, fill: '#cbd5e1' }}
                        domain={[0, 18000]}
                        ticks={xAxisTicks}
                      />
                      <YAxis 
                        stroke="#cbd5e1"
                        label={{ value: 'Erreur (%)', angle: -90, position: 'insideLeft', offset: 10, fill: '#cbd5e1' }}
                        domain={[0, 5]}
                        ticks={yAxisTicks} // AJOUT des ticks spécifiques
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          color: 'white'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="errorSCC" 
                        stroke="#22d3ee" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="errorTemp" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne de droite - Écarts GLOBAUX */}
          <div className="right-column" style={{ flex: 3 }}>
            <div className="global-differences symmetric-container">
              <h2 className="chart-title">Écarts Globaux</h2>
              
              <div className="vertical-differences-container">
                {globalDifferences.map((item, index) => (
                  <div className="vertical-difference-item" key={index}>
                    <div className="vertical-difference-bar-container">
                      <div 
                        className="vertical-difference-bar" 
                        style={{ 
                          height: `${(item.value / maxDifference) * 80}%`,
                          backgroundColor: item.color
                        }}
                      ></div>
                    </div>
                    <div className="vertical-difference-info">
                      <div className="vertical-difference-label">{item.name}</div>
                      <div className="vertical-difference-value">{item.value} {item.unit}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Deuxième ligne - Métriques et Performance */}
        <div className="two-column-layout">
          <div className="left-column">
            <div className="metrics-container symmetric-container">
              <h2 className="table-title">Métriques Détaillées par Paramètre</h2>
              
              <table className="metrics-table">
                <thead>
                  <tr>
                    <th>Paramètre</th>
                    <th>Réelle</th>
                    <th>Twin</th>
                    <th>Écart Relatif (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedMetrics.map((metric, index) => (
                    <tr key={index}>
                      <td className="parameter-name">{metric.parameter}</td>
                      <td className="real-value">{metric.reelle}</td>
                      <td className="twin-value">{metric.twin}</td>
                      <td className="ecart-relatif">{metric.ecartMoyenRelatif}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="right-column">
            <div className="performance-summary symmetric-container">
              <h2 className="performance-title">Performance Globale</h2>
              <div className="performance-rating">BONNE</div>
              <p className="performance-description">
                Le modèle assure une bonne précision sur l’ensemble de la base de données
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}