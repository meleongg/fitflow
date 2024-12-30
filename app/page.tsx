import Hero from "@/components/hero";
import { Button } from "@nextui-org/react";

export default async function Home() {
  return (
    <>
      <Hero />
      <main className="flex-1 flex flex-col gap-6 px-4">
        <Button className="bg-yellow-700">Click me</Button>
      </main>
    </>
  );
}
