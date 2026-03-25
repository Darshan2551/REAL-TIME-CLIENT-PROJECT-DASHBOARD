import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";
export const SocketProvider = ({ children }) => {
    const { accessToken, user } = useAuth();
    const [socket, setSocket] = useState(null);
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
    const value = useMemo(() => ({
        socket
    }), [socket]);
    return _jsx(SocketContext.Provider, { value: value, children: children });
};
export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket must be used inside SocketProvider");
    }
    return context;
};
