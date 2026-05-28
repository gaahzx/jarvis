'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('jarvis_token');
    router.replace(token ? '/dashboard' : '/login');
  }, [router]);
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-white/50">Carregando...</div>
    </div>
  );
}
