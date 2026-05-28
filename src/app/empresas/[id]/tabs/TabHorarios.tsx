'use client';

import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const DIAS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

export function TabHorarios({ data, reload }: any) {
  const [horarios, setHorarios] = useState(() => {
    return DIAS.map((_, i) => {
      const h = data.horarios.find((x: any) => x.dia_semana === i);
      return {
        dia_semana: i,
        abre: h?.abre?.slice(0, 5) || '08:00',
        fecha: h?.fecha?.slice(0, 5) || '18:00',
        fechado: h?.fechado || (h === undefined && (i === 0 || i === 6)),
      };
    });
  });
  const [saving, setSaving] = useState(false);

  function update(idx: number, key: string, val: any) {
    const novo = [...horarios];
    novo[idx] = { ...novo[idx], [key]: val };
    setHorarios(novo);
  }

  function copiarSemana() {
    if (horarios.length === 0) return;
    const ref = horarios[1]; // segunda
    setHorarios(horarios.map((h, i) => i >= 1 && i <= 5 ? { ...h, abre: ref.abre, fecha: ref.fecha, fechado: ref.fechado } : h));
    toast.info('Copiado segunda para os outros dias úteis');
  }

  async function save() {
    setSaving(true);
    try {
      await api.updateHorarios(data.empresa.id, horarios);
      toast.success('Horários salvos!');
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-4 text-sm text-cyan-200">
        📅 Configure os horários de atendimento. A IA usa essa info pra responder &quot;qual o horário?&quot;.
      </div>

      <div className="flex justify-end">
        <button onClick={copiarSemana} className="btn-secondary text-sm">
          Copiar segunda → dias úteis
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] text-left text-xs uppercase text-white/50">
            <tr>
              <th className="px-4 py-3">Dia</th>
              <th className="px-4 py-3">Fechado?</th>
              <th className="px-4 py-3">Abre</th>
              <th className="px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {horarios.map((h, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="px-4 py-3 font-medium text-white w-32">{DIAS[i]}</td>
                <td className="px-4 py-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={h.fechado}
                      onChange={(e) => update(i, 'fechado', e.target.checked)}
                      className="h-4 w-4 rounded accent-red-500"
                    />
                    <span className="text-xs text-white/60">{h.fechado ? 'Fechado' : 'Aberto'}</span>
                  </label>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="time"
                    disabled={h.fechado}
                    value={h.abre}
                    onChange={(e) => update(i, 'abre', e.target.value)}
                    className="input py-1.5 text-sm disabled:opacity-30"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="time"
                    disabled={h.fechado}
                    value={h.fecha}
                    onChange={(e) => update(i, 'fecha', e.target.value)}
                    className="input py-1.5 text-sm disabled:opacity-30"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar horários
        </button>
      </div>
    </div>
  );
}
