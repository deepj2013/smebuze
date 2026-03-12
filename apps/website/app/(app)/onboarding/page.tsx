'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

interface OnboardingStep {
  id: string;
  label: string;
  done: boolean;
  href: string;
}

interface OnboardingChecklist {
  steps: OnboardingStep[];
  showOnboarding: boolean;
}

export default function OnboardingWizardPage() {
  const [onboarding, setOnboarding] = useState<OnboardingChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await apiGet<OnboardingChecklist & { onboardingCompletedAt?: string; tenantSlug?: string }>('onboarding/checklist');
      if (data) setOnboarding({ steps: data.steps, showOnboarding: data.showOnboarding });
      setLoading(false);
    })();
  }, []);

  const handleComplete = async () => {
    setCompleting(true);
    await apiPost('onboarding/complete', {});
    setCompleting(false);
    setOnboarding((prev) => (prev ? { ...prev, showOnboarding: false } : null));
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }

  if (!onboarding?.steps?.length) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Setup complete</h1>
        <p className="text-slate-600 mb-6">You’re all set. Head to the dashboard to get started.</p>
        <Link href="/dashboard" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2 font-semibold hover:bg-brand-700">Go to dashboard</Link>
      </div>
    );
  }

  const allDone = onboarding.steps.every((s) => s.done);

  return (
    <div className="max-w-lg mx-auto py-12">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Set up your workspace</h1>
      <p className="text-slate-600 mb-8">Complete these steps to get the most out of SMEBUZZ.</p>

      <ol className="space-y-4 mb-8">
        {onboarding.steps.map((step, i) => (
          <li key={step.id} className="flex items-start gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
              step.done ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {step.done ? '✓' : i + 1}
            </span>
            <div className="flex-1 min-w-0">
              {step.done ? (
                <span className="text-slate-500 line-through">{step.label}</span>
              ) : (
                <Link href={step.href} className="text-brand-600 hover:underline font-medium">{step.label}</Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
          Back to dashboard
        </Link>
        <button
          type="button"
          onClick={handleComplete}
          disabled={completing}
          className="rounded-lg bg-brand-600 text-white px-4 py-2 font-semibold hover:bg-brand-700 disabled:opacity-50"
        >
          {completing ? 'Saving…' : allDone ? "I'm done" : "I'll do this later"}
        </button>
      </div>
    </div>
  );
}
