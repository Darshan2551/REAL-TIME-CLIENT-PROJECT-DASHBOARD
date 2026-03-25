import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { ago } from "../lib/format";
import { useSocket } from "../context/SocketContext";
const LAST_SEEN_KEY = "activity:lastSeenAt";
const uniqById = (items) => {
    const map = new Map();
    items.forEach((item) => {
        map.set(item.id, item);
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};
export const ActivityFeed = ({ projectId, title }) => {
    const { socket } = useSocket();
    const [items, setItems] = useState([]);
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
            const latest = latestResponse.data.data;
            const missed = missedResponse.data.data;
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
        const onActivity = (event) => {
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
    return (_jsxs("section", { className: "panel", children: [_jsx("div", { className: "panel-head", children: _jsx("h3", { children: title }) }), _jsxs("ul", { className: "activity-list", children: [visible.length === 0 ? _jsx("li", { className: "empty", children: "No activity yet" }) : null, visible.map((item) => (_jsxs("li", { children: [_jsx("p", { children: item.message }), _jsx("small", { children: ago(item.createdAt) })] }, item.id)))] })] }));
};
