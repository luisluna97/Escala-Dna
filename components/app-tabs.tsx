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
              <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                lock
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
