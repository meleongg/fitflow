import { Button } from "@nextui-org/react";
import { Settings } from "lucide-react";
import Link from "next/link";
import LogoutButton from "./logout-button";

export default function PageTitle({ title }: { title: string }) {
  return (
    <div className="flex justify-between items-center w-full">
      <h1 className="font-bold text-4xl">{title}</h1>
      <div className="flex gap-2 ml-auto">
        <Button isIconOnly as={Link} href="/protected/settings" color="primary">
          <Settings />
        </Button>
        <LogoutButton />
      </div>
    </div>
  );
}
