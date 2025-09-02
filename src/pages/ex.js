import { useEffect, useState } from 'react'
import { ref, query, limitToFirst, get } from 'firebase/database'
import { database } from '../firebase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// Labels des échantillons
const ECHANTILLONS = {
  demarrage: { label: '🔋 Démarrage' },
  vitesse: { label: '🏎️ Vitesse Max' },
  decharge: { label: '🔻 Décharge' },
}

export default function Simulation() {
  const [mesures, setMesures] = useState([])
  const [allData, setAllData] = useState([])
  const [echantillon, setEchantillon] = useState('demarrage')
  const [loading, setLoading] = useState(true)

  // Charger jusqu'à 30000 données, mais n'en afficher qu'un échantillon optimisé
  useEffect(() => {
    setLoading(true)
    const dbRef = query(ref(database, '/'), limitToFirst(30000)) // max lecture

    get(dbRef).then((snapshot) => {
      const data = snapshot.val()

      if (data) {
        const cleaned = Object.values(data)
          .filter(m =>
            m.time !== undefined &&
            m.temp !== undefined &&
            m.voltage !== undefined &&
            m.current !== undefined &&
            m.soc !== undefined
          )
          .sort((a, b) => a.time - b.time)

        const uniqueByTime = []
        const seen = new Set()
        for (const m of cleaned) {
          if (!seen.has(m.time)) {
            uniqueByTime.push(m)
            seen.add(m.time)
          }
        }

        console.log('✅ Données nettoyées :', uniqueByTime.length)
        setAllData(uniqueByTime)
        setLoading(false)
      } else {
        console.warn('⚠️ Aucune donnée trouvée.')
        setLoading(false)
      }
    })
  }, [])

  // Sélection et downsampling
  useEffect(() => {
    if (allData.length === 0) return

    let subset = []

    if (echantillon === 'demarrage') {
      subset = allData.slice(0, 5000)
    } else if (echantillon === 'vitesse') {
      const mid = Math.floor(allData.length / 2)
      subset = allData.slice(mid, mid + 5000)
    } else if (echantillon === 'decharge') {
      subset = allData.slice(-5000)
    }

    // Downsampling automatique si > 2000 points
    const maxPoints = 2000
    if (subset.length > maxPoints) {
      const step = Math.ceil(subset.length / maxPoints)
      subset = subset.filter((_, index) => index % step === 0)
      console.log(`🔽 Downsampling activé : ${subset.length} points affichés`)
    } else {
      console.log(`✅ Pas de downsampling : ${subset.length} points`)
    }

    setMesures(subset)
  }, [echantillon, allData])

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>📊 Simulation — Batterie EV</h1>

      <div style={{ marginBottom: 20 }}>
        <strong>📁 Choisir un échantillon :</strong>{' '}
        {Object.entries(ECHANTILLONS).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setEchantillon(key)}
            style={{
              marginRight: 10,
              padding: '6px 12px',
              cursor: 'pointer',
              backgroundColor: echantillon === key ? '#3498db' : '#ccc',
              color: echantillon === key ? 'white' : 'black',
              border: 'none',
              borderRadius: 4,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Chargement des données...</p>
      ) : mesures.length === 0 ? (
        <p>❌ Aucune donnée à afficher pour cet échantillon.</p>
      ) : (
        <>
          <h3>🌡️ Température vs Temps</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mesures}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis label={{ value: '°C', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="linear" dataKey="temp" stroke="#e74c3c" dot={false} />
            </LineChart>
          </ResponsiveContainer>

          <h3>⚡ Tension vs Temps</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mesures}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis label={{ value: 'Volts', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="linear" dataKey="voltage" stroke="#9b59b6" dot={false} />
            </LineChart>
          </ResponsiveContainer>

          <h3>🔌 Courant vs Temps</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mesures}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis label={{ value: 'Ampères', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="linear" dataKey="current" stroke="#2980b9" dot={false} />
            </LineChart>
          </ResponsiveContainer>

          <h3>🔋 SOC vs Temps</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mesures}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="linear" dataKey="soc" stroke="#27ae60" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
