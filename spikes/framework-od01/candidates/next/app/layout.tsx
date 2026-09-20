import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "ALETHEIA — spike" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
