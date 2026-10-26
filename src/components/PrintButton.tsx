"use client";
import { btnPrimary } from "./ui";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className={btnPrimary}>
      Imprimir / salvar PDF
    </button>
  );
}
