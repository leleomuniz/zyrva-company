# Decisões técnicas e limitações

Este registro evita que uma tela demonstrativa ou um adaptador preparado seja confundido com integração comprovada. Atualize o status quando um fluxo ganhar implementação, teste e evidência operacional.

## Decisões

### 1. Monólito modular no MVP

**Decisão:** Next.js concentra painel e API, com módulos de domínio e integrações separados. Processamento assíncrono usa Redis/BullMQ e pode ser extraído para worker.

**Motivo:** reduz deploys e contratos distribuídos antes de validar o produto. O limite é modular, não microserviço prematuro.

**Consequência:** em produção, webhooks/tarefas pesadas precisam de processo worker separado para não afetar a interface.

### 2. PostgreSQL + `pgvector`

**Decisão:** dados transacionais e busca vetorial ficam no PostgreSQL.

**Motivo:** uma fronteira transacional, backup e filtro de tenant; suficiente ao volume inicial.

**Consequência:** consultas vetoriais usam SQL parametrizado e exigem monitoramento/reindexação. Um banco vetorial dedicado só será avaliado com evidência de escala/recall.

### 3. Prisma 7 com adapter PostgreSQL

**Decisão:** Prisma 7.9 e `@prisma/adapter-pg` para acesso tipado; migração SQL habilita pgvector e constraints que o schema Prisma não expressa integralmente.

**Motivo:** produtividade no domínio e liberdade de SQL onde necessário.

**Consequência:** migration SQL é parte essencial da revisão; `db push` não substitui migrações.

### 4. Tenant explícito e defesa em profundidade

**Decisão:** `organizationId` em entidades relevantes, repositórios tenant-scoped, índices e FKs compostas na migração.

**Motivo:** impedir vazamento entre clientes por consulta ou referência errada.

**Consequência:** RLS não está ativa; autorização e filtros continuam indispensáveis e precisam de testes com dois tenants.

### 5. Agente declarativo e versionado

**Decisão:** IA produz JSON validado; código arbitrário não é aceito. Versão publicada é snapshot auditável.

**Motivo:** revisão humana, rollback, previsibilidade e segurança.

**Consequência:** mudanças de schema de configuração requerem versionamento/migração.

### 6. Adaptadores demo/real

**Decisão:** `APP_MODE=demo` não consome OpenAI/Meta. `production` habilita o caminho que exige segredos reais.

**Motivo:** produto avaliável sem inventar credenciais ou gerar custo.

**Consequência:** dados demo devem permanecer marcados; colocar chave no `.env` sem mudar o modo não prova integração.

### 7. OpenAI Responses API

**Decisão:** `gpt-5.6-terra` para runtime e builder por padrão, `gpt-5.6-sol` opcional após avaliação, `text-embedding-3-small` para conhecimento.

**Motivo:** equilíbrio inicial de qualidade/custo com saída estruturada e modelos configuráveis.

**Consequência:** nomes, preços e limites são externos; revisar documentação e evals antes de trocar.

### 8. WhatsApp Cloud API oficial

**Decisão:** integração direta com a API oficial da Meta; nenhuma automação de WhatsApp Web.

**Motivo:** segurança, suporte e conformidade com a plataforma.

**Consequência:** exige WABA, número, HTTPS, permissões, opt-in, templates e revisão vigente dos termos.

### 9. Redis/BullMQ para efeitos assíncronos

**Decisão:** webhook reconhece rapidamente e delega processamento; unicidade durável permanece no PostgreSQL.

**Motivo:** isolar latência/falha dos provedores e controlar retentativas.

**Consequência:** Redis/worker são dependências operacionais; lock Redis sozinho não garante idempotência.

### 10. Docker Debian e execução sem privilégio

**Decisão:** Node.js 24 em Debian slim; runner usa usuário próprio. Não foi ativado `output: "standalone"` nesta etapa.

**Motivo:** compatibilidade previsível com Prisma/dependências e Dockerfile simples.

**Consequência:** imagem é maior; otimização futura precisa de teste de build/runtime/migração.

## Matriz de entrega

Legenda: **demo** funciona com dados/adaptadores simulados; **preparado** possui contrato/estrutura, mas requer integração e aceitação; **planejado** não deve ser vendido como funcional.

| Capacidade | Estado | Observação honesta |
| --- | --- | --- |
| painel, empresas e agentes fictícios | demo | dados marcados e sem valor comercial real |
| login local | demo | credencial pública; proibido na internet |
| RBAC e tenant repository | preparado | requer cobertura abrangente e IdP de produção |
| schema/migração multiempresa | preparado | pgvector + FKs compostas; precisa teste em PostgreSQL real |
| builder | demo/preparado | rota pode selecionar Responses API em produção; não foi validada com chave real |
| playground/runtime | demo | a rota atual usa o motor demo; o adaptador runtime real ainda precisa ser conectado e aceito |
| versionamento/publicação | preparado | validar fluxo completo e auditoria persistida |
| conhecimento texto/FAQ | preparado | pipeline real e recuperação precisam de aceitação |
| PDF/DOCX/CSV/URL | planejado/parcial | parsers, sandbox, antivírus e SSRF ainda exigem implementação |
| inbox/handoff/leads | demo/preparado | provar corrida IA x humano e persistência antes de cliente |
| webhook Meta GET/POST + worker | preparado | valida assinatura, deduplica, persiste e encaminha para humano; exige teste com ativo Meta real |
| envio WhatsApp/status/templates | preparado/parcial | não validado com número real nesta entrega |
| áudio/imagem/documento | fallback | registrar/encaminhar; análise automática não está pronta |
| automações/ferramentas | demo/parcial | efeitos sensíveis e kill switch exigem aceitação |
| observabilidade | local/parcial | sem stack externa de logs, tracing, métricas ou plantão |
| privacidade/termos | textos base | revisão jurídica e processo operacional pendentes |
| Embedded Signup/outros canais | planejado | não implementado |

## Limitações conhecidas

### Produto e experiência

- o MVP apresenta várias áreas com dados demonstrativos; métricas não são medição de produção;
- nem todo botão/estado de tela corresponde a integração persistente completa;
- fluxos avançados de CRM, agenda, pagamento e disparo não estão implementados;
- interface pt-BR é a prioridade; internacionalização não foi construída.

### Autenticação e autorização

- autenticação demo não possui MFA, recuperação, federação, convite ou política corporativa;
- RLS do PostgreSQL não está habilitada;
- permissões e testes de isolamento precisam ser expandidos a toda rota nova;
- não há certificação/pentest independente nesta entrega.

### IA e conhecimento

- nenhuma chamada real foi executada sem credencial; respostas demo não medem qualidade do modelo;
- thresholds, prompts, limites e seleção Terra/Sol ainda precisam de evals com casos representativos;
- ingestão segura de arquivos/links e antivírus/sandbox não estão completos;
- `text-embedding-3-small` fixa atualmente vetor de 1536 dimensões;
- prompt injection é mitigado por arquitetura, não eliminado;
- não há garantia de resposta correta; fatos comerciais sem fonte devem causar esclarecimento/handoff.

### WhatsApp

- configuração manual precede Embedded Signup;
- nenhum número/token real está incluído ou deve ser solicitado por conversa;
- regras, templates, preços e limites da Meta não são codificados como verdade permanente;
- mídia não suportada vai para humano;
- homologação com Meta, App Review e aceite do cliente são externos;
- termos atuais para casos de IA precisam de análise jurídica/comercial antes da venda.

### Operação

- Docker Compose usa segredos locais conhecidos e não serve para produção;
- o rate limiter atual é local ao processo; múltiplas réplicas exigem contador compartilhado (Redis/gateway) e política no proxy;
- o worker Meta dedicado está implementado; dead-letter operacional, HA, autoscaling e cache multi-instância ainda precisam de configuração;
- não há provedor de e-mail, APM, SIEM, cofre ou storage de objetos configurado;
- restauração de backup, disaster recovery e rotação de chaves não foram exercitados;
- custo estimado não substitui fatura do provedor;
- política de retenção permanece decisão do negócio/jurídico.

### Validação deste ambiente

No ambiente em que esta entrega foi montada, os executáveis globais `node`, `npm` e `docker` não estavam disponíveis no `PATH`. A equipe usou ferramentas locais temporárias em `.tools` quando aplicável; essa pasta está ignorada e **não faz parte da distribuição**. Por isso, o Docker Compose não foi executado aqui e deve ser validado em uma máquina com Docker Desktop/Engine antes de publicação.

Esta limitação de ambiente deve aparecer no relatório de entrega, não ser escondida como teste aprovado.

## Critério para mudar “preparado” para “funcional”

Uma capacidade só muda de status quando há:

1. implementação conectada ao fluxo real;
2. testes unitários, integração e caso negativo;
3. teste com dependência real em homologação quando externa;
4. logs/métricas sem segredo;
5. tratamento de retry, idempotência e kill switch quando há efeito;
6. documentação e runbook;
7. aprovação de produto/segurança e, quando aplicável, jurídico/cliente.
