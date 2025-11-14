import { type ReactNode } from 'react';
import { SuspendedBanner } from './SuspendedBanner';

export function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SuspendedBanner />
      {children}
    </>
  );
}
