import { Button } from "@nextui-org/react";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";

export default function PageTitle({ title }: { title: string }) {
  return (
    <div className="flex justify-between items-center w-full px-8">
      <h1 className="font-bold text-4xl">{title}</h1>
      <div className="flex gap-2 ml-auto">
        <Button isIconOnly as={Link} href="/settings" color="primary">
          <Settings />
        </Button>
        <Button isIconOnly as={Link} href="/log-out" color="primary">
          <LogOut />
        </Button>
      </div>
    </div>
  );
}
