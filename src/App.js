import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Simulation from './pages/Simulation' // ✅ assure-toi que le fichier existe bien
import Statistiques from './pages/Statistiques'
import Visualisation from './pages/Visualisation'
import Historique from './pages/Historique'
import Predictions from './pages/Predictions'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/simulation" element={<Simulation />} />  {/* ✅ AJOUT IMPORTANT */}
        <Route path="/statistiques" element={<Statistiques />} />
        <Route path="/visualisation" element={<Visualisation />} />
        <Route path="/historique" element={<Historique />} /> {/* Ajoute ceci */}
        <Route path="/predictions" element={<Predictions />} /> {/* Ajoute ceci */}

      </Routes>
    </BrowserRouter>
  )
}

export default App
