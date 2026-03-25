import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { ago } from "../lib/format";
import { useSocket } from "../context/SocketContext";
export const NotificationBell = () => {
    const { socket } = useSocket();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    useEffect(() => {
        const load = async () => {
            const response = await api.get("/notifications", { params: { take: 20 } });
            setItems(response.data.data.items);
            setUnreadCount(response.data.data.unreadCount);
        };
        load().catch(() => undefined);
    }, []);
    useEffect(() => {
        if (!socket) {
            return;
        }
        const onCount = (payload) => setUnreadCount(payload.unreadCount);
        const onCreated = (notification) => {
            setItems((current) => [notification, ...current].slice(0, 20));
        };
        socket.on("notifications:count", onCount);
        socket.on("notifications:new", onCreated);
        return () => {
            socket.off("notifications:count", onCount);
            socket.off("notifications:new", onCreated);
        };
    }, [socket]);
    const markRead = async (id) => {
        await api.patch(`/notifications/${id}/read`);
        setItems((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    };
    const markAll = async () => {
        await api.patch("/notifications/read-all");
        setItems((current) => current.map((item) => ({ ...item, isRead: true })));
        setUnreadCount(0);
    };
    const unreadItems = useMemo(() => items.filter((item) => !item.isRead), [items]);
    return (_jsxs("div", { className: "notif-wrap", children: [_jsxs("button", { className: "notif-btn", type: "button", onClick: () => setOpen((state) => !state), children: ["Notifications", unreadCount > 0 ? _jsx("span", { className: "notif-badge", children: unreadCount }) : null] }), open ? (_jsxs("div", { className: "notif-dropdown", children: [_jsxs("div", { className: "notif-head", children: [_jsx("strong", { children: "Inbox" }), _jsx("button", { type: "button", onClick: markAll, disabled: unreadCount === 0, children: "Mark all" })] }), _jsxs("ul", { children: [items.length === 0 ? _jsx("li", { className: "empty", children: "No notifications" }) : null, items.map((item) => (_jsxs("li", { className: item.isRead ? "read" : "unread", children: [_jsx("p", { children: item.message }), _jsx("small", { children: ago(item.createdAt) }), !item.isRead ? (_jsx("button", { type: "button", onClick: () => markRead(item.id), children: "Mark read" })) : null] }, item.id)))] }), unreadItems.length === 0 ? _jsx("small", { className: "all-clear", children: "All clear" }) : null] })) : null] }));
};
