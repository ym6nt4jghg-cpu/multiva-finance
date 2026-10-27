# Multiva Finance

Plataforma de organização financeira pessoal com painel responsivo, autenticação, isolamento de dados por usuário, lançamentos, contas, cartões, metas, orçamentos, recorrências e assistente financeiro com confirmação explícita.

## Estado atual

- A demonstração funciona localmente com dados fictícios persistidos no navegador.
- O modo real usa um projeto Supabase exclusivo e a migração versionada em `supabase/migrations/`.
- O assistente aceita texto e, quando a OpenAI está configurada, áudio ou comprovantes. A interpretação sempre produz um rascunho; somente a confirmação do usuário cria o lançamento.
- WhatsApp aceita texto, áudio e imagem de comprovante pela Cloud API oficial; os três formatos geram apenas um rascunho até a confirmação. A integração e a Cakto ficam desativadas por padrão e devem ser ativadas somente após homologação das credenciais reais.
- Nenhuma conta bancária é conectada e nenhum dado de cartão completo deve ser informado.

## Desenvolvimento

Requisitos: Node.js 22 ou superior e pnpm 11.25.

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

Acesse `http://127.0.0.1:3000`. Sem Supabase configurado, use `/demo`.

## Banco e autenticação

Crie um projeto Supabase separado para a Multiva Finance. Não reutilize o banco da Multiva Business.

1. Aplique `supabase/migrations/20261026231517_finance_foundation.sql` pelo Supabase CLI ou pelo editor SQL.
2. Preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
3. Configure `APP_URL` com a URL pública exata, sem barra final.
4. Cadastre `${APP_URL}/auth/callback` entre as URLs permitidas do Supabase Auth.
5. Mantenha a service role somente no ambiente do servidor.

A migração cria RLS, auditoria, filas duráveis, limites de IA e operações atômicas para transferências, compras parceladas e pagamento de fatura.

## Variáveis de ambiente

Use `.env.example` como contrato. Os grupos são:

- Supabase: obrigatórias para contas reais.
- OpenAI: opcionais; `OPENAI_MODEL` interpreta texto e imagens, e `OPENAI_TRANSCRIPTION_MODEL` transcreve áudio.
- WhatsApp: mantenha `WHATSAPP_ENABLED=false` até concluir a configuração oficial da Meta.
- Cakto: mantenha `CAKTO_ENABLED=false` até validar segredo, produtos, ofertas e eventos reais.
- `CRON_SECRET`: segredo longo usado pelo processador de filas.

## Filas e webhooks

Configure os endpoints públicos:

- Meta: `GET/POST /api/webhooks/whatsapp`
- Cakto: `POST /api/webhooks/cakto`
- Worker: `GET/POST /api/jobs` com `Authorization: Bearer <CRON_SECRET>`

O worker deve ser chamado periodicamente por um agendador confiável. Webhooks apenas validam e persistem eventos; o processamento e o envio ficam na fila para preservar idempotência e permitir novas tentativas.

## Verificação

```bash
pnpm typecheck
pnpm test
pnpm test:db
pnpm test:e2e
pnpm build
```

Os testes E2E esperam a aplicação em `http://127.0.0.1:3000` e usam o Microsoft Edge instalado por padrão. Defina `PLAYWRIGHT_BROWSER_PATH` para outro Chromium compatível.

## Publicação

Antes de liberar produção, siga [docs/production-checklist.md](docs/production-checklist.md). O domínio planejado é `finance.multivabusiness.com.br`; mudanças de DNS e ativação de cobrança ficam fora do deploy local e exigem as credenciais reais do provedor.
