'use client';

import { ChatTest } from '@/components/ChatTest';

function getEmoji(s?: string): string {
  if (!s) return '🏢';
  const x = s.toLowerCase();
  if (x.includes('clín')) return '🏥';
  if (x.includes('imob')) return '🏠';
  if (x.includes('loja')) return '🛍️';
  return '🏢';
}

export function TabChatTest({ data }: any) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-200">
        💬 Teste a IA exatamente como ela responderia no WhatsApp real. Sem custo, usa modelos free.
      </div>

      <ChatTest
        empresaId={data.empresa.id}
        empresaNome={data.empresa.nome_fantasia}
        assistenteNome={data.identidade?.nome_assistente || 'Assistente'}
        emojiEmpresa={getEmoji(data.empresa.segmento)}
      />
    </div>
  );
}
