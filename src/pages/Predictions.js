import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function Predictions() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("/base_jumeau_final.json")
      .then((res) => res.json())
      .then((json) => {
        const cleaned = json
          .filter((d) => d.soc !== undefined && d.soc_estimé !== undefined)
          .slice(0, 100) // ✅ 100 points = 0 à 99000
          .map((d, i) => ({
            ...d,
            index: i * 1000, // ✅ Ajoute une colonne index
          }));
        setData(cleaned);
      });
  }, []);

  // ✅ Génère les ticks manuellement : [0, 1000, ..., 99000]
  const ticks = Array.from({ length: 100 }, (_, i) => i * 1000);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4 text-center">
        🔋 Comparaison SOC réel vs SOC estimé
      </h2>

      <div style={{ width: "100%", height: 400 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="index"
              ticks={ticks}
              interval={0} // ✅ Force tous les ticks à s'afficher
              tick={{ fontSize: 11, angle: -45 }} // ✅ Incline les ticks pour lisibilité
              label={{
                value: "Temps (ms)",
                position: "insideBottomRight",
                offset: -5,
              }}
            />
            <YAxis domain={[0, 100]} unit="%" />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="soc"
              name="SOC réel"
              stroke="#007bff"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="soc_estimé"
              name="SOC estimé"
              stroke="#ff4136"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}




/*import React, { useEffect, useState } from 'react'
import { ref, get } from 'firebase/database'
import { database } from '../firebase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// 🔁 Lissage exponentiel simple
function simpleExpSmoothing(data, alpha = 0.3) {
  if (!data.length) return []
  const result = [data[0]]
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1])
  }
  return result
}

// 🔍 Séquence décroissante (SOC)
function longestDecreasingSubsequence(arr) {
  const n = arr.length
  const dp = Array(n).fill(1)
  const prev = Array(n).fill(-1)
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (arr[j] > arr[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1
        prev[i] = j
      }
    }
  }
  let maxLen = 0, maxIdx = 0
  for (let i = 0; i < n; i++) {
    if (dp[i] > maxLen) {
      maxLen = dp[i]
      maxIdx = i
    }
  }
  const seqIndices = []
  let cur = maxIdx
  while (cur !== -1) {
    seqIndices.push(cur)
    cur = prev[cur]
  }
  seqIndices.reverse()
  return seqIndices
}

export default function Predictions() {
  const [seqData, setSeqData] = useState([])
  const [loading, setLoading] = useState(true)
  const [alpha, setAlpha] = useState(0.1)

  useEffect(() => {
    get(ref(database, '/'))
      .then(snapshot => {
        const raw = snapshot.val() || {}
        const arr = Object.values(raw)
          .filter(m => typeof m.soc === 'number' && typeof m.temperature === 'number' && typeof m.speed === 'number')
          .sort((a, b) => a.time - b.time)

        const socValues = arr.map(m => m.soc)
        const indices = longestDecreasingSubsequence(socValues)
        const seq = indices.map(i => arr[i])
        setSeqData(seq)
      })
      .catch(err => {
        console.error('Erreur Firebase:', err)
        setSeqData([])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Chargement des données…</p>
  if (seqData.length === 0) return <p>❌ Aucune séquence trouvée.</p>

  const generateSeries = (key) => {
    const real = seqData.map((m, i) => ({ index: i, value: m[key] }))
    const values = real.map(d => d.value)
    const predValues = simpleExpSmoothing(values, alpha)
    const pred = predValues.map((val, i) => ({ index: i, value: val }))

    // 🔮 Prédiction future linéaire (min 100 points)
    const futureLength = 100
    const lastPoints = real.slice(-20)
    const x = lastPoints.map(p => p.index)
    const y = lastPoints.map(p => p.value)
    const n = x.length
    const avgX = x.reduce((a, b) => a + b) / n
    const avgY = y.reduce((a, b) => a + b) / n
    const slope = x.map((xi, i) => (xi - avgX) * (y[i] - avgY)).reduce((a, b) => a + b) /
                  x.map(xi => (xi - avgX) ** 2).reduce((a, b) => a + b)
    const intercept = avgY - slope * avgX
    const lastIndex = real[real.length - 1].index
    const future = Array.from({ length: futureLength }, (_, i) => ({
      index: lastIndex + i + 1,
      value: slope * (lastIndex + i + 1) + intercept
    }))

    return { real, pred, future }
  }

  const soc = generateSeries('soc')
  const temp = generateSeries('temperature')
  const speed = generateSeries('speed')

  const renderChart = (title, real, pred, future, unit, colorReal, colorPred, colorFuture) => (
    <section style={{ marginBottom: 50 }}>
      <h2>{title}</h2>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="index" />
          <YAxis label={{ value: unit, angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(v) => v.toFixed(2)} />
          <Legend verticalAlign="top" height={36} />
          <Line data={real} dataKey="value" stroke={colorReal} strokeWidth={2} name="Réel" dot={false} />
          <Line data={pred} dataKey="value" stroke={colorPred} strokeWidth={2} name={`Lissé (α=${alpha})`} dot={false} />
          <Line data={future} dataKey="value" stroke={colorFuture} strokeWidth={2} name="Prédiction" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </section>
  )

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif', maxWidth: 1000, margin: 'auto' }}>
      <h1>📊 Analyse des courbes — réelle, lissée, prédite</h1>

      <div style={{ marginBottom: 20 }}>
        <label style={{ marginRight: 10 }}>
          <strong>Facteur de lissage α :</strong>
        </label>
        <select value={alpha} onChange={e => setAlpha(parseFloat(e.target.value))}>
          <option value="0.3">0.3 (léger)</option>
          <option value="0.2">0.2</option>
          <option value="0.1">0.1 (équilibré)</option>
          <option value="0.05">0.05 (fort)</option>
          <option value="0.01">0.01 (très fort)</option>
        </select>
      </div>

      {renderChart('🔋 SOC (%)', soc.real, soc.pred, soc.future, '%', '#2ecc71', '#e74c3c', '#9b59b6')}
      {renderChart('🌡️ Température (°C)', temp.real, temp.pred, temp.future, '°C', '#3498db', '#f39c12', '#8e44ad')}
      {renderChart('🏎️ Vitesse (km/h)', speed.real, speed.pred, speed.future, 'km/h', '#e67e22', '#1abc9c', '#c0392b')}
    </div>
  )
}
*/