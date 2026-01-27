"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
  disabled?: boolean;
};

const tabs: Tab[] = [
  { href: "/dashboard", label: "Horas extras" },
  { href: "/planejamento", label: "Planejamento de equipes", disabled: true },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppTabs() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => {
        const active = isActive(pathname, tab.href);
        if (tab.disabled) {
          return (
            <span
              key={tab.href}
              className="flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted"
            >
              <span>{tab.label}</span>
              <span
                className="grid h-6 w-6 place-items-center rounded-full border border-black/10 bg-white text-[10px] text-muted"
                aria-label="Bloqueado"
                title="Bloqueado"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
            </span>
          );
        }
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition",
              active
                ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand))/0.12] text-[hsl(var(--brand))]"
                : "border-black/10 bg-white text-muted hover:text-ink",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
