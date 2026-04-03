'use client';

import Navbar from '@/components/Navbar';

export default function FintechLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ backgroundColor: '#0B0F1A' }}>
      <Navbar />
      <main style={{ paddingTop: '64px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
