import { motion } from "framer-motion";
import { SUPPORTED_LANGUAGES, LanguageCode } from "@/lib/types";

interface LanguageSelectorProps {
  onSelect: (code: LanguageCode) => void;
  selected?: LanguageCode | null;
}

const LanguageSelector = ({ onSelect, selected }: LanguageSelectorProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 p-6 max-w-lg mx-auto"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-display font-bold text-foreground">
          What language do you want to learn?
        </h2>
        <p className="text-muted-foreground text-sm">
          You can always switch later
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        {SUPPORTED_LANGUAGES.map((lang, i) => (
          <motion.button
            key={lang.code}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelect(lang.code)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
              selected === lang.code
                ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <span className="text-2xl">{lang.flag}</span>
            <span className="font-medium text-foreground text-sm">{lang.name}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default LanguageSelector;
