// Import de Firebase
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database' // 🔥 ajoute cette ligne

// Configuration de ton projet
const firebaseConfig = {
  apiKey: "AIzaSyCJGiLbiVE6Vs6K9VoLkfQoAP67qm_eRWc",
  authDomain: "digital-twin-bev-2025.firebaseapp.com",
  databaseURL: "https://digital-twin-bev-2025-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "digital-twin-bev-2025",
  storageBucket: "digital-twin-bev-2025.appspot.com",
  messagingSenderId: "94649531759",
  appId: "1:94649531759:web:xxxxxxxxxxxxxxxxxxx" // complète ici si possible
}

// Initialiser Firebase
const app = initializeApp(firebaseConfig)

// 🔐 Exporte ce qu'il faut
export const auth = getAuth(app)
export const database = getDatabase(app) // ✅ on exporte bien la base
