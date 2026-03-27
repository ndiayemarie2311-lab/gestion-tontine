import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function DashboardTresorier({ tontineId }) {
  const [tontine, setTontine] = useState(null)
  const [membres, setMembres] = useState([])
  const [cotisations, setCotisations] = useState([])
  const [dettes, setDettes] = useState([])
  const [moisActuel, setMoisActuel] = useState('Mai')
  const [onglet, setOnglet] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [notifs, setNotifs] = useState([])

  const mois = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

  // ---- CHARGEMENT ----
  const charger = useCallback(async () => {
    if (!tontineId) return
    setLoading(true)

    const [{ data: t }, { data: m }, { data: c }, { data: d }] = await Promise.all([
      supabase.from('tontines').select('*').eq('id', tontineId).single(),
      supabase.from('membres').select('*').eq('tontine_id', tontineId).order('tour_ordre'),
      supabase.from('cotisations').select('*').eq('tontine_id', tontineId).order('created_at', { ascending: false }),
      supabase.from('dettes').select('*').eq('tontine_id', tontineId),
    ])

    setTontine(t); setMembres(m || []); setCotisations(c || []); setDettes(d || [])
    setLoading(false)
  }, [tontineId])

  useEffect(() => { charger() }, [charger])

  // ---- REALTIME ----
  useEffect(() => {
    if (!tontineId) return
    const channel = supabase.channel('tontine_' + tontineId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cotisations', filter: `tontine_id=eq.${tontineId}` },
        payload => {
          charger()
          const m = membres.find(mb => mb.id === payload.new?.membre_id)
          if (m) ajouterNotif(`💰 ${m.prenom} ${m.nom} vient de payer ${fF(payload.new.montant)}`)
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'membres', filter: `tontine_id=eq.${tontineId}` },
        () => charger())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [tontineId, charger, membres])

  function ajouterNotif(msg) {
    setNotifs(n => [{ id: Date.now(), msg, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }, ...n.slice(0, 9)])
  }

  // ---- ACTIONS ----
  async function validerPaiement(membreId, mois, montant) {
    await supabase.from('cotisations').upsert({
      membre_id: membreId, tontine_id: tontineId,
      montant, mois, statut: 'paye', mode: 'Cash',
      date_paiement: new Date().toISOString().split('T')[0]
    }, { onConflict: 'membre_id,mois' })
    await supabase.from('membres').update({ total_paye: supabase.raw('total_paye + ' + montant) }).eq('id', membreId)
    charger()
  }

  async function ajouterDette(membreId, montant, moisDette, note) {
    await supabase.from('dettes').insert({ membre_id: membreId, tontine_id: tontineId, montant, mois: moisDette, note })
    charger()
  }

  async function rembourserDette(detteId, montant) {
    const dette = dettes.find(d => d.id === detteId)
    if (!dette) return
    await supabase.from('dettes').update({ rembourse: Math.min(dette.rembourse + montant, dette.montant) }).eq('id', detteId)
    charger()
  }

  async function passerTourSuivant() {
    if (!tontine) return
    await supabase.from('tontines').update({ tour_actuel: (tontine.tour_actuel || 1) + 1 }).eq('id', tontineId)
    charger()
  }

  // ---- CALCULS ----
  const cotMois = cotisations.filter(c => c.mois === moisActuel)
  const payes = cotMois.filter(c => c.statut === 'paye').length
  const enRetard = membres.filter(m => !cotMois.find(c => c.membre_id === m.id && c.statut === 'paye')).length
  const totalCollecte = cotMois.filter(c => c.statut === 'paye').reduce((s, c) => s + c.montant, 0)
  const totalDettes = dettes.reduce((s, d) => s + (d.montant - d.rembourse), 0)
  const beneficiaireActuel = membres.find(m => m.tour_ordre === tontine?.tour_actuel)
  const fF = n => (n || 0).toLocaleString('fr-FR') + ' F'
  const ini = m => ((m.prenom?.[0] || '') + (m.nom?.[0] || '')).toUpperCase()
  const colors = ['#e8f5ee','#fdf3e3','#e6f1fb','#fbeaf0','#f3eefe','#faece7']
  const tcolors = ['#1a5c3a','#7a5500','#185fa5','#993556','#6b3fa0','#993c1d']

  if (loading) return <div style={s.loading}>Chargement...</div>

  return (
    <div style={s.page}>
      {/* SIDEBAR */}
      <aside style={s.sidebar}>
        <div style={s.sidebarLogo}>Gestion<span style={{ color: '#ffd77a' }}>Tontine</span></div>
        <div style={s.tontineBox}>
          <div style={s.tontineNom}>{tontine?.nom}</div>
          <div style={s.tontineRole}>Trésorier</div>
        </div>
        <nav style={s.nav}>
          {[
            { id: 'dashboard', label: 'Tableau de bord', icon: '▦' },
            { id: 'membres', label: 'Membres', icon: '👥' },
            { id: 'cotisations', label: 'Cotisations', icon: '💵' },
            { id: 'dettes', label: 'Dettes', icon: '⚠️' },
            { id: 'tours', label: 'Tours', icon: '🔄' },
          ].map(item => (
            <button key={item.id} style={{ ...s.navItem, ...(onglet === item.id ? s.navActive : {}) }} onClick={() => setOnglet(item.id)}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
              {item.id === 'dettes' && totalDettes > 0 && <span style={s.badge}>{dettes.filter(d => d.montant - d.rembourse > 0).length}</span>}
            </button>
          ))}
        </nav>
        {notifs.length > 0 && (
          <div style={s.notifBox}>
            <div style={s.notifTitle}>Activité récente</div>
            {notifs.slice(0, 3).map(n => (
              <div key={n.id} style={s.notifItem}><span style={{ flex: 1, fontSize: 11 }}>{n.msg}</span><span style={{ fontSize: 10, opacity: 0.6 }}>{n.time}</span></div>
            ))}
          </div>
        )}
      </aside>

      {/* MAIN */}
      <main style={s.main}>
        {/* --- DASHBOARD --- */}
        {onglet === 'dashboard' && (
          <div>
            <div style={s.banner}>
              <div>
                <div style={s.bannerNom}>{tontine?.nom}</div>
                <div style={s.bannerSub}>{membres.length} membres · Tour {tontine?.tour_actuel || 1}/{membres.length} · {fF(tontine?.cotisation)}/mois</div>
              </div>
              <button style={s.btnWhite} onClick={passerTourSuivant}>Passer au tour suivant →</button>
            </div>

            <div style={s.statsGrid}>
              {[
                { label: 'Payé ce mois', val: payes, sub: `sur ${membres.length}`, color: '#1a5c3a' },
                { label: 'En retard', val: enRetard, sub: 'membres', color: '#c8922a' },
                { label: 'Collecté', val: fF(totalCollecte), sub: moisActuel, color: '#1a5c3a' },
                { label: 'Dettes totales', val: fF(totalDettes), sub: 'en cours', color: '#c0392b' },
              ].map(({ label, val, sub, color }) => (
                <div key={label} style={s.stat}>
                  <div style={s.statLabel}>{label}</div>
                  <div style={{ ...s.statVal, color }}>{val}</div>
                  <div style={s.statSub}>{sub}</div>
                </div>
              ))}
            </div>

            <div style={s.grid2}>
              <div style={s.card}>
                <div style={s.cardTitle}>Bénéficiaire actuel — Tour {tontine?.tour_actuel}</div>
                {beneficiaireActuel ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#1a5c3a' }}>{ini(beneficiaireActuel)}</div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{beneficiaireActuel.prenom} {beneficiaireActuel.nom}</div>
                      <div style={{ fontSize: 13, color: '#6b6860' }}>Montant à recevoir : <strong style={{ color: '#1a5c3a' }}>{fF((tontine?.cotisation || 0) * membres.length)}</strong></div>
                      <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{beneficiaireActuel.tel}</div>
                    </div>
                  </div>
                ) : <div style={{ color: '#aaa', fontSize: 13 }}>Aucun bénéficiaire défini</div>}
              </div>

              <div style={s.card}>
                <div style={s.cardTitle}>Progression — {moisActuel}</div>
                <div style={{ marginBottom: 8, fontSize: 12, color: '#6b6860', display: 'flex', justifyContent: 'space-between' }}><span>Membres ayant payé</span><span>{payes}/{membres.length}</span></div>
                <div style={s.progBg}><div style={{ ...s.progFill, width: membres.length ? `${Math.round(payes / membres.length * 100)}%` : '0%' }} /></div>
                <div style={{ marginBottom: 8, fontSize: 12, color: '#6b6860', display: 'flex', justifyContent: 'space-between', marginTop: 14 }}><span>Montant collecté</span><span>{fF(totalCollecte)} / {fF((tontine?.cotisation || 0) * membres.length)}</span></div>
                <div style={s.progBg}><div style={{ ...s.progFill, width: `${(tontine?.cotisation || 0) * membres.length > 0 ? Math.round(totalCollecte / ((tontine?.cotisation || 0) * membres.length) * 100) : 0}%` }} /></div>
              </div>
            </div>

            {/* Tableau rapide */}
            <div style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={s.cardTitle}>Statut des paiements — {moisActuel}</div>
                <select value={moisActuel} onChange={e => setMoisActuel(e.target.value)} style={s.select}>{mois.map(m => <option key={m}>{m}</option>)}</select>
              </div>
              <table style={s.table}>
                <thead><tr>{['Membre','Montant','Statut','Action'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {membres.map((m, i) => {
                    const cot = cotMois.find(c => c.membre_id === m.id)
                    const statut = cot?.statut || 'en_attente'
                    return (
                      <tr key={m.id}>
                        <td style={s.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: colors[i % 6], color: tcolors[i % 6], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{ini(m)}</div>
                            <span style={{ fontWeight: 500 }}>{m.prenom} {m.nom}</span>
                          </div>
                        </td>
                        <td style={s.td}>{cot ? fF(cot.montant) : '—'}</td>
                        <td style={s.td}>
                          <span style={{ ...s.pill, ...(statut === 'paye' ? s.pillVert : statut === 'en_retard' ? s.pillOr : s.pillGris) }}>
                            {statut === 'paye' ? 'Payé' : statut === 'en_retard' ? 'En retard' : 'En attente'}
                          </span>
                        </td>
                        <td style={s.td}>
                          {statut !== 'paye' && (
                            <button style={s.btnSm} onClick={() => validerPaiement(m.id, moisActuel, m.cotisation || tontine?.cotisation || 0)}>✓ Valider</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- MEMBRES --- */}
        {onglet === 'membres' && (
          <div>
            <div style={s.pageHeader}>
              <div style={s.pageTitle}>Membres</div>
              <div style={s.copyCode}>
                Code d'invitation : <strong style={{ color: '#1a5c3a' }}>{tontineId?.slice(0, 8)}</strong>
                <button style={s.btnSm} onClick={() => navigator.clipboard.writeText(tontineId)}>Copier</button>
              </div>
            </div>
            <div style={s.card}>
              <table style={s.table}>
                <thead><tr>{['Membre','Téléphone','Tour','Cotisation','Total payé','Statut'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {membres.map((m, i) => {
                    const detteM = dettes.filter(d => d.membre_id === m.id).reduce((s, d) => s + (d.montant - d.rembourse), 0)
                    return (
                      <tr key={m.id}>
                        <td style={s.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: colors[i % 6], color: tcolors[i % 6], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>{ini(m)}</div>
                            <div><div style={{ fontWeight: 500 }}>{m.prenom} {m.nom}</div><div style={{ fontSize: 11, color: '#aaa' }}>{m.role}</div></div>
                          </div>
                        </td>
                        <td style={s.td}>{m.tel || '—'}</td>
                        <td style={s.td}><span style={{ fontWeight: 600 }}>#{m.tour_ordre || '—'}</span></td>
                        <td style={s.td}>{fF(m.cotisation || tontine?.cotisation)}</td>
                        <td style={s.td}>{fF(m.total_paye)}</td>
                        <td style={s.td}>{detteM > 0 ? <span style={{ ...s.pill, ...s.pillRouge }}>{fF(detteM)} de dette</span> : <span style={{ ...s.pill, ...s.pillVert }}>À jour</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- COTISATIONS --- */}
        {onglet === 'cotisations' && (
          <div>
            <div style={s.pageHeader}>
              <div style={s.pageTitle}>Cotisations</div>
              <select value={moisActuel} onChange={e => setMoisActuel(e.target.value)} style={s.select}>{mois.map(m => <option key={m}>{m}</option>)}</select>
            </div>
            <div style={s.card}>
              <table style={s.table}>
                <thead><tr>{['Membre','Mois','Montant','Date','Mode','Statut','Action'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {cotisations.filter(c => c.mois === moisActuel).map(c => {
                    const m = membres.find(mb => mb.id === c.membre_id)
                    return (
                      <tr key={c.id}>
                        <td style={s.td}><strong>{m?.prenom} {m?.nom}</strong></td>
                        <td style={s.td}>{c.mois}</td>
                        <td style={s.td}>{fF(c.montant)}</td>
                        <td style={s.td}>{c.date_paiement ? new Date(c.date_paiement).toLocaleDateString('fr-FR') : '—'}</td>
                        <td style={s.td}>{c.mode || '—'}</td>
                        <td style={s.td}><span style={{ ...s.pill, ...(c.statut === 'paye' ? s.pillVert : s.pillOr) }}>{c.statut === 'paye' ? 'Payé' : 'En attente'}</span></td>
                        <td style={s.td}>{c.statut !== 'paye' && m && <button style={s.btnSm} onClick={() => validerPaiement(m.id, c.mois, m.cotisation || tontine?.cotisation || 0)}>✓</button>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- DETTES --- */}
        {onglet === 'dettes' && (
          <div>
            <div style={s.pageHeader}><div style={s.pageTitle}>Gestion des dettes</div></div>
            <div style={s.statsGrid}>
              <div style={s.stat}><div style={s.statLabel}>Total dettes</div><div style={{ ...s.statVal, color: '#c0392b' }}>{fF(totalDettes)}</div></div>
              <div style={s.stat}><div style={s.statLabel}>Membres endettés</div><div style={{ ...s.statVal, color: '#c8922a' }}>{[...new Set(dettes.filter(d => d.montant - d.rembourse > 0).map(d => d.membre_id))].length}</div></div>
            </div>
            <div style={s.card}>
              {dettes.filter(d => d.montant - d.rembourse > 0).length === 0
                ? <div style={{ textAlign: 'center', color: '#aaa', padding: 32 }}>✓ Aucune dette en cours !</div>
                : dettes.filter(d => d.montant - d.rembourse > 0).map(d => {
                    const m = membres.find(mb => mb.id === d.membre_id)
                    const reste = d.montant - d.rembourse
                    const pct = Math.round(d.rembourse / d.montant * 100)
                    return (
                      <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #f5f4f0' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{m?.prenom} {m?.nom} <span style={{ fontWeight: 400, color: '#aaa', fontSize: 12 }}>— {d.mois}</span></div>
                          <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{d.note}</div>
                          <div style={{ marginTop: 8 }}>
                            <div style={s.progBg}><div style={{ ...s.progFill, width: pct + '%', background: pct > 50 ? '#c8922a' : '#c0392b' }} /></div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: 100 }}>
                          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, color: '#c0392b' }}>{fF(reste)}</div>
                          <div style={{ fontSize: 11, color: '#aaa' }}>sur {fF(d.montant)}</div>
                        </div>
                        <button style={{ ...s.btnSm, background: '#fdf3e3', color: '#c8922a', border: '1px solid #f0d5a0' }} onClick={() => {
                          const montant = parseInt(prompt(`Montant remboursé par ${m?.prenom} (max ${reste} F) :`))
                          if (montant && montant > 0) rembourserDette(d.id, Math.min(montant, reste))
                        }}>Rembourser</button>
                      </div>
                    )
                  })}
            </div>
          </div>
        )}

        {/* --- TOURS --- */}
        {onglet === 'tours' && (
          <div>
            <div style={s.pageHeader}>
              <div style={s.pageTitle}>Ordre des tours</div>
              <button style={s.btnVert} onClick={passerTourSuivant}>Passer au tour suivant</button>
            </div>
            <div style={s.card}>
              {[...membres].sort((a, b) => (a.tour_ordre || 0) - (b.tour_ordre || 0)).map((m, i) => {
                const estActuel = m.tour_ordre === tontine?.tour_actuel
                const estFait = m.tour_ordre < (tontine?.tour_actuel || 1)
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid #f5f4f0' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, background: estActuel ? '#1a5c3a' : estFait ? '#e8f5ee' : '#f5f4f0', color: estActuel ? '#fff' : estFait ? '#1a5c3a' : '#aaa' }}>{m.tour_ordre}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{m.prenom} {m.nom}</div>
                      <div style={{ fontSize: 12, color: '#aaa' }}>{fF((tontine?.cotisation || 0) * membres.length)}</div>
                    </div>
                    {estActuel && <span style={{ ...s.pill, ...s.pillVert }}>En cours</span>}
                    {estFait && <span style={{ ...s.pill, ...s.pillGris }}>Terminé ✓</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

const s = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", background: '#f5f4f0' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'DM Sans', sans-serif", color: '#6b6860' },
  sidebar: { width: 230, background: '#1a5c3a', display: 'flex', flexDirection: 'column', padding: '20px 0', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 },
  sidebarLogo: { fontFamily: "'Fraunces', serif", fontSize: 20, color: '#fff', fontWeight: 700, padding: '0 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  tontineBox: { padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  tontineNom: { fontSize: 13, fontWeight: 600, color: '#fff' },
  tontineRole: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  nav: { padding: '12px 10px', flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500, border: 'none', background: 'transparent', fontFamily: "'DM Sans', sans-serif", width: '100%', marginBottom: 2, transition: 'all .15s' },
  navActive: { background: 'rgba(255,255,255,0.18)', color: '#fff' },
  badge: { marginLeft: 'auto', background: '#c0392b', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 10 },
  notifBox: { margin: '12px 10px', background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 12 },
  notifTitle: { fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  notifItem: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, color: 'rgba(255,255,255,0.8)' },
  main: { flex: 1, padding: '24px 28px', maxWidth: 900 },
  banner: { background: '#1a5c3a', borderRadius: 14, padding: '22px 24px', color: '#fff', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  bannerNom: { fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, marginBottom: 4 },
  bannerSub: { fontSize: 13, opacity: 0.8 },
  btnWhite: { padding: '9px 18px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 },
  stat: { background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #ece9e0' },
  statLabel: { fontSize: 11, color: '#6b6860', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statVal: { fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700 },
  statSub: { fontSize: 11, color: '#aaa', marginTop: 2 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  card: { background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #ece9e0', marginBottom: 16 },
  cardTitle: { fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, marginBottom: 14 },
  progBg: { background: '#ece9e0', borderRadius: 99, height: 7, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 99, background: '#1a5c3a', transition: 'width .5s' },
  pageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  pageTitle: { fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '9px 12px', fontWeight: 500, color: '#6b6860', fontSize: 11, borderBottom: '1px solid #ece9e0', background: '#f5f4f0', textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { padding: '11px 12px', borderBottom: '1px solid #f5f4f0', verticalAlign: 'middle' },
  pill: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 },
  pillVert: { background: '#e8f5ee', color: '#0f5132' },
  pillOr: { background: '#fdf3e3', color: '#7a5500' },
  pillRouge: { background: '#fdecea', color: '#c0392b' },
  pillGris: { background: '#ece9e0', color: '#6b6860' },
  select: { padding: '7px 12px', borderRadius: 8, border: '1px solid #ece9e0', fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: '#fff', color: '#1a1a18' },
  btnSm: { padding: '5px 12px', background: '#e8f5ee', color: '#1a5c3a', border: '1px solid #9fe1cb', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  btnVert: { padding: '9px 18px', background: '#1a5c3a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  copyCode: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#6b6860', background: '#fff', padding: '8px 14px', borderRadius: 8, border: '1px solid #ece9e0' },
}