import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

export default function Historique() {
  const [donnees, setDonnees] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const dataSimulee = [];
    for (let i = 0; i < 500; i++) {
      dataSimulee.push({
        time_s: i,
        hv_temp_min: 20 + Math.sin(i / 10) * 5,
        hv_battery_voltage: 400 + Math.cos(i / 15) * 10,
        hv_battery_current: 10 + Math.sin(i / 5) * 3,
        hv_soc: 80 + (i * 0.02),
      });
    }
    setDonnees(dataSimulee);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/'); // Retour à la page login
  };

  const handleBack = () => {
    navigate('/dashboard'); // Retour au Dashboard
  };

  return (
    <div style={{ padding: '1rem' }}>
      {/* Barre de boutons */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '1rem'
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

      <h2>📜 Historique des mesures (500 points simulés)</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Time (s)</th>
            <th style={th}>Température (°C)</th>
            <th style={th}>Tension (V)</th>
            <th style={th}>Courant (A)</th>
            <th style={th}>SOC (%)</th>
          </tr>
        </thead>
        <tbody>
          {donnees.map((d, i) => (
            <tr key={i}>
              <td style={td}>{d.time.toFixed(2)}</td>
              <td style={td}>{d.temp.toFixed(1)}</td>
              <td style={td}>{d.voltage.toFixed(1)}</td>
              <td style={td}>{d.current.toFixed(1)}</td>
              <td style={td}>{d.soc.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = {
  border: '1px solid #ccc',
  padding: '6px',
  backgroundColor: '#eee',
  fontWeight: 'bold',
};

const td = {
  border: '1px solid #ccc',
  padding: '6px',
  textAlign: 'center',
};

