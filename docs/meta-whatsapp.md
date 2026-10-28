# Meta WhatsApp Cloud API

O único canal WhatsApp permitido no ZYRVA Agents é a **WhatsApp Cloud API oficial**, hospedada pela Meta. O projeto não usa WhatsApp Web, QR Code, conta pessoal, Selenium, Playwright, `whatsapp-web.js` ou técnica para contornar políticas/limites.

O modo demo não envia mensagens. Uma conexão real exige infraestrutura pública e ativos próprios do cliente/ZYRVA.

## Pré-requisitos

- Meta Business Portfolio administrado pela empresa responsável;
- conta no [Meta for Developers](https://developers.facebook.com/);
- aplicativo Meta com o produto WhatsApp;
- WhatsApp Business Account (WABA);
- número dedicado e apto ao registro;
- domínio HTTPS público e estável para o webhook;
- Política de Privacidade publicada e revisada;
- usuário do sistema/token com permissões mínimas;
- opt-in demonstrável e templates aprovados quando aplicável;
- aceite dos termos da Meta/WhatsApp pelo cliente.

Para SaaS multiempresa, permissões, App Review, verificação do negócio e Embedded Signup podem ser necessários. O MVP aceita configuração manual; Embedded Signup é evolução planejada, não deve ser representado como concluído.

## Variáveis

```dotenv
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
META_ACCESS_TOKEN=
META_PHONE_NUMBER_ID=
META_CHANNEL_ORGANIZATION_ID=
META_CHANNEL_COMPANY_ID=
META_CHANNEL_AGENT_ID=
META_GRAPH_API_VERSION=
```

| Variável | Origem/uso | Regra |
| --- | --- | --- |
| `META_APP_SECRET` | configurações do aplicativo Meta | valida HMAC do corpo bruto; servidor apenas |
| `META_WEBHOOK_VERIFY_TOKEN` | valor aleatório criado pela ZYRVA | compara no handshake; não é access token |
| `META_ACCESS_TOKEN` | usuário do sistema/ativo autorizado | cofre de segredos; nunca no navegador/log |
| `META_PHONE_NUMBER_ID` | painel WhatsApp/Graph API | identifica o número e a conexão |
| `META_CHANNEL_*_ID` | IDs internos existentes | prendem o número ao tenant e agente corretos no provisionamento |
| `META_GRAPH_API_VERSION` | versão vigente suportada | defina explicitamente e planeje upgrades |

Essas variáveis servem ao primeiro ambiente/conexão manual. `META_PHONE_NUMBER_ID` não cria uma conexão por si só. Depois da migração e do cadastro da organização, empresa e agente, execute `npm run db:provision-meta`; o comando valida o escopo e recusa um número já reservado por outro tenant.

Esta entrega usa `META_ACCESS_TOKEN` somente pelo ambiente e não grava o token em `ChannelConnection`. Os campos de ciphertext são reserva de schema; persistência de credenciais exige envelope encryption e rotação antes de ser habilitada.

Não copie tokens para documentação, tickets ou chats. Não use token temporário do painel em produção.

## Configurar o webhook

1. Publique a aplicação em HTTPS e valide `GET /api/health`.
2. Gere um valor forte e exclusivo para `META_WEBHOOK_VERIFY_TOKEN`.
3. No aplicativo Meta, configure a URL:

```text
https://SEU_DOMINIO/api/webhooks/meta
```

4. Informe o mesmo verify token no painel Meta.
5. Assine o campo/evento de mensagens da WABA e os status necessários.
6. Faça a verificação inicial.
7. Inicie `npm run worker:meta` no serviço de background.
8. Envie uma mensagem para o número de teste/produção e confirme evento, fila, conversa e status.

Um túnel HTTPS pode ajudar em homologação local, mas é temporário e expõe uma máquina de desenvolvimento. Nunca o trate como endpoint de produção; use proteção, não compartilhe a URL e encerre ao terminar.

Referências: [Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/), [webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/), [coleção oficial no Postman](https://www.postman.com/meta/whatsapp-business-platform/overview).

## Verificação `GET`

A Meta envia os parâmetros `hub.mode`, `hub.verify_token` e `hub.challenge`. O endpoint deve:

1. aceitar somente o modo esperado;
2. comparar `hub.verify_token` com o segredo usando comparação segura;
3. devolver o `hub.challenge` como texto quando válido;
4. devolver erro genérico quando inválido;
5. nunca registrar o token recebido.

O verify token prova conhecimento no cadastro inicial; ele não substitui a assinatura dos eventos `POST`.

## Recebimento `POST`

Antes de interpretar JSON:

1. obtenha o corpo bruto, sem reserializar;
2. calcule HMAC-SHA256 com `META_APP_SECRET`;
3. valide `X-Hub-Signature-256` em tempo constante;
4. rejeite assinatura ausente/inválida;
5. aplique limite de tamanho e timeout.

Depois da assinatura:

1. extraia IDs externos e `phone_number_id` com parser defensivo;
2. encontre a `ChannelConnection` ativa pelo número;
3. derive organização/empresa dessa conexão;
4. persista `WebhookEvent` e hash do payload com unicidade;
5. enfileire o trabalho;
6. responda `2xx` rapidamente.

O processamento do agente não deve ocorrer no caminho de ACK. Se o evento já existe, devolva sucesso sem repetir o efeito. Se não for possível persistir/enfileirar, gere alerta e siga a política de erro para permitir retentativa controlada da Meta; não devolva sucesso silencioso perdendo a mensagem.

O repositório oficial da Meta contém um [exemplo de validação de assinatura](https://github.com/fbsamples/whatsapp-api-examples/tree/main/signature-validation-with-webhooks-payloads).

## Tipos de mensagem

| Tipo recebido | Comportamento do MVP |
| --- | --- |
| texto | normalizar, persistir e processar pelo agente/atendente |
| botão/lista/interativo | extrair ID e título de forma tipada |
| imagem | registrar metadados; só baixar/analisar se pipeline seguro estiver habilitado |
| áudio | registrar e encaminhar para humano enquanto transcrição não estiver validada |
| documento | registrar e encaminhar; nunca executar/interpretar automaticamente |
| localização | registrar minimamente e encaminhar conforme regra/consentimento |
| desconhecido | persistir metadados mínimos e encaminhar para humano |

Download de mídia precisa de URL autenticada, limite de bytes, allowlist de MIME, varredura, armazenamento privado e expiração. URLs e tokens de mídia não vão para logs.

## Envio e janela de atendimento

Antes de cada envio, o adaptador verifica:

- conexão ativa e tenant correto;
- opt-out/consentimento e finalidade;
- conversa ainda em modo IA;
- janela de atendimento vigente;
- necessidade de template aprovado;
- categoria/idioma/variáveis corretas do template;
- limites, qualidade do número e rate limit;
- idempotência da resposta.

A regra operacional conhecida é uma janela de atendimento ao cliente após mensagem iniciada pela pessoa; mensagens iniciadas pela empresa fora da janela exigem template aprovado e opt-in aplicável. Como políticas, categorias, preços e definição exata da janela mudam, o sistema não deve congelar isso apenas em documentação. Confirme no [WhatsApp Business Messaging Policy](https://business.whatsapp.com/policy), na [documentação de templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/) e no painel da conta imediatamente antes de publicar.

Nunca use template para spam, compre/raspe listas ou tente contornar rejeições. Respeite pedido de saída imediatamente e mantenha prova da origem do opt-in.

## Status e ordem de eventos

Status de envio podem chegar duplicados ou fora de ordem. Relacione por ID da mensagem Meta, armazene a data do provedor e aceite apenas progressões válidas (`sent` -> `delivered` -> `read`) ou `failed` com erro redigido. Uma atualização desconhecida não deve apagar um status mais avançado.

Não registre número completo, token, corpo integral ou detalhes desnecessários do erro. Para suporte, use correlation ID, final redigido do telefone, código oficial e timestamp.

## Retentativas

- retry apenas em falhas transitórias (timeout, 429 e 5xx elegíveis);
- backoff exponencial com jitter e máximo definido;
- respeitar cabeçalhos do provedor;
- não repetir 4xx permanentes sem mudança;
- preservar a mesma chave de idempotência;
- após o limite, mover para fila de falhas, alertar e entregar a humano.

## Permissões e revisão

O envio/recebimento normalmente envolve `whatsapp_business_messaging`; gerenciamento de ativos/templates/Embedded Signup pode exigir `whatsapp_business_management` e revisão adicional. Solicite somente o necessário e valide a lista vigente na documentação/painel da Meta.

A Meta atualiza termos para casos de IA. Antes de comercializar, revise os [WhatsApp Business Solution Terms](https://www.facebook.com/legal/whatsapp_business_solution_terms) para confirmar que o produto é usado no atendimento específico da empresa cliente e não como distribuição de um assistente de IA de propósito geral. Essa análise é comercial/jurídica e não é substituída pelo código.

## Teste de aceitação real

1. handshake inválido é rejeitado e não vaza segredo;
2. assinatura inválida não cria mensagem/fila;
3. evento válido cria um único `WebhookEvent`;
4. repetição do mesmo evento não duplica mensagem/resposta/lead;
5. `phone_number_id` desconhecido não é associado a tenant padrão;
6. ACK ocorre antes do processamento pesado;
7. texto dentro da janela gera resposta sustentada;
8. pedido de humano pausa a IA;
9. mídia não suportada é registrada e encaminhada;
10. status enviados/delivered/read/failed atualizam corretamente;
11. opt-out bloqueia nova mensagem;
12. template fora da janela só é enviado quando aprovado/autorizado;
13. falha transitória respeita retry; falha permanente não entra em loop;
14. logs e auditoria não contêm token ou payload pessoal completo.

## Diagnóstico

| Sintoma | Verificação |
| --- | --- |
| Meta não valida URL | HTTPS/certificado, rota GET, token igual e resposta `hub.challenge` |
| POST recebe 401/403 | corpo bruto preservado, App Secret correto e header de assinatura |
| recebe teste mas não mensagem | assinatura da WABA/campo, número registrado e app/ativo corretos |
| mensagens duplicadas | unicidade externa, transação e chave do job |
| envio 400 | versão Graph, payload/tipo/template, idioma e parâmetros |
| envio 401/403 | token, permissões, ativo e app review |
| envio 429 | limites/qualidade, concorrência e backoff |
| cliente não recebe | status do webhook, janela, opt-in, template e bloqueio/opt-out |

Registre apenas códigos e IDs redigidos ao pedir suporte à Meta.
