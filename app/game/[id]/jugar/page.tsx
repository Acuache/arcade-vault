import { notFound } from 'next/navigation'
import GamePlayer from '@/components/GamePlayer'
import { getGame } from '@/lib/games'

export default async function Page(props: PageProps<'/game/[id]/jugar'>) {
  const { id } = await props.params
  const game = await getGame(id)
  if (!game) notFound()
  return <GamePlayer id={id} game={game} />
}
