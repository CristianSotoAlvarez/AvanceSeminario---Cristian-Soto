"use client";

import { useEffect } from "react";
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
