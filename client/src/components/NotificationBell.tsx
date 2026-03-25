import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { ago } from "../lib/format";
import type { Notification } from "../types/models";
import { useSocket } from "../context/SocketContext";

export const NotificationBell = () => {
  const { socket } = useSocket();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
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

    const onCount = (payload: { unreadCount: number }) => setUnreadCount(payload.unreadCount);

    const onCreated = (notification: Notification) => {
      setItems((current) => [notification, ...current].slice(0, 20));
    };

    socket.on("notifications:count", onCount);
    socket.on("notifications:new", onCreated);

    return () => {
      socket.off("notifications:count", onCount);
      socket.off("notifications:new", onCreated);
    };
  }, [socket]);

  const markRead = async (id: number) => {
    await api.patch(`/notifications/${id}/read`);
    setItems((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
  };

  const markAll = async () => {
    await api.patch("/notifications/read-all");
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  };

  const unreadItems = useMemo(() => items.filter((item) => !item.isRead), [items]);

  return (
    <div className="notif-wrap">
      <button className="notif-btn" type="button" onClick={() => setOpen((state) => !state)}>
        Notifications
        {unreadCount > 0 ? <span className="notif-badge">{unreadCount}</span> : null}
      </button>
      {open ? (
        <div className="notif-dropdown">
          <div className="notif-head">
            <strong>Inbox</strong>
            <button type="button" onClick={markAll} disabled={unreadCount === 0}>
              Mark all
            </button>
          </div>
          <ul>
            {items.length === 0 ? <li className="empty">No notifications</li> : null}
            {items.map((item) => (
              <li key={item.id} className={item.isRead ? "read" : "unread"}>
                <p>{item.message}</p>
                <small>{ago(item.createdAt)}</small>
                {!item.isRead ? (
                  <button type="button" onClick={() => markRead(item.id)}>
                    Mark read
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {unreadItems.length === 0 ? <small className="all-clear">All clear</small> : null}
        </div>
      ) : null}
    </div>
  );
};
