import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'

export default function Navbar() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/')
  }

  return (
    <nav style={{ padding: '10px', background: '#eee' }}>
      <Link to="/home" style={{ marginRight: '20px' }}>🏠 Visualisation</Link>
      <Link to="/data" style={{ marginRight: '20px' }}>📈 Données</Link>
      <Link to="/history" style={{ marginRight: '20px' }}>📊 Historique</Link>
      <button onClick={handleLogout}>🚪 Déconnexion</button>
    </nav>
  )
}
