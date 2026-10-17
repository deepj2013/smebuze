'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost, getApiUrl, getToken } from '@/lib/api';

type BackupFile = { name: string; size_bytes: number; created_at: string };
type ListResponse = { dir: string; keep_days: number; files: BackupFile[] };

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function AdminBackupsPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await apiGet<ListResponse>('admin/database-backups');
    if (res.error) setError(res.error);
    else setData(res.data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createBackup() {
    setBusy(true);
    setError('');
    setMsg('');
    const res = await apiPost<BackupFile>('admin/database-backups', {});
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setMsg(`Created ${res.data?.name ?? 'backup'} (${formatBytes(res.data?.size_bytes ?? 0)})`);
    await load();
  }

  async function download(name: string) {
    setError('');
    const token = getToken();
    if (!token) {
      setError('Not signed in');
      return;
    }
    const url = getApiUrl(`admin/database-backups/${encodeURIComponent(name)}/download`);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError((j as { message?: string }).message || `Download failed (${res.status})`);
      return;
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Database backups</h1>
        <p className="mt-1 text-sm text-slate-600">
          Platform admin only. Creates a full Postgres dump on the VPS and lets you download it to your laptop.
          Prefer the nightly cron on the server; use this button before risky changes.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">Do not open Postgres to the public internet.</p>
        <p className="mt-1">
          To browse tables in local pgAdmin, use an SSH tunnel (see deploy README). Dumps are{' '}
          <code className="rounded bg-white/80 px-1">.dump</code> (pg_dump custom). Restore with{' '}
          <code className="rounded bg-white/80 px-1">pg_restore</code> into a throwaway local DB only.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={createBackup}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Creating backup…' : 'Backup database now'}
        </button>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
        >
          Refresh list
        </button>
        {data ? (
          <span className="text-xs text-slate-500">
            Keep {data.keep_days} days · {data.dir}
          </span>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">File</th>
                <th className="px-3 py-2 font-medium">Size</th>
                <th className="px-3 py-2 font-medium">Created (UTC)</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(data?.files ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-slate-500">
                    No dumps yet. Click Backup database now, or install the VPS cron.
                  </td>
                </tr>
              ) : (
                (data?.files ?? []).map((f) => (
                  <tr key={f.name} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs text-slate-800">{f.name}</td>
                    <td className="px-3 py-2 text-slate-600">{formatBytes(f.size_bytes)}</td>
                    <td className="px-3 py-2 text-slate-600">{new Date(f.created_at).toISOString()}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => download(f.name)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-800"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="font-medium text-slate-900">Nightly cron (recommended)</p>
        <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs text-slate-800">
{`ssh YOUR_VPS
sudo -u smebuze bash /var/www/smebuze/scripts/install-db-backup-cron.sh`}
        </pre>
        <p className="mt-2 text-xs text-slate-500">
          Optional Google Drive: install rclone on the VPS and copy{' '}
          <code>backups/db</code> nightly (instructions in deploy README).
        </p>
      </div>
    </div>
  );
}
