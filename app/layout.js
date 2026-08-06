import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "AURUM | Gold Ornaments Sales Dispatch Management System",
  description: "Enterprise Gold Ornaments Dispatch, Sales & Inventory Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#FAF9F6] text-[#1C1917] font-sans selection:bg-[#B8860B]/20 selection:text-[#B8860B]">
        {children}
      </body>
    </html>
  );
}
