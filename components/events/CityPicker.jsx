'use client'

/** Location pill like District's header — native <select> so it works everywhere. */
export default function CityPicker({ cities, value, onChange }) {
  return (
    <label className="relative flex items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3">
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-coral" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
      <span className="sr-only">City</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-[9rem] cursor-pointer appearance-none bg-transparent pr-6 font-display text-base font-bold text-ink outline-none"
      >
        <option value="">All cities</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-4 text-xs text-ink/40">
        ▾
      </span>
    </label>
  )
}
