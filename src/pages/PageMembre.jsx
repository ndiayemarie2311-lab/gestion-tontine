const pw = {
  wrap: { fontFamily: "'DM Sans', sans-serif", maxWidth: 440, margin: '0 auto' },
  titre: { fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, marginBottom: 18 },
  montantBox: { background: '#1a5c3a', borderRadius: 12, padding: '18px 20px', textAlign: 'center', marginBottom: 24, color: '#fff' },
  montantLabel: { fontSize: 12, opacity: 0.75, marginBottom: 6 },
  montant: { fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700 },
  montantSub: { fontSize: 12, opacity: 0.7, marginTop: 4 },
  modesLabel: { fontSize: 12, color: '#6b6860', marginBottom: 12, fontWeight: 500 },
  modesGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  modeBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 12px', background: '#fff', border: '1px solid #ece9e0', borderRadius: 12, cursor: 'pointer', transition: 'all .15s', fontFamily: "'DM Sans', sans-serif' " },
  modeLogo: { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  modeNom: { fontSize: 13, fontWeight: 600, color: '#1a1a18' },
  modeSub: { fontSize: 11, color: '#aaa' },
  instructionBox: { background: '#f5f4f0', borderRadius: 12, padding: 16, marginBottom: 18, border: '1px solid #ece9e0' },
  step: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12, fontSize: 13, color: '#1a1a18', lineHeight: 1.5 },
  stepNum: { width: 22, height: 22, borderRadius: '50%', background: '#1a5c3a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 },
  fg: { marginBottom: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 5 },
  input: { width: '100%', padding: '10px 13px', borderRadius: 8, border: '1px solid #ece9e0', fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' },
  btnPayer: { width: '100%', padding: 13, background: '#1a5c3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  back: { background: 'none', border: 'none', color: '#1a5c3a', fontSize: 13, cursor: 'pointer', marginBottom: 14, fontFamily: "'DM Sans', sans-serif", padding: 0 },
}
 
 
// ============================================================
// PageMembre.jsx — Tableau de bord du membre
// ============================================================
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { WavePayment } from './WavePayment'
 
export default function PageMembre({ userId }) {
  const [membre, setMembre] = useState(null)
  const [tontine, setTontine] = useState(null)
  const [cotisations, setCotisations] = useState([])
  const [dettes, setDettes] = useState([])
  const [membres, setMembres] = useState([])
  const [vue, setVue] = useState('accueil') // 'accueil' | 'historique' | 'payer' | 'tontine'
  const [loading, setLoading] = useState(true)
  const moisActuel = 'Mai'
  const mois = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
 
  useEffect(() => {
    async function charger() {
      const { data: m } = await supabase.from('membres').select('*').eq('user_id', userId).single()
      if (!m) { setLoading(false); return }
      setMembre(m)
      const [{ data: t }, { data: c }, { data: d }, { data: ms }] = await Promise.all([
        supabase.from('tontines').select('*').eq('id', m.tontine_id).single(),
        supabase.from('cotisations').select('*').eq('membre_id', m.id).order('created_at', { ascending: false }),
        supabase.from('dettes').select('*').eq('membre_id', m.id),
        supabase.from('membres').select('prenom, nom, tour_ordre').eq('tontine_id', m.tontine_id).order('tour_ordre'),
      ])
      setTontine(t); setCotisations(c || []); setDettes(d || []); setMembres(ms || [])
      setLoading(false)
    }
    charger()
  }, [userId])
 
  const fF = n => (n || 0).toLocaleString('fr-FR') + ' F'
  const cotMois = cotisations.find(c => c.mois === moisActuel)
  const aPaye = cotMois?.statut === 'paye'
  const detteTotal = dettes.reduce((s, d) => s + (d.montant - d.rembourse), 0)
  const totalPaye = cotisations.filter(c => c.statut === 'paye').reduce((s, c) => s + c.montant, 0)
  const monTour = membre?.tour_ordre
  const tourActuel = tontine?.tour_actuel || 1
  const prochaineDistrib = monTour > tourActuel ? monTour - tourActuel : membres.length - tourActuel + monTour
 
  if (loading) return <div style={pm.loading}>Chargement...</div>
  if (!membre) return <div style={pm.loading}>Aucune tontine associée. Demandez un code à votre trésorier.</div>
 
  return (
    <div style={pm.page}>
      {/* HEADER */}
      <div style={pm.header}>
        <div>
          <div style={pm.headerNom}>Bonjour, {membre.prenom} 👋</div>
          <div style={pm.headerSub}>{tontine?.nom}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={pm.headerTour}>Tour #{monTour}</div>
          <div style={pm.headerTourSub}>votre numéro</div>
        </div>
      </div>
 
      {/* NAV BOTTOM (mobile-first) */}
      <div style={pm.bottomNav}>
        {[
          { id: 'accueil', label: 'Accueil', icon: '🏠' },
          { id: 'payer', label: 'Payer', icon: '💳' },
          { id: 'historique', label: 'Historique', icon: '📋' },
          { id: 'tontine', label: 'Tontine', icon: '👥' },
        ].map(item => (
          <button key={item.id} style={{ ...pm.navBtn, ...(vue === item.id ? pm.navBtnActive : {}) }} onClick={() => setVue(item.id)}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{ fontSize: 11 }}>{item.label}</span>
          </button>
        ))}
      </div>
 
      <div style={pm.content}>
        {/* ---- ACCUEIL ---- */}
        {vue === 'accueil' && (
          <div>
            {/* Alerte paiement */}
            {!aPaye && (
              <div style={pm.alertPayer}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Cotisation de {moisActuel} non payée</div>
                  <div style={{ fontSize: 13, opacity: 0.9 }}>{fF(membre.cotisation || tontine?.cotisation)} à payer</div>
                </div>
                <button style={pm.btnPayerAlert} onClick={() => setVue('payer')}>Payer →</button>
              </div>
            )}
            {aPaye && (
              <div style={pm.alertOk}>
                <span style={{ fontSize: 20 }}>✅</span>
                <div><div style={{ fontWeight: 600 }}>Cotisation de {moisActuel} payée !</div><div style={{ fontSize: 13, opacity: 0.8 }}>{fF(cotMois.montant)} via {cotMois.mode}</div></div>
              </div>
            )}
 
            {/* STATS */}
            <div style={pm.statsGrid}>
              <div style={pm.stat}>
                <div style={pm.statLabel}>Total payé</div>
                <div style={{ ...pm.statVal, color: '#1a5c3a' }}>{fF(totalPaye)}</div>
              </div>
              <div style={pm.stat}>
                <div style={pm.statLabel}>Dettes</div>
                <div style={{ ...pm.statVal, color: detteTotal > 0 ? '#c0392b' : '#1a5c3a' }}>{detteTotal > 0 ? fF(detteTotal) : '0 F'}</div>
              </div>
              <div style={pm.stat}>
                <div style={pm.statLabel}>Prochain tour</div>
                <div style={{ ...pm.statVal, fontSize: 16, marginTop: 3 }}>Dans {prochaineDistrib} mois</div>
              </div>
            </div>
 
            {/* Mon tour */}
            <div style={pm.card}>
              <div style={pm.cardTitle}>Ma distribution</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={pm.tourCircle}>{monTour}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Tour n°{monTour}</div>
                  <div style={{ fontSize: 13, color: '#6b6860', marginTop: 2 }}>Montant à recevoir : <strong style={{ color: '#1a5c3a' }}>{fF((membre.cotisation || tontine?.cotisation || 0) * membres.length)}</strong></div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
                    {monTour === tourActuel ? '🎉 C\'est votre tour ce mois !' : monTour < tourActuel ? '✓ Distribué' : `Dans environ ${prochaineDistrib} mois`}
                  </div>
                </div>
              </div>
            </div>
 
            {/* Dernières cotisations */}
            <div style={pm.card}>
              <div style={pm.cardTitle}>Derniers paiements</div>
              {cotisations.slice(0, 4).map(c => (
                <div key={c.id} style={pm.listItem}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.mois} 2025</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>{c.mode} · {c.date_paiement ? new Date(c.date_paiement).toLocaleDateString('fr-FR') : '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: '#1a5c3a' }}>{fF(c.montant)}</div>
                    <span style={{ ...pm.pill, ...(c.statut === 'paye' ? pm.pillVert : c.statut === 'en_attente_validation' ? pm.pillOr : pm.pillGris) }}>
                      {c.statut === 'paye' ? 'Validé' : c.statut === 'en_attente_validation' ? 'En attente' : 'En attente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
 
        {/* ---- PAYER ---- */}
        {vue === 'payer' && (
          <div>
            <div style={pm.pageTitle}>Payer ma cotisation</div>
            {aPaye
              ? <div style={pm.alertOk}><span style={{ fontSize: 20 }}>✅</span><div><div style={{ fontWeight: 600 }}>Déjà payé pour {moisActuel}</div><div style={{ fontSize: 13 }}>{fF(cotMois.montant)} · {cotMois.mode}</div></div></div>
              : <WavePayment membre={membre} tontine={tontine} mois={moisActuel} onSuccess={() => setVue('accueil')} />
            }
          </div>
        )}
 
        {/* ---- HISTORIQUE ---- */}
        {vue === 'historique' && (
          <div>
            <div style={pm.pageTitle}>Historique des paiements</div>
            <div style={pm.card}>
              {cotisations.length === 0
                ? <div style={{ textAlign: 'center', color: '#aaa', padding: 24 }}>Aucun paiement enregistré</div>
                : cotisations.map(c => (
                    <div key={c.id} style={pm.listItem}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{c.mois} 2025</div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>{c.mode || '—'} {c.reference_paiement ? `· Réf: ${c.reference_paiement}` : ''}</div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>{c.date_paiement ? new Date(c.date_paiement).toLocaleDateString('fr-FR') : '—'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#1a5c3a', fontSize: 15 }}>{fF(c.montant)}</div>
                        <span style={{ ...pm.pill, ...(c.statut === 'paye' ? pm.pillVert : pm.pillOr) }}>
                          {c.statut === 'paye' ? 'Validé' : 'En attente'}
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
            {dettes.length > 0 && (
              <div style={pm.card}>
                <div style={pm.cardTitle}>Mes dettes</div>
                {dettes.map(d => (
                  <div key={d.id} style={{ ...pm.listItem, background: '#fdecea', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{d.mois} — {d.note || 'Dette'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#c0392b' }}>{fF(d.montant - d.rembourse)}</div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>reste sur {fF(d.montant)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
 
        {/* ---- TONTINE ---- */}
        {vue === 'tontine' && (
          <div>
            <div style={pm.pageTitle}>Ma tontine</div>
            <div style={{ ...pm.card, background: '#1a5c3a', color: '#fff' }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{tontine?.nom}</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 14 }}>{membres.length} membres · Tour {tourActuel}/{membres.length}</div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div><div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700 }}>{fF(tontine?.cotisation)}</div><div style={{ fontSize: 11, opacity: 0.7 }}>par mois</div></div>
                <div><div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700 }}>{fF((tontine?.cotisation || 0) * membres.length)}</div><div style={{ fontSize: 11, opacity: 0.7 }}>cagnotte totale</div></div>
              </div>
            </div>
            <div style={pm.card}>
              <div style={pm.cardTitle}>Ordre des tours</div>
              {membres.map(m => {
                const estActuel = m.tour_ordre === tourActuel
                const estMoi = m.tour_ordre === monTour
                return (
                  <div key={m.tour_ordre} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f5f4f0' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: estActuel ? '#1a5c3a' : estMoi ? '#e8f5ee' : '#f5f4f0', color: estActuel ? '#fff' : estMoi ? '#1a5c3a' : '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{m.tour_ordre}</div>
                    <div style={{ flex: 1, fontWeight: estMoi ? 700 : 400, color: estMoi ? '#1a5c3a' : '#1a1a18' }}>{m.prenom} {m.nom} {estMoi ? '(moi)' : ''}</div>
                    {estActuel && <span style={{ ...pm.pill, ...pm.pillVert }}>Ce mois</span>}
                    {m.tour_ordre < tourActuel && <span style={{ fontSize: 13 }}>✓</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
 
const pm = {
  page: { fontFamily: "'DM Sans', sans-serif", background: '#f5f4f0', minHeight: '100vh', maxWidth: 480, margin: '0 auto' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'DM Sans', sans-serif", color: '#6b6860', fontSize: 14 },
  header: { background: '#1a5c3a', padding: '20px 20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerNom: { fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  headerTour: { fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, color: '#ffd77a' },
  headerTourSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  content: { padding: '16px 16px 100px' },
  bottomNav: { display: 'flex', position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid #ece9e0', zIndex: 50 },
  navBtn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 4px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#aaa', fontFamily: "'DM Sans', sans-serif", transition: 'all .15s' },
  navBtnActive: { color: '#1a5c3a', borderBottom: '2px solid #1a5c3a' },
  alertPayer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#c0392b', borderRadius: 12, padding: '14px 16px', marginBottom: 14, color: '#fff' },
  alertOk: { display: 'flex', alignItems: 'center', gap: 12, background: '#e8f5ee', border: '1px solid #9fe1cb', borderRadius: 12, padding: '14px 16px', marginBottom: 14, color: '#0f5132' },
  btnPayerAlert: { padding: '8px 16px', background: '#fff', color: '#c0392b', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 },
  stat: { background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1px solid #ece9e0' },
  statLabel: { fontSize: 11, color: '#6b6860', marginBottom: 4 },
  statVal: { fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700 },
  card: { background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #ece9e0', marginBottom: 14 },
  cardTitle: { fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, marginBottom: 14 },
  tourCircle: { width: 56, height: 56, borderRadius: '50%', background: '#1a5c3a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, flexShrink: 0 },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f4f0' },
  pill: { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 },
  pillVert: { background: '#e8f5ee', color: '#0f5132' },
  pillOr: { background: '#fdf3e3', color: '#7a5500' },
  pillGris: { background: '#ece9e0', color: '#6b6860' },
  pageTitle: { fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, marginBottom: 16 },
}