"use client";

import { useEstadoSocket } from "@/hooks/use-socket";
import { AnimatePresence, motion } from "motion/react";
import { WifiOff, Loader2 } from "lucide-react";

export function BannerConexion() {
  const estado = useEstadoSocket();
  const visible = estado !== "conectado";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div
            className="flex items-center justify-center gap-2 py-1.5 px-4"
            style={{
              background: estado === "reconectando" ? "#FEF3C7" : "#FFF1F2",
              borderBottom: `1px solid ${estado === "reconectando" ? "#FDE68A" : "#FECDD3"}`,
            }}
          >
            {estado === "reconectando" ? (
              <Loader2 size={12} className="animate-spin" style={{ color: "#B45309" }} />
            ) : (
              <WifiOff size={12} style={{ color: "#DC2626" }} />
            )}
            <span
              className="font-display text-[11px] font-semibold"
              style={{ color: estado === "reconectando" ? "#B45309" : "#DC2626" }}
            >
              {estado === "reconectando"
                ? "Reconectando al servidor en tiempo real..."
                : "Sin conexión — los datos pueden estar desactualizados"}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
