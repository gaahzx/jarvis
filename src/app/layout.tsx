import './globals.css';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'JARVIS Admin',
  description: 'Painel de gestão das empresas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
