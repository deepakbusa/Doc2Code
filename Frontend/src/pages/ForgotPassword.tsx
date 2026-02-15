import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Code2, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

const ForgotPassword = () => {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="orb w-[500px] h-[500px] -top-40 left-1/3 bg-purple-600/12" />
      <div className="orb w-[350px] h-[350px] -bottom-24 -right-24 bg-cyan-500/10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[400px] relative"
      >
        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 shadow-2xl shadow-black/10">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
              <div className="h-9 w-9 rounded-lg gradient-bg flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Code2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-foreground tracking-tight">
                Doc2Code
              </span>
            </Link>
            <h1 className="text-xl font-semibold text-foreground">
              Reset your password
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              We&apos;ll send you a reset link
            </p>
          </div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <p className="text-sm text-muted-foreground">
                Check your inbox for a password reset link.
              </p>
              <Link to="/login">
                <Button
                  variant="outline"
                  className="mt-4 border-border/60 hover:border-primary/40"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to login
                </Button>
              </Link>
            </motion.div>
          ) : (
            <>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...register("email")}
                    className="h-11 bg-background/50 border-border/60 focus:border-primary/50"
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">
                      {String(errors.email.message)}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 gradient-bg text-white border-0 hover:opacity-90 shadow-lg shadow-purple-500/20 transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-6">
                <Link
                  to="/login"
                  className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
