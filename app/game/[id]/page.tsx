import { notFound } from 'next/navigation'
import GameDetail from '@/components/GameDetail'
import { getGame, getScores } from '@/lib/games'

export default async function Page(props: PageProps<'/game/[id]'>) {
  const { id } = await props.params
  const game = await getGame(id)
  if (!game) notFound()
  const scores = await getScores(id, 10)
  return <GameDetail game={game} scores={scores} />
}
