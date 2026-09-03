'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';
import { SIGNUP_BUSINESS_TYPES } from '@/lib/business-types';
import { VARIANT_THEMES } from '@/lib/variant-theme';
import {
  WORKSPACE_MODULE_OPTIONS,
  defaultModulesForShop,
  normalizeEnabledModules,
} from '@/lib/workspace-setup';
import { BookOpen, Check, Compass, Sparkles, Store } from 'lucide-react';

type LearnMode = 'tutorial' | 'manual' | 'explore';

interface Checklist {
  showOnboarding: boolean;
  businessType?: string;
  enabledModules?: string[];
  workspaceConfigured?: boolean;
  canConfigure?: boolean;
  homeHref?: string;
}

export default function OnboardingWizardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<Checklist | null>(null);
  const [step, setStep] = useState(1);
  const [shopType, setShopType] = useState<string>('');
  const [modules, setModules] = useState<string[]>(defaultModulesForShop('retail_shop'));
  const [learn, setLearn] = useState<LearnMode>('tutorial');

  useEffect(() => {
    (async () => {
      const { data } = await apiGet<Checklist>('onboarding/checklist');
      if (data?.homeHref?.startsWith('/ice-crest')) {
        window.location.replace('/ice-crest/dashboard');
        return;
      }
      if (data) {
        setMeta(data);
        const type = data.businessType && data.businessType !== 'standard' ? data.businessType : '';
        setShopType(type);
        const saved = (data.enabledModules || []).filter((m) => WORKSPACE_MODULE_OPTIONS.some((o) => o.id === m));
        setModules(saved.length ? saved : defaultModulesForShop(type || 'retail_shop'));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!shopType) return;
    const saved = (meta?.enabledModules || []).filter((m) => WORKSPACE_MODULE_OPTIONS.some((o) => o.id === m));
    if (meta?.businessType === shopType && saved.length) {
      setModules(saved);
      return;
    }
    setModules(defaultModulesForShop(shopType));
  }, [shopType, meta?.businessType, meta?.enabledModules]);

  const shopMeta = useMemo(() => SIGNUP_BUSINESS_TYPES.find((t) => t.id === shopType), [shopType]);

  const toggleModule = (id: string) => {
    setModules((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const save = async () => {
    setError(null);
    if (!shopType) {
      setError('Choose how you sell — restaurant, shop, or trading desk.');
      setStep(1);
      return;
    }
    setSaving(true);
    const { data, error: err } = await apiPatch<{ homeHref?: string; learnMode?: LearnMode }>('onboarding/workspace', {
      businessType: shopType,
      enabledModules: normalizeEnabledModules(modules),
      learnMode: learn,
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    const home = data?.homeHref || '/dashboard';
    if (learn === 'tutorial') router.push('/help?guide=1');
    else if (learn === 'manual') router.push('/help');
    else router.push(home);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <p className="text-slate-600">Preparing your workspace…</p>
      </div>
    );
  }

  if (meta && meta.canConfigure === false) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4">
        <h1 className="text-2xl font-bold text-slate-900">Waiting for setup</h1>
        <p className="mt-2 text-slate-600">
          An admin still needs to choose the shop type and which menus you see. You can read the manual in the meantime.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/help" className="rounded-xl bg-brand-600 text-white px-4 py-2.5 text-sm font-semibold">Open help</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-12 px-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Welcome in</p>
      <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">What kind of shop is this?</h1>
      <p className="mt-2 text-slate-600">
        Tell us once. We save it for this workspace, then show only the menus you switch on. You can change it later from Setup.
      </p>

      <ol className="mt-6 flex gap-2 text-sm font-medium">
        {[1, 2, 3].map((n) => (
          <li key={n} className={`flex-1 rounded-full py-1.5 text-center ${step === n ? 'bg-brand-600 text-white' : n < step ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-500'}`}>
            {n === 1 ? 'Shop' : n === 2 ? 'Menus' : 'Guide'}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-slate-500">
        {step === 1 && 'Choose restaurant, kirana, department store, trading or services.'}
        {step === 2 && 'Tick only what this shop needs. Unticked items stay hidden in the menu.'}
        {step === 3 && 'A short tutorial, a written manual, or jump straight in. Help stays in the menu.'}
      </p>

      {error && <div className="mt-4 rounded-xl bg-red-50 text-red-800 p-3 text-sm">{error}</div>}

      {step === 1 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SIGNUP_BUSINESS_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setShopType(t.id)}
              className={`text-left rounded-2xl border p-4 transition-all ${
                shopType === t.id ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200' : 'border-slate-200 bg-white hover:border-brand-300'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ background: VARIANT_THEMES[t.id]?.primary ?? '#0284c7' }}
                  />
                  <span className="font-semibold text-slate-900">{t.title}</span>
                </span>
                {shopType === t.id && <Check className="h-4 w-4 text-brand-700" />}
              </span>
              <span className="mt-1 block text-sm text-slate-600 leading-relaxed">{t.blurb}</span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="mt-6">
          <p className="text-sm text-slate-600 mb-3">
            Suggested for {shopMeta?.title || 'your shop'}. Turn off anything you do not want in the menu.
          </p>
          <ul className="space-y-2">
            {WORKSPACE_MODULE_OPTIONS.map((m) => {
              const on = modules.includes(m.id);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => toggleModule(m.id)}
                    className={`w-full text-left rounded-2xl border px-4 py-3 flex items-start gap-3 ${
                      on ? 'border-brand-400 bg-white' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 bg-white'}`}>
                      {on && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span>
                      <span className="block font-semibold text-slate-900">{m.label}</span>
                      <span className="block text-sm text-slate-600">{m.blurb}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 grid grid-cols-1 gap-3">
          {[
            { id: 'tutorial' as const, icon: Sparkles, title: 'Show me a short tutorial', body: 'A few screens that walk through billing, stock and the printer.' },
            { id: 'manual' as const, icon: BookOpen, title: 'Open the written manual', body: 'Step-by-step pages you can keep open while you work.' },
            { id: 'explore' as const, icon: Compass, title: 'I will explore myself', body: 'Go straight to the counter or dashboard. Help stays in the menu.' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setLearn(opt.id)}
              className={`text-left rounded-2xl border p-4 flex gap-3 ${
                learn === opt.id ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200' : 'border-slate-200 bg-white hover:border-brand-300'
              }`}
            >
              <opt.icon className="h-5 w-5 text-brand-700 shrink-0 mt-0.5" />
              <span>
                <span className="block font-semibold text-slate-900">{opt.title}</span>
                <span className="block text-sm text-slate-600 mt-0.5">{opt.body}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {step > 1 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">
            Back
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            disabled={step === 1 && !shopType}
            onClick={() => setStep((s) => s + 1)}
            className="rounded-xl bg-brand-600 text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
            <Store className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save and open workspace'}
          </button>
        )}
      </div>
    </div>
  );
}
