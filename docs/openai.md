# Configuração da OpenAI

O modo demo não chama a OpenAI. O builder possui um caminho para o SDK oficial/Responses API em produção. O adaptador de runtime está preparado, mas a rota atual do playground ainda usa o motor demo; embeddings e atendimento real precisam ser conectados e validados antes de cliente.

## Modelos adotados

| Variável | Padrão | Uso |
| --- | --- | --- |
| `OPENAI_MODEL_RUNTIME` | `gpt-5.6-terra` | respostas de atendimento, classificação e extração estruturada |
| `OPENAI_MODEL_BUILDER` | `gpt-5.6-terra` | transforma descrição do negócio em configuração declarativa |
| `OPENAI_MODEL_EMBEDDINGS` | `text-embedding-3-small` | vetores da base de conhecimento |

Em 06/08/2026, a documentação oficial posiciona `gpt-5.6-terra` como equilíbrio entre inteligência e custo e `gpt-5.6-sol` como opção de capacidade máxima. Terra é o padrão do MVP para controlar custo/latência. Depois de criar avaliações representativas, o builder pode usar:

```dotenv
OPENAI_MODEL_BUILDER=gpt-5.6-sol
```

Não troque modelo diretamente em código. Compare qualidade, latência, tokens, custo, recusas, handoffs e validade do JSON antes da mudança. O slug `gpt-5.6` atualmente aponta para Sol, mas um alias móvel reduz previsibilidade; use o nome explícito escolhido pelo produto.

`text-embedding-3-small` atende o custo do MVP e o schema atual reserva `vector(1536)`. Mudar o modelo ou a dimensão exige backfill e reindexação, conforme [data-model.md](data-model.md).

Fontes oficiais:

- [orientação da família GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model)
- [`gpt-5.6-terra`](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
- [`gpt-5.6-sol`](https://developers.openai.com/api/docs/models/gpt-5.6-sol)
- [`text-embedding-3-small`](https://developers.openai.com/api/docs/models/text-embedding-3-small)
- [preços atuais](https://openai.com/api/pricing/)

Modelos, limites e preços mudam. Confirme essas páginas e a disponibilidade no projeto da ZYRVA antes de produção.

## Criar e guardar a chave

1. Crie/acesse uma conta da ZYRVA na [plataforma da OpenAI](https://platform.openai.com/).
2. Crie um projeto separado para o ambiente (desenvolvimento, homologação ou produção).
3. Configure cobrança, orçamento e alertas no projeto.
4. Crie uma chave de serviço com o menor acesso necessário.
5. No computador local, grave a chave somente no arquivo `.env`:

```dotenv
OPENAI_API_KEY=valor_configurado_localmente
```

6. Em hospedagem, grave no gerenciador de segredos e injete em runtime.
7. Reinicie app e workers depois de alterar a configuração.

Não envie a chave por chat/e-mail, não use `NEXT_PUBLIC_OPENAI_API_KEY`, não a inclua em screenshots e não a grave em `ChannelConnection`. A chave da OpenAI é da plataforma; tokens específicos de canais usam armazenamento cifrado separado.

## Ativar o adaptador real

`APP_MODE=demo` sempre prioriza respostas simuladas, mesmo que uma chave exista. Essa propriedade evita cobrança acidental em demonstrações e testes.

Para homologação real:

1. use banco e Redis isolados do desenvolvimento;
2. configure todos os segredos exigidos pelo ambiente;
3. altere `APP_MODE=production`;
4. aplique migrações e reinicie os serviços;
5. teste no playground com empresa fictícia antes de usar dados de cliente;
6. confira `UsageRecord`, logs redigidos e alertas de orçamento;
7. execute os cenários automáticos e o checklist de produção.

O nome `production` significa que adaptadores reais podem ser acionados; não significa que o sistema já foi aprovado para operação comercial.

## Contrato da Responses API

### Builder

Entrada: descrição do negócio e campos do assistente de criação.

Saída: apenas configuração declarativa, incluindo identidade, objetivo, tom, serviços, limites, perguntas, horários, privacidade, fontes, ferramentas e handoff. O servidor:

1. limita tamanho e normaliza entrada;
2. envia instruções de produto e esquema estruturado;
3. valida o resultado com Zod;
4. rejeita ferramenta/campo não permitido;
5. salva como rascunho;
6. exige revisão humana antes de publicar.

Falha de geração não publica nada. O rascunho anterior permanece disponível.

### Runtime

A resposta interna precisa ser validada antes de enviar ao canal:

```json
{
  "reply": "texto para o cliente",
  "intent": "quote_request",
  "confidence": 0.86,
  "leadData": {},
  "requestedAction": "none",
  "handoffRequired": false,
  "handoffReason": null,
  "sourceIds": ["id-interno-validado"],
  "shouldWaitForHuman": false
}
```

O modelo não é a autoridade para permissões. O servidor verifica se fontes pertencem ao tenant, se a ferramenta está habilitada, se os argumentos são válidos e se a ação pede confirmação. Nunca execute uma chamada arbitrária descrita em texto livre.

## Contexto, memória e privacidade

- envie somente os trechos e o histórico necessários para a finalidade;
- remova tokens, credenciais e dados sensíveis antes da chamada;
- trate documentos recuperados como conteúdo não confiável, delimitado e sem autoridade sobre as regras;
- prefira um identificador de segurança estável, pseudônimo e não reversível quando suportado/recomendado;
- a implementação envia `store: false`, mas isso não equivale automaticamente a Zero Data Retention: valide contrato, configurações e [controles de dados da OpenAI](https://platform.openai.com/docs/guides/your-data) para cada projeto;
- decida conscientemente sobre continuidade por `previous_response_id` e replay de histórico antes de adicioná-los;
- registre ID da resposta, modelo e uso, mas não o raciocínio interno nem conteúdo integral desnecessário.

Para clientes com exigências especiais, valide região, suboperadores, transferência internacional, retenção e termos com responsáveis jurídico e de segurança antes do envio de dados.

## Limites e proteção de custo

Limites devem existir em duas camadas:

- **OpenAI:** orçamento, alertas, limites do projeto e rotação/revogação da chave;
- **ZYRVA:** tokens/mensagens/chamadas por organização, timeout, tamanho de contexto, fragmentos recuperados, ferramentas por turno, retentativas e circuit breaker.

Ao atingir limite, pare de chamar o modelo e encaminhe/avise o operador. Não tente contornar rate limits com loops ou várias chaves.

Recomendações iniciais que precisam ser calibradas por avaliação:

- `reasoning.effort=low` para atendimento sensível a latência;
- compare `low` e `medium` no builder;
- limite de uma resposta do agente por mensagem recebida;
- poucas chamadas de ferramenta por turno e profundidade total finita;
- timeout menor que a janela operacional do worker;
- circuit breaker em falhas repetidas/429/5xx.

Esses valores não devem ser tratados como universais. Registre a decisão por organização/plano.

## Avaliações antes de trocar prompt ou modelo

Use dados sintéticos ou devidamente autorizados e cubra:

- resposta sustentada por fonte e citação correta;
- ausência de fonte para preço/prazo/política;
- coleta progressiva sem repetir perguntas;
- pedido de humano e bloqueio de resposta da IA;
- prompt injection no usuário e no documento;
- dados pessoais sensíveis;
- ferramenta proibida e ferramenta indisponível;
- cliente confuso/irritado;
- mensagem fora do horário;
- formato JSON inválido, recusa, timeout e rate limit;
- comparação Terra/Sol em qualidade, latência e custo.

Um modelo mais capaz não elimina guardrails, validação nem revisão humana.

## Diagnóstico

| Sintoma | Verificação |
| --- | --- |
| continua respondendo em demo | confirme `APP_MODE`; este é o comportamento esperado |
| 401/invalid API key | projeto correto, chave ativa e segredo disponível no processo servidor |
| 403/model unavailable | acesso do projeto e slug configurado nas três variáveis |
| 429 | orçamento/rate limit, concorrência e política de retry com jitter |
| JSON inválido | structured output, schema compatível, tratamento de recusa e validação Zod |
| custo alto | contexto, chunks, tokens, chamadas repetidas, modelo e cache |
| resposta sem fonte | filtro de tenant, ingestão, threshold e regra de handoff |

Nunca coloque a chave nem o conteúdo completo do cliente em uma issue ao investigar.
