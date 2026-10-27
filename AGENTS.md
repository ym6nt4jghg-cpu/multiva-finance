<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## GRAPHIFY FIRST - ECONOMIA DE TOKENS

Estas regras sao obrigatorias em todas as tarefas neste projeto.

1. Antes de pesquisar, listar ou abrir arquivos, consulte o grafo local usando graphify query, graphify explain ou graphify path.
2. Use consultas curtas com nomes tecnicos de modulos ou simbolos.
3. Identifique o menor conjunto de arquivos necessario.
4. Leia somente os arquivos e trechos relevantes.
5. Evite releituras desnecessarias na mesma tarefa.
6. Nao explore o repositorio inteiro se o grafo for suficiente.
7. Ignore node_modules, .next, graphify-out e test-results nas buscas.
8. Depois de alteracoes estruturais, atualize o grafo com graphify update . quando suportado; caso contrario, use graphify . --code-only.
9. Se o grafo falhar ou estiver incompleto, consulte o codigo-fonte necessario.
10. Mantenha respostas objetivas e evite reproduzir arquivos inteiros.
11. Nunca comprometa seguranca, testes ou qualidade.
12. Use o grafo como indice, validando no codigo antes de alterar.

Fluxo: tarefa -> Graphify -> arquivos relevantes -> leitura minima -> alteracao -> testes -> atualizacao do grafo.

## MODO GRAPHIFY FIRST - ECONOMIA MAXIMA

OBJETIVO: minimizar o consumo de tokens em todas as tarefas.

REGRAS:

1. Consultar graphify-out/graph.json por meio dos comandos
   graphify query, graphify path ou graphify explain
   ANTES de qualquer busca pelo código.

2. NÃO explorar o repositório inteiro.

3. NÃO reler arquivos antigos sem necessidade.

4. NÃO carregar todos os arquivos para entender a arquitetura.

5. NÃO ler GRAPH_REPORT.md inteiro.

6. NÃO pesquisar node_modules, .next, .pnpm-store
   ou arquivos gerados.

7. Utilizar o Graphify para identificar os arquivos exatos
   relacionados à solicitação.

8. Abrir apenas os trechos de código indispensáveis
   para realizar a alteração.

9. NÃO executar buscas amplas quando o grafo já
   identificar os componentes relevantes.

10. NÃO repetir análises já realizadas na tarefa.

11. Atualizar o grafo após mudanças estruturais.

12. Responder de forma curta, informando apenas
    o que foi alterado e os testes realizados.

13. Se o grafo estiver incompleto, permitir apenas
    a leitura adicional necessária para garantir
    uma alteração correta e segura.

FLUXO OBRIGATÓRIO:

PEDIDO DO USUÁRIO
        ↓
CONSULTAR GRAPHIFY
        ↓
LOCALIZAR ARQUIVOS RELEVANTES
        ↓
LER SOMENTE TRECHOS NECESSÁRIOS
        ↓
MODIFICAR CÓDIGO
        ↓
TESTAR
        ↓
ATUALIZAR GRAPHIFY

Nunca realizar uma varredura completa do projeto
quando uma consulta direcionada for suficiente.

## GRAPHIFY FIRST - PRIORIDADE MAXIMA

Objetivo: economizar tokens, contexto e tempo de execução.

REGRAS OBRIGATORIAS:

1. Antes de procurar qualquer arquivo, consultar o Graphify.

2. Usar graphify query, graphify path ou graphify explain
   para identificar os componentes relacionados à tarefa.

3. Nunca iniciar uma tarefa lendo o projeto inteiro.

4. Nunca fazer buscas globais se o Graphify já
   identificou os arquivos necessários.

5. Abrir somente os arquivos apontados pelo grafo.

6. Ler somente os trechos relevantes para a alteração.

7. Não carregar relatórios grandes ou arquivos de
   dependências sem necessidade.

8. Não repetir leituras já realizadas na mesma tarefa.

9. Se o grafo não encontrar algo, fazer uma busca
   direcionada e atualizar o mapa quando necessário.

10. Depois de alterações estruturais, executar
    graphify update . se disponível.

11. Manter respostas objetivas, sem repetir código
    completo desnecessariamente.

12. Não comprometer testes, segurança ou correção
    para economizar tokens.

FLUXO PADRAO:

Pedido -> Graphify -> Arquivos relevantes ->
Leitura minima -> Alteração -> Teste.
