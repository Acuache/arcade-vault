import Link from 'next/link'
import type { Game, ScoreRow } from '@/lib/types'

export default function GameDetail({
  game,
  scores,
}: {
  game: Game
  scores: ScoreRow[]
}) {
  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={'cover-bg ' + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{
                  color: 'var(--magenta)',
                  textShadow: '0 0 6px rgba(255,0,110,0.5)',
                }}
              >
                {game.best.toLocaleString('es-ES')}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: 'var(--yellow)',
                  textShadow: '0 0 6px rgba(245,255,0,0.5)',
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/game/${game.id}/jugar`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/game" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          {scores.length === 0 && (
            <div
              style={{
                padding: 24,
                textAlign: 'center',
                color: 'var(--ink-faint)',
                fontSize: 12,
              }}
            >
              Aún no hay puntuaciones. ¡Sé el primero!
            </div>
          )}
          {scores.map((r, i) => (
            <div
              key={i}
              className={
                'lb-row' +
                (i === 0 ? ' top1' : i === 1 ? ' top2' : i === 2 ? ' top3' : '')
              }
            >
              <div className="rk">#{String(r.rank).padStart(2, '0')}</div>
              <div className="pl">
                {r.alias}
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--ink-faint)',
                    letterSpacing: '0.1em',
                  }}
                >
                  {new Date(r.created_at).toLocaleDateString('es-ES')}
                </div>
              </div>
              <div className="sc">{r.score.toLocaleString('es-ES')}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
