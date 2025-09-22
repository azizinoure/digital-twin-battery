import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calendar, Filter, Download, Search, AlertTriangle, Battery, Thermometer, Zap, BarChart2 } from 'react-feather';
import { ref, get } from 'firebase/database';
import { database } from '../firebase';
import './History.css';

// Composant pour les cartes de statistiques
const StatCard = ({ icon, title, value, subtitle, color }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ backgroundColor: color }}>
      {icon}
    </div>
    <div className="stat-content">
      <h3>{value || '0'}</h3>
      <p>{title}</p>
      {subtitle && <span>{subtitle}</span>}
    </div>
  </div>
);

// Composant pour les éléments de données
const DataItem = ({ label, value, status }) => (
  <div className={`data-item ${status ? `status-${status}` : ''}`}>
    <span className="data-label">{label}:</span>
    <span className="data-value">{value || 'N/A'}</span>
  </div>
);

// Fonction pour détecter les alertes dans un point de données
const detectAlerts = (dataPoint) => {
  const alerts = [];
  
  if (dataPoint.hv_temp_max >= 45) alerts.push('Température élevée');
  if (dataPoint.hv_temp_min <= 5) alerts.push('Température faible');
  if (dataPoint.hv_battery_voltage <= 360) alerts.push('Tension faible');
  if (dataPoint.hv_battery_current <= -50) alerts.push('Courant faible');
  if (dataPoint.hv_soc >= 80) alerts.push('SOC élevé');
  if (dataPoint.hv_soc <= 20) alerts.push('SOC faible');
  
  return alerts;
};

// Composant principal de la page d'historique
export default function HistoryPage() {
  const [trajets, setTrajets] = useState([]);
  const [filteredTrajets, setFilteredTrajets] = useState([]);
  const [selectedTrajet, setSelectedTrajet] = useState(null);
  const [filterAlerts, setFilterAlerts] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalTrajets: 0,
    totalDonnees: 0,
    avgSOC: '0',
    alertsCount: 0,
    commonIssues: []
  });
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les données depuis Firebase - CORRECTION ICI
  useEffect(() => {
    const fetchTrajets = async () => {
      setIsLoading(true);
      try {
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
          
          const formattedTrajets = trajetsArray.map((trajet) => {
            if (!trajet.data || !Array.isArray(trajet.data) || trajet.data.length === 0) {
              return {
                id: trajet.id,
                nom: `Trajet ${trajet.id + 1}`,
                date: `Trajet ${trajet.id + 1}`,
                duree: '0s',
                distance: 'N/A',
                socStart: 0,
                socEnd: 0,
                alerts: [],
                maxTemp: 0,
                minTemp: 0,
                avgVoltage: 0,
                avgCurrent: 0,
                dataPoints: [],
                totalPoints: 0
              };
            }

            const firstData = trajet.data[0];
            const lastData = trajet.data[trajet.data.length - 1];
            
            // Détecter toutes les alertes du trajet
            const allAlerts = trajet.data.flatMap(detectAlerts);
            const uniqueAlerts = [...new Set(allAlerts)];
            
            // Calculer les températures max/min
            const temperaturesMax = trajet.data.map(d => d.hv_temp_max);
            const temperaturesMin = trajet.data.map(d => d.hv_temp_min);
            
            return {
              id: trajet.id,
              nom: `Trajet ${trajet.id + 1}`,
              date: `Trajet ${trajet.id + 1}`,
              duree: `${trajet.data.length}s`,
              distance: 'N/A',
              socStart: firstData.hv_soc,
              socEnd: lastData.hv_soc,
              alerts: uniqueAlerts,
              maxTemp: Math.max(...temperaturesMax),
              minTemp: Math.min(...temperaturesMin),
              avgVoltage: trajet.data.reduce((sum, d) => sum + d.hv_battery_voltage, 0) / trajet.data.length,
              avgCurrent: trajet.data.reduce((sum, d) => sum + d.hv_battery_current, 0) / trajet.data.length,
              dataPoints: trajet.data,
              totalPoints: trajet.data.length
            };
          });
          
          setTrajets(formattedTrajets);
          setFilteredTrajets(formattedTrajets);
          calculateStats(formattedTrajets);
          prepareChartData(formattedTrajets);
        } else {
          console.log('Aucun trajet trouvé dans Firebase');
          setTrajets([]);
          setFilteredTrajets([]);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des trajets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrajets();
  }, []);

  // Calculer les statistiques
  const calculateStats = (trajetsData) => {
    const totalTrajets = trajetsData.length;
    const totalDonnees = trajetsData.reduce((sum, trajet) => sum + trajet.totalPoints, 0);
    const avgSOC = totalTrajets > 0 ? trajetsData.reduce((sum, trajet) => sum + trajet.socEnd, 0) / totalTrajets : 0;
    const alertsCount = trajetsData.reduce((sum, trajet) => sum + trajet.alerts.length, 0);
    
    // Détecter les alertes les plus courantes
    const alertCounts = {};
    trajetsData.forEach(trajet => {
      trajet.alerts.forEach(alert => {
        alertCounts[alert] = (alertCounts[alert] || 0) + 1;
      });
    });
    
    const commonIssues = Object.entries(alertCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([alert]) => alert);
    
    setStats({
      totalTrajets,
      totalDonnees,
      avgSOC: avgSOC.toFixed(1),
      alertsCount,
      commonIssues: commonIssues.length > 0 ? commonIssues : ['Aucune alerte']
    });
  };

  // Préparer les données pour les graphiques
  const prepareChartData = (trajetsData) => {
    const chartData = trajetsData.map((trajet) => ({
      id: trajet.id,
      nom: trajet.nom,
      socEnd: trajet.socEnd,
      alertsCount: trajet.alerts.length
    }));
    
    setChartData(chartData);
  };

  // Filtrer les trajets en fonction des critères
  useEffect(() => {
    if (trajets.length === 0) return;
    
    let result = [...trajets];
    
    // Filtrer par alerte
    if (filterAlerts !== 'all') {
      result = result.filter(trajet => 
        trajet.alerts.includes(filterAlerts)
      );
    }
    
    // Filtrer par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(trajet => 
        trajet.nom.toLowerCase().includes(query) || 
        trajet.alerts.some(alert => alert.toLowerCase().includes(query))
      );
    }
    
    setFilteredTrajets(result);
    calculateStats(result);
    prepareChartData(result);
  }, [trajets, filterAlerts, searchQuery]);

  // Exporter les données
  const exportData = (format) => {
    const dataToExport = selectedTrajet || filteredTrajets;
    
    if (!dataToExport || (Array.isArray(dataToExport) && dataToExport.length === 0)) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    let dataStr, fileType, fileName;
    
    if (format === 'csv') {
      if (selectedTrajet && selectedTrajet.dataPoints) {
        // Exporter les données détaillées d'un trajet
        const headers = Object.keys(selectedTrajet.dataPoints[0]).join(',');
        const values = selectedTrajet.dataPoints.map(point => 
          Object.values(point).join(',')
        ).join('\n');
        
        dataStr = `${headers}\n${values}`;
        fileName = `trajet-${selectedTrajet.id + 1}-details.csv`;
      } else {
        // Exporter la liste des trajets
        const headers = ['ID', 'Nom', 'Durée', 'Points', 'SOC Départ', 'SOC Arrivée', 'Alertes'];
        const values = filteredTrajets.map(trajet => [
          trajet.id + 1,
          trajet.nom,
          trajet.duree,
          trajet.totalPoints,
          trajet.socStart,
          trajet.socEnd,
          trajet.alerts.join('; ')
        ].join(','));
        
        dataStr = `${headers.join(',')}\n${values.join('\n')}`;
        fileName = 'liste-trajets.csv';
      }
      
      fileType = 'text/csv';
    } else {
      // Format JSON
      dataStr = JSON.stringify(dataToExport, null, 2);
      fileType = 'application/json';
      fileName = selectedTrajet ? `trajet-${selectedTrajet.id + 1}.json` : 'trajets.json';
    }
    
    const blob = new Blob([dataStr], { type: fileType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="history-container">
        <div className="loading-spinner">Chargement des données depuis Firebase...</div>
      </div>
    );
  }

  return (
    <div className="history-container">
      {/* En-tête avec filtres */}
      <div className="history-header">
        <h1><BarChart2 size={32} /> Historique des Trajets</h1>
        
        <div className="filters-container">
          <div className="filter-group">
            <label><Search size={16} /> Recherche:</label>
            <input 
              type="text" 
              placeholder="Nom de trajet ou alerte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label><Filter size={16} /> Alertes:</label>
            <select 
              value={filterAlerts} 
              onChange={(e) => setFilterAlerts(e.target.value)}
            >
              <option value="all">Toutes</option>
              <option value="Tension faible">Tension faible</option>
              <option value="Température élevée">Température élevée</option>
              <option value="Température faible">Température faible</option>
              <option value="Courant faible">Courant faible</option>
              <option value="SOC élevé">SOC élevé</option>
              <option value="SOC faible">SOC faible</option>
            </select>
          </div>
          
          <div className="export-buttons">
            <button onClick={() => exportData('csv')} className="export-btn">
              <Download size={16} /> CSV
            </button>
            <button onClick={() => exportData('json')} className="export-btn">
              <Download size={16} /> JSON
            </button>
          </div>
        </div>
      </div>

      {/* Tableau de bord des statistiques */}
      <div className="stats-dashboard">
        <StatCard 
          icon={<Battery size={24} />} 
          title="Total des trajets" 
          value={stats.totalTrajets} 
          color="#4caf50" 
        />
        <StatCard 
          icon={<Zap size={24} />} 
          title="Points de données" 
          value={stats.totalDonnees} 
          color="#2196f3" 
        />
        <StatCard 
          icon={<Thermometer size={24} />} 
          title="SOC moyen" 
          value={`${stats.avgSOC}%`} 
          color="#ff9800" 
        />
        <StatCard 
          icon={<AlertTriangle size={24} />} 
          title="Alertes" 
          value={stats.alertsCount} 
          subtitle={stats.commonIssues.join(', ')} 
          color="#f44336" 
        />
      </div>

      {/* Visualisations graphiques */}
      <div className="charts-section">
        <h2>Évolution du SOC par trajet</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nom" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="socEnd" stroke="#8884d8" name="SOC Final (%)" />
          </LineChart>
        </ResponsiveContainer>
        
        <h2>Répartition des alertes</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={[
            { name: 'Tension faible', count: filteredTrajets.filter(t => t.alerts.includes('Tension faible')).length },
            { name: 'Température élevée', count: filteredTrajets.filter(t => t.alerts.includes('Température élevée')).length },
            { name: 'Température faible', count: filteredTrajets.filter(t => t.alerts.includes('Température faible')).length },
            { name: 'Courant faible', count: filteredTrajets.filter(t => t.alerts.includes('Courant faible')).length },
            { name: 'SOC élevé', count: filteredTrajets.filter(t => t.alerts.includes('SOC élevé')).length },
            { name: 'SOC faible', count: filteredTrajets.filter(t => t.alerts.includes('SOC faible')).length }
          ]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Liste des trajets */}
      <div className="trips-list-section">
        <h2>Trajets ({filteredTrajets.length})</h2>
        
        {filteredTrajets.length === 0 ? (
          <div className="no-data-message">
            Aucun trajet trouvé avec les filtres actuels.
          </div>
        ) : (
          <div className="trips-table-container">
            <table className="trips-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nom</th>
                  <th>Durée</th>
                  <th>Points</th>
                  <th>SOC Initial</th>
                  <th>SOC Final</th>
                  <th>Alertes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrajets.map(trajet => (
                  <tr key={trajet.id} className={selectedTrajet?.id === trajet.id ? 'selected' : ''}>
                    <td>{trajet.id + 1}</td>
                    <td>{trajet.nom}</td>
                    <td>{trajet.duree}</td>
                    <td>{trajet.totalPoints}</td>
                    <td>{trajet.socStart}%</td>
                    <td>{trajet.socEnd}%</td>
                    <td>
                      {trajet.alerts.length > 0 ? (
                        <div className="alerts-container">
                          {trajet.alerts.map((alert, index) => (
                            <span key={index} className="alert-badge">{alert}</span>
                          ))}
                        </div>
                      ) : 'Aucune'}
                    </td>
                    <td>
                      <button 
                        onClick={() => setSelectedTrajet(trajet)}
                        className="view-details-btn"
                      >
                        Détails
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de détail du trajet */}
      {selectedTrajet && (
        <div className="modal-overlay" onClick={() => setSelectedTrajet(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Détails du {selectedTrajet.nom}</h2>
              <button onClick={() => setSelectedTrajet(null)} className="close-btn">×</button>
            </div>
            
            <div className="modal-body">
              <div className="trip-details-grid">
                <DataItem label="ID" value={selectedTrajet.id + 1} />
                <DataItem label="Nom" value={selectedTrajet.nom} />
                <DataItem label="Durée" value={selectedTrajet.duree} />
                <DataItem label="Points de données" value={selectedTrajet.totalPoints} />
                <DataItem label="SOC Initial" value={`${selectedTrajet.socStart}%`} />
                <DataItem label="SOC Final" value={`${selectedTrajet.socEnd}%`} />
                <DataItem label="Température max" value={`${selectedTrajet.maxTemp}°C`} />
                <DataItem label="Température min" value={`${selectedTrajet.minTemp}°C`} />
                <DataItem label="Tension moyenne" value={`${selectedTrajet.avgVoltage.toFixed(2)}V`} />
                <DataItem label="Courant moyen" value={`${selectedTrajet.avgCurrent.toFixed(2)}A`} />
              </div>
              
              <div className="alerts-section">
                <h3>Alertes détectées</h3>
                {selectedTrajet.alerts.length > 0 ? (
                  <div className="alerts-list">
                    {selectedTrajet.alerts.map((alert, index) => (
                      <div key={index} className="alert-item">
                        <AlertTriangle size={16} />
                        <span>{alert}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Aucune alerte pendant ce trajet</p>
                )}
              </div>
              
              <div className="modal-actions">
                <button onClick={() => exportData('csv')} className="export-btn">
                  <Download size={16} /> Exporter les données
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
