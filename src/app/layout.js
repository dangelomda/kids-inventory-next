export const metadata = { title: 'Inventário Kids', description: 'Inventário com Supabase' };
import './globals.css';


export default function RootLayout({ children }) {
return (
<html lang="pt-BR">
<body>{children}</body>
</html>
);
}