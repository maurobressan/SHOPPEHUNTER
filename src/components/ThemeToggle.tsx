"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("tema", next ? "escuro" : "claro");
    } catch {}
  };
  return (
    <button type="button" onClick={toggle} title={dark ? "Usar tema claro" : "Usar tema escuro"} aria-label={dark ? "Usar tema claro" : "Usar tema escuro"} className={className}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
