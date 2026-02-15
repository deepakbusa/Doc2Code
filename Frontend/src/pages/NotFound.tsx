import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Code2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      <div className="orb w-[500px] h-[500px] top-1/4 -left-32 bg-purple-600/10" />
      <div className="orb w-[400px] h-[400px] bottom-1/4 -right-32 bg-cyan-500/8" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center relative"
      >
        <div className="text-[120px] sm:text-[160px] font-black leading-none gradient-text opacity-80 select-none">
          404
        </div>
        <h1 className="text-xl font-semibold text-foreground mt-2 mb-2">
          Page not found
        </h1>
        <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button
            size="lg"
            className="gradient-bg text-white border-0 hover:opacity-90 shadow-lg shadow-purple-500/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground/50">
          <Code2 className="h-4 w-4" />
          Doc2Code
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
