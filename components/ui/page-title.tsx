import { Button } from "@nextui-org/react";
import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import LogoutButton from "./logout-button";

export default function PageTitle({ title }: { title: string }) {
  const router = useRouter();

  return (
    <div className="flex justify-between items-center w-full">
      <h1 className="font-bold text-4xl">{title}</h1>
      <div className="flex gap-2 ml-auto">
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
