# Checklist de produção

## Infraestrutura

- [ ] Criar projeto Supabase exclusivo da Multiva Finance.
- [ ] Aplicar a migração e confirmar que todas as tabelas públicas estão com RLS ativa.
- [ ] Configurar URL pública e callback de autenticação.
- [ ] Gerar segredos independentes para service role, cron, Cakto e Meta.
- [ ] Publicar primeiro em staging e validar HTTPS, cookies e cabeçalhos de segurança.
- [ ] Apontar `finance.multivabusiness.com.br` somente após a aprovação do staging.

## Produto e dados

- [ ] Validar cadastro, confirmação de e-mail, login, recuperação e exclusão da conta.
- [ ] Confirmar isolamento entre dois usuários reais.
- [ ] Validar exportação antes de excluir uma conta.
- [ ] Revisar textos jurídicos com razão social, contato e prazos definitivos.
- [ ] Definir retenção, backup e procedimento de restauração.

## IA

- [ ] Definir modelos de interpretação e transcrição.
- [ ] Validar texto, JPG, PNG, OGG, WAV, MP3 e M4A com dados não sensíveis.
- [ ] Confirmar limites, mensagens de indisponibilidade e revisão obrigatória do rascunho.
- [ ] Monitorar custo e taxa de falha sem registrar conteúdo financeiro nos logs.

## WhatsApp

- [ ] Homologar conta, número, permissões e política comercial na Meta.
- [ ] Validar challenge e assinatura do webhook.
- [ ] Testar vínculo de uso único e expiração.
- [ ] Testar confirmação idempotente de rascunho.
- [ ] Testar download autenticado, tamanho máximo e interpretação de áudio e imagem.
- [ ] Confirmar janela de atendimento e comportamento do opt-out.
- [ ] Ativar `WHATSAPP_ENABLED` somente após os testes reais.

## Cakto

- [ ] Criar produtos e ofertas definitivos sem reutilizar itens da Multiva Business.
- [ ] Conferir preços, recorrência e moeda com o responsável comercial.
- [ ] Validar assinatura e formatos reais de todos os eventos usados.
- [ ] Testar aprovação, renovação, recusa, atraso, recuperação, cancelamento, reembolso e chargeback.
- [ ] Reconciliar manualmente qualquer evento marcado como falha.
- [ ] Ativar `CAKTO_ENABLED` somente depois da homologação.

## Operação

- [ ] Agendar `/api/jobs` com Bearer `CRON_SECRET` e alertar em respostas 5xx.
- [ ] Monitorar filas `webhook_jobs` e `whatsapp_outbox`.
- [ ] Executar typecheck, testes unitários, banco, E2E e build no artefato final.
- [ ] Registrar rollback do deploy e da migração antes do lançamento.
- [ ] Manter cobrança fechada até a aprovação expressa dos planos e preços definitivos.
