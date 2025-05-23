import Navbar from "@/components/ui/navbar";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col pb-24 bg-background">
      <div className="w-full flex flex-col flex-1 gap-6 py-8 px-8">
        {children}
      </div>
      <Navbar />
    </div>
  );
}
