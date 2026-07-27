import { motion } from "framer-motion";
import { Construction } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";

interface ComingSoonPageProps {
  moduleName: string;
}

export function ComingSoonPage({ moduleName }: ComingSoonPageProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="space-y-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center mx-auto">
          <Construction className="w-8 h-8 text-foreground/30" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{moduleName}</h2>
          <p className="text-sm text-foreground/65 mt-2">
            Este módulo está sendo construído. <br />
            Ele estará disponível na próxima etapa!
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate("/")}>
          Voltar ao Dashboard
        </Button>
      </motion.div>
    </div>
  );
}
