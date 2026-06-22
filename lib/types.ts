// ===== lib/types.ts — tipos de dominio compartidos =====

export type GameCategory = 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS'
export type GameColor = 'cyan' | 'magenta' | 'yellow' | 'green'

export type Game = {
  id: string
  title: string
  short: string
  long: string
  cat: GameCategory
  cover: string // clase CSS, ej. "cover-bricks"
  color: GameColor
  best: number
  plays: string
}

export type ScoreRow = {
  rank: number
  alias: string
  score: number
  created_at: string // ISO timestamp de Supabase
}
