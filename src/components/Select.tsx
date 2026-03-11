import { useEffect, useState } from "react";

type Option = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
};

export default function Select({ value, onChange, options, className = "" }: Props) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    function update() {
      setIsDark(document?.documentElement?.classList.contains("dark") ?? false);
    }
    update();
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  const base = `appearance-none pr-8 pl-3 py-1 rounded-full border shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0`;
  const theme = isDark
    ? "bg-zinc-800 text-white border-zinc-700 focus:border-indigo-500 focus:ring-indigo-600"
    : "bg-white text-zinc-900 border-zinc-200 focus:border-indigo-500 focus:ring-indigo-200";

  return (
    <div className={`inline-block relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${base} ${theme} w-full cursor-pointer`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className={isDark ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? "text-zinc-300" : "text-zinc-500"}`}
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
