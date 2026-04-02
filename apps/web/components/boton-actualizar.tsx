"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { Button } from "@dispatch-track/ui";

interface Props {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}

export function BotonActualizar({ onClick, disabled }: Props) {
  const [girando, setGirando] = useState(false);

  async function manejarClick() {
    if (girando || disabled) return;
    setGirando(true);
    try {
      await onClick();
    } finally {
      // Mínimo 600ms para que la animación se vea completa
      setTimeout(() => setGirando(false), 600);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={manejarClick} disabled={disabled}>
      <motion.span
        animate={girando ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ display: "inline-flex" }}
      >
        <RefreshCw size={14} />
      </motion.span>
      <span className="ml-1">Actualizar</span>
    </Button>
  );
}
