import { createClient } from '@/lib/supabase/server'
import type { Game, ScoreRow } from '@/lib/types'

// Lectura de juegos y scores desde Supabase (Server Components).

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('games').select('*').order('title')
  return (data ?? []) as Game[]
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return (data as Game | null) ?? null
}

export async function getScores(
  gameId: string,
  limit = 12
): Promise<ScoreRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('scores')
    .select('alias, score, created_at')
    .eq('game_id', gameId)
    .order('score', { ascending: false })
    .limit(limit)
  return ((data ?? []) as Omit<ScoreRow, 'rank'>[]).map((r, i) => ({
    ...r,
    rank: i + 1,
  }))
}
