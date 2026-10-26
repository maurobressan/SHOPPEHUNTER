import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Nunito } from "next/font/google";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const brand = Nunito({ subsets: ["latin"], weight: ["800", "900"], variable: "--font-brand", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Shoppe Hunter", template: "%s · Shoppe Hunter" },
  description: "Descubra produtos lucrativos para vender na Shopee: tendências, concorrência, fornecedores e cálculo real de lucro com as taxas oficiais.",
};

export const viewport: Viewport = { themeColor: "#0B1E4F" };

// Aplica o tema escolhido antes da página aparecer, para não piscar.
const themeScript = `try{if(localStorage.getItem("tema")==="escuro")document.documentElement.dataset.theme="dark"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${brand.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
