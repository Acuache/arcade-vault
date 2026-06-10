import GamePlayer from "@/components/GamePlayer";

export default async function Page(props: PageProps<"/game/[id]/jugar">) {
  const { id } = await props.params;
  return <GamePlayer id={id} />;
}
