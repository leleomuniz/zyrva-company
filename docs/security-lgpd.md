# Segurança e LGPD

Este documento é um baseline técnico, não parecer jurídico, certificação ou garantia de conformidade. A ZYRVA e cada cliente devem definir papéis, bases legais, contratos, retenção e textos com profissionais de privacidade/segurança antes da operação comercial.

## Responsabilidades

Para cada tratamento, registre por escrito:

- quem é controlador, operador e eventual suboperador;
- finalidade e base legal;
- categorias de titulares e dados;
- necessidade/proporcionalidade;
- compartilhamentos e transferências internacionais;
- retenção e descarte;
- canal para exercício de direitos;
- medidas técnicas/administrativas e responsável;
- risco residual e necessidade de RIPD.

Não assuma que consentimento é sempre a base correta. Quando consentimento for usado, ele precisa ser livre, específico, informado, demonstrável e revogável. Opt-in do WhatsApp e base legal LGPD são análises relacionadas, mas não idênticas.

## Classificação de dados

| Classe | Exemplos | Tratamento |
| --- | --- | --- |
| público | textos institucionais aprovados | integridade e versionamento |
| interno | configurações, métricas agregadas | acesso autenticado |
| pessoal | nome, telefone, e-mail, conversa, lead | finalidade, minimização, retenção e direitos |
| sensível/alto risco | saúde, biometria, documentos, dados de menor | não coletar por padrão; handoff e revisão específica |
| segredo | senha, chave, token, connection string | cofre, criptografia, rotação, nunca em log/frontend |

O agente deve desencorajar o envio de dados sensíveis não necessários e encaminhar casos de alto risco. Dados completos de pagamento não são aceitos.

## Autenticação e sessão

Modo demo possui credencial pública e só pode ser usado localmente. Antes de internet/produção:

- desative `POST /api/auth/demo` e a senha demonstrativa;
- integre provedor de identidade maduro ou implemente hash de senha forte, recuperação segura e bloqueio;
- exija MFA para administradores e operações sensíveis;
- use cookies `HttpOnly`, `Secure`, `SameSite` apropriado e escopo mínimo;
- faça rotação/invalidação de sessão após login, mudança de papel/senha e incidente;
- limite tentativas por conta, IP/sinal de risco sem bloquear usuários legitimamente;
- não revele se e-mail existe;
- registre login, falha, logout e mudança de permissão de forma redigida.

`AUTH_SECRET` precisa ser aleatório, exclusivo por ambiente e rotacionado com plano de invalidação.

## Papéis e menor privilégio

| Papel | Escopo esperado |
| --- | --- |
| `ZYRVA_ADMIN` | administração da plataforma/organizações, fortemente restrita e auditada |
| `COMPANY_MANAGER` | configuração da própria organização/empresa, agentes e equipe autorizada |
| `ATTENDANT` | inbox, leads e respostas atribuídas, sem segredos/configuração crítica |
| `VIEWER` | leitura autorizada, sem mutações |

Autorização ocorre no servidor em toda ação. Ocultar botão não é controle. Exportar, publicar agente, mudar canal, alterar papéis, revelar/rotacionar token e confirmar ação sensível exigem permissão específica e reautenticação quando apropriado.

## Isolamento multiempresa

- derive `organizationId` da sessão ou do `phone_number_id` validado;
- filtre toda operação, inclusive contagens, buscas, exportações e vetores;
- confirme que IDs relacionados pertencem ao mesmo tenant;
- use constraints compostas/RLS como defesa adicional quando disponível;
- limpe contexto por request/job e nunca mantenha tenant em variável global;
- crie testes com duas organizações para leitura, escrita, busca, cache, fila e webhook;
- use chaves de cache e jobs com namespace do tenant;
- não inclua dados de outro tenant em prompt, log, métrica ou erro.

Uma tentativa cruzada deve falhar sem confirmar a existência do recurso e gerar evento de segurança.

## Segredos e criptografia

- gerenciador de segredos em homologação/produção;
- TLS entre cliente, app, banco, Redis e provedores;
- criptografia em repouso do provedor e, antes de persistir tokens de canal, envelope encryption no nível da aplicação;
- chave de criptografia fora do banco, com versão por ciphertext e rotação gradual;
- identidades do workload em vez de chaves pessoais quando suportado;
- nunca usar variável `NEXT_PUBLIC_*` para segredo;
- mascarar valores em CI, shell history, APM, exceptions e suporte;
- revogar imediatamente chave exposta e investigar uso; apenas apagar do Git não basta.

Backups, dumps, exports e arquivos temporários têm a mesma classificação do dado original.

Esta entrega não persiste `META_ACCESS_TOKEN` em `ChannelConnection`; ele permanece no ambiente e o worker não envia mensagens. A cifra de tokens por tenant ainda é requisito obrigatório antes de implementar provisionamento de credenciais ou envio externo.

## Segurança web e API

Controles mínimos:

- Zod em parâmetros, query, headers e bodies;
- limite de tamanho por rota e upload;
- rate limiting por IP, usuário, organização e operação cara;
- proteção CSRF para mutações baseadas em cookie, além de `SameSite`;
- CORS fechado ao(s) domínio(s) necessários;
- CSP, HSTS, `nosniff`, frame protection e política de referrer;
- queries parametrizadas e nenhuma concatenação em SQL vetorial;
- escaping padrão do React e sanitização para conteúdo rico;
- SSRF: URL allowlist, DNS/IP validation, bloqueio de rede privada e redirects limitados;
- upload: extensão + MIME + magic bytes, tamanho, antivírus/sandbox e armazenamento privado;
- dependências fixadas, atualização e scan de vulnerabilidade/licença;
- mensagens de erro genéricas para cliente e detalhes redigidos internamente.

O reverse proxy/WAF complementa, mas não substitui controles no app.

## Webhooks e integrações

- valide assinatura HMAC no corpo bruto antes de parsear;
- compare segredos em tempo constante;
- derive tenant do ativo externo conhecido;
- persista idempotência antes do efeito;
- ACK rápido e processamento na fila;
- retry limitado com jitter, dead-letter e kill switch;
- valide respostas HTTP do provedor e nunca siga URL arbitrária;
- registre código/ID redigido, não token/payload completo;
- aplique allowlist de ferramenta e confirmação humana.

Consulte [meta-whatsapp.md](meta-whatsapp.md).

## Segurança de IA e conhecimento

Modelo e conteúdo recuperado são não confiáveis. Defesas:

- instruções de sistema são separadas de documentos e mensagens;
- documentos são delimitados como dados, não autoridade;
- recuperação sempre filtra tenant e agente;
- saída estruturada é validada e limitada;
- `sourceIds` são revalidados no banco;
- ferramenta possui schema, autorização, timeout, idempotência e risco;
- ação irreversível/sensível exige humano;
- limite de tokens, tempo, chamadas, profundidade e retries;
- baixa confiança ou conflito encaminha para pessoa;
- segredos e instruções internas nunca entram no contexto por conveniência;
- avaliações incluem exfiltração, prompt injection direto/indireto e cross-tenant.

Não prometa que prompt injection é “resolvida”. Use camadas, reduza privilégios e monitore falhas.

## Logs, auditoria e métricas

Nunca registrar:

- chaves, tokens, senha/hash de senha ou cookie;
- connection string completa;
- corpo integral de documento/conversa por padrão;
- telefone/e-mail completos quando hash/final redigido basta;
- dados de pagamento completos;
- raciocínio interno do modelo.

Registre `correlationId`, operação, tenant autorizado, ator, entidade, resultado, duração, código redigido e versão. `AuditLog.before/after` precisa de allowlist de campos; uma cópia automática pode capturar segredo ou dado excessivo.

Acesso a logs é restrito, auditado e sujeito a retenção. Métrica usa cardinalidade controlada e não coloca telefone/e-mail como label.

## Retenção e ciclo de vida

Defina uma tabela aprovada antes do primeiro cliente. Não existe prazo universal neste repositório.

| Categoria | Finalidade | Prazo | Descarte | Responsável |
| --- | --- | --- | --- | --- |
| mensagens/conversas | atendimento e qualidade | a definir | anonimizar/excluir | a definir |
| leads/consentimento | relacionamento e prova | a definir | anonimizar/excluir | a definir |
| documentos/chunks | conhecimento do agente | até remoção/contrato, a validar | excluir fonte, chunks e vetores | a definir |
| webhook bruto | idempotência/investigação | mínimo necessário | excluir payload, manter evento mínimo | a definir |
| auditoria | segurança/prestação de contas | a definir | retenção protegida/anonimizada | a definir |
| logs/APM | operação e incidente | curto, a definir | expiração automática | a definir |
| backups | recuperação | conforme RPO/RTO e legal | expiração criptográfica/física | a definir |

Implemente jobs de expiração observáveis e teste cascatas. Exclusão lógica sem job de descarte não cumpre eliminação.

## Direitos do titular

O processo precisa autenticar o solicitante e permitir:

- confirmação/acesso;
- correção;
- informação sobre compartilhamento;
- portabilidade quando aplicável;
- revisão/explicação de decisões quando aplicável;
- revogação de consentimento/oposição;
- anonimização, bloqueio ou eliminação quando cabível.

Fluxo recomendado:

1. registrar solicitação sem expor dados no ticket;
2. verificar identidade proporcionalmente;
3. localizar dados por organização/empresa/contato;
4. congelar exclusões conflitantes com investigação legal válida;
5. exportar em formato legível e protegido;
6. corrigir/anonimizar/excluir banco, vetores, objetos e índices;
7. propagar a provedores conforme contrato;
8. registrar conclusão mínima e comunicar o titular;
9. tratar dados que reapareçam após restauração de backup.

As páginas de Política de Privacidade, Termos, solicitação e exclusão são interfaces; elas não substituem esse processo operacional.

## Incidentes

Mantenha runbook e contatos fora do repositório público. Ao detectar incidente:

1. preserve evidências com acesso controlado;
2. contenha (revogue token, pause canal/automação, isole revisão);
3. determine tenants, titulares, dados, período e impacto;
4. corrija e valide não recorrência;
5. restaure operação gradualmente;
6. avalie notificações contratuais/ANPD/titulares nos prazos aplicáveis;
7. faça retrospectiva e acompanhe ações.

Teste o kill switch e a rotação antes de precisar deles.

## Revisão antes da operação

- pentest/revisão independente do fluxo autenticado e webhook;
- threat model atualizado;
- teste de isolamento e autorização automatizado;
- restauração de backup comprovada;
- inventário de dados/suboperadores e contratos;
- políticas/termos aprovados e canal do encarregado;
- retenção/jobs de descarte ativos;
- incident response e plantão definidos;
- revisão das políticas OpenAI/Meta e transferência internacional;
- checklist completo em [production-checklists.md](production-checklists.md).
