import { Button } from "@nextui-org/react";
import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import LogoutButton from "./logout-button";

export default function PageTitle({ title }: { title: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
      <h1 className="font-bold text-2xl sm:text-3xl md:text-4xl break-words">
        {title}
      </h1>
      <div className="flex gap-2 self-end sm:self-auto">
        <Button
          isIconOnly
          color="primary"
          onPress={() => router.push("/protected/settings")}
        >
          <Settings />
        </Button>
        <LogoutButton />
      </div>
    </div>
  );
}
