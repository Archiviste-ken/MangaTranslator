import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Manga Translator',
  description: 'Translate manga, manhwa, and manhua pages using AI-powered OCR and translation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-manga-bg text-manga-text min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
