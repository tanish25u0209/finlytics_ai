'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FintechPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/fintech/apply');
  }, [router]);

  return null;
}
