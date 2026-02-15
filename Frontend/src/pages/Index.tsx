import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Code2,
  Zap,
  FileCode,
  Globe,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Layers,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Globe,
    title: "Any Documentation",
    description:
      "Paste any API docs URL and we'll parse it automatically — Stripe, GitHub, Firebase, and more.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: FileCode,
    title: "Multi-Language",
    description:
      "Generate code in TypeScript, Python, Java, Go, Rust, and JavaScript with best practices built in.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description:
      "Production-ready code generated in seconds. No boilerplate, no manual translation.",
    color: "from-cyan-500 to-emerald-500",
  },
];

const stats = [
  { value: "6+", label: "Languages" },
  { value: "10K+", label: "Generations" },
  { value: "<3s", label: "Avg Speed" },
  { value: "99%", label: "Accuracy" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Floating orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="orb w-[600px] h-[600px] -top-48 -left-48 bg-purple-600/20" />
        <div className="orb w-[500px] h-[500px] top-1/3 -right-32 bg-blue-600/15" />
        <div className="orb w-[400px] h-[400px] bottom-0 left-1/3 bg-cyan-500/10" />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/60 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg gradient-bg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Code2 className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">
              Doc2Code
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button
                size="sm"
                className="gradient-bg text-white border-0 hover:opacity-90 shadow-lg shadow-purple-500/25 transition-all duration-300 hover:shadow-purple-500/40"
              >
                Get Started
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-24 px-6">
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-xs text-purple-300 mb-8 backdrop-blur-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Powered by AI
              <ChevronRight className="h-3 w-3" />
            </motion.div>

            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.1] mb-7">
              <span className="text-foreground">Turn Docs Into</span>
              <br />
              <span className="gradient-text">Production Code</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Paste any API documentation URL, describe what you need, and get
              clean, production-ready code instantly. Supports 6+ languages.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="h-13 px-10 text-base gradient-bg text-white border-0 hover:opacity-90 glow transition-all duration-300 hover:shadow-[0_0_60px_-12px_hsl(var(--primary)/0.6)]"
                >
                  Start Generating
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-13 px-10 text-base border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
                >
                  <Terminal className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Code preview mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
            className="mt-16 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/20 glow-accent"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-2">
                api-client.ts
              </span>
            </div>
            <div className="p-6 text-left font-mono text-sm leading-relaxed">
              <div className="text-purple-400">
                <span className="text-blue-400">import</span> axios{" "}
                <span className="text-blue-400">from</span>{" "}
                <span className="text-emerald-400">'axios'</span>;
              </div>
              <div className="mt-3 text-muted-foreground/60">
                {"// Auto-generated from Stripe API docs"}
              </div>
              <div className="text-purple-400 mt-1">
                <span className="text-blue-400">export class</span>{" "}
                <span className="text-cyan-400">StripeClient</span>{" "}
                <span className="text-muted-foreground">{"{"}</span>
              </div>
              <div className="pl-6 text-muted-foreground/70">
                <span className="text-blue-400">private</span> apiKey
                <span className="text-muted-foreground/40">:</span>{" "}
                <span className="text-cyan-400">string</span>;
              </div>
              <div className="pl-6 mt-2 text-purple-400">
                <span className="text-blue-400">async</span>{" "}
                <span className="text-yellow-400">listCustomers</span>
                <span className="text-muted-foreground/50">()</span>{" "}
                <span className="text-muted-foreground">{"{ ... }"}</span>
              </div>
              <div className="text-muted-foreground">{"}"}</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 px-6 border-y border-border/30">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <div className="text-3xl font-extrabold gradient-text">
                  {s.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 bg-card/50 text-xs text-muted-foreground mb-5">
              <Layers className="h-3 w-3 text-primary" />
              How it works
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Three steps to{" "}
              <span className="gradient-text">production code</span>
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Go from documentation to working code in under a minute
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-7 card-hover group relative overflow-hidden"
              >
                {/* Subtle gradient top edge */}
                <div
                  className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${f.color} opacity-0 group-hover:opacity-60 transition-opacity duration-500`}
                />

                <div
                  className={`h-11 w-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-lg`}
                >
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-base">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-12 relative overflow-hidden">
            <div className="orb w-[350px] h-[350px] -top-32 -right-32 bg-purple-600/15" />
            <div className="orb w-[250px] h-[250px] -bottom-20 -left-20 bg-cyan-500/10" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Ready to <span className="gradient-text">accelerate</span> your
                development?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Stop writing boilerplate. Start shipping production code in
                seconds.
              </p>
              <Link to="/signup">
                <Button
                  size="lg"
                  className="h-13 px-10 text-base gradient-bg text-white border-0 hover:opacity-90 glow transition-all"
                >
                  Get Started Free
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <div className="h-6 w-6 rounded-md gradient-bg flex items-center justify-center">
              <Code2 className="h-3.5 w-3.5 text-white" />
            </div>
            Doc2Code © 2026
          </div>
          <div className="text-xs text-muted-foreground/60">
            Built with AI
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
