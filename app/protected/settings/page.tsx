"use client";

import PageTitle from "@/components/ui/page-title";
import { createClient } from "@/utils/supabase/client";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Switch,
  Tab,
  Tabs,
  useDisclosure,
} from "@nextui-org/react";
import {
  AlertTriangle,
  Bell,
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
  useMetric: true, // kg by default
  useDarkMode: false,
  enableNotifications: true,
  defaultRestTimer: 60, // seconds
  enableSounds: true,
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
          useDarkMode: prefsData.use_dark_mode,
          enableNotifications: prefsData.enable_notifications,
          defaultRestTimer: prefsData.default_rest_timer,
          enableSounds: prefsData.enable_sounds,
        });
      } else {
        // Create default preferences if none exists
        await supabase.from("user_preferences").insert({
          user_id: user.id,
          use_metric: DEFAULT_PREFERENCES.useMetric,
          use_dark_mode: DEFAULT_PREFERENCES.useDarkMode,
          enable_notifications: DEFAULT_PREFERENCES.enableNotifications,
          default_rest_timer: DEFAULT_PREFERENCES.defaultRestTimer,
          enable_sounds: DEFAULT_PREFERENCES.enableSounds,
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Save preferences
  const savePreferences = async () => {
    try {
      setIsSaving(true);

      const { error } = await supabase
        .from("user_preferences")
        .update({
          use_metric: preferences.useMetric,
          use_dark_mode: preferences.useDarkMode,
          enable_notifications: preferences.enableNotifications,
          default_rest_timer: preferences.defaultRestTimer,
          enable_sounds: preferences.enableSounds,
        })
        .eq("user_id", userProfile.id);

      if (error) throw error;

      toast.success("Preferences saved successfully");

      // Apply dark mode if changed
      if (preferences.useDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
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

      const { error } = await supabase.auth.updateUser({ email: newEmail });

      if (error) throw error;

      toast.success("Verification email sent. Please check your inbox.");
      setNewEmail("");
    } catch (error: any) {
      console.error("Error updating email:", error);
      toast.error(error.message || "Failed to update email");
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
        toast.error("Passwords don't match");
        return;
      }

      // First verify the current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: currentPassword,
      });

      if (signInError) {
        toast.error("Current password is incorrect");
        return;
      }

      // Then update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete account
  const deleteAccount = async () => {
    try {
      if (deleteConfirm !== userProfile.email) {
        toast.error("Email confirmation doesn't match");
        return;
      }

      // Delete user data first (you might want to handle this differently)
      await supabase
        .from("user_preferences")
        .delete()
        .eq("user_id", userProfile.id);

      // Delete the user account
      const { error } = await supabase.auth.admin.deleteUser(userProfile.id);

      if (error) throw error;

      // Sign out after deletion
      await supabase.auth.signOut();
      toast.success("Account deleted successfully");
      router.push("/sign-in");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error.message || "Failed to delete account");
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <PageTitle title="Settings" />

      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
        aria-label="Settings"
        color="primary"
        variant="underlined"
        classNames={{
          tabList: "gap-6",
        }}
      >
        <Tab
          key="account"
          title={
            <div className="flex items-center gap-2">
              <User size={18} />
              <span>Account</span>
            </div>
          }
        />
        <Tab
          key="preferences"
          title={
            <div className="flex items-center gap-2">
              <Settings size={18} />
              <span>Preferences</span>
            </div>
          }
        />
      </Tabs>

      {/* Account Settings */}
      {activeTab === "account" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col items-start">
              <h3 className="text-lg font-bold">Profile Information</h3>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-6">
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium">{userProfile?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Account Created</p>
                <p className="font-medium">
                  {userProfile?.created_at
                    ? new Date(userProfile.created_at).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  color="danger"
                  variant="light"
                  startContent={<LogOut size={18} />}
                  onPress={signOut}
                >
                  Sign Out
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex flex-col items-start">
              <h3 className="text-lg font-bold">Update Email</h3>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-4">
              <Input
                label="New Email Address"
                placeholder="Enter your new email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                startContent={<Mail size={18} className="text-default-400" />}
              />
              <div className="flex justify-end">
                <Button
                  color="primary"
                  isLoading={isSaving}
                  startContent={<Save size={18} />}
                  onPress={updateEmail}
                >
                  Update Email
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex flex-col items-start">
              <h3 className="text-lg font-bold">Change Password</h3>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-4">
              <Input
                label="Current Password"
                placeholder="Enter your current password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                startContent={<Key size={18} className="text-default-400" />}
              />
              <Input
                label="New Password"
                placeholder="Enter your new password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                label="Confirm New Password"
                placeholder="Confirm your new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  color="primary"
                  isLoading={isSaving}
                  startContent={<Save size={18} />}
                  onPress={updatePassword}
                >
                  Update Password
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card className="border-danger-300">
            <CardHeader className="flex flex-col items-start">
              <div className="flex items-center gap-2 text-danger">
                <AlertTriangle size={18} />
                <h3 className="text-lg font-bold">Delete Account</h3>
              </div>
              <p className="text-small text-default-500">
                This action cannot be undone. All your data will be permanently
                deleted.
              </p>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-4">
              <Input
                label="Confirm by typing your email"
                placeholder="Enter your email to confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                color="danger"
                startContent={<Trash2 size={18} className="text-danger" />}
              />
              <div className="flex justify-end">
                <Button
                  color="danger"
                  onPress={onOpen}
                  isDisabled={deleteConfirm !== userProfile?.email}
                >
                  Delete My Account
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Delete Account Confirmation Modal */}
          <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1">
                    Confirm Account Deletion
                  </ModalHeader>
                  <ModalBody>
                    <p>
                      Are you sure you want to permanently delete your account?
                      This action cannot be undone.
                    </p>
                    <p className="text-danger font-medium">
                      All your workout history, exercises, and preferences will
                      be lost.
                    </p>
                  </ModalBody>
                  <ModalFooter>
                    <Button color="default" variant="flat" onPress={onClose}>
                      Cancel
                    </Button>
                    <Button
                      color="danger"
                      onPress={() => {
                        deleteAccount();
                        onClose();
                      }}
                    >
                      Confirm Delete
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>
        </div>
      )}

      {/* Preferences */}
      {activeTab === "preferences" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col items-start">
              <h3 className="text-lg font-bold">Display Preferences</h3>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-6">
              <div className="flex justify-between items-center">
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
                />
              </div>

              <div className="flex justify-between items-center">
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
                  onValueChange={(isSelected) =>
                    setPreferences({ ...preferences, useDarkMode: isSelected })
                  }
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex flex-col items-start">
              <h3 className="text-lg font-bold">Workout Preferences</h3>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="font-medium">Notifications</p>
                  <p className="text-sm text-gray-500">
                    Enable notifications for workouts and reminders
                  </p>
                </div>
                <Switch
                  size="lg"
                  color="primary"
                  isSelected={preferences.enableNotifications}
                  onValueChange={(isSelected) =>
                    setPreferences({
                      ...preferences,
                      enableNotifications: isSelected,
                    })
                  }
                  thumbIcon={({ isSelected, className }) => (
                    <Bell className={className} size={14} />
                  )}
                />
              </div>

              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="font-medium">Sound Effects</p>
                  <p className="text-sm text-gray-500">
                    Enable sounds for timers and actions
                  </p>
                </div>
                <Switch
                  size="lg"
                  color="primary"
                  isSelected={preferences.enableSounds}
                  onValueChange={(isSelected) =>
                    setPreferences({ ...preferences, enableSounds: isSelected })
                  }
                />
              </div>

              <div className="flex flex-col space-y-2">
                <p className="font-medium">Default Rest Timer</p>
                <p className="text-sm text-gray-500 mb-2">
                  Set the default duration for rest intervals
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
                    <Clock size={18} className="text-default-400" />
                  }
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

          <div className="flex justify-end">
            <Button
              color="primary"
              isLoading={isSaving}
              onPress={savePreferences}
              startContent={<Save size={18} />}
            >
              Save Preferences
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
