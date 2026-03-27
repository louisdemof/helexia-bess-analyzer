// src/components/inputs/ProfileSelector.tsx
import { getProfilesByPriority } from '../../data/loadProfiles.ts';
import type { LoadProfile } from '../../data/loadProfiles.ts';

interface Props {
  selectedId: string | null;
  onSelect: (profile: LoadProfile) => void;
  highlightState?: string;
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'PRIORIDADE 1 — Alta exposição à TUSD Ponta',
  2: 'PRIORIDADE 2 — Potencial relevante',
  3: 'PRIORIDADE 3 — Casos específicos',
};

export default function ProfileSelector({ selectedId, onSelect, highlightState }: Props) {
  return (
    <div className="space-y-6">
      {([1, 2, 3] as const).map((pri) => {
        const profiles = getProfilesByPriority(pri);
        return (
          <div key={pri}>
            <h4 className="mb-3 text-sm font-medium text-[#6692A8]">{PRIORITY_LABELS[pri]}</h4>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {profiles.map((p) => {
                const isSelected = selectedId === p.id;
                const isRecommended = highlightState && p.preferredStates.includes(highlightState);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelect(p)}
                    className={`relative rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-[#2F927B] bg-[#2F927B]/20'
                        : 'border-[#2F927B]/20 bg-[#1A2332] hover:border-[#2F927B]/40'
                    }`}
                  >
                    {isRecommended && !isSelected && (
                      <span className="absolute -top-2 right-2 rounded-full bg-[#2F927B] px-2 py-0.5 text-[10px] font-medium text-white">
                        Recomendado
                      </span>
                    )}
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-lg">{p.emoji}</span>
                      <span className="text-sm font-medium text-white">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#6692A8]">
                      <span>LF {p.loadFactor}</span>
                      <span>C-rate {p.defaultCRate}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.preferredStates.map((s) => (
                        <span key={s} className="rounded-full bg-[#2F927B]/20 px-1.5 py-0.5 text-[10px] text-[#2F927B]">{s}</span>
                      ))}
                    </div>
                    {!p.syntheticAllowed && (
                      <p className="mt-1 text-[10px] text-[#f97316]">CSV obrigatório</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
