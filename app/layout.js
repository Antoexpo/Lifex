export const metadata = {
  title: 'LIFEX',
  description: 'MVP LIFEX'
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: '2rem' }}>
        {children}
      </body>
    </html>
  );
}
