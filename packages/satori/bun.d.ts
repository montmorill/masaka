/** Bun.serve 最小类型声明（仅声明 SatoriServer 用到的成员） */
interface BunServer {
  port: number
  pendingWebSockets: number
  upgrade(req: Request, options?: { data?: unknown, headers?: Record<string, string> }): boolean
  stop(closeActiveConnections?: boolean): void
}

interface BunWebSocket {
  data: unknown
  readyState: number
  send(data: string | ArrayBuffer): number
  close(code?: number, reason?: string): void
}

interface BunServeOptions {
  port?: number
  hostname?: string
  fetch(req: Request, server: BunServer): Response | Promise<Response | undefined> | undefined
  websocket?: {
    open?(ws: BunWebSocket): void
    message?(ws: BunWebSocket, message: string | ArrayBuffer): void
    close?(ws: BunWebSocket, code: number, reason: string): void
  }
}

declare const Bun: {
  serve(options: BunServeOptions): BunServer
}
