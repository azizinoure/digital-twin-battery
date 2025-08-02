import React, { useState, useEffect } from 'react';

export default function Historique() {
  const [donnees, setDonnees] = useState([]);

  useEffect(() => {
    // Simuler 500 points de données
    const dataSimulee = [];
    for (let i = 0; i < 500; i++) {
      dataSimulee.push({
        time: i,
        temp: 20 + Math.sin(i / 10) * 5,       // Temp entre 15 et 25
        voltage: 400 + Math.cos(i / 15) * 10,  // Voltage entre 390 et 410
        current: 10 + Math.sin(i / 5) * 3,     // Courant entre 7 et 13
        soc: 80 + (i * 0.02),                  // SOC qui augmente lentement
      });
    }
    setDonnees(dataSimulee);
  }, []);

  return (
    <div style={{ padding: '1rem' }}>
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
