# Sistema de Tickets — Design

Data: 2026-11-13 · Branch: `feature/tickets`

## 1. Intenção

Ajudar os jogadores da Craftsapiens com um sistema de tickets próprio do Assistente, melhor do que o bot de tickets usado hoje. Hoje um bot externo cria canais privados `ticket-NNNN` fora de categorias (no topo da lista de canais) (≈ 8.900 tickets até agora) e renomeia para `closed-NNNN` ao fechar, deixando os canais parados na lista. A staff recebe pedidos sem contexto ("oi, preciso de ajuda") e não sabe quem está atendendo o quê.

O novo sistema mantém a aparência que jogadores e staff já conhecem (um canal privado por ticket, mesmo padrão de nome) e acrescenta: formulário por tipo de ticket, ficha do jogador para a staff, botão "Assumir", fechamento com transcrição salva e limpeza automática dos canais.

## 2. Objetivos, não-objetivos, anti-objetivos

**Objetivos (v1)**
1. Formulário de abertura por tipo de ticket.
2. Um ticket aberto por jogador.
3. Ficha do jogador para a staff (conta vinculada, dados da API, punições anteriores).
4. Botão "Assumir" mostrando quem atende.
5. Fechamento com transcrição salva e canal apagado depois de um prazo.
6. Avaliação **secreta** do atendimento pelo jogador: 3 perguntas rápidas, um clique cada. Fica só no banco, mais um resumo mensal.

**Não-objetivos (ficam para versões futuras)**
- IA respondendo dúvidas antes da staff.
- DM ao jogador, lembrete de ticket parado, auto-fechamento por inatividade.
- Página de tickets no painel web e métricas além do resumo mensal.
- Comentário escrito na avaliação (o dono pediu avaliação rápida, só clique).
- Reenviar o resumo mensal se o bot estiver desligado na hora agendada.
- Reabrir ticket, transferir atendimento, adicionar outros membros ao ticket.
- Migrar tickets do bot antigo.

**Anti-objetivos (seria fracasso mesmo funcionando)**
- Qualquer funcionalidade existente parar ou mudar de comportamento em produção.
- Jogador conseguir ver informação só da staff (punições, ficha) ou ver ticket de outro jogador.
- Um erro no módulo de tickets derrubar o bot inteiro.
- Código do ticket espalhado pelos arquivos existentes.

## 3. Restrições

- **Nada que funciona hoje pode parar.** Mudanças em arquivos existentes ficam limitadas aos pontos de encaixe da seção 6, e cada uma mantém o comportamento atual quando as variáveis novas não existem.
- **Código limpo:** o ticket fica num módulo isolado e as funções puras ficam separadas do código que fala com o Discord.
- Stack existente: TypeScript, oceanic.js, Mongoose. Nenhuma dependência nova.
- ESLint do projeto: aspas duplas, ponto e vírgula, fim de linha LF.
- Textos para o usuário em português (pt-BR).
- Commits só na branch `feature/tickets`.

## 4. Abordagens consideradas

| Abordagem | Trade-off | Decisão |
|---|---|---|
| **A. Um canal privado por ticket, fora de categorias** | Igual ao que todos conhecem hoje. O handler existente de denúncia em canais `ticket-…` continua funcionando. Sem categoria, o filtro de links não age e o limite de 50 canais por categoria não se aplica. A staff vê os tickets no topo da lista, como hoje. Mais código de permissões. | **Escolhida** pelo dono do projeto (inclusive o "fora de categorias") |
| B. Thread privada dentro de `#suporte` | Sem limite prático e lista de canais limpa, mas muda o costume e o handler existente não roda em threads. | Descartada |
| C. Modmail (DM para o bot) | Muito mais código, e não funciona para quem tem DM fechada. | Descartada |

## 5. Como funciona (fluxo)

### 5.1 Painel
- Um staff com permissão `Gerenciar Servidor` usa `/ticket painel` num canal. O bot publica um embed "Precisa de ajuda?" com um **menu de seleção**: uma opção por tipo de ticket, cada uma com descrição curta.

### 5.2 Abertura
1. O jogador escolhe o tipo no menu.
2. Um jogador pode ter até **3 tickets abertos** ao mesmo tempo (ex.: duas denúncias e uma dúvida).
   - Se já tem 1 ou 2 abertos, recebe uma mensagem efêmera com os links e a pergunta "Quer abrir outro de <tipo> mesmo assim?", com os botões **Abrir outro** e **Cancelar**.
   - Se já tem 3, recebe os links e o pedido para fechar um antes; nada é criado. O limite é conferido de novo no envio do formulário.
3. Senão, abre um **modal** com os campos do tipo:

| Tipo | Campos do modal |
|---|---|
| 🚨 Denúncia | Nick do denunciado · O que aconteceu · Links de provas (opcional) |
| ❓ Dúvida | Sua dúvida |
| 🐛 Bug | O que aconteceu · Como reproduzir (opcional) |
| ⚖️ Recorrer de punição | Nick punido · Por que a punição deve ser revista |
| 💎 VIP / Compras | Nick · Descreva o problema · ID/comprovante da compra (opcional) |

4. Ao enviar o modal, o bot:
   - reserva o próximo número (contador atômico no Mongo);
   - cria o canal `ticket-NNNN` **fora de categorias**, como o bot atual faz, visível **só** para o jogador, para os cargos de staff e para o próprio bot (as permissões vão no próprio canal, porque não há categoria para herdar);
   - publica a mensagem inicial: menciona o jogador e os cargos de staff, mostra um embed com o tipo e as respostas do formulário, e os botões **Assumir**, **Ficha** e **Fechar**;
   - responde ao jogador (efêmero) com o link do canal.
5. Provas em arquivo: o modal não aceita upload, então a mensagem inicial pede para o jogador enviar imagens e vídeos no próprio canal.

### 5.3 Ficha do jogador (botão "Ficha")
- **Só a staff** pode usar, e a resposta é **efêmera** (só quem clicou vê). Assim as punições nunca ficam visíveis ao jogador no canal.
- Conteúdo:
  - usuário do Discord, apelido no servidor e se a conta está vinculada (`client.getDiscordByNick`);
  - dados da API pelo apelido: grupo, online, cidade e nação (`client.api.getPlayerInfo`);
  - quantidade de punições e as 3 últimas na ordem do array (`userDB.findOne({ nick }).punicoes`). O campo é `Mixed` e só tem `horario` como texto formatado, então não dá para ordenar por data.
- Cada fonte falha de forma independente. Se a API cair ou a conta não estiver vinculada, a ficha mostra "indisponível" ou "não vinculado" naquele campo e continua.

### 5.4 Assumir
- Só a staff pode assumir. O bot grava quem assumiu, edita a mensagem inicial para "Atendido por @staff" e desativa o botão.
- Se o ticket já foi assumido, quem clicar recebe uma resposta efêmera dizendo quem está atendendo.

### 5.5 Fechar
1. O jogador ou a staff clica em **Fechar** e confirma num botão efêmero (sem diálogo).
2. O bot:
   - renomeia o canal para `closed-NNNN` e tira do jogador a permissão de enviar mensagens;
   - gera a transcrição (autor, data e hora, texto, URLs de anexos) e salva no documento do ticket;
   - publica no canal de log da staff um resumo (número, tipo, jogador, quem assumiu, quem fechou, duração) com a transcrição em anexo `.txt`;
   - marca o ticket como fechado, com o horário em que o canal deve ser apagado.
3. Depois de `TICKETS_DELETE_AFTER_HOURS`, o canal é apagado. A verificação roda a cada 1 minuto e também ao iniciar o bot, então sobrevive a reinicializações.

### 5.6 Avaliação do atendimento (secreta, um clique por pergunta)
Perguntas, nesta ordem (lista fixa no código, então dá para mudar ou acrescentar uma 4ª editando só os dados):

| # | id | Pergunta | Botões (valor gravado) |
|---|---|---|---|
| 1 | `resolved` | Seu problema foi resolvido? | Sim (2) · Em parte (1) · Não (0) |
| 2 | `service` | Como você avalia o atendimento? | 1 · 2 · 3 · 4 · 5 |
| 3 | `speed` | E o tempo até ser atendido? | 1 · 2 · 3 · 4 · 5 |

1. Logo depois de fechar, o bot publica no canal `closed-NNNN` a pergunta 1 com os botões, e o aviso "Suas respostas são anônimas para a staff (1/3)". O jogador perdeu a permissão de escrever, mas ainda consegue clicar em botões.
2. Cada clique grava a resposta e **troca a mesma mensagem** pela próxima pergunta (2/3, 3/3). Depois da última, a mensagem vira "Avaliação registrada. Obrigado!". A mensagem **nunca mostra a resposta anterior**, porque a staff também vê o canal.
3. **Só quem abriu o ticket** responde. Cada pergunta é gravada uma vez só e na ordem (gravação atômica: só grava a pergunta N se já houver exatamente N−1 respostas). Clique duplicado ou fora de ordem é ignorado. Para os outros, a resposta é efêmera.
4. Se o jogador parar no meio, as respostas dadas ficam gravadas.
5. As respostas **não aparecem em nenhum lugar no Discord por ticket**: nem no log, nem no canal.
6. A avaliação fica aberta enquanto o canal existir, até ele ser apagado pelo prazo. Fica ligada ao ticket, e por ele a quem assumiu (`claimedBy`).

### 5.7 Resumo mensal
- No dia 1 de cada mês, às 09:00 (America/Sao_Paulo), o bot publica no canal `TICKETS_SUMMARY_CHANNEL_ID` o resumo do mês anterior, com base nos tickets **fechados** naquele mês:
  - total de tickets fechados e quantos por tipo;
  - quantos tiveram pelo menos uma resposta; % de "resolvido" (Sim = 100%, Em parte = 50%, Não = 0%); média de atendimento e média de tempo (1–5);
  - por staff que assumiu: tickets atendidos, quantos avaliados, % resolvido, média de atendimento e média de tempo. Os sem atendente ficam numa linha "Sem atendente".
  - Médias consideram só quem respondeu aquela pergunta. Sem respostas, aparece `—`.
- O resumo **não mostra notas individuais nem jogadores**.
- Usa `node-cron`, que o projeto já usa, num agendamento próprio do módulo. O agendamento existente em `main.ts` não é tocado.
- Sem `TICKETS_SUMMARY_CHANNEL_ID`, o resumo não é enviado, mas as avaliações continuam sendo gravadas.

## 6. Arquitetura

### 6.1 Módulo novo
```
src/modules/tickets/
  config.ts        lê e valida as variáveis TICKETS_* (uma vez, com tipos)
  model.ts         Mongoose: Ticket + contador
  categories.ts    tipos de ticket e campos do modal (só dados)
  service.ts       regras: abrir, assumir, fechar, limpar (usa o client)
  views.ts         embeds, botões, modais (funções puras)
  transcript.ts    formata a transcrição (função pura)
  survey.ts        perguntas da avaliação e cálculo do resumo mensal (funções puras)
  handlers.ts      roteia customIDs "ticket:*" para o service
  scheduler.ts     apaga canais fechados vencidos
  index.ts         API pública: isTicketInteraction, handleTicketInteraction, startTickets
```
- Os IDs de componentes seguem o formato `ticket:<ação>[:<id>]`, por exemplo `ticket:open:<tipo>`, `ticket:modal:<tipo>`, `ticket:claim:<ticketId>`, `ticket:close:<ticketId>`, `ticket:close-confirm:<ticketId>`, `ticket:profile:<ticketId>`, `ticket:rate:<ticketId>:<índice da pergunta>:<valor>`.
- Todo handler roda dentro de `try/catch`. Um erro é logado com o prefixo `[TICKETS]` e o usuário recebe uma resposta efêmera "Não foi possível…". Nada sobe para o processo.

### 6.2 Dados (`model.ts`)
- **Ticket:** `number`, `guildId`, `channelId`, `userId`, `category`, `answers` (pares campo/resposta), `status` (`open` | `closed`), `claimedBy`, `closedBy`, `createdAt`, `claimedAt`, `closedAt`, `deleteAt`, `survey` (lista ordenada de `{ questionId, value, answeredAt }`), `transcript` (lista de `{ authorId, authorTag, content, attachments[], createdAt }`).
  - Índice em `{ guildId, userId, status }` para contar os tickets abertos de cada jogador (limite de 3).
- **Contador:** documento `{ _id: "ticket", seq }`, incrementado com `findOneAndUpdate({ $inc })`. Ao iniciar, o módulo faz `seq = max(seq, TICKETS_START_NUMBER - 1)`. O valor **só sobe, nunca desce**, então mudar a variável para um número maior pula a numeração, e um número menor é ignorado.

### 6.2.1 Por que fora de categorias
- O filtro de links ([messageCreate.ts:114](../../../src/events/messageCreate.ts)) não age em canais com `parentID === null`, então links de provas não são apagados, sem mudar o código existente.
- Não existe o limite de 50 canais por categoria. Vale o limite do servidor (500 canais), longe do volume de tickets.
- Se a criação do canal falhar por qualquer motivo, o jogador recebe "Não foi possível abrir o ticket agora, tente em alguns minutos" e o erro vai para o log `[TICKETS]`.

### 6.3 Pontos de encaixe no código existente (as únicas mudanças fora do módulo)
1. **`src/events/interactionCreate.ts`:** no início de `run`, se `TICKETS_ENABLED` e `isTicketInteraction(interaction)`, repassa para `handleTicketInteraction` e retorna. `isTicketInteraction` verifica o **prefixo `ticket:` do customID**, tanto em componentes (que o arquivo já trata, como `confirm_ban…`) quanto em envios de modal (que o arquivo hoje não trata). Qualquer outro customID segue o fluxo atual sem mudança.
2. **`src/structures/Client.ts`, `updateSlash()`:** troca o ID fixo por `process.env.GUILD_ID || "892472046729179136"`.
3. **`src/events/ready.ts`:** se `TICKETS_ENABLED`, chama `startTickets(client)`, que inicia o scheduler.
4. **`src/commands/Mod/ticket.ts`** (arquivo novo, carregado pelo auto-loader): comando `/ticket` com os subcomandos `painel` e `resumo`. O `resumo` envia na hora o resumo do mês anterior para o canal da gestão e exige a permissão Gerenciar Servidor. A permissão do `painel` é checada dentro do `execute` (membro com cargo de staff ou permissão Gerenciar Servidor), porque o `updateSlash()` atual não repassa `default_member_permissions` ao Discord. Se o módulo estiver desligado, responde "Sistema de tickets desativado".

5. **`package.json`:** scripts `seed:test` e `test:tickets`.
6. **`src/scripts/seed-test.ts`** (arquivo novo): fica dentro de `src/` porque o `tsconfig.json` tem `rootDir: ./src`. Fora de `src/`, o `npm run build` quebra.

Com `TICKETS_ENABLED` ausente ou falso, o comportamento é idêntico ao da `master`, exceto pelo comando `/ticket` aparecer na lista e responder "desativado".

### 6.4 Configuração (`.env`)
| Variável | Uso | Padrão |
|---|---|---|
| `GUILD_ID` | servidor onde os slash commands são registrados | `892472046729179136` |
| `TICKETS_ENABLED` | liga o módulo | `false` |
| `TICKETS_STAFF_ROLE_IDS` | cargos de staff, separados por vírgula | obrigatório se ligado |
| `TICKETS_LOG_CHANNEL_ID` | canal de log e transcrições da staff | obrigatório se ligado |
| `TICKETS_SUMMARY_CHANNEL_ID` | canal **só da gestão** para o resumo mensal de avaliações | opcional (sem ele, não há resumo) |
| `TICKETS_START_NUMBER` | primeiro número do contador | `8917` |
| `TICKETS_DELETE_AFTER_HOURS` | prazo para apagar canal fechado | `24` |

Se o módulo estiver ligado e faltar uma variável obrigatória, o `config.ts` loga o erro e **mantém o módulo desligado**. O bot sobe normalmente.

## 7. Testes e validação

### 7.1 Etapa 1 — servidor de teste (desenvolvimento)
- Bot de teste (aplicação separada no Developer Portal), servidor Discord vazio e MongoDB separado (local ou Atlas grátis). `.env` com `TOKEN` de teste, `MONGODB` de teste, `GUILD_ID` de teste, `DEVELOPMENT=true` e as variáveis `TICKETS_*`.
- **Script `npm run seed:test`** (`src/scripts/seed-test.ts`): cria o documento `global` do `GUILD_ID` no banco. Sem esse documento, todo slash command quebra em `db.blacklistedUsers` num banco vazio. O script recusa rodar se `DEVELOPMENT !== "true"`.
- Fora do ticket, outras funções do bot não funcionam no servidor de teste (IDs fixos do servidor real), e os bots de música só logam erro sem token. Isso é esperado.
- No servidor de teste, a ficha mostra "não vinculado", porque a verificação depende do servidor real. O teste confirma que ela não quebra.
- As funções puras (`views.ts`, `transcript.ts`, `config.ts`) ganham testes com `node:test` via `ts-node`, sem dependência nova. Esses testes rodam localmente (Node 20). O CI usa Node 16 e só roda ESLint, então eles ficam fora do CI.

### 7.2 Etapa 2 — bot real, antes do merge
- A branch sobe no lugar da `master` no servidor de produção, usando o MongoDB de produção. `TICKETS_START_NUMBER` fica uns 100 acima do último número do bot antigo (ex. `9100`), para não colidir enquanto os dois rodam. No go-live a numeração só continua daí; um salto nos números não atrapalha.
- Antes do go-live, a staff fecha todos os tickets de teste, para que nenhum deles bloqueie alguém pela regra de um ticket por jogador.
- O painel é publicado num canal visível **só para a staff**. A staff testa o fluxo completo com dados reais: API, contas vinculadas, punições.
- Rollback: voltar para a `master` e reiniciar.
- Aprovado: merge na `master`, painel movido para o canal público e painel do bot antigo desativado.

### 7.3 Checklist manual (as duas etapas)
- [ ] Painel aparece, e cada tipo abre o modal certo.
- [ ] Segundo ticket do mesmo jogador é recusado com link para o aberto.
- [ ] Outro jogador não vê o canal.
- [ ] Jogador não consegue usar Assumir nem Ficha.
- [ ] Ficha mostra dados ou "indisponível" sem erro.
- [ ] Assumir atualiza a mensagem, e segundo clique informa quem atende.
- [ ] Fechar renomeia, bloqueia o jogador, posta log com transcrição.
- [ ] Canal fechado é apagado após o prazo, inclusive se o bot reiniciar no meio.
- [ ] Após fechar, o jogador responde as 3 perguntas com 1 clique cada. A mensagem avança 1/3 → 2/3 → 3/3 → "Avaliação registrada" sem mostrar respostas, e nada aparece no log. Outra conta não consegue responder. Clique duplo não grava duas vezes.
- [ ] O resumo mensal, disparado à mão no teste, mostra totais e médias por staff, sem notas individuais nem jogadores.
- [ ] Com `TICKETS_ENABLED=false`, nada do ticket roda.
- [ ] Comandos, moderação automática e música existentes funcionam como antes (etapa 2).

## 8. Decisões tomadas pelo Claude (o dono pode corrigir)
1. Ficha por botão efêmero só para a staff, em vez de embed fixo no topo do canal, porque o canal é compartilhado com o jogador e as punições não devem ficar expostas.
2. Painel com 5 botões, um por tipo. O menu de seleção foi descartado porque, quando o jogador fecha o formulário sem enviar, o menu fica preso na opção escolhida e não dá para escolher a mesma de novo.
3. Fechamento: o canal vira `closed-NNNN` e é apagado 24h depois (configurável). A transcrição vai para o canal de log e para o banco.
4. Um ticket aberto por jogador, contando todos os tipos.
5. Numeração: contador próprio no banco que só sobe, começando uns 100 acima do último número do bot antigo, para não colidir durante a etapa 2.
6. Sem configuração de categoria: os tickets ficam sempre fora de categorias. Colocar numa categoria faria o filtro de links apagar provas.
7. Ficha: "3 últimas punições" usa a ordem do array, porque o banco não guarda a data em formato ordenável.
8. O handler existente de denúncia em canais `ticket-…` continua rodando também nos tickets novos. Ele pode repetir o pedido de provas num ticket de Denúncia, e isso é aceito na v1.
9. Avaliação: as 3 perguntas e seus valores (tabela 5.6), feitas em sequência na mesma mensagem para não expor respostas à staff no canal.
10. Resumo mensal: dia 1 às 09:00 (America/Sao_Paulo), em canal próprio só da gestão, sem notas individuais nem jogadores.

## 9. Deixado para quem implementar
- Textos exatos de embeds e mensagens, cores e emojis.
- Limites de caracteres dos campos do modal.
- Paginação da busca de mensagens para a transcrição (canais muito longos).
- Ordem de criação dos arquivos e divisão dos commits.
