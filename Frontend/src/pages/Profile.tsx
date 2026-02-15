import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TopNav } from "@/components/TopNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Crown, Zap, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Invalid email"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z.string().min(8, "Min 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuthStore();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || "", email: user?.email || "" },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    setIsUpdatingProfile(true);
    try {
      await updateProfile(data);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: z.infer<typeof passwordSchema>) => {
    setIsChangingPassword(true);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      toast.success("Password changed successfully");
      passwordForm.reset();
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const usagePercent = user
    ? (user.requestsUsed / user.requestsLimit) * 100
    : 0;

  return (
    <>
      <TopNav title="Profile" />
      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Plan & Usage */}
          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 relative overflow-hidden shadow-lg shadow-black/5">
            {/* Decorative gradient edge */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

            <div className="flex items-center gap-3 mb-5">
              <div className="h-11 w-11 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground capitalize flex items-center gap-2">
                  {user?.plan || "Free"} Plan
                  {user?.plan === "pro" && (
                    <Sparkles className="h-4 w-4 text-purple-400" />
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {user?.requestsUsed || 0} of {user?.requestsLimit || 0}{" "}
                  requests used
                </p>
              </div>
            </div>

            <div className="relative">
              <Progress value={usagePercent} className="h-2.5" />
              <div
                className="absolute top-0 h-2.5 rounded-full gradient-bg opacity-80 transition-all"
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-primary" />
                {(user?.requestsLimit || 0) - (user?.requestsUsed || 0)}{" "}
                remaining
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-border/60 hover:border-primary/40 hover:bg-primary/5"
              >
                Upgrade Plan
              </Button>
            </div>
          </div>

          {/* Profile Info */}
          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 shadow-lg shadow-black/5">
            <h3 className="font-semibold text-foreground mb-5">
              Profile Information
            </h3>
            <form
              onSubmit={profileForm.handleSubmit(onProfileSubmit)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  {...profileForm.register("name")}
                  className="h-11 bg-background/50 border-border/60 focus:border-primary/50"
                />
                {profileForm.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {profileForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  {...profileForm.register("email")}
                  className="h-11 bg-background/50 border-border/60 focus:border-primary/50"
                />
                {profileForm.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {profileForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                size="sm"
                className="gradient-bg text-white border-0 hover:opacity-90 shadow-md shadow-purple-500/15"
                disabled={isUpdatingProfile}
              >
                {isUpdatingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Changes
              </Button>
            </form>
          </div>

          <Separator className="border-border/30" />

          {/* Change Password */}
          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 shadow-lg shadow-black/5">
            <h3 className="font-semibold text-foreground mb-5">
              Change Password
            </h3>
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  {...passwordForm.register("currentPassword")}
                  className="h-11 bg-background/50 border-border/60 focus:border-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  {...passwordForm.register("newPassword")}
                  className="h-11 bg-background/50 border-border/60 focus:border-primary/50"
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  {...passwordForm.register("confirmPassword")}
                  className="h-11 bg-background/50 border-border/60 focus:border-primary/50"
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                size="sm"
                className="gradient-bg text-white border-0 hover:opacity-90 shadow-md shadow-purple-500/15"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Update Password
              </Button>
            </form>
          </div>
        </motion.div>
      </main>
    </>
  );
};

export default Profile;
