class PresenceService {
  private connections = new Map<string, Set<string>>();

  addConnection(userId: string, socketId: string) {
    const sockets = this.connections.get(userId) ?? new Set<string>();
    sockets.add(socketId);
    this.connections.set(userId, sockets);
  }

  removeConnection(userId: string, socketId: string) {
    const sockets = this.connections.get(userId);

    if (!sockets) {
      return;
    }

    sockets.delete(socketId);

    if (sockets.size === 0) {
      this.connections.delete(userId);
      return;
    }

    this.connections.set(userId, sockets);
  }

  getOnlineUserCount() {
    return this.connections.size;
  }

  isOnline(userId: string) {
    return this.connections.has(userId);
  }
}

export const presenceService = new PresenceService();
