# ConectaLog Suporte

Plataforma interna de abertura de chamados e acompanhamento de ativos da ConectaLog. A aplicação agora é uma SPA em **React + Vite**, utilizando Supabase como backend colaborativo e um servidor Express para integrações auxiliares (ConectaBot e APIs de ativos).

## Sumário

- [Stack Principal](#stack-principal)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Fluxos Principais](#fluxos-principais)
- [Integração com Supabase](#integração-com-supabase)
- [Como Rodar Localmente](#como-rodar-localmente)
- [Próximos Passos Sugestões](#próximos-passos-sugestões)

## Stack Principal

- **React 18 + Vite** para o front-end client-side com hot reload rápido.
- **React Router 6** controlando rotas para funcionários, suporte e administradores.
- **Chakra UI** e **styled-components** para estilização e componentes reutilizáveis.
- **Supabase** (Auth, Postgres, Realtime) como backend principal.
- **Express** em `server/index.ts` atuando como proxy para o ConectaBot (OpenAI) e APIs de ativos.

## Estrutura de Pastas

- `src/App.jsx`: ponto central do roteamento. Direciona cada perfil (`employee`, `support`, `admin`) para suas rotas dedicadas e injeta o cabeçalho comum.
- `src/pages/SupportDashboard.jsx`: painel unificado do suporte. Recebe a prop `section` (`"tickets"` ou `"assets"`) para renderizar a lista de chamados ou o inventário de ativos.
- `src/pages/EmployeeHome.jsx` e `src/pages/TicketDetail.jsx`: experiência do colaborador para abertura, listagem e acompanhamento dos seus chamados.
- `src/components/layout/`: cabeçalho responsivo (`AppHeader.jsx`) e wrapper de layout compartilhado (`Layout.jsx`).
- `src/components/admin/`: telas administrativas, incluindo `asset-management.tsx` e `AdminTicketsTable.tsx`.
- `src/services/` e `src/utils/`: helpers para consumo de APIs e formatação.
- `server/index.ts`: servidor Express que expõe `/api/assets` (validação com Supabase Service Role) e `/api/conectabot`.
- `supabaseClient.js`: cliete Supabase reutilizado pelo front-end.
- `scripts/`: arquivos SQL versionados com estrutura das tabelas e seeds.

## Fluxos Principais

**Funcionário (`/` / `/ticket/:id`)**
- `EmployeeHome.jsx` lista chamados do usuário autenticado, permite criar novos chamados e conversar com o suporte.
- `TicketDetail.jsx` exibe a conversa, anexos e históricos quando o colaborador abre um chamado específico.

**Suporte (`/support/*`)**
- `/support/tickets`: `SupportDashboard` com `section="tickets"`, incluindo filtros por status/prioridade, drag & drop e painel de chats atendidos.
- `/support/assets`: `SupportDashboard` com `section="assets"`, apresentando métricas, filtros e cartões detalhados dos ativos atribuídos ao agente.
- `/support/analytics`: `BI.jsx` com visão analítica consolidada.

**Administração (`/tickets`, `/ativos`, `/bi`)**
- `AdminTickets.tsx` reaproveita a view de chamados com privilégios administrativos.
- `AdminDashboard` consolida gestão completa de ativos.
- `BI.jsx` mostra dashboards estratégicos consumidos por suporte e administração.

## Integração com Supabase

- `supabaseClient.js` exporta o client autentica reutilizado no front.
- `server/index.ts` utiliza a chave Service Role para rotas protegidas (`/api/assets`).
- Real-time: canais de tickets e mensagens acompanhados por `SupportDashboard.jsx`, `EmployeeHome.jsx` e `TeamChatPanel.jsx` garantem atualização instantânea.
- Tabelas principais (ver `scripts/00*.sql`): `users`, `tickets`, `messages`, `ticket_history`, `assets`, `ticket_stats`.

## Como Rodar Localmente

1. Instale dependências:
   ```bash
   npm install
   ```
2. Configure variáveis Supabase/ConectaBot em um arquivo `.env` (URL, ANON KEY, SERVICE_ROLE, OPENAI).
3. Execute o front-end:
   ```bash
   npm run dev
   ```
   A SPA ficará disponível em `http://localhost:5173`.
4. (Opcional) Suba o servidor auxiliar para ConectaBot/ativos:
   ```bash
   npm run dev:api
   ```
5. Use `npm run dev:full` para subir front e servidor em paralelo dentro do mesmo terminal.

## Próximos Passos Sugestões

- Adicionar testes automatizados (unitários e e2e) para fluxos críticos de chamados e ativos.
- Configurar CI para lint/build/test antes de deploys.
- Documentar as variáveis de ambiente esperadas por `server/index.ts` e scripts SQL de provisionamento.