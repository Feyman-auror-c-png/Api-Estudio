import { Plus, Trash2 } from "lucide-react";
import type { KeyValueRow } from "../types";

interface Props {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueEditor({ rows, onChange, keyPlaceholder = "Clave", valuePlaceholder = "Valor" }: Props) {
  const update = (id: string, patch: Partial<KeyValueRow>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const add = () =>
    onChange([...rows, { id: crypto.randomUUID(), enabled: true, key: "", value: "" }]);

  return (
    <div className="kv-editor">
      <div className="kv-heading"><span></span><span>Clave</span><span>Valor</span><span></span></div>
      {rows.map((row) => (
        <div className="kv-row" key={row.id}>
          <input type="checkbox" checked={row.enabled} onChange={(event) => update(row.id, { enabled: event.target.checked })} />
          <input value={row.key} placeholder={keyPlaceholder} onChange={(event) => update(row.id, { key: event.target.value })} />
          <input value={row.value} placeholder={valuePlaceholder} onChange={(event) => update(row.id, { value: event.target.value })} />
          <button className="icon-button danger" title="Eliminar" onClick={() => onChange(rows.filter((item) => item.id !== row.id))}><Trash2 size={15} /></button>
        </div>
      ))}
      <button className="add-row" onClick={add}><Plus size={15} /> Agregar fila</button>
    </div>
  );
}
