# ConectaLog Suporte

Este projeto é uma solução de suporte interno para a empresa ConectaLog, permitindo que os usuários abram chamados, atribuam graus de importância e que a equipe de TI receba atualizações em tempo real sobre o status e SLA dos chamados.

## Estrutura do Projeto

O projeto é organizado da seguinte forma:

```
conectalog-suporte
├── src
│   ├── app.ts                # Ponto de entrada da aplicação, configura o roteamento e inicializa o aplicativo React.
│   ├── components            # Componentes reutilizáveis da aplicação.
│   │   ├── TicketForm.tsx    # Formulário para abertura de chamados.
│   │   ├── TicketList.tsx    # Lista de chamados abertos.
│   │   ├── TicketDetail.tsx   # Detalhes de um chamado específico.
│   │   └── StatusBadge.tsx    # Indicador visual do status do chamado.
│   ├── pages                 # Páginas da aplicação.
│   │   ├── Home.tsx          # Tela inicial da aplicação.
│   │   ├── Tickets.tsx       # Página que lista todos os chamados abertos.
│   │   └── AdminDashboard.tsx # Página para a equipe de TI gerenciar chamados.
│   ├── services              # Serviços para interagir com APIs e bancos de dados.
│   │   └── supabaseClient.ts  # Configuração do cliente Supabase.
│   ├── types                 # Tipos e interfaces utilizados no projeto.
│   │   └── index.ts          # Exportação de tipos e interfaces.
│   └── utils                 # Funções utilitárias.
│       └── slaCalculator.ts   # Cálculo do SLA dos chamados.
├── package.json              # Configuração do npm, dependências e scripts.
├── tsconfig.json             # Configuração do TypeScript.
└── README.md                 # Documentação do projeto.
```

## Instalação

1. Clone o repositório:
   ```
   git clone <url-do-repositorio>
   cd conectalog-suporte
   ```

2. Instale as dependências:
   ```
   npm install
   ```

3. Configure o Supabase com suas credenciais.

## Uso

Para iniciar a aplicação, execute:
```
npm start
```

A aplicação estará disponível em `http://localhost:3000`.

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

## Licença

Este projeto está licenciado sob a MIT License. Veja o arquivo LICENSE para mais detalhes.