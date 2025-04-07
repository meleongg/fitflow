"use client";

import { useSession } from "@/contexts/SessionContext";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@nextui-org/react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const { endSession } = useSession();

  const handleSignOut = async () => {
    try {
      // First clear all session data
      endSession();

      // Then clear any other app state stored in localStorage
      clearAppLocalStorage();

      // Finally, sign out from Supabase
      await supabase.auth.signOut();
      router.push("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  // Helper function to clear all app-related localStorage items
  const clearAppLocalStorage = () => {
    // Clear specific keys
    const keysToRemove = [
      "fitflow-active-session",
      "rest-timer-duration",
      "fitflow-theme",
      // Add any other app-specific keys here
    ];

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // Force storage event to ensure components update
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <Button isIconOnly color="primary" onPress={handleSignOut}>
      <LogOut />
    </Button>
  );
}
