// src/components/inputs/CSVUploader.tsx
import { useCallback, useState } from 'react';
import Papa from 'papaparse';

interface Props {
  onParsed: (hourlyKW: number[], fileName: string) => void;
}

export default function CSVUploader({ onParsed }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const processFile = useCallback((file: File) => {
    setStatus(null);
    Papa.parse(file, {
      delimiter: ';',
      skipEmptyLines: true,
      complete(results) {
        try {
          const rows = results.data as string[][];
          // Detect header row
          const startIdx = rows.findIndex((r) =>
            r.some((c) => /power|potencia|kw|watts/i.test(c))
          );
          const dataRows = startIdx >= 0 ? rows.slice(startIdx + 1) : rows;

          // Parse power values (last column typically, or column index 2)
          // Detect decimal format from sample values:
          // - "1.234,56" or "347004,656" (comma decimal) → Brazilian
          // - "1234.56" or "1,234.56" (dot decimal) → English
          // Key insight: if comma appears and each value has at most ONE comma
          // with digits after it that are NOT exactly 3 → it's a decimal comma
          const sampleVals = dataRows.slice(0, 20).map((r) => (r[r.length - 1] || r[2] || '').trim()).filter(Boolean);
          let useCommaDecimal = false;
          if (sampleVals.some((v) => v.includes(','))) {
            // Check if comma is used as decimal: pattern like "347004,656" (not "347,004")
            // If there are commas but no dots, and digits after comma are not exactly 3 → decimal comma
            const hasNoDots = sampleVals.every((v) => !v.includes('.'));
            const commaNotThousand = sampleVals.some((v) => {
              const parts = v.split(',');
              return parts.length === 2 && parts[1].length !== 3;
            });
            const hasDotThousand = sampleVals.some((v) => /\d\.\d{3}/.test(v));
            useCommaDecimal = hasNoDots ? commaNotThousand : hasDotThousand;
          }

          const rawValues: number[] = [];
          for (const row of dataRows) {
            if (row.length < 2) continue;
            // Try last column, then column 2
            const valStr = (row[row.length - 1] || row[2] || '').trim();
            if (!valStr) continue;
            let val: number;
            if (useCommaDecimal) {
              // Comma decimal: "1.234,56" → strip dots, comma→dot
              // Also handles "347004,656" (no dots, just comma decimal)
              val = parseFloat(valStr.replace(/\./g, '').replace(',', '.'));
            } else {
              // Dot decimal: "1234.56" or "1,234.56" → strip commas
              val = parseFloat(valStr.replace(/,/g, ''));
            }
            if (!isNaN(val) && val >= 0) {
              rawValues.push(val);
            }
          }

          if (rawValues.length === 0) {
            setStatus({ type: 'error', message: 'Nenhum dado numérico encontrado no CSV.' });
            return;
          }

          // Detect if values are in W (>10000 typically) and convert to kW
          const maxVal = Math.max(...rawValues);
          const values = maxVal > 50000 ? rawValues.map((v) => v / 1000) : rawValues;

          // Aggregate to hourly if 15-min intervals (4× or close to 35040)
          let hourlyKW: number[];
          if (values.length >= 35000) {
            // 15-min intervals → aggregate to hourly (mean of 4)
            hourlyKW = [];
            for (let i = 0; i < values.length; i += 4) {
              const chunk = values.slice(i, i + 4);
              const avg = chunk.reduce((a, b) => a + b, 0) / chunk.length;
              hourlyKW.push(avg);
            }
          } else if (values.length >= 8000 && values.length <= 9000) {
            // Already hourly
            hourlyKW = values;
          } else {
            // Pad or trim to 8760
            hourlyKW = values.slice(0, 8760);
          }

          // Pad to 8760 if short
          while (hourlyKW.length < 8760) {
            hourlyKW.push(hourlyKW[hourlyKW.length % Math.min(hourlyKW.length, 24)] ?? 0);
          }
          hourlyKW = hourlyKW.slice(0, 8760);

          const nullPct = rawValues.filter((v) => v === 0).length / rawValues.length;
          const warnings: string[] = [];
          if (nullPct > 0.05) warnings.push(`${(nullPct * 100).toFixed(1)}% valores nulos`);
          if (rawValues.length < 8000) warnings.push(`Apenas ${rawValues.length} registros (esperado ~35040 ou ~8760)`);

          const msg = `${rawValues.length} registros processados → ${hourlyKW.length} horas${warnings.length ? '. ' + warnings.join('; ') : ''}`;
          setStatus({ type: 'success', message: msg });
          onParsed(hourlyKW, file.name);
        } catch (err) {
          setStatus({ type: 'error', message: `Erro ao processar CSV: ${err}` });
        }
      },
      error(err) {
        setStatus({ type: 'error', message: `Erro ao ler CSV: ${err.message}` });
      },
    });
  }, [onParsed]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          dragOver ? 'border-[#2F927B] bg-[#2F927B]/10' : 'border-[#6692A8]/30 bg-[#1A2332]'
        }`}
      >
        <svg className="mb-3 h-10 w-10 text-[#6692A8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="mb-1 text-sm text-white">Arraste o arquivo CSV aqui</p>
        <p className="mb-3 text-xs text-[#6692A8]">Formato: 8760 linhas (1 ano horário) — separador ; — valores em Watts</p>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer rounded-lg bg-[#2F927B] px-4 py-2 text-sm font-medium text-white hover:bg-[#2F927B]/80 transition-colors">
            Selecionar arquivo
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileInput} />
          </label>
          <a
            href={`${import.meta.env.BASE_URL}template_curva_carga_8760h.csv`}
            download="template_curva_carga_8760h.csv"
            className="rounded-lg border border-[#6692A8] px-4 py-2 text-sm text-[#6692A8] hover:bg-white/5 transition-colors"
          >
            Baixar template CSV
          </a>
        </div>
      </div>
      {status && (
        <p className={`mt-3 text-sm ${status.type === 'error' ? 'text-[#ef4444]' : 'text-[#2F927B]'}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}
