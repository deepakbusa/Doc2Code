import { useState } from "react";
import { motion } from "framer-motion";
import { TopNav } from "@/components/TopNav";
import { useAuthStore } from "@/stores/authStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    User,
    Lock,
    Key,
    Crown,
    Zap,
    Sparkles,
    Copy,
    RefreshCw,
    Shield,
    Trash2,
    AlertTriangle,
    Loader2,
    Eye,
    EyeOff,
    Check,
} from "lucide-react";

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

const Settings = () => {
    const { user, updateProfile, changePassword } = useAuthStore();
    const [isUpdating, setIsUpdating] = useState(false);
    const [isChangingPw, setIsChangingPw] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [apiKeyCopied, setApiKeyCopied] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState("");

    const mockApiKey = "dc2_live_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";

    const profileForm = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: { name: user?.name || "", email: user?.email || "" },
    });

    const passwordForm = useForm({
        resolver: zodResolver(passwordSchema),
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

    const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
        setIsUpdating(true);
        try {
            await updateProfile(data);
            toast.success("Profile updated successfully");
        } catch (err: any) {
            toast.error(err.message || "Failed to update profile");
        } finally {
            setIsUpdating(false);
        }
    };

    const onPasswordSubmit = async (data: z.infer<typeof passwordSchema>) => {
        setIsChangingPw(true);
        try {
            await changePassword(data.currentPassword, data.newPassword);
            toast.success("Password changed successfully");
            passwordForm.reset();
        } catch (err: any) {
            toast.error(err.message || "Failed to change password");
        } finally {
            setIsChangingPw(false);
        }
    };

    const copyApiKey = () => {
        navigator.clipboard.writeText(mockApiKey);
        setApiKeyCopied(true);
        toast.success("API key copied to clipboard");
        setTimeout(() => setApiKeyCopied(false), 2000);
    };

    const cardClass = "rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 shadow-lg shadow-black/5";

    return (
        <>
            <TopNav title="Settings" />
            <main className="flex-1 p-6 max-w-3xl mx-auto w-full overflow-y-auto">
                <Tabs defaultValue="profile" className="space-y-6">
                    <TabsList className="bg-muted/50 border border-border/40 p-1 h-auto">
                        <TabsTrigger value="profile" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm px-4 py-2 gap-2">
                            <User className="h-4 w-4" /> Profile
                        </TabsTrigger>
                        <TabsTrigger value="security" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm px-4 py-2 gap-2">
                            <Lock className="h-4 w-4" /> Security
                        </TabsTrigger>
                        <TabsTrigger value="api" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm px-4 py-2 gap-2">
                            <Key className="h-4 w-4" /> API Keys
                        </TabsTrigger>
                    </TabsList>

                    {/* Profile Tab */}
                    <TabsContent value="profile">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <div className={cardClass}>
                                <h3 className="text-base font-semibold text-foreground mb-1">Profile Information</h3>
                                <p className="text-sm text-muted-foreground mb-5">Update your personal details</p>
                                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Full Name</Label>
                                            <Input
                                                {...profileForm.register("name")}
                                                className="h-11 bg-background/50 border-border/60 focus:border-primary/50"
                                            />
                                            {profileForm.formState.errors.name && (
                                                <p className="text-xs text-destructive">{profileForm.formState.errors.name.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Email Address</Label>
                                            <Input
                                                {...profileForm.register("email")}
                                                className="h-11 bg-background/50 border-border/60 focus:border-primary/50"
                                            />
                                            {profileForm.formState.errors.email && (
                                                <p className="text-xs text-destructive">{profileForm.formState.errors.email.message}</p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="gradient-bg text-white border-0 hover:opacity-90 shadow-md shadow-purple-500/15"
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Save Changes
                                    </Button>
                                </form>
                            </div>
                        </motion.div>
                    </TabsContent>

                    {/* Security Tab */}
                    <TabsContent value="security">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <div className={cardClass}>
                                <div className="flex items-center gap-2 mb-1">
                                    <Shield className="h-4 w-4 text-primary" />
                                    <h3 className="text-base font-semibold text-foreground">Change Password</h3>
                                </div>
                                <p className="text-sm text-muted-foreground mb-5">Ensure your account stays secure</p>
                                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Current Password</Label>
                                        <Input
                                            type="password"
                                            {...passwordForm.register("currentPassword")}
                                            className="h-11 bg-background/50 border-border/60 focus:border-primary/50"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>New Password</Label>
                                            <Input
                                                type="password"
                                                {...passwordForm.register("newPassword")}
                                                className="h-11 bg-background/50 border-border/60 focus:border-primary/50"
                                            />
                                            {passwordForm.formState.errors.newPassword && (
                                                <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Confirm Password</Label>
                                            <Input
                                                type="password"
                                                {...passwordForm.register("confirmPassword")}
                                                className="h-11 bg-background/50 border-border/60 focus:border-primary/50"
                                            />
                                            {passwordForm.formState.errors.confirmPassword && (
                                                <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="gradient-bg text-white border-0 hover:opacity-90"
                                        disabled={isChangingPw}
                                    >
                                        {isChangingPw ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Update Password
                                    </Button>
                                </form>
                            </div>

                            {/* Danger Zone */}
                            <Separator className="border-border/30" />
                            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                    <h3 className="text-base font-semibold text-destructive">Danger Zone</h3>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Once you delete your account, there is no going back. Please be certain.
                                </p>
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label className="text-sm text-muted-foreground">
                                            Type <span className="font-mono font-bold text-destructive">delete my account</span> to confirm
                                        </Label>
                                        <Input
                                            value={deleteConfirm}
                                            onChange={(e) => setDeleteConfirm(e.target.value)}
                                            placeholder="delete my account"
                                            className="h-11 bg-background/50 border-destructive/30 focus:border-destructive/50 max-w-sm"
                                        />
                                    </div>
                                    <Button
                                        variant="destructive"
                                        disabled={deleteConfirm !== "delete my account"}
                                        className="shadow-md"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Account Permanently
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </TabsContent>

                    {/* API Keys Tab */}
                    <TabsContent value="api">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <div className={cardClass}>
                                <div className="flex items-center gap-2 mb-1">
                                    <Key className="h-4 w-4 text-primary" />
                                    <h3 className="text-base font-semibold text-foreground">API Key</h3>
                                </div>
                                <p className="text-sm text-muted-foreground mb-5">
                                    Use this key to authenticate API requests
                                </p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 relative">
                                        <Input
                                            value={showApiKey ? mockApiKey : mockApiKey.replace(/./g, "•")}
                                            readOnly
                                            className="h-11 bg-background/50 border-border/60 font-mono text-sm pr-20"
                                        />
                                        <button
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                        >
                                            {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={copyApiKey}
                                        className="h-11 w-11 border-border/60 hover:border-primary/40"
                                    >
                                        {apiKeyCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-11 border-border/60 hover:border-primary/40 gap-2"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Regenerate
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground/70 mt-3">
                                    Keep your API key secret. Do not share it in public repositories or client-side code.
                                </p>
                            </div>
                        </motion.div>
                    </TabsContent>


                </Tabs>
            </main>
        </>
    );
};

export default Settings;
