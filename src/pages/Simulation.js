import { useEffect, useState } from 'react'
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
    // 🔥 Pointeur vers la racine, pas 'mesures'
    const dbRef = ref(database, '/')

    get(dbRef)
      .then(snapshot => {
        const raw = snapshot.val()
        console.log('Données brutes Firebase:', raw)  // <-- vérifie ici

        if (!raw) {
          setMesures([])
          setLoading(false)
          return
        }

        // Conversion en tableau et filtrage léger
        const arrayData = Object.values(raw)
          .filter(m =>
            m.time !== undefined &&
            (m.soc !== undefined || m.displayed_soc !== undefined) &&
            m.temperature !== undefined &&
            m.max_temperature !== undefined &&
            m.voltage !== undefined &&
            m.current !== undefined &&
            m.speed !== undefined
          )

        // Ajouter l'index croissant pour l'axe X
        const dataWithIndex = arrayData.map((m, i) => ({ ...m, index: i }))

        setMesures(dataWithIndex)
        setLoading(false)
      })
      .catch(err => {
        console.error('Erreur chargement données:', err)
        setMesures([])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <p>Chargement des données…</p>
  }
  if (mesures.length === 0) {
    return <p>❌ Aucune donnée disponible.</p>
  }

  return (
    <div style={{ padding: 40, fontFamily: 'Arial, sans-serif' }}>
      <h1>📊 Simulation — Batterie EV (Index comme axe X)</h1>

      {/* SOC réel vs SOC affiché */}
      <section style={{ marginBottom: 60 }}>
        <h2>🔋 SOC réel vs SOC affiché</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" name="Numéro de mesure" />
            <YAxis domain={[0, 110]} label={{ value: '% SOC', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="soc" stroke="#27ae60" name="SOC réel" dot={false} />
            <Line type="monotone" dataKey="displayed_soc" stroke="#2980b9" name="SOC affiché" dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Température et Température max */}
      <section style={{ marginBottom: 60 }}>
        <h2>🌡️ Température et Température max</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" name="Numéro de mesure" />
            <YAxis label={{ value: '°C', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="temperature" stroke="#e74c3c" name="Température" dot={false} />
            <Line type="monotone" dataKey="max_temperature" stroke="#c0392b" name="Température max" dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Tension */}
      <section style={{ marginBottom: 60 }}>
        <h2>🔌 Tension (Voltage)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" name="Numéro de mesure" />
            <YAxis label={{ value: 'Volts', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="voltage" stroke="#9b59b6" name="Tension" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Courant */}
      <section style={{ marginBottom: 60 }}>
        <h2>⚡ Courant (Ampères)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" name="Numéro de mesure" />
            <YAxis label={{ value: 'Ampères', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="current" stroke="#2980b9" name="Courant" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Vitesse */}
      <section style={{ marginBottom: 60 }}>
        <h2>🏎️ Vitesse (km/h)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" name="Numéro de mesure" />
            <YAxis label={{ value: 'km/h', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="speed" stroke="#9c27b0" name="Vitesse" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}
