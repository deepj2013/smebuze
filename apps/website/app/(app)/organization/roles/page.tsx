'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';

interface Role {
  id: string;
  name: string;
  slug: string;
  is_system?: boolean;
  permission_ids?: string[];
}

interface Permission {
  id: string;
  key: string;
  module: string;
  description?: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', slug: '', permissionIds: [] as string[] });
  const [editPermissionIds, setEditPermissionIds] = useState<string[]>([]);

  const load = async () => {
    const [rolesRes, permsRes] = await Promise.all([
      apiGet<Role[] | { data: Role[] }>('organization/roles'),
      apiGet<Permission[]>('organization/permissions'),
    ]);
    if (rolesRes.error) setError(rolesRes.error);
    else if (Array.isArray(rolesRes.data)) setRoles(rolesRes.data);
    else if (rolesRes.data && typeof rolesRes.data === 'object' && Array.isArray((rolesRes.data as { data?: Role[] }).data)) setRoles((rolesRes.data as { data: Role[] }).data);
    if (Array.isArray(permsRes.data)) setPermissions(permsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const loadRoleDetail = async (id: string) => {
    const { data } = await apiGet<Role & { permission_ids?: string[] }>(`organization/roles/${id}`);
    if (data?.permission_ids) setEditPermissionIds(data.permission_ids);
    setEditId(id);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error: err } = await apiPost('organization/roles', {
      name: createForm.name,
      slug: createForm.slug || undefined,
      permission_ids: createForm.permissionIds,
    });
    if (err) setError(err);
    else {
      setShowCreate(false);
      setCreateForm({ name: '', slug: '', permissionIds: [] });
      load();
    }
  };

  const handleUpdatePermissions = async () => {
    if (!editId) return;
    const { error: err } = await apiPatch(`organization/roles/${editId}`, { permission_ids: editPermissionIds });
    if (err) setError(err);
    else {
      setEditId(null);
      load();
    }
  };

  const togglePermission = (pid: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(pid)) setList(list.filter((id) => id !== pid));
    else setList([...list, pid]);
  };

  const byModule = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const m = p.module || 'other';
    if (!acc[m]) acc[m] = [];
    acc[m].push(p);
    return acc;
  }, {});

  if (loading) return <p className="text-slate-600">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Roles</h1>
      <p className="text-sm text-slate-600 mb-4">Create custom roles and assign permissions. System roles can have their permissions updated.</p>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700"
        >
          Create role
        </button>
      </div>
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-lg p-4 mb-6 max-w-md">
          <h2 className="font-medium text-slate-800 mb-3">New role</h2>
          <div className="space-y-2 mb-3">
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Role name"
              className="w-full border border-slate-300 rounded px-3 py-2"
              required
            />
            <input
              type="text"
              value={createForm.slug}
              onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="Slug (optional)"
              className="w-full border border-slate-300 rounded px-3 py-2"
            />
          </div>
          <div className="text-sm font-medium text-slate-700 mb-2">Permissions</div>
          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded p-2 mb-3">
            {Object.entries(byModule).map(([module, perms]) => (
              <div key={module} className="mb-2">
                <span className="text-xs font-medium text-slate-500 uppercase">{module}</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {perms.map((p) => (
                    <label key={p.id} className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={createForm.permissionIds.includes(p.id)}
                        onChange={() => togglePermission(p.id, createForm.permissionIds, (ids) => setCreateForm((f) => ({ ...f, permissionIds: ids })))}
                      />
                      {p.key}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-2 bg-brand-600 text-white rounded text-sm">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 border border-slate-300 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-3 font-medium text-slate-700">Name</th>
              <th className="text-left p-3 font-medium text-slate-700">Slug</th>
              <th className="text-left p-3 font-medium text-slate-700">System</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3 text-slate-500">{r.slug}</td>
                <td className="p-3">{r.is_system ? 'Yes' : 'No'}</td>
                <td className="p-3">
                  <button type="button" onClick={() => loadRoleDetail(r.id)} className="text-brand-600 hover:underline mr-2">Edit permissions</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-10 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b font-medium">Edit role permissions</div>
            <div className="p-4 overflow-y-auto flex-1">
              {Object.entries(byModule).map(([module, perms]) => (
                <div key={module} className="mb-4">
                  <span className="text-xs font-medium text-slate-500 uppercase">{module}</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {perms.map((p) => (
                      <label key={p.id} className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={editPermissionIds.includes(p.id)}
                          onChange={() => togglePermission(p.id, editPermissionIds, setEditPermissionIds)}
                        />
                        {p.key}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex gap-2">
              <button type="button" onClick={handleUpdatePermissions} className="px-3 py-2 bg-brand-600 text-white rounded text-sm">Save</button>
              <button type="button" onClick={() => setEditId(null)} className="px-3 py-2 border border-slate-300 rounded text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
