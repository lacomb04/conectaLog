# ConectaLog Suporte

Plataforma interna de abertura e atendimento de chamados da ConectaLog, construída com Next.js 13+, Supabase e componentes reutilizáveis para fluxos de funcionários e equipe de suporte.

## Sumário

- [Stack Principal](#stack-principal)
- [Fluxo do Funcionário (`/employee`)](#fluxo-do-funcionário-employee)
- [Fluxo do Suporte (`/support`)](#fluxo-do-suporte-support)
- [Componentes Compartilhados](#componentes-compartilhados)
- [Integração com Supabase](#integração-com-supabase)
- [Como Rodar Localmente](#como-rodar-localmente)
- [Próximos Passos Sugestões](#próximos-passos-sugestões)

## Stack Principal

- **Next.js 13+ (App Router)** para renderização híbrida (Server/Client Components) e roteamento.
- **Supabase (auth, banco Postgres e realtime)** como backend principal.
- **Shadcn/UI + Tailwind CSS** para componentes de interface e estilização.
- **date-fns** para formatação de datas em português (locale `ptBR`).
- **Lucide Icons** para ícones consistentes entre as views.

## Fluxo do Funcionário (`/employee`)

Arquivos em `app/employee` e `components/employee` lidam com a experiência do colaborador.

- `app/employee/layout.tsx`: protege todas as rotas de funcionário. Cria client Supabase no servidor, valida sessão em `auth.getUser()`, busca perfil em `users` e redireciona visitantes não autenticados para `/login`. Renderiza `EmployeeNav` seguido do conteúdo.
- `components/employee/employee-nav.tsx`: componente client que exibe barra superior com atalhos (Meus Tickets e Novo Ticket), mostra nome/departamento do usuário e processa logout via `supabase.auth.signOut()` seguido de `router.refresh()`.
- `app/employee/page.tsx`: página inicial “Meus Tickets”. Recupera usuário atual; se não houver sessão retorna `null`. Busca tickets criados pelo usuário (`tickets` + join `creator`) em ordem decrescente e entrega para `TicketList`, além de exibir CTA para `/employee/new`.
- `components/employee/ticket-list.tsx`: lista client-side com cartões clicáveis e UI responsiva. Mostra número do ticket, prioridade com `Badge`, status, descrição resumida e tempo relativo (`formatDistanceToNow`). Quando não há tickets, apresenta card vazio informativo.
- `app/employee/new/page.tsx`: view para abertura de chamado. Estrutura layout (`Card`) com título e subtítulo, delegando a lógica para `NewTicketForm`.
- `components/employee/new-ticket-form.tsx`: controla estado local do formulário (título, descrição, prioridade, categoria). Na submissão busca usuário via `supabase.auth.getUser()`, insere ticket (`status: open`) e mostra toast (`useToast`). Em caso de sucesso redireciona para `/employee`; falhas exibem toast destrutivo. Também oferece botão “Cancelar” que usa `router.back()`.
- `app/employee/tickets/[id]/page.tsx`: detalha um ticket específico criado pelo colaborador. Valida sessão; se ticket não existir ou não pertencer ao usuário, redireciona para `/employee`. Carrega mensagens públicas (inner join em `users`) e perfil do autor antes de renderizar `TicketDetail` com `isSupport={false}`.

## Fluxo do Suporte (`/support`)

Arquivos em `app/support` e `components/support` compõem o painel da equipe de suporte.

`app/support/layout.tsx`: guarda de rota para suporte/admin. Obtém sessão, carrega perfil e bloqueia acesso de usuários comuns redirecionando-os para `/employee`. Renderiza `SupportNav` e conteúdo.
`components/support/support-nav.tsx`: navegação client que traz atalhos "Chamados", "Ativos" e "Analytics". Destaca a rota ativa com variante do botão, mantém branding e fluxo de logout para suporte/admin.
`app/support/page.tsx`: pós-validação redireciona imediatamente para `/support/tickets`, mantendo URL raiz como alias da lista de chamados.
`app/support/tickets/page.tsx`: carrega tickets e lista de agentes (roles `support|admin`) e renderiza `SupportTicketsDashboard` com métricas, filtros e ações em tempo real.
`components/support/support-tickets-dashboard.tsx`: painel client-side com cards de métricas, filtros por status/prioridade, atribuição e mudança de status com atualização `resolved_at/closed_at`. Escuta canal `tickets-changes` para sincronia instantânea e mostra toasts informativos.
`app/support/assets/page.tsx`: busca inventário relevante para o usuário autenticado (todos se admin, apenas designados se suporte) e renderiza `SupportAssetsDashboard`.
`components/support/support-assets-dashboard.tsx`: visão focada em ativos sob responsabilidade, com métricas de inventário, filtros por categoria/status/pesquisa e sincronização realtime via canal `assets-owner-{userId}`.
- `app/support/tickets/[id]/page.tsx`: detalhe completo para suporte/admin. Reforça validação de permissão, busca ticket + mensagens (inclusive internas) e histórico em `ticket_history`, então renderiza `TicketDetail` com `isSupport={true}` e histórico.
- `app/support/analytics/page.tsx`: página de BI. Coleta tickets (com joins) e registros agregados de `ticket_stats`, renderizando `AnalyticsDashboard`.
- `components/support/analytics-dashboard.tsx`: centraliza análises com `useMemo` e Recharts. Calcula distribuições por status/prioridade/categoria, série dos últimos 7 dias, tempos médios de resposta/resolução, cumprimento de SLA e performance por agente (total, resolvidos, tempo médio). Organiza visualizações em abas (Visão Geral, Performance, Agentes) com gráficos de pizza, linhas e barras.

## Componentes Compartilhados

- `components/tickets/ticket-detail.tsx`: hub da conversação dos tickets. Cliente Supabase escuta canal `messages-{ticket.id}` para carregar mensagens em tempo real, respeitando visibilidade de mensagens internas (apenas suporte as vê). Permite resposta com toggle “Mensagem interna”, atualiza `responded_at` no primeiro retorno do suporte, mostra informações do ticket, SLA (deadlines, badges de cumprimento) e histórico quando disponível.
- `hooks/use-toast.ts` + componentes `components/ui/*`: abstraem notificações e componentes de UI padronizados.
- `lib/types.ts`: define tipos TypeScript para `User`, `Ticket`, `Message`, `TicketHistory`, prioridades, status e categorias, garantindo consistência entre front e Supabase.

## Integração com Supabase

- `lib/supabase/server.ts`: cria client server-side via `createServerClient` mantendo cookies de sessão (`@supabase/ssr`).
- `lib/supabase/client.ts`: singleton do client browser-side, reaproveitando instância entre renders.
- Tabelas relevantes (ver `scripts/00*.sql`): `users`, `tickets`, `messages`, `ticket_history`, `ticket_stats` com chaves estrangeiras para criador (`created_by`) e responsável (`assigned_to`).
- Canais realtime utilizados:
  - `tickets-changes` (suporte) para INSERT/UPDATE/DELETE de tickets;
  - `messages-{ticket.id}` (funcionários e suporte) para novas mensagens.

## Como Rodar Localmente

1. Instale dependências:
   ```bash
   npm install
   ```
2. Configure variáveis de ambiente Supabase (URL e ANON KEY) se necessário; a versão de desenvolvimento usa as chaves presentes em `lib/supabase/{server,client}.ts`.
3. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Acesse `http://localhost:3000` para usar a aplicação.

## Próximos Passos Sugestões

- Documentar também o fluxo de autenticação (`app/login`, `components/auth/login-form.tsx`).
- Detalhar scripts SQL (`scripts/`) com estrutura de tabelas e funções.
- Acrescentar exemplos de testes automatizados para regras de negócio críticas (criação de ticket, SLA, permissões).