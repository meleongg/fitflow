"use client";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@nextui-org/react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  return (
    <Button isIconOnly color="primary" onPress={handleSignOut}>
      <LogOut />
    </Button>
  );
}
