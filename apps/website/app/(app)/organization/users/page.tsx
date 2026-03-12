'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

interface OrgUser {
  id: string;
  email: string;
  name?: string | null;
  is_active: boolean;
  role_names?: string[];
}

interface Role {
  id: string;
  name: string;
  slug?: string;
}

export default function UsersPage() {
  const [list, setList] = useState<OrgUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const loadUsers = async () => {
    const { data, error: err } = await apiGet<OrgUser[] | { data: OrgUser[] }>('organization/users');
    if (err) setError(err);
    else if (Array.isArray(data)) setList(data);
    else if (data && typeof data === 'object' && Array.isArray((data as { data?: OrgUser[] }).data)) setList((data as { data: OrgUser[] }).data);
  };

  useEffect(() => {
    (async () => {
      await loadUsers();
      const { data: rolesData } = await apiGet<Role[]>('organization/roles');
      if (Array.isArray(rolesData)) setRoles(rolesData);
      setLoading(false);
    })();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    setInviteSuccess(null);
    setError(null);
    const { data, error: err } = await apiPost<{ inviteLink: string }>('organization/invites', {
      email: inviteEmail.trim(),
      role_id: inviteRoleId || undefined,
    });
    setInviteSending(false);
    if (err) setError(err);
    else if (data?.inviteLink) {
      setInviteSuccess(`Invite sent to ${inviteEmail}. They can join via the link (check email or share link).`);
      setInviteEmail('');
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(data.inviteLink);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <Link href="/organization/users/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Add user</Link>
      </div>
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 max-w-lg">
        <h2 className="font-semibold text-slate-900 mb-2">Invite by email</h2>
        <p className="text-sm text-slate-500 mb-3">Send an invite link to join this workspace. They'll set their password on the join page.</p>
        <form onSubmit={handleInvite} className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-slate-600 mb-1">Role (optional)</label>
            <select
              value={inviteRoleId}
              onChange={(e) => setInviteRoleId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Staff</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={inviteSending} className="rounded-lg bg-slate-700 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
            {inviteSending ? 'Sending…' : 'Send invite'}
          </button>
        </form>
        {inviteSuccess && <p className="mt-2 text-sm text-green-700">{inviteSuccess}</p>}
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Name</th>
                <th className="text-left p-3 font-medium text-slate-700">Email</th>
                <th className="text-left p-3 font-medium text-slate-700">Roles</th>
                <th className="text-left p-3 font-medium text-slate-700">Status</th>
                <th className="text-left p-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-slate-500">No users yet.</td></tr>
              ) : (
                list.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{u.name ?? '—'}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{(u.role_names ?? []).join(', ') || '—'}</td>
                    <td className="p-3">{u.is_active ? 'Active' : 'Inactive'}</td>
                    <td className="p-3">
                      <Link href={`/organization/users/${u.id}/edit`} className="text-brand-600 hover:underline text-sm">Edit</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
