import { Injectable } from '@nestjs/common';
import { ReportsService } from '../reports/reports.service';
import { TenantContext } from '../common/tenant-context';

const AGENTS = [
  { id: 'sales-summary', name: 'Sales summary', description: 'Returns last period sales summary' },
  { id: 'health-score', name: 'Health score', description: 'Returns business health score 1–10' },
  { id: 'payment-reminder', name: 'Payment reminder', description: 'Suggests payment reminder message' },
];

@Injectable()
export class AiService {
  constructor(private readonly reportsService: ReportsService) {}

  async getBusinessSummary(ctx: TenantContext, period?: string): Promise<{ summary: string; data?: Record<string, unknown> }> {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const sales = await this.reportsService.getSalesSummary(ctx, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10));
    const health = await this.reportsService.getBusinessHealthScore(ctx);
    const summary = `Last month: Invoiced ₹${sales.totalInvoiced.toFixed(2)}, Received ₹${sales.totalReceived.toFixed(2)}, Pending ₹${sales.totalPending.toFixed(2)}. Health score: ${health.score}/10 — ${health.message}`;
    return { summary, data: { sales: sales.totalInvoiced, received: sales.totalReceived, pending: sales.totalPending, health_score: health.score } };
  }

  async listAgents(): Promise<{ id: string; name: string; description: string }[]> {
    return AGENTS;
  }

  async invokeAgent(agentId: string, ctx: TenantContext, params?: Record<string, string>): Promise<{ result: string; agent: string }> {
    if (agentId === 'sales-summary') {
      const s = await this.getBusinessSummary(ctx, params?.period);
      return { agent: agentId, result: s.summary };
    }
    if (agentId === 'health-score') {
      const h = await this.reportsService.getBusinessHealthScore(ctx);
      return { agent: agentId, result: `Health score: ${h.score}/10. ${h.message}` };
    }
    if (agentId === 'payment-reminder') {
      return { agent: agentId, result: 'Payment reminder: Integrate with WhatsApp to send template message to customers with pending invoices.' };
    }
    return { agent: agentId, result: 'Unknown agent. Use sales-summary, health-score, or payment-reminder.' };
  }
}
