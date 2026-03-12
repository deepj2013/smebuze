'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';

const DEAL_STAGES = ['lead', 'quotation_sent', 'negotiation', 'order', 'won', 'lost'] as const;
const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  quotation_sent: 'Quotation sent',
  negotiation: 'Negotiation',
  order: 'Order',
  won: 'Won',
  lost: 'Lost',
};

interface Lead {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  deal_stage?: string;
  deal_value?: string | number | null;
  expected_close_date?: string | null;
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error: err } = await apiGet<Lead[] | { data: Lead[] }>('crm/leads');
    if (err) setError(err);
    else if (Array.isArray(data)) setLeads(data);
    else if (data && typeof data === 'object' && Array.isArray((data as { data?: Lead[] }).data)) setLeads((data as { data: Lead[] }).data);
    else setLeads([]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const byStage = DEAL_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage] || stage,
    leads: leads.filter((l) => (l.deal_stage || 'lead') === stage),
  }));

  const moveTo = async (leadId: string, newStage: string) => {
    setMovingId(leadId);
    setError(null);
    const { error: err } = await apiPatch(`crm/leads/${leadId}`, { deal_stage: newStage });
    setMovingId(null);
    if (err) setError(err);
    else load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Sales pipeline</h1>
        <Link href="/crm/leads/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Add lead</Link>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {byStage.map(({ stage, label, leads: stageLeads }) => (
            <div key={stage} className="flex-shrink-0 w-72 rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
              <div className="p-3 border-b border-slate-200 bg-white">
                <h2 className="font-medium text-slate-800">{label}</h2>
                <span className="text-xs text-slate-500">{stageLeads.length} lead{stageLeads.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="p-2 space-y-2 min-h-[120px]">
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <div className="font-medium text-slate-900">{lead.name}</div>
                    {lead.deal_value != null && Number(lead.deal_value) > 0 && (
                      <div className="text-sm text-slate-600 mt-0.5">₹{Number(lead.deal_value).toLocaleString()}</div>
                    )}
                    {lead.expected_close_date && (
                      <div className="text-xs text-slate-500 mt-0.5">Close: {String(lead.expected_close_date).slice(0, 10)}</div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <Link href={`/crm/leads/${lead.id}`} className="text-xs text-brand-600 hover:underline">View</Link>
                      <select
                        value={lead.deal_stage || 'lead'}
                        onChange={(e) => moveTo(lead.id, e.target.value)}
                        disabled={!!movingId}
                        className="text-xs rounded border border-slate-300 px-2 py-1"
                      >
                        {DEAL_STAGES.map((s) => (
                          <option key={s} value={s}>{STAGE_LABELS[s] || s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
