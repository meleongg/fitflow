import Navbar from "@/components/ui/navbar";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <div className="w-full flex flex-col gap-12 items-start py-8">
          {children}
        </div>
      </div>
      <Navbar />
    </div>
  );
}
