import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { ago } from "../lib/format";
import type { ActivityItem } from "../types/models";
import { useSocket } from "../context/SocketContext";

type Props = {
  projectId?: number;
  title: string;
};

const LAST_SEEN_KEY = "activity:lastSeenAt";

const uniqById = (items: ActivityItem[]) => {
  const map = new Map<number, ActivityItem>();
  items.forEach((item) => {
    map.set(item.id, item);
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const ActivityFeed = ({ projectId, title }: Props) => {
  const { socket } = useSocket();
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const since = localStorage.getItem(LAST_SEEN_KEY);

      const [latestResponse, missedResponse] = await Promise.all([
        api.get("/activity/feed", {
          params: {
            take: 20,
            ...(projectId ? { projectId } : {})
          }
        }),
        since
          ? api.get("/activity/feed", {
              params: {
                take: 20,
                since,
                ...(projectId ? { projectId } : {})
              }
            })
          : Promise.resolve({ data: { data: [] } })
      ]);

      const latest = latestResponse.data.data as ActivityItem[];
      const missed = missedResponse.data.data as ActivityItem[];
      const merged = uniqById([...missed, ...latest]).slice(0, 20);
      setItems(merged);

      // keep last seen stamp so user can grab missed feed when reconnect happends
      const newest = merged[0]?.createdAt;
      if (newest) {
        localStorage.setItem(LAST_SEEN_KEY, newest);
      }
    };

    load().catch(() => undefined);
  }, [projectId]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    if (projectId) {
      socket.emit("project:join", projectId);
    }

    const onActivity = (event: ActivityItem) => {
      if (projectId && event.projectId !== projectId) {
        return;
      }

      setItems((current) => {
        const next = uniqById([event, ...current]).slice(0, 20);
        const newest = next[0]?.createdAt;
        if (newest) {
          localStorage.setItem(LAST_SEEN_KEY, newest);
        }
        return next;
      });
    };

    socket.on("activity:new", onActivity);

    return () => {
      socket.off("activity:new", onActivity);
      if (projectId) {
        socket.emit("project:leave", projectId);
      }
    };
  }, [socket, projectId]);

  const visible = useMemo(() => items.slice(0, 20), [items]);

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>{title}</h3>
      </div>
      <ul className="activity-list">
        {visible.length === 0 ? <li className="empty">No activity yet</li> : null}
        {visible.map((item) => (
          <li key={item.id}>
            <p>{item.message}</p>
            <small>{ago(item.createdAt)}</small>
          </li>
        ))}
      </ul>
    </section>
  );
};
