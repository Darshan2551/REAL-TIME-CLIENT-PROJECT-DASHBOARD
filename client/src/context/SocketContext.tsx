import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

type SocketContextValue = {
  socket: Socket | null;
};

const SocketContext = createContext<SocketContextValue | null>(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

export const SocketProvider = ({ children }: PropsWithChildren) => {
  const { accessToken, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!accessToken || !user) {
      socket?.disconnect();
      setSocket(null);
      return;
    }

    const nextSocket = io(SOCKET_URL, {
      autoConnect: true,
      auth: {
        token: accessToken
      }
    });

    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
      setSocket(null);
    };
  }, [accessToken, user]);

  const value = useMemo(
    () => ({
      socket
    }),
    [socket]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used inside SocketProvider");
  }

  return context;
};
