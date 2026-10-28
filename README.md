# ZYRVA Agents

Plataforma brasileira multiempresa para criar, testar, publicar e acompanhar agentes de atendimento com IA. O MVP prioriza o painel da ZYRVA, o criador de agentes, o playground, leads, atendimento humano e a preparação da integração oficial com o WhatsApp.

> **Estado desta entrega:** o projeto inicia em `APP_MODE=demo` e usa dados fictícios. Ele permite avaliar o produto sem gastar créditos nem possuir contas da OpenAI ou da Meta. Integrações externas, mensagens reais e operação comercial exigem credenciais próprias, infraestrutura e a conclusão dos checklists de produção. Nunca envie chaves por conversa nem as grave no repositório.

## O que você pode avaliar agora

- painel responsivo em português do Brasil;
- empresas e agentes demonstrativos da RBR Garage, Serra Doces e Educallis;
- criador de agente e geração de configuração em modo simulado;
- playground para testar conversa, intenção, confiança, fontes e handoff;
- visões de conversas, leads, conhecimento, automações, métricas e auditoria;
- login local de demonstração;
- PostgreSQL com `pgvector`, Redis e migrações via Docker Compose;
- rotas preparadas para OpenAI Responses API e Meta WhatsApp Cloud API.

Dados, contagens e conversas do modo demo são demonstrativos. Eles não representam clientes, vendas, consumo ou integrações reais.

## Stack desta versão

| Camada | Tecnologia |
| --- | --- |
| web | Next.js 16.3, React 19.2 e TypeScript estrito |
| interface | Tailwind CSS 4.3 e componentes acessíveis |
| dados | PostgreSQL 17, `pgvector` 0.8.5 e Prisma 7.9 |
| fila | Redis 8.2 e BullMQ 6 |
| IA | SDK OpenAI 7, Responses API e embeddings |
| runtime | Node.js 24 LTS |
| testes | Vitest 4 e Playwright 1.62 |

## Demo sem Docker

Este é o caminho mais rápido para avaliar a interface e as APIs simuladas. Ele exige apenas Node.js 24 LTS; banco e Redis não são necessários em `APP_MODE=demo`.

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) e entre com:

```text
E-mail: leonardo@zyrva.demo
Senha:  ZyrvaDemo!2026
```

Essa senha é intencionalmente pública e só pode ser usada com `APP_MODE=demo`. Os dados são fictícios e podem voltar ao estado inicial ao reiniciar; este caminho não valida PostgreSQL, fila ou integrações externas.

Se `node` ou `npm` não estiverem instalados, siga [Desenvolvimento no computador](#desenvolvimento-no-computador).

## Ambiente completo com Docker

Esta opção valida aplicação, PostgreSQL/pgvector, migrações e Redis em conjunto. Você precisa do [Docker Desktop](https://www.docker.com/products/docker-desktop/) com Docker Compose.

1. Abra o PowerShell nesta pasta.
2. Crie o arquivo local de configuração:

```powershell
Copy-Item .env.example .env
```

3. Suba aplicação, banco e Redis:

```powershell
docker compose --profile demo up --build
```

4. Quando o serviço estiver saudável, abra [http://localhost:3000](http://localhost:3000).

Os serviços one-shot `migrate` e `seed` aplicam o schema e inserem/atualizam os três cenários fictícios. O `seed` pertence somente ao perfil `demo`.

Para encerrar:

```powershell
docker compose down
```

O comando preserva os volumes. Para apagar **todos os dados locais** e recomeçar, use `docker compose down -v` somente quando tiver certeza.

## Desenvolvimento no computador

Pré-requisitos para o ambiente completo:

- Node.js 24 LTS;
- npm compatível com o `package-lock.json`;
- Docker Desktop para PostgreSQL e Redis.

No Windows, se `node` ou `npm` aparecer como “comando não reconhecido”, instale o [Node.js 24 LTS](https://nodejs.org/en/download), feche e abra novamente o PowerShell e confirme:

```powershell
node --version
npm --version
```

A pasta `.tools` usada temporariamente nesta execução está ignorada pelo Git e **não faz parte do projeto distribuído**. Uma nova máquina deve instalar Node.js 24 LTS normalmente; não dependa dessa pasta.

Prepare o ambiente com persistência:

```powershell
Copy-Item .env.example .env
docker compose up -d postgres redis vector-init
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Alterações de código são recarregadas automaticamente.

Comandos mais usados:

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run worker:meta` | consumidor seguro da fila Meta, somente em `APP_MODE=production` |
| `npm run lint` | regras de qualidade do código |
| `npm run typecheck` | validação do TypeScript |
| `npm test` | testes unitários e de integração |
| `npm run test:e2e` | testes de ponta a ponta com Playwright |
| `npm run build` | build de produção |
| `npm run db:migrate -- --name nome_da_mudanca` | cria migração durante desenvolvimento |
| `npm run db:deploy` | aplica migrações existentes |
| `npm run db:seed` | recria/atualiza dados fictícios locais |
| `npm run db:provision-meta` | vincula um número Meta a organização, empresa e agente existentes |
| `npm run db:studio` | abre a interface local do Prisma |
| `npm run check` | lint, tipos, testes e build em sequência |

Se uma porta local estiver ocupada, altere `APP_PORT`, `POSTGRES_PORT` ou `REDIS_PORT` no `.env`. Veja logs com `docker compose logs --tail 100 app migrate seed postgres redis`.

## Modos demo e produção

`APP_MODE` controla a fronteira entre simulação e provedores reais:

| Valor | Comportamento esperado |
| --- | --- |
| `demo` | aceita a conta local, mostra dados fictícios e usa adaptadores simulados; chaves externas podem ficar vazias |
| `production` | desabilita credenciais demo e deve falhar de forma segura quando um segredo obrigatório estiver ausente |

No modo demo, o cookie de sessão omite `Secure` para funcionar em `http://localhost`. Em `APP_MODE=production`, o servidor adiciona `Secure`; portanto, HTTPS é obrigatório.

O consumidor da fila Meta roda separado da interface. Em produção, defina `APP_MODE=production` e `TRUST_PROXY=true` no `.env`, configure os segredos e use `docker compose --profile production up --build`. App e worker recebem o mesmo modo; se ele continuar em `demo`, o worker recusa iniciar. O seed fictício não faz parte desse perfil. O worker persiste a mensagem e pausa a IA para atendimento humano; ele não envia respostas automáticas nesta entrega.

`META_PHONE_NUMBER_ID` sozinho não cria um canal. Depois de cadastrar organização, empresa e agente no banco, informe `META_CHANNEL_ORGANIZATION_ID`, `META_CHANNEL_COMPANY_ID` e `META_CHANNEL_AGENT_ID`, então execute `npm run db:provision-meta` (ou o mesmo comando no target `migrator`). O script recusa reutilizar um número pertencente a outro tenant.

Mudar a variável para `production` **não torna a aplicação pronta para clientes**. Antes disso, conclua revisão de segurança, domínio/TLS, backups, observabilidade, políticas LGPD, configuração da Meta, limites de custo e testes do fluxo completo.

## Variáveis de ambiente

O arquivo [.env.example](.env.example) documenta todas as variáveis. As principais são:

- `DATABASE_URL` e `REDIS_URL`: persistência e fila;
- `AUTH_SECRET`: assinatura das sessões;
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`: mesma chave no build e no runtime de todas as réplicas;
- `OPENAI_API_KEY`: chave criada no projeto da OpenAI;
- `OPENAI_MODEL_RUNTIME`: modelo das conversas, padrão `gpt-5.6-terra`;
- `OPENAI_MODEL_BUILDER`: modelo que estrutura o rascunho do agente, padrão `gpt-5.6-terra`;
- `OPENAI_MODEL_EMBEDDINGS`: padrão `text-embedding-3-small`;
- `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID` e `META_GRAPH_API_VERSION`: conexão oficial da Meta;
- `META_CHANNEL_ORGANIZATION_ID`, `META_CHANNEL_COMPANY_ID` e `META_CHANNEL_AGENT_ID`: escopo usado pelo provisionamento explícito do canal.

Use um gerenciador de segredos em produção. Variáveis que começam com `NEXT_PUBLIC_` são expostas ao navegador e nunca devem conter tokens.

## Rotas operacionais

| Método e rota | Uso |
| --- | --- |
| `GET /api/health` | health check da aplicação |
| `POST /api/auth/demo` | login local, somente em modo demo |
| `POST /api/auth/logout` | encerra a sessão |
| `POST /api/agents/generate` | gera configuração declarativa de agente |
| `POST /api/playground/message` | processa uma mensagem no simulador |
| `GET /api/webhooks/meta` | verificação inicial do webhook pela Meta |
| `POST /api/webhooks/meta` | recebe eventos assinados do WhatsApp |

O endpoint do webhook precisa de HTTPS público para a Meta. Não use túnel temporário nem token de teste como configuração permanente de produção.

## Arquitetura resumida

```text
Navegador
   |
Next.js (painel + APIs)
   |---- PostgreSQL + pgvector (dados multiempresa e conhecimento)
   |---- Redis/BullMQ (webhooks e tarefas assíncronas)
   |---- OpenAI Responses API (adaptador real, opcional)
   `---- Meta WhatsApp Cloud API (adaptador real, opcional)
```

Toda consulta de dados de negócio deve carregar o `organizationId` derivado da sessão, nunca de um identificador confiado do navegador. Webhooks identificam a empresa pelo `phone_number_id`, validam assinatura e usam idempotência antes de enfileirar trabalho.

## Documentação

- [Arquitetura](docs/architecture.md)
- [Modelo de dados](docs/data-model.md)
- [OpenAI Responses API](docs/openai.md)
- [Meta WhatsApp Cloud API e webhook](docs/meta-whatsapp.md)
- [Publicação e operação](docs/deployment.md)
- [Segurança e LGPD](docs/security-lgpd.md)
- [Decisões e limitações conhecidas](docs/decisions-and-limitations.md)
- [Checklists de produção e cliente](docs/production-checklists.md)

## Antes de conectar um cliente real

São necessários, no mínimo:

- conta e projeto próprios na OpenAI com cobrança e limites configurados;
- Meta Business Portfolio, aplicativo Meta, WABA e número dedicado ao atendimento;
- domínio HTTPS público e estável para o webhook;
- PostgreSQL e Redis gerenciados ou operados com backup e monitoramento;
- textos de privacidade, termos, consentimento e retenção revisados por profissional competente;
- contrato, papéis LGPD e procedimento de atendimento aos titulares definidos;
- teste de isolamento entre organizações, restauração de backup e handoff humano;
- aprovação dos templates e verificação das regras vigentes do WhatsApp.

Este repositório não representa certificação jurídica, de segurança ou de conformidade da ZYRVA. A responsabilidade de validar regras vigentes, contratos e base legal permanece com a operação.

## Fontes técnicas

A implementação e os guias foram alinhados com documentação oficial atual em 06/08/2026:

- [Next.js: deployment](https://nextjs.org/docs/app/getting-started/deploying)
- [Prisma: Docker](https://www.prisma.io/docs/guides/deployment/docker)
- [OpenAI: orientação de modelos](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI: `gpt-5.6-terra`](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
- [OpenAI: `text-embedding-3-small`](https://developers.openai.com/api/docs/models/text-embedding-3-small)
- [Meta: WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/)
- [Meta: coleção oficial da WhatsApp Business Platform](https://www.postman.com/meta/whatsapp-business-platform/overview)

Políticas, preços, limites e versões de API mudam. Confirme novamente essas fontes antes de cada entrada em produção.

## Validação deste ambiente

Os executáveis globais `node`, `npm` e `docker` não estavam disponíveis no `PATH` desta máquina. Com a cópia temporária ignorada em `.tools`, passaram `prisma generate`, `prisma validate`, `npm test` e o build de produção do Next.js. Encoding UTF-8, links relativos e parse do YAML também foram verificados.

O Docker Compose não pôde ser iniciado aqui. Execute `docker compose config` e o fluxo do ambiente completo em uma máquina com Docker antes de qualquer publicação.
