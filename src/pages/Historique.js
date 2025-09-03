import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calendar, Filter, Download, Search, AlertTriangle, Battery, Thermometer, Zap, BarChart2 } from 'react-feather';
import './History.css';

// Données simulées pour l'historique
const generateHistoricalData = () => {
  const trips = [];
  const now = new Date();
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    
    const distance = Math.random() * 100 + 20;
    const duration = Math.floor(Math.random() * 120 + 30);
    const socStart = Math.floor(Math.random() * 30 + 60);
    const socEnd = Math.max(5, socStart - Math.floor(distance / 3));
    
    trips.push({
      id: i + 1,
      date: date.toISOString().split('T')[0],
      time: `${Math.floor(duration / 60)}h${duration % 60}m`,
      distance: parseFloat(distance.toFixed(1)),
      socStart,
      socEnd,
      alerts: Math.random() > 0.7 ? ['Tension faible'] : 
              Math.random() > 0.8 ? ['Température élevée'] : 
              Math.random() > 0.9 ? ['SOC faible'] : [],
      maxTemp: Math.floor(Math.random() * 15 + 25),
      minTemp: Math.floor(Math.random() * 10 + 15),
      avgVoltage: Math.floor(Math.random() * 50 + 360),
      avgCurrent: Math.floor(Math.random() * 30 - 40)
    });
  }
  
  return trips;
};

// Composant pour les cartes de statistiques
const StatCard = ({ icon, title, value, subtitle, color }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ backgroundColor: color }}>
      {icon}
    </div>
    <div className="stat-content">
      <h3>{value || '0'}</h3> {/* Valeur par défault ajoutée */}
      <p>{title}</p>
      {subtitle && <span>{subtitle}</span>}
    </div>
  </div>
);

// Composant pour les éléments de données
const DataItem = ({ label, value, status }) => (
  <div className={`data-item ${status ? `status-${status}` : ''}`}>
    <span className="data-label">{label}:</span>
    <span className="data-value">{value || 'N/A'}</span> {/* Valeur par défault ajoutée */}
  </div>
);

// Composant principal de la page d'historique
export default function HistoryPage() {
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [filterAlerts, setFilterAlerts] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalDistance: '0',
    avgSOC: '0',
    alertsCount: 0,
    commonIssues: []
  }); // Initialisation par défaut
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // État de chargement

  // Charger les données au montage du composant
  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      try {
        const historicalData = generateHistoricalData();
        setTrips(historicalData);
        setFilteredTrips(historicalData);
        calculateStats(historicalData);
        prepareChartData(historicalData);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculer les statistiques
  const calculateStats = (tripsData) => {
    const totalTrips = tripsData.length;
    const totalDistance = tripsData.reduce((sum, trip) => sum + trip.distance, 0);
    const avgSOC = totalTrips > 0 ? tripsData.reduce((sum, trip) => sum + trip.socEnd, 0) / totalTrips : 0;
    const alertsCount = tripsData.reduce((sum, trip) => sum + trip.alerts.length, 0);
    
    setStats({
      totalTrips,
      totalDistance: totalDistance.toFixed(1),
      avgSOC: avgSOC.toFixed(1),
      alertsCount,
      commonIssues: ['Tension faible', 'Température élevée']
    });
  };

  // Préparer les données pour les graphiques
  const prepareChartData = (tripsData) => {
    const sortedData = [...tripsData].sort((a, b) => a.date.localeCompare(b.date));
    setChartData(sortedData);
  };

  // Filtrer les trajets en fonction des critères
  useEffect(() => {
    if (trips.length === 0) return;
    
    let result = [...trips];
    
    // Filtrer par plage de dates
    result = result.filter(trip => 
      trip.date >= dateRange.start && trip.date <= dateRange.end
    );
    
    // Filtrer par alerte
    if (filterAlerts !== 'all') {
      result = result.filter(trip => 
        trip.alerts.includes(filterAlerts)
      );
    }
    
    // Filtrer par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(trip => 
        trip.date.includes(query) || 
        trip.alerts.some(alert => alert.toLowerCase().includes(query))
      );
    }
    
    setFilteredTrips(result);
    calculateStats(result);
    prepareChartData(result);
  }, [trips, dateRange, filterAlerts, searchQuery]);

  // Exporter les données
  const exportData = (format) => {
    const dataToExport = selectedTrip || filteredTrips;
    
    if (!dataToExport || (Array.isArray(dataToExport) && dataToExport.length === 0)) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    let dataStr, fileType, fileName;
    
    if (format === 'csv') {
      // Convertir en CSV
      const headers = Object.keys(Array.isArray(dataToExport) ? dataToExport[0] : dataToExport).join(',');
      const values = Array.isArray(dataToExport) 
        ? dataToExport.map(trip => Object.values(trip).join(',')).join('\n')
        : Object.values(dataToExport).join(',');
      
      dataStr = `${headers}\n${values}`;
      fileType = 'text/csv';
      fileName = selectedTrip ? `trip-${selectedTrip.id}.csv` : 'trips-history.csv';
    } else {
      // Convertir en JSON
      dataStr = JSON.stringify(dataToExport, null, 2);
      fileType = 'application/json';
      fileName = selectedTrip ? `trip-${selectedTrip.id}.json` : 'trips-history.json';
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
        <div className="loading-spinner">Chargement des données historiques...</div>
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
            <label><Calendar size={16} /> Date de début:</label>
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            />
          </div>
          
          <div className="filter-group">
            <label>Date de fin:</label>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
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
              <option value="SOC faible">SOC faible</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label><Search size={16} /> Recherche:</label>
            <input 
              type="text" 
              placeholder="Date ou alerte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
          value={stats.totalTrips} 
          color="#4caf50" 
        />
        <StatCard 
          icon={<Zap size={24} />} 
          title="Distance totale" 
          value={`${stats.totalDistance} km`} 
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
        <h2>Évolution du SOC</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="socEnd" stroke="#8884d8" name="SOC Final (%)" />
          </LineChart>
        </ResponsiveContainer>
        
        <h2>Répartition des alertes</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={[
            { name: 'Tension faible', count: filteredTrips.filter(t => t.alerts.includes('Tension faible')).length },
            { name: 'Température élevée', count: filteredTrips.filter(t => t.alerts.includes('Température élevée')).length },
            { name: 'SOC faible', count: filteredTrips.filter(t => t.alerts.includes('SOC faible')).length }
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
        <h2>Trajets ({filteredTrips.length})</h2>
        
        {filteredTrips.length === 0 ? (
          <div className="no-data-message">
            Aucun trajet trouvé avec les filtres actuels.
          </div>
        ) : (
          <div className="trips-table-container">
            <table className="trips-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Durée</th>
                  <th>Distance (km)</th>
                  <th>SOC Initial</th>
                  <th>SOC Final</th>
                  <th>Alertes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map(trip => (
                  <tr key={trip.id} className={selectedTrip?.id === trip.id ? 'selected' : ''}>
                    <td>{trip.date}</td>
                    <td>{trip.time}</td>
                    <td>{trip.distance}</td>
                    <td>{trip.socStart}%</td>
                    <td>{trip.socEnd}%</td>
                    <td>
                      {trip.alerts.length > 0 ? (
                        <div className="alerts-container">
                          {trip.alerts.map((alert, index) => (
                            <span key={index} className="alert-badge">{alert}</span>
                          ))}
                        </div>
                      ) : 'Aucune'}
                    </td>
                    <td>
                      <button 
                        onClick={() => setSelectedTrip(trip)}
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
      {selectedTrip && (
        <div className="modal-overlay" onClick={() => setSelectedTrip(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Détails du Trajet - {selectedTrip.date}</h2>
              <button onClick={() => setSelectedTrip(null)} className="close-btn">×</button>
            </div>
            
            <div className="modal-body">
              <div className="trip-details-grid">
                <DataItem label="Date" value={selectedTrip.date} />
                <DataItem label="Durée" value={selectedTrip.time} />
                <DataItem label="Distance" value={`${selectedTrip.distance} km`} />
                <DataItem label="SOC Initial" value={`${selectedTrip.socStart}%`} />
                <DataItem label="SOC Final" value={`${selectedTrip.socEnd}%`} />
                <DataItem label="Température max" value={`${selectedTrip.maxTemp}°C`} />
                <DataItem label="Température min" value={`${selectedTrip.minTemp}°C`} />
                <DataItem label="Tension moyenne" value={`${selectedTrip.avgVoltage}V`} />
                <DataItem label="Courant moyen" value={`${selectedTrip.avgCurrent}A`} />
              </div>
              
              <div className="alerts-section">
                <h3>Alertes</h3>
                {selectedTrip.alerts.length > 0 ? (
                  <div className="alerts-list">
                    {selectedTrip.alerts.map((alert, index) => (
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
                  <Download size={16} /> Exporter en CSV
                </button>
                <button onClick={() => exportData('json')} className="export-btn">
                  <Download size={16} /> Exporter en JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
