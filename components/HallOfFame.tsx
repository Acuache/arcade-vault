'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Game, ScoreRow } from '@/lib/types'

export default function HallOfFame({ games }: { games: Game[] }) {
  const [tab, setTab] = useState(games[0]?.id ?? '')
  const [rows, setRows] = useState<ScoreRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tab) return
    let active = true
    const supabase = createClient()
    supabase
      .from('scores')
      .select('alias, score, created_at')
      .eq('game_id', tab)
      .order('score', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (!active) return
        const mapped = ((data ?? []) as Omit<ScoreRow, 'rank'>[]).map(
          (r, i) => ({
            ...r,
            rank: i + 1,
          })
        )
        setRows(mapped)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [tab])

  const game = games.find((g) => g.id === tab)
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES')

  if (!game) return null

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            className={'chip' + (tab === g.id ? ' active' : '')}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="podium">
          {rows[1] && (
            <div className="podium-slot silver">
              <div className="rank-num">02</div>
              <div className="name">{rows[1].alias}</div>
              <div className="score">
                {rows[1].score.toLocaleString('es-ES')}
              </div>
              <div className="date">{fmtDate(rows[1].created_at)}</div>
            </div>
          )}
          {rows[0] && (
            <div className="podium-slot gold">
              <div
                className="pixel"
                style={{
                  fontSize: 9,
                  color: 'var(--gold)',
                  letterSpacing: '0.18em',
                }}
              >
                CAMPEÓN
              </div>
              <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
                01
              </div>
              <div className="name">{rows[0].alias}</div>
              <div className="score" style={{ fontSize: 20 }}>
                {rows[0].score.toLocaleString('es-ES')}
              </div>
              <div className="date">{fmtDate(rows[0].created_at)}</div>
            </div>
          )}
          {rows[2] && (
            <div className="podium-slot bronze">
              <div className="rank-num">03</div>
              <div className="name">{rows[2].alias}</div>
              <div className="score">
                {rows[2].score.toLocaleString('es-ES')}
              </div>
              <div className="date">{fmtDate(rows[2].created_at)}</div>
            </div>
          )}
        </div>
      )}

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={i}
            className={
              'tr' +
              (i === 0 ? ' top1' : i === 1 ? ' top2' : i === 2 ? ' top3' : '')
            }
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{String(r.rank).padStart(2, '0')}</div>
            <div className="pl">{r.alias}</div>
            <div className="sc">{r.score.toLocaleString('es-ES')}</div>
            <div className="dt">{fmtDate(r.created_at)}</div>
          </div>
        ))}
        {!loading && rows.length === 0 && (
          <div
            style={{
              padding: 48,
              textAlign: 'center',
              color: 'var(--ink-faint)',
            }}
          >
            <div
              className="pixel"
              style={{
                fontSize: 12,
                color: 'var(--magenta)',
                marginBottom: 10,
              }}
            >
              SIN PUNTUACIONES
            </div>
            <div>
              Nadie ha jugado a {game.title} todavía. ¡Sé el primero en entrar
              al salón!
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <Link href="/game" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  )
}
