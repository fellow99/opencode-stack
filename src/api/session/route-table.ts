export interface SessionRoute {
  sessionID: string;
  connectorID: string;
  createdAt: number;
}

export class SessionRouteTable {
  private readonly routes = new Map<string, SessionRoute>();

  public register(sessionID: string, connectorID: string): void {
    this.routes.set(sessionID, {
      sessionID,
      connectorID,
      createdAt: Date.now(),
    });
  }

  public lookup(sessionID: string): string | undefined {
    return this.routes.get(sessionID)?.connectorID;
  }

  public clear(sessionID: string): void {
    this.routes.delete(sessionID);
  }

  public getAll(): SessionRoute[] {
    return Array.from(this.routes.values());
  }
}
