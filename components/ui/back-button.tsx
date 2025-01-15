import { Button } from "@nextui-org/react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

const BackButton = ({ url }: { url: string }) => {
  return (
    <Button
      as={Link}
      href={url}
      variant="light"
      className="mb-1"
      startContent={<ChevronLeft />}
    >
      Back
    </Button>
  );
};

export default BackButton;
