import Features from "@/components/features";
import Footer from "@/components/footer";
import Hero from "@/components/hero";
import NavbarLanding from "@/components/navbar-landing";

export default async function Home() {
  return (
    <>
      <NavbarLanding />
      <main className="flex-1 flex flex-col gap-6 px-4 lg:px-40">
        <Hero />
        <Features />
      </main>
      <Footer />
    </>
  );
}
