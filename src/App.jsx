// ============================================================
// src/lib/supabase.js
// ============================================================
// import { createClient } from '@supabase/supabase-js'
// export const supabase = createClient(
//   import.meta.env.VITE_SUPABASE_URL,
//   import.meta.env.VITE_SUPABASE_ANON_KEY
// )


// ============================================================
// src/App.jsx — Routeur principal
// ============================================================
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import DashboardTresorier from './pages/DashboardTresorier'
import PageMembre from './pages/PageMembre'

export default function App() {
  const [session, setSession] = useState(null)
  const [membre, setMembre] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Récupérer la session actuelle
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    // Écouter les changements d'authentification
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) { setMembre(null); setLoading(false); return }

    // Récupérer le profil membre de l'utilisateur connecté
    supabase
      .from('membres')
      .select('*, tontines(*)')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        setMembre(data)
        setLoading(false)
      })
  }, [session])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'DM Sans, sans-serif', color: '#6b6860' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 700, color: '#1a5c3a', marginBottom: 8 }}>GestionTontine</div>
        <div style={{ fontSize: 13 }}>Chargement...</div>
      </div>
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        {/* Page de connexion — redirige si déjà connecté */}
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <AuthPage />}
        />

        {/* Page principale — redirige vers login si non connecté */}
        <Route
          path="/"
          element={
            !session
              ? <Navigate to="/login" replace />
              : membre?.role === 'tresorier'
                ? <DashboardTresorier tontineId={membre.tontine_id} />
                : <PageMembre userId={session.user.id} />
          }
        />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}


// ============================================================
// README — Instructions de déploiement complet
// ============================================================
/*

# GestionTontine — Guide de déploiement

## 1. Prérequis
- Node.js 18+
- Compte Supabase gratuit (supabase.com)
- Compte Vercel gratuit (vercel.com)

## 2. Installation
  npm create vite@latest gestiontontine -- --template react
  cd gestiontontine
  npm install @supabase/supabase-js react-router-dom

## 3. Copier les fichiers
  src/
  ├── lib/
  │   └── supabase.js          ← Config Supabase
  ├── pages/
  │   ├── AuthPage.jsx          ← Connexion / Inscription
  │   ├── DashboardTresorier.jsx ← Interface trésorier
  │   ├── WavePayment.jsx        ← Paiement Wave/Orange/Cash
  │   └── PageMembre.jsx         ← Interface membre
  └── App.jsx                    ← Routeur principal

## 4. Variables d'environnement (.env)
  VITE_SUPABASE_URL=https://xxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...

  → Trouvez ces valeurs dans : Supabase → Settings → API

## 5. Configurer Supabase
  a. Créez un projet sur supabase.com
  b. Allez dans SQL Editor et collez le SQL du fichier schema.sql
  c. Activez Email Auth dans Authentication → Providers

## 6. Déploiement Vercel
  npm install -g vercel
  vercel
  
  Dans Vercel → Settings → Environment Variables :
  Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

## 7. Créer le premier trésorier
  a. Inscrivez-vous via /login
  b. Dans Supabase → Table Editor → membres
  c. Changez role = 'tresorier' pour votre compte
  d. Créez votre tontine dans la table tontines

## 8. Inviter des membres
  - Partagez le code tontine (l'UUID de la tontine)
  - Les membres s'inscrivent et entrent ce code
  - Ils sont automatiquement ajoutés à votre tontine

## Flux de paiement Wave
  1. Membre déclare paiement → statut 'en_attente_validation'
  2. Trésorier reçoit notification en temps réel
  3. Trésorier vérifie et valide → statut 'paye'
  
  Note: Wave n'a pas d'API publique officielle au Sénégal.
  L'intégration directe est possible si vous obtenez accès
  à Wave Business API via wave.com/en/business

*/