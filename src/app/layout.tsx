import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Shopee Hunter Pro", template: "%s · Shopee Hunter Pro" },
  description: "Descubra produtos lucrativos para vender na Shopee: tendências, concorrência, fornecedores e cálculo real de lucro com as taxas oficiais.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
