import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../firebase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function Simulation() {
  const [mesures, setMesures] = useState([]);
  const [trajets, setTrajets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vue, setVue] = useState('global'); // 'global', 'parTrajet', 'cumulTrajet'
  const [currentIndex, setCurrentIndex] = useState(0);

  // ✅ Positions cumulées exactes
  const positionsCumulees = [
    0, 581, 1111, 1409, 2186, 2739, 4038, 4860,
    5145, 5588, 5961, 8526, 11163, 17391, 18650, 19632
  ];

  const xTicksGlobal = Array.from({ length: 20 }, (_, i) => i * 1000);

  useEffect(() => {
    setLoading(true);
    const dbRef = ref(database, '/trajets/trajets');
    get(dbRef)
      .then(snapshot => {
        const allTrajets = snapshot.val();
        if (!allTrajets) { 
          setMesures([]); 
          setTrajets([]); 
          setLoading(false); 
          return; 
        }

        const trajetsArray = Object.values(allTrajets);
        setTrajets(trajetsArray);

        // 🌍 Fusion globale
        const mergedData = trajetsArray.flatMap(trajet => 
          trajet.data.map(m => ({
            time: m.time_s,
            hv_soc: m.hv_soc,
            hv_battery_current: m.hv_battery_current,
            hv_battery_voltage: m.hv_battery_voltage,
            hv_temp_max: m.hv_temp_max,
            hv_temp_min: m.hv_temp_min,
            ambient_air_temp: m.ambient_air_temp,
            vehicle_speed: m.vehicle_speed,
            total_energy_charge: m.total_energy_charge,
            total_energy_discharge: m.total_energy_discharge
          }))
        );

        let cumulativeTime = 0;
        const adjustedData = mergedData.map((m, i) => {
          if (i > 0 && m.time < mergedData[i - 1].time) 
            cumulativeTime += mergedData[i - 1].time;
          return { ...m, time: m.time + cumulativeTime };
        });

        // 🧮 Axe X cumulatif avec les positions exactes
        const cumulTrajetData = [];
        trajetsArray.forEach((trajet, i) => {
          const offset = positionsCumulees[i] ?? 0; // offset basé sur tableau
          trajet.data.forEach(m => {
            cumulTrajetData.push({ ...m, time: m.time_s + offset });
          });
        });

        setMesures({ global: adjustedData, cumulTrajet: cumulTrajetData });
        setLoading(false);
      })
      .catch(err => { 
        console.error(err); 
        setMesures([]); 
        setTrajets([]); 
        setLoading(false); 
      });
  }, []);

  if (loading) return <p>Chargement…</p>;
  if (!mesures || mesures.global.length === 0) return <p>❌ Aucune donnée disponible</p>;

  const tooltipLabelFormatter = (label, payload) => 
    payload?.[0]?.payload?.time ? `t=${payload[0].payload.time}s` : '';

  // Choix des données
  let dataAffiche;
  if (vue === 'global') dataAffiche = mesures.global;
  else if (vue === 'parTrajet') 
    dataAffiche = trajets[currentIndex].data.map(m => ({ ...m, time: m.time_s }));
  else if (vue === 'cumulTrajet') 
    dataAffiche = mesures.cumulTrajet;

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>📊 Simulation</h1>

      {/* Boutons de vue */}
      <div style={{ marginBottom: 15 }}>
        <button onClick={() => setVue('global')} disabled={vue==='global'}>📈 Axe X global</button>
        <button onClick={() => setVue('parTrajet')} disabled={vue==='parTrajet'} style={{ marginLeft: 10 }}>🚗 Axe X par trajet</button>
        <button onClick={() => setVue('cumulTrajet')} disabled={vue==='cumulTrajet'} style={{ marginLeft: 10 }}>🧮 Axe X cumulé</button>
      </div>

      {/* Navigation */}
      {vue === 'parTrajet' && (
        <div style={{ marginBottom: 10 }}>
          <button onClick={() => setCurrentIndex((currentIndex-1+trajets.length)%trajets.length)}>◀️ Trajet précédent</button>
          <span style={{ margin: '0 10px' }}>Trajet {currentIndex+1} / {trajets.length}</span>
          <button onClick={() => setCurrentIndex((currentIndex+1)%trajets.length)}>Trajet suivant ▶️</button>
        </div>
      )}

      {/* Graphiques */}
      {[
        { key: "hv_soc", title: "🔋 hv_soc", yLabel: "% SOC", ticks: [0,20,40,60,80,100], stroke: "#27ae60" },
        { key: "vehicle_speed", title: "🏎️ vehicle_speed (km/h)", yLabel: "km/h", ticks: [0,50,100,150,200,250], stroke: "#9c27b0" },
        { key: "hv_battery_voltage", title: "🔌 hv_battery_voltage (Volts)", yLabel: "V", stroke: "#9b59b6" },
        { key: "hv_battery_current", title: "⚡ hv_battery_current (A)", yLabel: "A", stroke: "#2980b9" },
      ].map(cfg => (
        <section key={cfg.key}>
          <h2>{cfg.title}</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dataAffiche}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" type="number"
                ticks={vue==='global' ? xTicksGlobal : (vue==='cumulTrajet' ? positionsCumulees : undefined)}
                label={{ value: "Temps (s)", position: "insideBottomRight", offset: -5 }} 
              />
              <YAxis 
                ticks={cfg.ticks} 
                domain={cfg.ticks ? [0, Math.max(...cfg.ticks)] : undefined}
                label={{ value: cfg.yLabel, angle: -90, position: 'insideLeft' }} 
              />
              <Tooltip labelFormatter={tooltipLabelFormatter} />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey={cfg.key} stroke={cfg.stroke} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      ))}

      {/* Températures */}
      <section>
        <h2>🌡️ Températures</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dataAffiche}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" type="number"
              ticks={vue==='global' ? xTicksGlobal : (vue==='cumulTrajet' ? positionsCumulees : undefined)}
              label={{ value: "Temps (s)", position: "insideBottomRight", offset: -5 }} 
            />
            <YAxis label={{ value: '°C', angle: -90, position: 'insideLeft' }} />
            <Tooltip labelFormatter={tooltipLabelFormatter} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="hv_temp_max" stroke="#e74c3c" dot={false} />
            <Line type="monotone" dataKey="hv_temp_min" stroke="#c0392b" dot={false} />
            <Line type="monotone" dataKey="ambient_air_temp" stroke="#f39c12" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Énergies */}
      <section>
        <h2>⚡ Énergies (kWh)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dataAffiche}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" type="number"
              ticks={vue==='global' ? xTicksGlobal : (vue==='cumulTrajet' ? positionsCumulees : undefined)}
              label={{ value: "Temps (s)", position: "insideBottomRight", offset: -5 }} 
            />
            <YAxis label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} />
            <Tooltip labelFormatter={tooltipLabelFormatter} />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="total_energy_charge" stroke="#16a085" dot={false} />
            <Line type="monotone" dataKey="total_energy_discharge" stroke="#f39c12" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}


















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
