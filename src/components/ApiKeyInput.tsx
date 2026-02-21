import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, Loader2, Eye, EyeOff } from "lucide-react";
import { saveApiKey, getApiKey } from "@/lib/storage";
import { validateApiKey } from "@/lib/mistral";

interface ApiKeyInputProps {
  onKeySet: () => void;
}

const ApiKeyInput = ({ onKeySet }: ApiKeyInputProps) => {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = async () => {
    if (!key.trim()) return;
    setLoading(true);
    setError("");

    const valid = await validateApiKey(key.trim());
    if (valid) {
      saveApiKey(key.trim());
      onKeySet();
    } else {
      setError("Invalid API key. Please check and try again.");
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 p-6 max-w-md mx-auto"
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Key className="w-8 h-8 text-primary" />
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-display font-bold text-foreground">
          Enter your Mistral API Key
        </h2>
        <p className="text-muted-foreground text-sm">
          Your key is encrypted and stored locally on your device. Never sent anywhere except Mistral's API.
        </p>
      </div>

      <div className="w-full space-y-3">
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-4 py-3 pr-12 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-destructive text-sm"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          onClick={handleSubmit}
          disabled={loading || !key.trim()}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Validating...
            </>
          ) : (
            "Continue"
          )}
        </button>
      </div>

      <a
        href="https://console.mistral.ai/api-keys/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary hover:underline"
      >
        Get a Mistral API key →
      </a>
    </motion.div>
  );
};

export default ApiKeyInput;
