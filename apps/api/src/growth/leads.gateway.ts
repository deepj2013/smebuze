import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

type LeadLivePayload = {
  tenant_id: string;
  event_id: string;
  lead_id: string;
  source: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  message?: string | null;
  created_at: string;
};

@WebSocketGateway({
  namespace: '/leads',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class LeadsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(LeadsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwt.verify(token) as {
        sub: string;
        tenantId?: string | null;
        isSuperAdmin?: boolean;
      };
      client.data.userId = payload.sub;
      client.data.tenantId = payload.tenantId ?? null;
      client.data.isSuperAdmin = Boolean(payload.isSuperAdmin);
      if (payload.tenantId) {
        await client.join(this.room(payload.tenantId));
      }
      client.emit('connected', { ok: true, tenantId: payload.tenantId ?? null });
    } catch (err) {
      this.logger.warn(`WS auth failed: ${(err as Error).message}`);
      client.disconnect();
    }
  }

  @SubscribeMessage('subscribe')
  async subscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { tenantId?: string }) {
    const tid = body?.tenantId || client.data.tenantId;
    if (!tid) return { ok: false };
    if (!client.data.isSuperAdmin && client.data.tenantId !== tid) {
      return { ok: false, error: 'forbidden' };
    }
    await client.join(this.room(tid));
    return { ok: true, room: this.room(tid) };
  }

  emitLeadIngest(payload: LeadLivePayload) {
    if (!this.server || !payload.tenant_id) return;
    this.server.to(this.room(payload.tenant_id)).emit('lead.ingest', payload);
  }

  private room(tenantId: string) {
    return `tenant:${tenantId}`;
  }
}
