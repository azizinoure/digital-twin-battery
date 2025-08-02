import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { database } from '../firebase'

export default function Statistiques() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const dbRef = ref(database, '/') // chemin racine
    onValue(dbRef, (snapshot) => {
      const data = snapshot.val()
      console.log('📦 Données reçues dans Statistiques :', data)

      if (!data) {
        console.warn('⚠️ Aucune donnée trouvée')
        return
      }

      const values = Object.values(data)
      const extract = (key) => values.map(v => parseFloat(v[key])).filter(x => !isNaN(x))

      const calcStats = (arr) => {
        const n = arr.length
        if (n === 0) return { min: '-', max: '-', avg: '-', std: '-', count: 0 }
        const min = Math.min(...arr)
        const max = Math.max(...arr)
        const avg = arr.reduce((a, b) => a + b, 0) / n
        const std = Math.sqrt(arr.reduce((a, b) => a + (b - avg) ** 2, 0) / n)
        return { min, max, avg: avg.toFixed(2), std: std.toFixed(2), count: n }
      }

      setStats({
        temp: calcStats(extract('temp')),
        voltage: calcStats(extract('voltage')),
        current: calcStats(extract('current')),
        soc: calcStats(extract('soc'))
      })
    })
  }, [])

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>📊 Analyse Statistique — Batterie EV</h1>
      {!stats ? (
        <p>Chargement des données...</p>
      ) : (
        <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr>
              <th>Paramètre</th>
              <th>Min</th>
              <th>Max</th>
              <th>Moyenne</th>
              <th>Écart-type</th>
              <th>Nombre de mesures</th>
            </tr>
          </thead>
          <tbody>
            {['temp', 'voltage', 'current', 'soc'].map((key) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{stats[key].min}</td>
                <td>{stats[key].max}</td>
                <td>{stats[key].avg}</td>
                <td>{stats[key].std}</td>
                <td>{stats[key].count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
