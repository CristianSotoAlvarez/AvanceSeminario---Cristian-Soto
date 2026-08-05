"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1").replace(
    "/api/v1",
    "",
  );

let socketSingleton: Socket | null = null;

function obtenerSocket(): Socket {
  if (!socketSingleton) {
    socketSingleton = io(`${SOCKET_URL}/eventos`, {
      withCredentials: true,
      autoConnect: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });
  }
  return socketSingleton;
}

/** Escucha eventos 'camion:actualizado' y llama al callback */
export function useSocketCamiones(onActualizado: () => void) {
  useEffect(() => {
    const socket = obtenerSocket();
    socket.on("camion:actualizado", onActualizado);
    return () => {
      socket.off("camion:actualizado", onActualizado);
    };
  }, [onActualizado]);
}

/** Escucha eventos 'andenes:actualizados' y llama al callback */
export function useSocketAndenes(onActualizado: () => void) {
  useEffect(() => {
    const socket = obtenerSocket();
    socket.on("andenes:actualizados", onActualizado);
    socket.on("camion:actualizado", onActualizado);
    return () => {
      socket.off("andenes:actualizados", onActualizado);
      socket.off("camion:actualizado", onActualizado);
    };
  }, [onActualizado]);
}

/** Escucha eventos 'tuneles:actualizados' y llama al callback */
export function useSocketTuneles(onActualizado: () => void) {
  useEffect(() => {
    const socket = obtenerSocket();
    socket.on("tuneles:actualizados", onActualizado);
    socket.on("camion:actualizado", onActualizado);
    return () => {
      socket.off("tuneles:actualizados", onActualizado);
      socket.off("camion:actualizado", onActualizado);
    };
  }, [onActualizado]);
}

export type EstadoConexion = "conectado" | "desconectado" | "reconectando";

/** Expone el estado de conexión del socket en tiempo real */
export function useEstadoSocket(): EstadoConexion {
  const [estado, setEstado] = useState<EstadoConexion>("conectado");

  useEffect(() => {
    const socket = obtenerSocket();

    function alConectar()      { setEstado("conectado"); }
    function alDesconectar()   { setEstado("desconectado"); }
    function alReconectar()    { setEstado("reconectando"); }

    // Estado inicial
    setEstado(socket.connected ? "conectado" : "desconectado");

    socket.on("connect",            alConectar);
    socket.on("disconnect",         alDesconectar);
    socket.on("reconnect_attempt",  alReconectar);
    socket.on("reconnect",          alConectar);

    return () => {
      socket.off("connect",           alConectar);
      socket.off("disconnect",        alDesconectar);
      socket.off("reconnect_attempt", alReconectar);
      socket.off("reconnect",         alConectar);
    };
  }, []);

  return estado;
}
