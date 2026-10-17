'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';

/**
 * Menu visibility is configured only by the universal admin
 * (Admin → Tenants → Configure). Shop tenants no longer self-serve this screen.
 */
export default function OrganizationMenusPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const me = await apiGet<{ user?: { isSuperAdmin?: boolean } }>('auth/me');
      if (me.data?.user?.isSuperAdmin) {
        router.replace('/admin/tenants');
        return;
      }
      router.replace('/organization/companies');
    })();
  }, [router]);

  return (
    <div className="max-w-lg space-y-3 p-4">
      <h1 className="text-xl font-semibold text-slate-900">Menus moved</h1>
      <p className="text-sm text-slate-600">
        Which screens this shop shows is set by the SMEBUZE platform admin under{' '}
        <strong>Admin → Tenants → Configure</strong>. Shop users manage day-to-day company, staff, printers and branding only.
      </p>
      <Link href="/organization/companies" className="text-sm font-medium text-brand-700 hover:underline">
        ← Back to Organization
      </Link>
    </div>
  );
}
