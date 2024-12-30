import Navbar from "@/components/ui/navbar";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="max-w-7xl flex flex-col gap-12 items-start py-8">
        {children}
      </div>
      <Navbar />
    </>
  );
}