import React from 'react'

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold tracking-widest text-muted">
        {label}
      </span>
      {children}
    </label>
  )
}

function inputClass(active) {
  return [
    'tnum w-full rounded border bg-well px-3 py-2 text-xs text-white',
    'placeholder:text-muted/50 outline-none transition-colors duration-150',
    'focus:outline-none focus:border-accent',
    '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
    active ? 'border-accent/50' : 'border-base-500',
  ].join(' ')
}

function Toggle({ checked, onClick, children }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onClick}
      className="flex items-center gap-2 text-[11px] font-medium text-muted transition-colors hover:text-slate-200"
    >
      <span
        className={`flex h-4 w-7 items-center rounded-full p-0.5 transition-colors duration-200 ${
          checked ? 'bg-accent' : 'bg-well'
        }`}
      >
        <span
          className={`h-3 w-3 rounded-full bg-white shadow transition-transform duration-200 ease-out ${
            checked ? 'translate-x-3' : 'translate-x-0'
          }`}
        />
      </span>
      {children}
    </button>
  )
}

export default function FilterBar({ filters, onChange }) {
  const update = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="px-4 pt-3 pb-3">
      <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2">
        <Field label="MIN BET">
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={filters.minWagerInput}
            placeholder="0.00"
            onChange={(e) =>
              update({
                minWagerInput: e.target.value,
                minWager: parseFloat(e.target.value) || 0,
              })
            }
            className={inputClass(!!filters.minWagerInput)}
          />
        </Field>

        <Field label="MIN MULT">
          <input
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            value={filters.minMultiplierInput}
            placeholder="0×"
            onChange={(e) =>
              update({
                minMultiplierInput: e.target.value,
                minMultiplier: parseFloat(e.target.value) || 0,
              })
            }
            className={inputClass(!!filters.minMultiplierInput)}
          />
        </Field>

        <Field label="GAME / PROVIDER">
          <input
            type="text"
            value={filters.search}
            placeholder="Search…"
            onChange={(e) => update({ search: e.target.value })}
            className={inputClass(!!filters.search)}
          />
        </Field>
      </div>

      <div className="mt-3 flex items-center gap-5">
        <Toggle
          checked={filters.includeZero}
          onClick={() => update({ includeZero: !filters.includeZero })}
        >
          Show 0.00 bets
        </Toggle>
      </div>
    </div>
  )
}
