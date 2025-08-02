import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()

  const backgroundStyle = {
    backgroundImage: "url('battery-bg.jpeg')", // image placée dans /public
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    height: '100vh',
    color: 'white',
    textAlign: 'center',
    padding: '50px 20px',
    fontFamily: 'Arial, sans-serif',
  }

  return (
    <div style={backgroundStyle}>
      <h2 style={{ color: '#00ffff' }}>UNIVERSITÉ DE SOUSSE</h2>
      <h3>ISSAT SOUSSE</h3>
      <h3>Département de Génie Électronique</h3>
      <h2 style={{ marginTop: '30px', color: '#00bfff' }}>
        Projet de fin d'études - Mastère_Recherche_SEE
      </h2>

      <div style={{ marginTop: '20px' }}>
        <button onClick={() => navigate('/simulation')} style={btnStyle}>
          🔧 SIMULATION
        </button>
        <button onClick={() => navigate('/visualisation')} style={btnStyle}>
          🧩 VISUALISATION
        </button>
        <button onClick={() => navigate('/historique')} style={btnStyle}>
          📊 HISTORIQUE
        </button>
        <button onClick={() => navigate('/statistiques')} style={btnStyle}>
          📈 ANALYSE STATISTIQUE
        </button>
        {/* Nouveau bouton Prédiction ajouté */}
        <button onClick={() => navigate('/predictions')} style={btnStyle}>
          📉 PRÉDICTION
        </button>
      </div>

      <h2 style={{ marginTop: '60px' }}>
        Application des Jumeaux Numériques pour la supervision et le diagnostic des systèmes industriels embarqués
      </h2>
      <h4>Systèmes Electroniques Embarqués - 2025</h4>
    </div>
  )
}

const btnStyle = {
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  padding: '12px 25px',
  margin: '10px',
  fontSize: '16px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold',
}

/*import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()

  const backgroundStyle = {
    backgroundImage: "url('battery-bg.jpeg')", // image placée dans /public
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    height: '100vh',
    color: 'white',
    textAlign: 'center',
    padding: '50px 20px',
    fontFamily: 'Arial, sans-serif',
  }

  return (
    <div style={backgroundStyle}>
      <h2 style={{ color: '#00ffff' }}>UNIVERSITÉ DE SOUSSE</h2>
      <h3>ISSAT SOUSSE</h3>
      <h3>Département de Génie Électronique</h3>
      <h2 style={{ marginTop: '30px', color: '#00bfff' }}>
        Projet de fin d'études - Mastère_Recherche_SEE
      </h2>

      <div style={{ marginTop: '20px' }}>
        <button onClick={() => navigate('/simulation')} style={btnStyle}>
          🔧 SIMULATION
        </button>
        <button onClick={() => navigate('/visualisation')} style={btnStyle}>
          🧩 VISUALISATION
        </button>
        <button onClick={() => navigate('/historique')} style={btnStyle}>
          📊 HISTORIQUE
        </button>
        <button onClick={() => navigate('/statistiques')} style={btnStyle}>
          📈 ANALYSE STATISTIQUE
        </button>
      </div>

      <h2 style={{ marginTop: '60px' }}>
        Application des Jumeaux Numériques pour la supervision et le diagnostic des systèmes industriels embarqués
      </h2>
      <h4>Systèmes Electroniques Embarqués - 2025</h4>
    </div>
  )
}

const btnStyle = {
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  padding: '12px 25px',
  margin: '10px',
  fontSize: '16px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold',
}
*/