"use client";

import { useTheme } from "@/components/theme-provider";
import PageTitle from "@/components/ui/page-title";
import { createClient } from "@/utils/supabase/client";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Select,
  SelectItem,
  Switch,
  Tab,
  Tabs,
  useDisclosure,
} from "@nextui-org/react";
import {
  AlertTriangle,
  Check,
  Clock,
  Key,
  LogOut,
  Mail,
  Moon,
  Save,
  Settings,
  Sun,
  Trash2,
  User,
  Weight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// Default user preferences
const DEFAULT_PREFERENCES = {
  useMetric: true,
  useDarkMode: false,
  defaultRestTimer: 60, // seconds
};

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activeTab, setActiveTab] = useState("account");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const { theme, setTheme } = useTheme();

  // Form states
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // Fetch user data and preferences
  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Not authenticated");
      }

      setUserProfile(user);

      // Get user preferences from database
      const { data: prefsData, error: prefsError } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (prefsData) {
        setPreferences({
          useMetric: prefsData.use_metric,
          useDarkMode: theme === "dark", // Match the current theme
          defaultRestTimer: prefsData.default_rest_timer,
        });
      } else {
        // Create default preferences if none exists
        await supabase.from("user_preferences").insert({
          user_id: user.id,
          use_metric: DEFAULT_PREFERENCES.useMetric,
          use_dark_mode: DEFAULT_PREFERENCES.useDarkMode,
          default_rest_timer: DEFAULT_PREFERENCES.defaultRestTimer,
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, [theme]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Save preferences
  const savePreferences = async () => {
    try {
      setIsSaving(true);

      // Show loading toast that will be updated with result
      const toastId = toast.loading("Saving your preferences...");

      // Apply theme change globally
      setTheme(preferences.useDarkMode ? "dark" : "light");

      const { error } = await supabase
        .from("user_preferences")
        .update({
          use_metric: preferences.useMetric,
          use_dark_mode: preferences.useDarkMode,
          default_rest_timer: preferences.defaultRestTimer,
        })
        .eq("user_id", userProfile.id);

      if (error) throw error;

      // Update the loading toast to success
      toast.success("Your preferences have been saved", {
        id: toastId,
        icon: <Check className="h-4 w-4" />,
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Could not save preferences. Please try again.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Update email
  const updateEmail = async () => {
    try {
      setIsSaving(true);

      if (!newEmail) {
        toast.error("Please enter a new email address");
        return;
      }

      // Loading toast that will be updated
      const toastId = toast.loading("Sending verification email...");

      const { error } = await supabase.auth.updateUser({ email: newEmail });

      if (error) throw error;

      toast.success("Verification email sent", {
        id: toastId,
        description: "Please check your inbox to complete the change",
        duration: 5000,
      });

      setNewEmail("");
    } catch (error: any) {
      console.error("Error updating email:", error);
      toast.error("Failed to update email", {
        description: error.message || "Please try again later",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Update password
  const updatePassword = async () => {
    try {
      setIsSaving(true);

      if (!currentPassword) {
        toast.error("Please enter your current password");
        return;
      }

      if (!newPassword) {
        toast.error("Please enter a new password");
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error("New passwords don't match");
        return;
      }

      if (newPassword.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }

      // Loading toast
      const toastId = toast.loading("Verifying your password...");

      // First verify the current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: currentPassword,
      });

      if (signInError) {
        toast.error("Current password is incorrect", { id: toastId });
        return;
      }

      // Update loading message
      toast.loading("Updating your password...", { id: toastId });

      // Then update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully", {
        id: toastId,
        icon: <Check className="h-4 w-4" />,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password", {
        description: error.message || "Please try again later",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete account
  const deleteAccount = async () => {
    try {
      if (deleteConfirm !== userProfile.email) {
        toast.error("Email confirmation doesn't match your account email");
        return;
      }

      const toastId = toast.loading("Deleting your account...");

      // Delete user data first
      await supabase
        .from("user_preferences")
        .delete()
        .eq("user_id", userProfile.id);

      // Delete the user account
      const { error } = await supabase.auth.admin.deleteUser(userProfile.id);

      if (error) throw error;

      // Sign out after deletion
      await supabase.auth.signOut();

      toast.success("Account deleted successfully", {
        id: toastId,
        description: "We're sorry to see you go",
      });

      router.push("/sign-in");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account", {
        description: error.message || "Please contact support if this persists",
      });
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const toastId = toast.loading("Signing you out...");

      await supabase.auth.signOut();

      toast.success("Signed out successfully", {
        id: toastId,
        duration: 3000,
      });

      router.push("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 pb-16 space-y-6 w-full max-w-5xl mx-auto min-w-[320px]">
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />

        {/* Tab skeleton */}
        <div className="border-b border-divider w-full">
          <div className="flex gap-4 mb-2">
            <div className="h-10 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-10 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse opacity-60" />
          </div>
          <div className="h-0.5 w-28 bg-primary rounded-full mb-[-1px]" />
        </div>

        {/* Card skeletons */}
        <div className="space-y-6 w-full pt-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="shadow-sm overflow-hidden">
              <CardHeader className="flex flex-col items-start gap-2">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </CardHeader>
              <Divider />
              <CardBody className="space-y-6 px-4 md:px-6 py-5">
                {/* Staggered animation for content */}
                <div
                  className="space-y-4"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex flex-col gap-2">
                    <div
                      className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                      style={{ animationDelay: `${i * 50}ms` }}
                    />
                    <div
                      className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                      style={{ animationDelay: `${i * 75}ms` }}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div
                      className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                      style={{ animationDelay: `${i * 100}ms` }}
                    />
                    <div
                      className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                      style={{ animationDelay: `${i * 125}ms` }}
                    />
                  </div>

                  <div className="flex justify-end">
                    <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Add global styles for better animations */}
        <style jsx global>{`
          @keyframes pulseDelay {
            0%,
            100% {
              opacity: 0.5;
            }
            50% {
              opacity: 1;
            }
          }
          .animate-pulse {
            animation: pulseDelay 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>
      </div>
    );
  }

  // Enhanced Settings Page with better responsiveness
  return (
    <div className="p-4 md:p-6 pb-16 space-y-6 w-full max-w-5xl mx-auto min-w-[320px] animate-fadeIn">
      <PageTitle title="Settings" />

      {/* Enhanced tabs with better mobile appearance */}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
        aria-label="Settings"
        color="primary"
        variant="underlined"
        classNames={{
          tabList: "gap-4 w-full relative overflow-x-auto scrollbar-hide",
          panel: "w-full pt-3",
          cursor: "w-full",
          tab: "max-w-fit px-3 h-10 data-[selected=true]:font-medium",
          base: "w-full",
        }}
        className="w-full"
      >
        <Tab
          key="account"
          title={
            <div className="flex items-center gap-2">
              <User size={16} />
              <span>Account</span>
            </div>
          }
        >
          {/* Account settings content goes directly inside the Tab */}
          <div className="space-y-6 w-full py-3">
            {/* Profile Information Card */}
            <Card className="shadow-sm hover:shadow transition-shadow">
              <CardHeader className="flex flex-col items-start">
                <h3 className="text-lg font-bold">Profile Information</h3>
              </CardHeader>
              <Divider />
              <CardBody className="space-y-6 px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Email Address</p>
                    <p className="font-medium">{userProfile?.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Account Created</p>
                    <p className="font-medium">
                      {userProfile?.created_at
                        ? new Date(userProfile.created_at).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    color="danger"
                    variant="light"
                    startContent={<LogOut size={16} />}
                    onPress={signOut}
                    className="h-10"
                  >
                    Sign Out
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Update Email Card */}
            <Card className="shadow-sm hover:shadow transition-shadow">
              <CardHeader className="flex flex-col items-start">
                <h3 className="text-lg font-bold">Update Email</h3>
              </CardHeader>
              <Divider />
              <CardBody className="space-y-5 px-4 md:px-6">
                <Input
                  label="New Email Address"
                  placeholder="Enter your new email address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  startContent={<Mail size={16} className="text-default-400" />}
                  classNames={{
                    inputWrapper: "h-12",
                  }}
                />
                <div className="flex justify-end">
                  <Button
                    color="primary"
                    isLoading={isSaving}
                    startContent={<Save size={16} />}
                    onPress={updateEmail}
                    className="h-10 w-full sm:w-auto"
                  >
                    Update Email
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Change Password Card - Enhanced for better spacing */}
            <Card className="shadow-sm hover:shadow transition-shadow">
              <CardHeader className="flex flex-col items-start">
                <h3 className="text-lg font-bold">Change Password</h3>
              </CardHeader>
              <Divider />
              <CardBody className="space-y-5 px-4 md:px-6">
                <Input
                  label="Current Password"
                  placeholder="Enter your current password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  startContent={<Key size={16} className="text-default-400" />}
                  classNames={{
                    inputWrapper: "h-12",
                  }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="New Password"
                    placeholder="Enter your new password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    classNames={{
                      inputWrapper: "h-12",
                    }}
                  />
                  <Input
                    label="Confirm New Password"
                    placeholder="Confirm your new password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    classNames={{
                      inputWrapper: "h-12",
                    }}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    color="primary"
                    isLoading={isSaving}
                    startContent={<Save size={16} />}
                    onPress={updatePassword}
                    className="h-10 w-full sm:w-auto"
                  >
                    Update Password
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Delete Account Card with improved danger styling */}
            <Card className="shadow-sm hover:shadow-md border border-danger-200 transition-all">
              <CardHeader className="flex flex-col items-start">
                <div className="flex items-center gap-2 text-danger">
                  <AlertTriangle size={18} />
                  <h3 className="text-lg font-bold">Delete Account</h3>
                </div>
                <p className="text-small text-default-500">
                  This action cannot be undone. All your data will be
                  permanently deleted.
                </p>
              </CardHeader>
              <Divider />
              <CardBody className="space-y-5 px-4 md:px-6">
                <Input
                  label="Confirm by typing your email"
                  placeholder="Enter your email to confirm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  color="danger"
                  startContent={<Trash2 size={16} className="text-danger" />}
                  classNames={{
                    inputWrapper: "h-12",
                  }}
                />
                <div className="flex justify-end">
                  <Button
                    color="danger"
                    onPress={onOpen}
                    isDisabled={deleteConfirm !== userProfile?.email}
                    className="h-10 w-full sm:w-auto"
                  >
                    Delete My Account
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>
        <Tab
          key="preferences"
          title={
            <div className="flex items-center gap-2">
              <Settings size={16} />
              <span>Preferences</span>
            </div>
          }
        >
          {/* Preferences content goes directly inside the Tab */}
          <div className="space-y-6 w-full py-3">
            {/* Display Preferences Card */}
            <Card className="shadow-sm hover:shadow transition-shadow">
              <CardHeader className="flex flex-col items-start">
                <h3 className="text-lg font-bold">Display Preferences</h3>
              </CardHeader>
              <Divider />
              <CardBody className="space-y-8 px-4 md:px-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="space-y-1">
                    <p className="font-medium">Weight Units</p>
                    <p className="text-sm text-gray-500">
                      Choose between metric (kg) and imperial (lbs)
                    </p>
                  </div>
                  <Switch
                    size="lg"
                    color="primary"
                    startContent={<span className="text-sm">lbs</span>}
                    endContent={<span className="text-sm">kg</span>}
                    isSelected={preferences.useMetric}
                    onValueChange={(isSelected) =>
                      setPreferences({ ...preferences, useMetric: isSelected })
                    }
                    thumbIcon={({ isSelected, className }) =>
                      isSelected ? (
                        <Weight className={className} size={14} />
                      ) : (
                        <Weight className={className} size={14} />
                      )
                    }
                    className="self-start sm:self-center"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="space-y-1">
                    <p className="font-medium">Theme</p>
                    <p className="text-sm text-gray-500">
                      Choose between light and dark mode
                    </p>
                  </div>
                  <Switch
                    size="lg"
                    color="primary"
                    startContent={<Sun size={18} />}
                    endContent={<Moon size={18} />}
                    isSelected={preferences.useDarkMode}
                    onValueChange={(isSelected) => {
                      // Apply theme change immediately
                      setTheme(isSelected ? "dark" : "light");
                      // Then update preferences state
                      setPreferences({
                        ...preferences,
                        useDarkMode: isSelected,
                      });

                      // Add a subtle toast notification
                      toast.success(
                        `${isSelected ? "Dark" : "Light"} theme activated`,
                        {
                          duration: 2000,
                          icon: isSelected ? (
                            <Moon size={16} />
                          ) : (
                            <Sun size={16} />
                          ),
                        }
                      );
                    }}
                    className="self-start sm:self-center"
                  />
                </div>
              </CardBody>
            </Card>

            {/* Workout Preferences Card */}
            <Card className="shadow-sm hover:shadow transition-shadow">
              <CardHeader className="flex flex-col items-start">
                <h3 className="text-lg font-bold">Workout Preferences</h3>
              </CardHeader>
              <Divider />
              <CardBody className="space-y-8 px-4 md:px-6">
                <div className="flex flex-col space-y-2">
                  <p className="font-medium">Workout Time Estimation</p>
                  <p className="text-sm text-gray-500 mb-2">
                    Set your typical rest duration between sets. This helps
                    calculate more accurate workout time estimates.
                  </p>
                  <Select
                    label="Rest Duration"
                    selectedKeys={[preferences.defaultRestTimer.toString()]}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        defaultRestTimer: parseInt(e.target.value),
                      })
                    }
                    startContent={
                      <Clock size={16} className="text-default-400" />
                    }
                    classNames={{
                      trigger: "h-12",
                      value: "text-base",
                    }}
                    className="max-w-md"
                  >
                    <SelectItem key="30" value="30">
                      30 seconds
                    </SelectItem>
                    <SelectItem key="45" value="45">
                      45 seconds
                    </SelectItem>
                    <SelectItem key="60" value="60">
                      60 seconds
                    </SelectItem>
                    <SelectItem key="90" value="90">
                      90 seconds
                    </SelectItem>
                    <SelectItem key="120" value="120">
                      2 minutes
                    </SelectItem>
                    <SelectItem key="180" value="180">
                      3 minutes
                    </SelectItem>
                  </Select>
                </div>
              </CardBody>
            </Card>

            {/* Save Button - Better positioning for mobile */}
            <div className="flex justify-end sticky bottom-4 pt-2">
              <Button
                color="primary"
                isLoading={isSaving}
                onPress={savePreferences}
                startContent={<Save size={16} />}
                className="w-full sm:w-auto h-12 shadow-md"
                size="lg"
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </Tab>
      </Tabs>

      {/* Add global styles for animations and mobile optimizations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
