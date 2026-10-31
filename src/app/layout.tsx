import type { Metadata } from "next";
import { DM_Sans, Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--inter", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SCBVS - Senior Citizen Beneficiary Verification System",
  description: "Prototype for PC-317 IHCI. Fake test data only.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${dmSans.variable} ${manrope.variable} antialiased`}>{children}</body>
    </html>
  );
}
