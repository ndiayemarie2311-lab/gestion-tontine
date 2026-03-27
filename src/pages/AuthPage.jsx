import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [form, setForm] = useState({ email: '', password: '', prenom: '', nom: '', tel: '', code: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password
    })
    if (error) setError('Email ou mot de passe incorrect.')
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true); setError('')
    if (!form.prenom || !form.nom) { setError('Prénom et nom requis.'); setLoading(false); return }
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { prenom: form.prenom, nom: form.nom, tel: form.tel } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    // Si un code de tontine est fourni, rejoindre la tontine
    if (form.code && data.user) {
      await supabase.from('membres').insert({
        user_id: data.user.id,
        tontine_id: form.code,
        prenom: form.prenom,
        nom: form.nom,
        tel: form.tel,
        role: 'membre'
      })
    }
    setSuccess('Compte créé ! Vérifiez votre email pour confirmer.')
    setLoading(false)
  }

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: window.location.origin + '/reset-password'
    })
    if (error) setError(error.message)
    else setSuccess('Email de réinitialisation envoyé !')
    setLoading(false)
  }

  return (
    <div style={s.page}>
      <div style={s.left}>
        <div style={s.brand}>
          <div style={s.logo}>Gestion<span style={{ color: '#ffd77a' }}>Tontine</span></div>
          <p style={s.tagline}>La plateforme numérique des tontines sénégalaises</p>
          <div style={s.features}>
            {['Suivez vos cotisations en temps réel', 'Gérez vos dettes facilement', 'Payez via Wave ou Orange Money', 'Notifications automatiques'].map(f => (
              <div key={f} style={s.feat}>
                <div style={s.featDot} />
                <span style={s.featText}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={s.right}>
        <div style={s.card}>
          {/* TABS */}
          <div style={s.tabs}>
            <button style={{ ...s.tab, ...(mode === 'login' ? s.tabActive : {}) }} onClick={() => { setMode('login'); setError(''); setSuccess('') }}>Connexion</button>
            <button style={{ ...s.tab, ...(mode === 'register' ? s.tabActive : {}) }} onClick={() => { setMode('register'); setError(''); setSuccess('') }}>Inscription</button>
          </div>

          {/* ERROR / SUCCESS */}
          {error && <div style={s.alertErr}>{error}</div>}
          {success && <div style={s.alertOk}>{success}</div>}

          {/* LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} style={s.form}>
              <div style={s.fg}>
                <label style={s.label}>Adresse email</label>
                <input style={s.input} type="email" placeholder="vous@email.com" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
              <div style={s.fg}>
                <label style={s.label}>Mot de passe</label>
                <input style={s.input} type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} required />
              </div>
              <button type="button" style={s.forgotLink} onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}>Mot de passe oublié ?</button>
              <button type="submit" style={s.btn} disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          )}

          {/* REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} style={s.form}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={s.fg}>
                  <label style={s.label}>Prénom</label>
                  <input style={s.input} placeholder="Fatou" value={form.prenom} onChange={e => set('prenom', e.target.value)} required />
                </div>
                <div style={s.fg}>
                  <label style={s.label}>Nom</label>
                  <input style={s.input} placeholder="Ndiaye" value={form.nom} onChange={e => set('nom', e.target.value)} required />
                </div>
              </div>
              <div style={s.fg}>
                <label style={s.label}>Email</label>
                <input style={s.input} type="email" placeholder="vous@email.com" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
              <div style={s.fg}>
                <label style={s.label}>Téléphone</label>
                <input style={s.input} placeholder="77 XXX XX XX" value={form.tel} onChange={e => set('tel', e.target.value)} />
              </div>
              <div style={s.fg}>
                <label style={s.label}>Mot de passe</label>
                <input style={s.input} type="password" placeholder="Min. 6 caractères" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} />
              </div>
              <div style={s.fg}>
                <label style={s.label}>Code de tontine <span style={{ color: '#aaa', fontWeight: 400 }}>(optionnel)</span></label>
                <input style={s.input} placeholder="Entrez le code fourni par votre trésorier" value={form.code} onChange={e => set('code', e.target.value)} />
              </div>
              <button type="submit" style={s.btn} disabled={loading}>
                {loading ? 'Création...' : 'Créer mon compte'}
              </button>
            </form>
          )}

          {/* FORGOT */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgot} style={s.form}>
              <p style={{ fontSize: 13, color: '#6b6860', marginBottom: 16 }}>Entrez votre email pour recevoir un lien de réinitialisation.</p>
              <div style={s.fg}>
                <label style={s.label}>Adresse email</label>
                <input style={s.input} type="email" placeholder="vous@email.com" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
              <button type="submit" style={s.btn} disabled={loading}>{loading ? 'Envoi...' : 'Envoyer le lien'}</button>
              <button type="button" style={{ ...s.forgotLink, marginTop: 10 }} onClick={() => setMode('login')}>← Retour à la connexion</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" },
  left: { flex: 1, background: '#1a5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 },
  brand: { maxWidth: 380 },
  logo: { fontFamily: "'Fraunces', serif", fontSize: 32, color: '#fff', fontWeight: 700, marginBottom: 12, letterSpacing: '-0.5px' },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginBottom: 40 },
  features: { display: 'flex', flexDirection: 'column', gap: 14 },
  feat: { display: 'flex', alignItems: 'center', gap: 12 },
  featDot: { width: 8, height: 8, borderRadius: '50%', background: '#ffd77a', flexShrink: 0 },
  featText: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  right: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, background: '#f5f4f0' },
  card: { background: '#fff', borderRadius: 16, padding: '32px 36px', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #ece9e0' },
  tabs: { display: 'flex', background: '#f5f4f0', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 },
  tab: { flex: 1, padding: '8px 0', border: 'none', background: 'transparent', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#6b6860', fontFamily: "'DM Sans', sans-serif", transition: 'all .15s' },
  tabActive: { background: '#fff', color: '#1a5c3a', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  form: { display: 'flex', flexDirection: 'column', gap: 4 },
  fg: { marginBottom: 12 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 5 },
  input: { width: '100%', padding: '10px 13px', borderRadius: 8, border: '1px solid #ece9e0', fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none', color: '#1a1a18', boxSizing: 'border-box' },
  btn: { marginTop: 8, padding: '12px', background: '#1a5c3a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background .15s' },
  forgotLink: { background: 'none', border: 'none', color: '#1a5c3a', fontSize: 12, cursor: 'pointer', textAlign: 'right', fontFamily: "'DM Sans', sans-serif", padding: '2px 0' },
  alertErr: { background: '#fdecea', border: '1px solid #f5c6c2', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c0392b', marginBottom: 16 },
  alertOk: { background: '#e8f5ee', border: '1px solid #9fe1cb', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#0f5132', marginBottom: 16 },
}