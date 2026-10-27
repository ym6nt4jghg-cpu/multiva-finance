import type {Metadata} from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import './premium.css';
export const metadata:Metadata={title:{default:'Multiva Finance · Seu dinheiro, com mais clareza',template:'%s · Multiva Finance'},description:'Seu dinheiro organizado. Simples assim. Controle financeiro pessoal com contas, metas, orçamentos e assistente conversacional.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body><a className="skip-link" href="#main">Pular para o conteúdo</a>{children}</body></html>}
