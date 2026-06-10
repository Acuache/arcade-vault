import GameDetail from "@/components/GameDetail";

export default async function Page(props: PageProps<"/biblioteca/[id]">) {
  const { id } = await props.params;
  return <GameDetail id={id} />;
}
