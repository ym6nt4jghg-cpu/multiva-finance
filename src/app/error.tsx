'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main id="main" className="loading-page"><h1>Não conseguimos carregar agora.</h1><p>Seus dados não foram alterados. Verifique a conexão e tente novamente.</p><button className="button" onClick={reset}>Tentar novamente</button><a href="/">Voltar ao início</a></main>}
