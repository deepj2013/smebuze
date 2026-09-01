import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Start a 7-day free trial',
  description: 'Create a SMEBUZZ workspace. GST billing, stock and accounts — no card needed for the trial.',
  alternates: { canonical: '/signup' },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
