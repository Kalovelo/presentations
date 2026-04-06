import './globals.css';
import Header from '@/components/Header';

export const metadata = {
  title: 'Splitdumb',
  description: 'Expense splitting app',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main style={{ maxWidth: 1100, margin: '1.5rem auto', padding: '0 1rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
