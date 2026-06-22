'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'

export default function Auth() {
  const router = useRouter()
  const { signIn, signUp, setAlias } = useAuth()

  const [tab, setTab] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [guest, setGuest] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error } =
      tab === 'in' ? await signIn(email, pass) : await signUp(email, pass)
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push('/game')
  }

  const playAsGuest = () => {
    const alias = (guest || 'PLAYER1').toUpperCase().slice(0, 10)
    setAlias(alias)
    router.push('/game')
  }

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--ink-faint)',
              letterSpacing: '0.16em',
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={tab === 'in' ? 'on' : ''}
            onClick={() => setTab('in')}
          >
            INICIAR SESIÓN
          </button>
          <button
            className={tab === 'up' ? 'on' : ''}
            onClick={() => setTab('up')}
          >
            CREAR CUENTA
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label>Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              required
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              className="mono"
              style={{ color: 'var(--magenta)', fontSize: 12, marginBottom: 8 }}
            >
              {error}
            </div>
          )}

          <button
            className="btn lg"
            type="submit"
            disabled={busy}
            style={{ width: '100%', marginTop: 8 }}
          >
            {busy ? '...' : tab === 'in' ? 'ENTRAR AL VAULT' : 'CREAR Y JUGAR'}
          </button>
        </form>

        <div className="auth-divider">O JUEGA COMO INVITADO</div>
        <div className="field">
          <label>Alias</label>
          <input
            value={guest}
            onChange={(e) => setGuest(e.target.value)}
            placeholder="px_kai"
          />
        </div>
        <button
          className="btn ghost"
          style={{ width: '100%', marginTop: 4 }}
          onClick={playAsGuest}
        >
          JUGAR COMO INVITADO
        </button>

        <div
          style={{
            marginTop: 18,
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--ink-faint)',
            letterSpacing: '0.1em',
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  )
}
