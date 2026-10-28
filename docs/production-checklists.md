# Checklists de produção e cliente

Marque um item somente com evidência: URL, execução de teste, ticket aprovado, log redigido ou responsável/data. “Configurado” sem teste não é concluído.

## Plataforma antes da primeira produção

### Responsabilidade e escopo

- [ ] Dono técnico, dono do produto, responsável de segurança e encarregado/canal de privacidade definidos.
- [ ] Controlador, operador e suboperadores mapeados por finalidade.
- [ ] Contratos, DPA/termos e transferência internacional revisados.
- [ ] Política de Privacidade, Termos, solicitação e exclusão publicados e aprovados.
- [ ] Matriz de retenção/descarte aprovada, com jobs e responsáveis.
- [ ] Casos proibidos e ações que exigem confirmação humana documentados.
- [ ] RPO, RTO, SLA e horário de suporte acordados.

### Identidade e acesso

- [ ] `APP_MODE=production` e login demo inacessível.
- [ ] Provedor de identidade/fluxo de senha revisado; MFA para administradores.
- [ ] `AUTH_SECRET`, Server Actions key e chaves de plataforma novos por ambiente.
- [ ] Papéis `ZYRVA_ADMIN`, `COMPANY_MANAGER`, `ATTENDANT`, `VIEWER` testados.
- [ ] Operações sensíveis exigem permissão específica e auditoria.
- [ ] Contas de banco de runtime/migração separadas e com menor privilégio.
- [ ] Processo de entrada, mudança de função e desligamento de operador testado.
- [ ] Acesso a produção/logs/cofre é mínimo, nominal e auditado.

### Aplicação e isolamento

- [ ] `npm ci`, lint, typecheck, testes e build passam em CI limpa.
- [ ] Testes com dois tenants cobrem leitura, escrita, export, busca, cache, fila e webhook.
- [ ] FKs compostas/guards tenant-scoped foram aplicados no banco de produção.
- [ ] Toda rota deriva tenant da sessão/ativo externo, não do body confiado.
- [ ] Rate limiting existe por IP, usuário, tenant e operação cara.
- [ ] `TRUST_PROXY=true` somente atrás de ingress que sobrescreve `X-Forwarded-For`.
- [ ] CSRF, cookies, CORS e headers de segurança foram revisados.
- [ ] Upload, URL fetch/SSRF, SQL vetorial e conteúdo rico têm validação dedicada.
- [ ] Scanner de dependências/imagem não tem achado crítico não aceito.
- [ ] Pentest/revisão independente concluído para autenticação, tenant e webhook.

### Infraestrutura

- [ ] Domínio, DNS, TLS e proxy/WAF configurados e renovação monitorada.
- [ ] PostgreSQL privado com `pgvector`, TLS, capacidade e alertas.
- [ ] Redis privado com TLS/autenticação, sem política de eviction que descarte jobs.
- [ ] Web e worker usam a mesma revisão e fazem shutdown gracioso.
- [ ] Migração roda como job único antes do tráfego.
- [ ] Health/readiness não revelam detalhes e estão ligados ao orquestrador.
- [ ] Segredos vêm do cofre e não da imagem/manifesto/log.
- [ ] Tokens de canal persistidos usam envelope encryption versionada e rotação testada.
- [ ] Multi-réplica usa mesma Server Actions key e cache/invalidação coordenados.
- [ ] Saída de rede e portas de banco/Redis estão restritas.
- [ ] Ambientes local, homologação e produção são isolados.

### Backup e continuidade

- [ ] Backup automático e PITR habilitados com alerta de falha.
- [ ] Restauração completa foi testada em ambiente isolado.
- [ ] RPO/RTO medidos atendem o contrato.
- [ ] Versão PostgreSQL, pgvector e migrações constam do runbook.
- [ ] Rollback/roll-forward de aplicação e migração foram ensaiados.
- [ ] Kill switch de IA, canal e automação foi testado.
- [ ] Procedimento de indisponibilidade OpenAI, Meta, banco e Redis foi simulado.

### OpenAI

- [ ] Projeto e chave de serviço separados por ambiente.
- [ ] Orçamento, alertas e limites configurados.
- [ ] Modelos nas variáveis foram confirmados na documentação/conta atual.
- [ ] Terra/Sol e reasoning foram avaliados em casos representativos.
- [ ] Structured output, recusa, timeout, 429 e 5xx são tratados.
- [ ] Limites de tokens, contexto, ferramentas, tempo e loops estão ativos.
- [ ] Dados enviados foram minimizados; retenção/`store`/contrato revisados.
- [ ] Usage/custo por tenant é registrado e possui alerta/circuit breaker.
- [ ] Chave não aparece em frontend, logs, APM, CI ou banco.

### Meta/WhatsApp

- [ ] Business Portfolio, app, WABA e propriedade dos ativos confirmados.
- [ ] Business Verification/App Review/permissões concluídos quando exigidos.
- [ ] Número dedicado registrado e perfil de negócio correto.
- [ ] URL HTTPS estável; handshake e assinatura HMAC testados.
- [ ] `phone_number_id` desconhecido não recebe tenant padrão.
- [ ] Evento repetido não duplica mensagem, lead, resposta ou ferramenta.
- [ ] ACK rápido, worker, retry, dead-letter e alertas testados.
- [ ] Opt-in, opt-out, janela e templates vigentes revisados.
- [ ] Status sent/delivered/read/failed e eventos fora de ordem testados.
- [ ] Qualidade, limites e cobrança têm responsável/alerta.
- [ ] Termos vigentes para uso de IA foram revisados por jurídico/comercial.
- [ ] Token é de produção, mínimo e rotacionável; nenhum token temporário.

### Privacidade e operação

- [ ] Inventário de dados/suboperadores está atualizado.
- [ ] Exportação/correção/exclusão do titular foi testada ponta a ponta.
- [ ] Opt-out bloqueia envio e fica auditado.
- [ ] Logs/auditoria usam allowlist e redação.
- [ ] Jobs de retenção excluem banco, vetores, objetos e payloads.
- [ ] Restore de backup inclui procedimento para exclusões já atendidas.
- [ ] Plano de incidente possui contatos, critérios e comunicação.
- [ ] Alertas têm plantão/dono e não contêm dados pessoais.
- [ ] Suporte sabe pausar IA/canal, assumir conversa e escalar falha.

## Onboarding de cada cliente

### Contrato e descoberta

- [ ] Razão social, contato autorizado e responsáveis confirmados.
- [ ] Escopo, horários, SLA, finalidade e canal definidos.
- [ ] Papéis LGPD e instruções de tratamento formalizados.
- [ ] Base legal, opt-in, aviso de privacidade e opt-out aprovados.
- [ ] Categorias proibidas/sensíveis e público menor de idade avaliados.
- [ ] Retenção, exportação, encerramento e devolução de dados acordados.
- [ ] Volume esperado e teto de custo/mensagens/tokens acordados.
- [ ] Ninguém enviou credencial por e-mail/chat/ticket.

### Organização e pessoas

- [ ] Organização/empresa foi criada com país BR, BRL e fuso correto.
- [ ] Domínio, nome, telefone e dados de suporte foram conferidos.
- [ ] Apenas usuários nominados foram convidados.
- [ ] Papéis seguem menor privilégio; ao menos dois contatos administrativos.
- [ ] Atendentes receberam treinamento de handoff, opt-out e incidente.
- [ ] Acesso de teste/demo foi removido antes do go-live.

### Configuração do agente

- [ ] Nome, identificação como assistente virtual e objetivo foram aprovados.
- [ ] Tom, idioma, saudação e mensagem de privacidade foram aprovados.
- [ ] Serviços/produtos, público, horários e região foram conferidos.
- [ ] Assuntos permitidos/proibidos e perguntas de qualificação estão corretos.
- [ ] Preços, prazos, políticas e condições possuem fontes atuais.
- [ ] Mensagem sem confiança, erro e fora de horário está aprovada.
- [ ] Regras de handoff e fila/responsável humano estão configuradas.
- [ ] Ferramentas mínimas estão habilitadas; ações sensíveis pedem humano.
- [ ] Um responsável humano revisou e publicou a versão registrada.

### Base de conhecimento

- [ ] Cliente tem direito de usar cada documento/conteúdo.
- [ ] Dados desnecessários, segredos e documentos pessoais foram removidos.
- [ ] Arquivos/tipos/tamanhos passaram por validação e varredura.
- [ ] Fontes têm dono, validade e procedimento de atualização.
- [ ] Ingestão terminou sem erro e chunks pertencem ao tenant/agente correto.
- [ ] Busca não retorna dados das duas organizações usadas no teste de isolamento.
- [ ] Perguntas críticas recuperam fonte correta; ausência causa handoff.
- [ ] Tentativas de prompt injection no documento não mudam regras/ferramentas.

### Número e Meta

- [ ] Propriedade do WABA/número e responsabilidade de cobrança definidas.
- [ ] Nome de exibição e perfil foram aprovados pela Meta/cliente.
- [ ] Token foi inserido diretamente no cofre por pessoa autorizada.
- [ ] Conexão ativa mapeia o `phone_number_id` ao tenant correto.
- [ ] Opt-in e templates do cliente possuem evidência/aprovação.
- [ ] Janela de atendimento, feriados e mensagens iniciadas pela empresa testados.
- [ ] Entrada, resposta, status, duplicidade, retry e falha foram testados.
- [ ] Áudio/imagem/documento não suportado chega ao humano.
- [ ] Pedido de sair bloqueia novas mensagens.

### Aceitação do fluxo completo

- [ ] Criar empresa e agente por descrição.
- [ ] Revisar rascunho e publicar versão.
- [ ] Adicionar conhecimento e recuperar resposta com fonte.
- [ ] Responder “não sei/confirmarei” sem inventar preço/prazo.
- [ ] Simular/receber mensagem e salvar contato/conversa.
- [ ] Capturar/atualizar lead sem duplicar telefone.
- [ ] Pedir humano, pausar IA e atribuir atendente.
- [ ] Atendente responder e devolver à IA de forma explícita.
- [ ] Falha OpenAI/Meta encaminhar sem loop ou perda silenciosa.
- [ ] Logs, uso e auditoria mostrarem correlação sem segredo.
- [ ] Cliente aprovar evidências e data de go-live.

## Go-live

- [ ] Backup/restore recente confirmado.
- [ ] Versão, migração, prompts/modelos e configuração congelados para a janela.
- [ ] Plantão ZYRVA e contatos do cliente disponíveis.
- [ ] Limites iniciais conservadores e alertas ativos.
- [ ] Tráfego liberado gradualmente com número de teste primeiro.
- [ ] Primeiras conversas acompanhadas ao vivo sem expor dados desnecessários.
- [ ] Taxa de erro, fila, latência, custo, handoff e qualidade monitorados.
- [ ] Critérios de rollback/pausa são conhecidos por quem está de plantão.

## Após o go-live

- [ ] Revisão em 24 horas, 7 dias e 30 dias (ou cadência contratada).
- [ ] Respostas incorretas viram casos de avaliação e correção de fonte/regra.
- [ ] Fontes e templates vencidos são atualizados/desativados.
- [ ] Usuários/papéis e acessos ao cofre são revisados periodicamente.
- [ ] Custos e limites por organização são revisados com o cliente.
- [ ] Retenção/descarte e backup continuam saudáveis.
- [ ] Políticas e versões OpenAI/Meta são revisitadas antes de upgrades.
- [ ] Nenhuma métrica demo aparece como real.

## Offboarding do cliente

- [ ] Bloquear novos envios e pausar canal/agente/automações.
- [ ] Revogar token Meta e acessos de usuários conforme responsabilidade.
- [ ] Entregar exportação acordada por canal seguro.
- [ ] Excluir/anonimizar dados, vetores, arquivos e jobs conforme contrato/base legal.
- [ ] Tratar retenções obrigatórias com escopo mínimo e acesso restrito.
- [ ] Registrar conclusão e evidência sem preservar conteúdo excessivo.
- [ ] Garantir expiração em backups e impedir reaparecimento após restore.
- [ ] Remover monitoramento/custos específicos e confirmar encerramento ao cliente.
