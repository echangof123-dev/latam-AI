import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import "./globals.css";

export const dynamic = "force-dynamic";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`,
  description:
    "Agenda, CRM y recepción con inteligencia artificial para negocios de Latinoamérica. La recepcionista atiende a tus clientes; el asistente del dueño consulta el negocio.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
