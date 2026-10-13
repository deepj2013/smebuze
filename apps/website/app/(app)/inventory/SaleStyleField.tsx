const WEIGHT = new Set(['kg', 'kgs', 'g', 'gm', 'gram', 'grams', 'ltr', 'l', 'litre', 'liter', 'ml']);

export default function SaleStyleField({
  value,
  unit,
  onChange,
}: {
  value: 'fixed' | 'loose';
  unit: string;
  onChange: (value: 'fixed' | 'loose') => void;
}) {
  const weightHint = WEIGHT.has(String(unit || '').trim().toLowerCase());
  return (
    <label className="block text-sm font-medium text-slate-700">
      How this is sold
      <select
        value={value}
        onChange={(e) => onChange(e.target.value === 'loose' ? 'loose' : 'fixed')}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm min-h-[40px]"
      >
        <option value="fixed">Fixed — one tap adds 1 (box, tin, plate)</option>
        <option value="loose">Loose — by weight or by rupees</option>
      </select>
      <span className="mt-1 block text-xs font-normal text-slate-500">
        {value === 'loose'
          ? `Price is per ${unit || 'kg'}. On the counter they type 500 g or ₹100 and the bill calculates itself.`
          : weightHint
            ? `Unit is ${unit}. Prefer Loose so the counter can take half a kilo or ₹100.`
            : 'Use Fixed for packed boxes. Use Loose for mithai sold from a tray.'}
      </span>
    </label>
  );
}
