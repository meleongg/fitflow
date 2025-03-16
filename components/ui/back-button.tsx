import { Button } from "@nextui-org/react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function BackButton({ url }: { url: string }) {
  return (
    <Button
      as={Link}
      href={url}
      variant="light"
      color="default"
      size="md"
      className="mb-4 pl-0"
      startContent={<ChevronLeft className="h-4 w-4" />}
    >
      Back
    </Button>
  );
}
