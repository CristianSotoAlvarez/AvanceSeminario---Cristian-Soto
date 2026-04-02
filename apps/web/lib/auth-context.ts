import { createContext } from "react";
import type { UsuarioAuth } from "@/lib/api";

export const AuthContext = createContext<{ usuario: UsuarioAuth | null }>({ usuario: null });
