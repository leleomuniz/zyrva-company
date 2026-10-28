# Publicação e operação

Este guia separa desenvolvimento local de produção. `docker-compose.yml` é uma conveniência local; suas senhas padrão, portas e volumes não constituem uma arquitetura de produção.

## Ambientes

Mantenha recursos e credenciais separados:

| Ambiente | Dados | Provedores | Acesso |
| --- | --- | --- | --- |
| local | somente fictícios | adaptadores demo | computador do desenvolvedor |
| homologação | fictícios/autorizados | contas de teste OpenAI/Meta | equipe restrita |
| produção | clientes reais | projetos/ativos de produção | menor privilégio |

Nunca restaure banco de produção no ambiente local sem processo formal de anonimização.

## Docker Compose local

Serviços:

- `postgres`: PostgreSQL 17 com binário `pgvector`;
- `vector-init`: cria `CREATE EXTENSION vector` de forma idempotente;
- `redis`: Redis com AOF local;
- `migrate`: aplica `prisma migrate deploy` uma vez;
- `seed`: perfil `demo`, executa o seed idempotente com as três empresas fictícias;
- `app`: build de produção do Next.js na porta 3000;
- `worker`: perfil `production`, consome a fila Meta sem executar respostas externas.

O serviço `seed` existe para o ambiente local e cria registros marcados como demonstração. Não execute esse seed em banco de produção.

Inicialização completa:

```powershell
Copy-Item .env.example .env
docker compose --profile demo up --build
```

Verificação:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
docker compose ps
docker compose logs --tail 100 app migrate seed
```

Para executar Next.js no host e somente dependências no Docker:

```powershell
docker compose up -d postgres redis vector-init
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

As portas de banco e Redis são publicadas apenas em `127.0.0.1`. O volume Redis/AOF ajuda no desenvolvimento, mas não substitui durabilidade/backup gerenciado.

## Imagem Docker

O `Dockerfile` usa Node.js 24 sobre Debian slim e possui targets:

- `builder`: gera Prisma Client e executa `next build`;
- `migrator`: contém o Prisma CLI e executa migrações;
- `runner`: imagem final, usuário sem privilégio, `next start`.

Build manual:

```powershell
docker build --target runner -t zyrva-agents:local .
```

O projeto não usa `output: "standalone"` nesta etapa; a imagem final inclui dependências de produção. Se essa opção for adotada depois, altere Dockerfile e `next.config.ts` juntos e valide Prisma, arquivos estáticos e runtime. Consulte o [guia oficial do Next.js](https://nextjs.org/docs/app/getting-started/deploying).

## Topologia recomendada

```text
Internet
  -> DNS/CDN/WAF/reverse proxy/TLS
     -> serviço web Next.js (1+ réplicas)
     -> endpoint /api/webhooks/meta

serviço worker (1+ réplicas)
  -> Redis/BullMQ
  -> OpenAI / Meta

web + worker
  -> PostgreSQL privado com pgvector
  -> cofre de segredos
  -> logs, métricas e alertas
```

O proxy reverso deve tratar TLS, requisições malformadas, tamanho de corpo, slow clients e rate limiting. Não exponha PostgreSQL/Redis à internet. Restrinja saída de rede do worker aos provedores necessários quando possível.

### Worker

O MVP pode processar tarefas simples no processo web durante desenvolvimento. Para tráfego real, execute o consumidor BullMQ como serviço separado, com comando, health check e política de shutdown próprios. Funções serverless não devem manter um worker permanente; use um serviço/container de background ou fila gerenciada compatível.

Não escale webhooks reais antes desse worker e da fila de falhas estarem validados.

## Preparação da infraestrutura

1. Crie PostgreSQL compatível com a versão adotada e habilite `pgvector`.
2. Ative TLS, backups automáticos, point-in-time recovery e alertas de espaço/conexões.
3. Crie usuário de runtime com privilégio mínimo e usuário de migração separado.
4. Crie Redis privado com autenticação, TLS e política de eviction adequada; jobs não podem sumir por `allkeys-*`.
5. Crie cofre de segredos e identidades do workload.
6. Configure logs estruturados, métricas e alarmes.
7. Configure domínio, certificado, WAF/proxy e limite de payload.
8. Crie registros DNS e URLs separadas para homologação/produção.
9. Configure OpenAI/Meta somente depois da infraestrutura básica estar observável.

## Segredos e configuração

Produção exige valores novos para, no mínimo:

- `AUTH_SECRET`;
- `DATABASE_URL`;
- `REDIS_URL`;
- credenciais OpenAI/Meta;
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`;
- `TRUST_PROXY=true`, somente atrás de ingress que sobrescreva `X-Forwarded-For`.

`AUTH_SECRET` assina sessões e `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` é uma chave interna do Next.js. Esta entrega não armazena o token Meta no banco; implemente envelope encryption e rotação antes de adicionar esse fluxo.

Em múltiplas instâncias Next.js, a mesma chave de Server Actions deve estar disponível durante o build e em todas as réplicas. Gere chave AES válida codificada em Base64 e injete via CI/cofre, sem gravar em argumento/log de build. A documentação local do Next.js também recomenda coordenação de cache/tag entre instâncias quando houver revalidação.

## Pipeline de release

Uma release reproduzível deve:

1. instalar com `npm ci`;
2. executar `npm run lint`;
3. executar `npm run typecheck`;
4. executar `npm test` e testes de isolamento/integracão;
5. executar `npm run build`;
6. construir a imagem uma vez, assinar e verificar vulnerabilidades;
7. fazer backup/verificar capacidade antes de migração arriscada;
8. executar o target/job `migrator` uma única vez;
9. publicar web e worker com a mesma revisão;
10. aguardar readiness e executar smoke tests;
11. liberar tráfego gradualmente;
12. monitorar erros, fila, latência e custo.

Não execute `prisma migrate dev` ou `prisma db push` no deploy. Revise SQL e locks antes de `migrate deploy`. Migrações destrutivas devem usar expansão/backfill/contração em releases separadas.

## Health, readiness e shutdown

`GET /api/health` serve ao health check. Em produção, diferencie:

- **liveness:** processo está respondendo, sem depender de provedor externo;
- **readiness:** revisão pode receber tráfego e dependências essenciais estão prontas;
- **diagnóstico interno:** banco, Redis/fila, migração e versões, protegido de acesso público.

Não coloque chaves, connection strings ou exceções no payload de health. Durante shutdown, pare de aceitar jobs, aguarde o job atual dentro de timeout e renove/reprocesse locks conforme a BullMQ.

## Next.js em múltiplas instâncias

- use a mesma imagem/build ID em todas as réplicas;
- fixe a chave de Server Actions;
- use estratégia de cache compartilhado e invalidação de tags se utilizar cache dinâmico/ISR;
- garanta afinidade apenas quando indispensável; sessão deve ser validável entre réplicas;
- mantenha assets da versão anterior durante rolling deploy para evitar version skew;
- confira suporte a streaming no proxy.

Referência: [self-hosting do Next.js](https://nextjs.org/docs/app/guides/self-hosting).

## Banco, backup e restauração

Backups não são considerados válidos até uma restauração testada.

Mínimo operacional:

- backup/PITR com retenção aprovada;
- criptografia em trânsito e repouso;
- monitoramento de falha e espaço;
- restauração trimestral em ambiente isolado (ou frequência definida pelo risco);
- RPO/RTO acordados por contrato;
- backup antes de migração de alto risco;
- procedimento para preservar/excluir dados de titulares em cópias restauradas;
- documentação de versão PostgreSQL, extensão e migrações.

## Observabilidade e alertas

Crie painéis/alertas para:

- 5xx, latência e indisponibilidade de health;
- falhas de assinatura do webhook e picos de rejeição;
- fila aguardando, jobs falhos e tempo do job mais antigo;
- conexões, CPU, armazenamento e locks do banco;
- memória/eviction/conexões do Redis;
- 401/403/429/5xx da OpenAI/Meta;
- tokens, mensagens e orçamento por organização;
- falha/atraso de backup;
- handoffs e mensagens não respondidas acima do SLA.

Alertas não carregam corpo de conversa ou segredo.

## Rollback

1. pare a expansão de tráfego e jobs da revisão defeituosa;
2. preserve correlação, logs e jobs falhos;
3. volte para a imagem anterior quando o schema for retrocompatível;
4. não reverta banco automaticamente se houver risco de perda;
5. desative adaptador/canal pelo kill switch quando a integração estiver causando efeitos;
6. reexecute apenas jobs idempotentes após confirmar a causa;
7. comunique clientes/encarregado conforme impacto e plano de incidentes.

Migração incompatível requer plano específico de roll-forward/restauração previamente testado.

## Alternativas de hospedagem

Qualquer plataforma que execute Node/Docker pode servir o Next.js. Se usar Vercel ou outra plataforma serverless:

- PostgreSQL e Redis continuam externos/privados;
- webhook precisa preservar corpo bruto e ter timeout adequado;
- worker BullMQ vive em serviço de background separado;
- limites de execução/body/streaming precisam ser verificados;
- regiões e processamento de dados precisam atender contrato/LGPD;
- migração continua sendo job único, não parte de cada inicialização.

Escolher provedor não elimina os requisitos do [checklist de produção](production-checklists.md).
