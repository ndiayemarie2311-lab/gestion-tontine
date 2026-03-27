// ============================================================
// WavePayment.jsx — Intégration paiement Wave / Orange Money
// ============================================================
import { useState } from 'react'
import { supabase } from '../lib/supabase'
 
// Wave n'a pas d'API publique officielle au Sénégal —
// Cette intégration utilise Wave Business API (si disponible)
// ou génère un lien de paiement Wave manuel + confirmation trésorier.
 
export function WavePayment({ membre, tontine, mois, onSuccess }) {
  const [etape, setEtape] = useState('choix') // 'choix' | 'wave' | 'orange' | 'confirmation' | 'succes'
  const [mode, setMode] = useState('')
  const [refPaiement, setRefPaiement] = useState('')
  const [capture, setCapture] = useState(null)
  const [loading, setLoading] = useState(false)
 
  const montant = membre?.cotisation || tontine?.cotisation || 0
  const tresorierTel = tontine?.tresorier_tel || '77 000 00 00'
 
  async function confirmerPaiement() {
    if (!refPaiement.trim()) { alert('Entrez votre référence de transaction.'); return }
    setLoading(true)
 
    // Enregistrer la cotisation avec statut 'en_attente_validation'
    const { error } = await supabase.from('cotisations').upsert({
      membre_id: membre.id,
      tontine_id: tontine.id,
      mois,
      montant,
      mode,
      statut: 'en_attente_validation',
      reference_paiement: refPaiement,
      date_paiement: new Date().toISOString().split('T')[0],
    }, { onConflict: 'membre_id,mois' })
 
    // Notifier le trésorier via Supabase realtime
    await supabase.from('notifications').insert({
      tontine_id: tontine.id,
      type: 'paiement_en_attente',
      message: `${membre.prenom} ${membre.nom} a déclaré un paiement ${mode} de ${montant.toLocaleString('fr-FR')} F — Réf: ${refPaiement}`,
      membre_id: membre.id,
      lu: false,
    })
 
    setLoading(false)
    if (!error) { setEtape('succes'); onSuccess?.() }
  }
 
  const fF = n => (n || 0).toLocaleString('fr-FR') + ' F CFA'
 
  return (
    <div style={pw.wrap}>
      {/* CHOIX DU MODE */}
      {etape === 'choix' && (
        <div>
          <div style={pw.titre}>Payer votre cotisation</div>
          <div style={pw.montantBox}>
            <div style={pw.montantLabel}>Montant à payer</div>
            <div style={pw.montant}>{fF(montant)}</div>
            <div style={pw.montantSub}>{mois} · {tontine?.nom}</div>
          </div>
          <div style={pw.modesLabel}>Choisissez votre mode de paiement</div>
          <div style={pw.modesGrid}>
            <button style={pw.modeBtn} onClick={() => { setMode('Wave'); setEtape('wave') }}>
              <div style={{ ...pw.modeLogo, background: '#1a56db', color: '#fff', fontSize: 18 }}>W</div>
              <div style={pw.modeNom}>Wave</div>
              <div style={pw.modeSub}>Instantané</div>
            </button>
            <button style={pw.modeBtn} onClick={() => { setMode('Orange Money'); setEtape('orange') }}>
              <div style={{ ...pw.modeLogo, background: '#ff6600', color: '#fff', fontSize: 18 }}>O</div>
              <div style={pw.modeNom}>Orange Money</div>
              <div style={pw.modeSub}>USSD *144#</div>
            </button>
            <button style={pw.modeBtn} onClick={() => { setMode('Free Money'); setEtape('orange') }}>
              <div style={{ ...pw.modeLogo, background: '#e60026', color: '#fff', fontSize: 18 }}>F</div>
              <div style={pw.modeNom}>Free Money</div>
              <div style={pw.modeSub}>USSD *555#</div>
            </button>
            <button style={pw.modeBtn} onClick={() => { setMode('Cash'); setEtape('confirmation') }}>
              <div style={{ ...pw.modeLogo, background: '#1a5c3a', color: '#fff', fontSize: 18 }}>💵</div>
              <div style={pw.modeNom}>Cash</div>
              <div style={pw.modeSub}>En mains propres</div>
            </button>
          </div>
        </div>
      )}
 
      {/* WAVE */}
      {etape === 'wave' && (
        <div>
          <button style={pw.back} onClick={() => setEtape('choix')}>← Retour</button>
          <div style={pw.titre}>Payer par Wave</div>
          <div style={pw.instructionBox}>
            <div style={pw.step}><div style={pw.stepNum}>1</div><div>Ouvrez votre <strong>application Wave</strong></div></div>
            <div style={pw.step}><div style={pw.stepNum}>2</div><div>Appuyez sur <strong>Envoyer</strong></div></div>
            <div style={pw.step}><div style={pw.stepNum}>3</div><div>Entrez le numéro du trésorier : <strong style={{ color: '#1a56db', fontSize: 16 }}>{tresorierTel}</strong></div></div>
            <div style={pw.step}><div style={pw.stepNum}>4</div><div>Entrez le montant : <strong style={{ color: '#1a5c3a' }}>{fF(montant)}</strong></div></div>
            <div style={pw.step}><div style={pw.stepNum}>5</div><div>Dans le message, écrivez : <strong>Cotisation {mois} - {tontine?.nom}</strong></div></div>
            <div style={pw.step}><div style={pw.stepNum}>6</div><div>Confirmez et <strong>copiez la référence</strong> de transaction</div></div>
          </div>
          <div style={pw.fg}>
            <label style={pw.label}>Référence Wave (ex: TXN-XXXXXXXX)</label>
            <input style={pw.input} placeholder="Entrez votre référence" value={refPaiement} onChange={e => setRefPaiement(e.target.value)} />
          </div>
          <button style={pw.btnPayer} onClick={confirmerPaiement} disabled={loading}>
            {loading ? 'Envoi...' : 'Confirmer le paiement'}
          </button>
        </div>
      )}
 
      {/* ORANGE / FREE */}
      {etape === 'orange' && (
        <div>
          <button style={pw.back} onClick={() => setEtape('choix')}>← Retour</button>
          <div style={pw.titre}>Payer par {mode}</div>
          <div style={pw.instructionBox}>
            <div style={pw.step}><div style={pw.stepNum}>1</div><div>Composez <strong>{mode === 'Orange Money' ? '*144#' : '*555#'}</strong> sur votre téléphone</div></div>
            <div style={pw.step}><div style={pw.stepNum}>2</div><div>Choisissez <strong>Transfert d'argent</strong></div></div>
            <div style={pw.step}><div style={pw.stepNum}>3</div><div>Entrez le numéro : <strong style={{ fontSize: 16 }}>{tresorierTel}</strong></div></div>
            <div style={pw.step}><div style={pw.stepNum}>4</div><div>Entrez le montant : <strong style={{ color: '#1a5c3a' }}>{fF(montant)}</strong></div></div>
            <div style={pw.step}><div style={pw.stepNum}>5</div><div>Confirmez avec votre <strong>code PIN</strong></div></div>
            <div style={pw.step}><div style={pw.stepNum}>6</div><div>Notez le <strong>numéro de transaction</strong> reçu par SMS</div></div>
          </div>
          <div style={pw.fg}>
            <label style={pw.label}>Numéro de transaction</label>
            <input style={pw.input} placeholder="Ex: OM-1234567890" value={refPaiement} onChange={e => setRefPaiement(e.target.value)} />
          </div>
          <button style={pw.btnPayer} onClick={confirmerPaiement} disabled={loading}>
            {loading ? 'Envoi...' : 'Confirmer le paiement'}
          </button>
        </div>
      )}
 
      {/* CASH */}
      {etape === 'confirmation' && (
        <div>
          <button style={pw.back} onClick={() => setEtape('choix')}>← Retour</button>
          <div style={pw.titre}>Déclaration de paiement Cash</div>
          <div style={{ ...pw.instructionBox, background: '#fdf3e3', borderColor: '#f0d5a0' }}>
            <p style={{ fontSize: 13, color: '#7a5500', lineHeight: 1.6 }}>En cliquant sur Confirmer, vous déclarez avoir remis <strong>{fF(montant)}</strong> en espèces au trésorier. Ce paiement sera validé par le trésorier.</p>
          </div>
          <div style={pw.fg}>
            <label style={pw.label}>Note (optionnel)</label>
            <input style={pw.input} placeholder="Ex: remis ce matin" value={refPaiement} onChange={e => setRefPaiement(e.target.value)} />
          </div>
          <button style={pw.btnPayer} onClick={confirmerPaiement} disabled={loading}>
            {loading ? 'Envoi...' : 'Confirmer'}
          </button>
        </div>
      )}
 
      {/* SUCCÈS */}
      {etape === 'succes' && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Paiement déclaré !</div>
          <div style={{ fontSize: 14, color: '#6b6860', lineHeight: 1.6 }}>
            Votre paiement de <strong>{fF(montant)}</strong> via <strong>{mode}</strong> a été enregistré.<br />
            Le trésorier va le valider prochainement.
          </div>
          <div style={{ marginTop: 20, padding: '12px 16px', background: '#e8f5ee', borderRadius: 10, fontSize: 13, color: '#1a5c3a' }}>
            Référence : <strong>{refPaiement || 'Cash'}</strong>
          </div>
        </div>
      )}
    </div>
  )
}