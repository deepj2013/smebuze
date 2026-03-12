'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';

interface Role {
  id: string;
  name: string;
}
interface Department {
  id: string;
  name: string;
}
interface Company {
  id: string;
  name: string;
}

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [userRes, rolesRes, deptRes, compRes] = await Promise.all([
        apiGet<Record<string, unknown>>(`organization/users/${id}`),
        apiGet<Role[]>('organization/roles'),
        apiGet<Department[]>('organization/departments'),
        apiGet<Company[]>('organization/companies'),
      ]);
      if (userRes.error) setLoadErr(userRes.error);
      else if (userRes.data) {
        const u = userRes.data as Record<string, unknown>;
        setName((u.name as string) ?? '');
        setEmail((u.email as string) ?? '');
        setPhone((u.phone as string) ?? '');
        setDepartmentId((u.department_id as string) ?? '');
        setCompanyId((u.default_company_id as string) ?? '');
        setIsActive((u.is_active as boolean) ?? true);
        setRoleIds(Array.isArray(u.role_ids) ? (u.role_ids as string[]) : []);
      }
      if (Array.isArray(rolesRes.data)) setRoles(rolesRes.data);
      if (Array.isArray(deptRes.data)) setDepartments(deptRes.data);
      if (Array.isArray(compRes.data)) setCompanies(compRes.data);
    })();
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await apiPatch(`organization/users/${id}`, {
      name: name || undefined,
      email,
      phone: phone || undefined,
      department_id: departmentId || null,
      default_company_id: companyId || null,
      is_active: isActive,
      role_ids: roleIds,
    });
    setLoading(false);
    if (err) setError(err);
    else router.push('/organization/users');
  };

  const toggleRole = (rid: string) => {
    setRoleIds((prev) => (prev.includes(rid) ? prev.filter((x) => x !== rid) : [...prev, rid]));
  };

  if (loadErr) return <div className="p-4 text-red-600">{loadErr}</div>;
  return (
    <div>
      <Link href="/organization/users" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Users</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Edit user</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">— None —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Default company</label>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">— None —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="text-sm font-medium text-slate-700">Active</span>
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Roles</label>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <label key={r.id} className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-sm">
                <input type="checkbox" checked={roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
                {r.name}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Save</button>
          <Link href="/organization/users" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
