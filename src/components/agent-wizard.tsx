"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FlaskConical,
  ListChecks,
  MessageCircleQuestion,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  WandSparkles,
  Workflow,
  X,
} from "lucide-react";
import { useAppStore } from "@/hooks/use-app-store";
import type { Agent, AgentConfig, ChatMessage, GeneratedAgentDraft } from "@/types";
import { Button, Field, Input, LinkButton, PageHeader, Select, Textarea, cn } from "@/components/ui";

const steps = [
  { title: "Empresa", short: "Empresa", icon: Building2 },
  { title: "Objetivo", short: "Objetivo", icon: Sparkles },
  { title: "Serviços", short: "Serviços", icon: BriefcaseBusiness },
  { title: "Público", short: "Público", icon: UsersRound },
  { title: "Personalidade", short: "Persona", icon: UserRound },
  { title: "Qualificação", short: "Perguntas", icon: MessageCircleQuestion },
  { title: "Horários", short: "Horários", icon: Clock3 },
  { title: "Encaminhamento", short: "Humano", icon: Workflow },
  { title: "Conhecimento", short: "Base", icon: BookOpen },
  { title: "Ferramentas", short: "Ferramentas", icon: ListChecks },
  { title: "Teste", short: "Teste", icon: FlaskConical },
  { title: "Revisão", short: "Publicar", icon: ShieldCheck },
] as const;

const availableTools = [
  "Registrar lead",
  "Atualizar lead",
  "Consultar horário de funcionamento",
  "Consultar catálogo",
  "Solicitar orçamento",
  "Solicitar agendamento",
  "Encaminhar para humano",
  "Enviar notificação interna",
  "Disparar webhook autorizado",
];

const defaultConfig: AgentConfig = {
  objective: "Atender clientes, esclarecer dúvidas e registrar oportunidades qualificadas.",
  persona: "Assistente virtual profissional, transparente e prestativo.",
  tone: "Cordial e objetivo",
  language: "Português do Brasil",
  greeting: "Olá! Sou o assistente virtual da empresa. Como posso ajudar?",
  services: [],
  allowedTopics: ["Serviços", "Horários", "Orçamentos"],
  forbiddenTopics: ["Informações não confirmadas", "Descontos não autorizados"],
  qualificationQuestions: ["Qual é o seu nome?", "Como podemos entrar em contato?", "O que você procura?"],
  requiredInformation: ["Nome", "Telefone", "Interesse"],
  businessHours: "Segunda a sexta, 08:00-18:00",
  responseRules: ["Não inventar preços ou prazos", "Confirmar dados antes de executar uma ação"],
  maxMessageLength: 600,
  knowledgeSourceIds: [],
  allowedTools: ["Registrar lead", "Encaminhar para humano"],
  handoffRules: ["Cliente pedir atendimento humano", "Confiança abaixo do limite mínimo"],
  confidenceThreshold: 0.7,
  privacyMessage: "Usaremos seus dados apenas para este atendimento. Você pode solicitar revisão ou exclusão.",
  errorMessage: "Não consegui confirmar essa informação. Vou encaminhar para nossa equipe.",
  outOfHoursMessage: "Estamos fora do horário agora. Sua mensagem foi registrada para o próximo período útil.",
};

function fallbackDraft(prompt: string, companyName: string): GeneratedAgentDraft {
  const lower = prompt.toLowerCase();
  const automotive = lower.includes("oficina") || lower.includes("automot");
  const bakery = lower.includes("doce") || lower.includes("bolo") || lower.includes("confeitaria");
  const school = lower.includes("escola") || lower.includes("matrícula") || lower.includes("educa");
  const services = automotive
    ? ["Polimento técnico", "Vitrificação", "Higienização interna"]
    : bakery
      ? ["Bolos personalizados", "Doces", "Kits para festa"]
      : school
        ? ["Matrículas", "Visitas", "Informações pedagógicas"]
        : ["Atendimento", "Orçamento", "Agendamento"];
  return {
    name: automotive ? "Nilo" : bakery ? "Clara" : school ? "Lia" : "Nina",
    role: automotive ? "Consultor automotivo" : bakery ? "Assistente de encomendas" : school ? "Assistente escolar" : "Assistente de atendimento",
    description: `Assistente virtual de ${companyName} configurado a partir do briefing informado.`,
    config: {
      ...defaultConfig,
      objective: prompt.trim() || defaultConfig.objective,
      services,
      greeting: `Olá! Sou o assistente virtual de ${companyName}. Como posso ajudar?`,
      qualificationQuestions: automotive
        ? ["Qual é o modelo e ano do veículo?", "Qual serviço você procura?", "Qual dia prefere?"]
        : bakery
          ? ["Qual é a data do evento?", "Para quantas pessoas?", "Há restrição alimentar?"]
          : school
            ? ["Qual é a idade do estudante?", "Para qual ano letivo?", "Qual é o contato do responsável?"]
            : defaultConfig.qualificationQuestions,
    },
  };
}

function TagEditor({ values, onChange, placeholder }: { values: string[]; onChange: (values: string[]) => void; placeholder: string }) {
  const [value, setValue] = useState("");
  const add = () => {
    const item = value.trim();
    if (!item || values.some((current) => current.toLowerCase() === item.toLowerCase())) return;
    onChange([...values, item]);
    setValue("");
  };
  return (
    <div>
      <div className="flex gap-2"><Input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} placeholder={placeholder} /><Button type="button" icon={Plus} onClick={add} aria-label="Adicionar item">Adicionar</Button></div>
      {values.length ? <div className="mt-3 flex flex-wrap gap-2">{values.map((item) => <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-raised px-2.5 py-1 text-xs text-muted-strong">{item}<button type="button" onClick={() => onChange(values.filter((current) => current !== item))} className="text-muted hover:text-danger" aria-label={`Remover ${item}`}><X className="size-3" /></button></span>)}</div> : <p className="mt-2 text-xs text-muted">Nenhum item adicionado.</p>}
    </div>
  );
}

function Choice({ checked, onChange, title, description }: { checked: boolean; onChange: (checked: boolean) => void; title: string; description?: string }) {
  return (
    <label className={cn("flex cursor-pointer gap-3 rounded-md border p-3 transition-colors", checked ? "border-violet/45 bg-violet/[0.07]" : "border-border bg-background/35 hover:border-border-strong")}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-4 accent-violet" />
      <span><span className="block text-sm font-medium text-foreground">{title}</span>{description ? <span className="mt-0.5 block text-xs leading-5 text-muted">{description}</span> : null}</span>
    </label>
  );
}

function ReviewRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-1 border-b border-border py-3 last:border-0 sm:grid-cols-[160px_1fr]"><dt className="text-xs font-medium text-muted">{label}</dt><dd className="text-sm text-muted-strong">{children}</dd></div>;
}

export function AgentWizard() {
  const router = useRouter();
  const companies = useAppStore((state) => state.companies);
  const selectedCompanyId = useAppStore((state) => state.selectedCompanyId);
  const knowledge = useAppStore((state) => state.knowledge);
  const addAgent = useAppStore((state) => state.addAgent);
  const notify = useAppStore((state) => state.notify);
  const initialCompanyId = selectedCompanyId === "all" ? companies[0]?.id || "" : selectedCompanyId;
  const [step, setStep] = useState(0);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [brief, setBrief] = useState("Crie um agente que responda dúvidas, explique os serviços, faça perguntas para qualificar o cliente e encaminhe solicitações comerciais para um atendente.");
  const [audience, setAudience] = useState("Pessoas interessadas nos serviços da empresa, atendidas pelo WhatsApp.");
  const [draft, setDraft] = useState<GeneratedAgentDraft>({ name: "Novo agente", role: "Assistente virtual", description: "", config: structuredClone(defaultConfig) });
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [testInput, setTestInput] = useState("Olá, quero saber mais sobre os serviços.");
  const [testing, setTesting] = useState(false);
  const [testMessages, setTestMessages] = useState<ChatMessage[]>([]);
  const draftHydrated = useRef(false);
  const company = companies.find((item) => item.id === companyId);
  const scopedKnowledge = knowledge.filter((source) => source.companyId === companyId);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem("zyrva-agent-wizard-draft");
      draftHydrated.current = true;
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored) as { companyId?: string; brief?: string; audience?: string; draft?: GeneratedAgentDraft; step?: number };
        if (parsed.companyId) setCompanyId(parsed.companyId);
        if (parsed.brief) setBrief(parsed.brief);
        if (parsed.audience) setAudience(parsed.audience);
        if (parsed.draft) setDraft(parsed.draft);
        if (typeof parsed.step === "number") setStep(Math.min(11, Math.max(0, parsed.step)));
      } catch { window.localStorage.removeItem("zyrva-agent-wizard-draft"); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!draftHydrated.current) return;
    window.localStorage.setItem("zyrva-agent-wizard-draft", JSON.stringify({ companyId, brief, audience, draft, step }));
  }, [audience, brief, companyId, draft, step]);

  const updateDraft = (patch: Partial<GeneratedAgentDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const updateConfig = <K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) => setDraft((current) => ({ ...current, config: { ...current.config, [key]: value } }));
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const CurrentStepIcon = steps[step].icon;
  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(companyId && draft.name.trim() && draft.role.trim());
    if (step === 1) return Boolean(draft.config.objective.trim());
    if (step === 2) return draft.config.services.length > 0;
    if (step === 4) return Boolean(draft.config.persona.trim() && draft.config.greeting.trim());
    return true;
  }, [companyId, draft, step]);

  const generate = async () => {
    setGenerating(true);
    const fallback = fallbackDraft(brief, company?.name || "sua empresa");
    try {
      const response = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: brief,
          businessName: company?.name,
          businessType: company?.segment,
          useAI: false,
        }),
      });
      if (!response.ok) throw new Error("adaptador indisponível");
      const payload = (await response.json()) as {
        draft?: Partial<GeneratedAgentDraft>;
        data?: {
          configuration?: {
            name?: string;
            description?: string;
            objective?: string;
            persona?: string;
            tone?: string[];
            greeting?: string;
            services?: Array<{ name: string }>;
            allowedTopics?: string[];
            forbiddenTopics?: string[];
            qualificationQuestions?: Array<{ question: string }>;
            requiredInformation?: string[];
            responseRules?: string[];
            maxMessageLength?: number;
            knowledgeSourceIds?: string[];
            authorizedTools?: string[];
            handoffRules?: Array<{ message: string }>;
            minimumConfidence?: number;
            privacyMessage?: string;
            errorMessage?: string;
            outsideHoursMessage?: string;
          };
        };
      };
      const configuration = payload.data?.configuration;
      const generated: Partial<GeneratedAgentDraft> = payload.draft || (configuration ? {
        name: configuration.name,
        role: configuration.persona,
        description: configuration.description,
        config: {
          ...fallback.config,
          objective: configuration.objective || fallback.config.objective,
          persona: configuration.persona || fallback.config.persona,
          tone: configuration.tone?.join(", ") || fallback.config.tone,
          greeting: configuration.greeting || fallback.config.greeting,
          services: configuration.services?.map((service) => service.name) || fallback.config.services,
          allowedTopics: configuration.allowedTopics || fallback.config.allowedTopics,
          forbiddenTopics: configuration.forbiddenTopics || fallback.config.forbiddenTopics,
          qualificationQuestions: configuration.qualificationQuestions?.map((question) => question.question) || fallback.config.qualificationQuestions,
          requiredInformation: configuration.requiredInformation || fallback.config.requiredInformation,
          responseRules: configuration.responseRules || fallback.config.responseRules,
          maxMessageLength: configuration.maxMessageLength || fallback.config.maxMessageLength,
          knowledgeSourceIds: configuration.knowledgeSourceIds || [],
          allowedTools: configuration.authorizedTools || fallback.config.allowedTools,
          handoffRules: configuration.handoffRules?.map((rule) => rule.message) || fallback.config.handoffRules,
          confidenceThreshold: configuration.minimumConfidence ?? fallback.config.confidenceThreshold,
          privacyMessage: configuration.privacyMessage || fallback.config.privacyMessage,
          errorMessage: configuration.errorMessage || fallback.config.errorMessage,
          outOfHoursMessage: configuration.outsideHoursMessage || fallback.config.outOfHoursMessage,
        },
      } : {});
      setDraft({
        ...fallback,
        ...generated,
        config: { ...fallback.config, ...(generated.config || {}) },
      });
      notify({ title: "Rascunho gerado", description: "Revise todas as etapas antes de publicar.", tone: "success" });
    } catch {
      setDraft(fallback);
      notify({ title: "Rascunho demonstrativo gerado", description: "A IA externa não está configurada; usamos o gerador local seguro.", tone: "warning" });
    } finally {
      setGenerating(false);
    }
  };

  const sendTest = async () => {
    const body = testInput.trim();
    if (!body) return;
    const contact: ChatMessage = { id: `test-contact-${Date.now()}`, author: "contact", body, timestamp: "Agora" };
    setTestMessages((current) => [...current, contact]);
    setTestInput("");
    setTesting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    const service = draft.config.services[0];
    const reply = service
      ? `${draft.config.greeting} Posso explicar sobre ${service.toLowerCase()} ou registrar seu interesse para nossa equipe.`
      : `${draft.config.greeting} Vou fazer algumas perguntas para entender melhor o que você precisa.`;
    setTestMessages((current) => [...current, { id: `test-agent-${Date.now()}`, author: "agent", body: reply, timestamp: "Agora", sourceLabels: ["Simulação local do rascunho"] }]);
    setTesting(false);
  };

  const saveAgent = (status: "Rascunho" | "Ativo") => {
    if (status === "Ativo" && !reviewed) return;
    setPublishing(true);
    const now = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date());
    const agent: Agent = {
      id: `agent-${Date.now()}`,
      companyId,
      name: draft.name.trim(),
      role: draft.role.trim(),
      description: draft.description.trim() || draft.config.objective,
      status,
      version: 1,
      model: status === "Ativo" ? "Modelo de produção" : "Modelo de teste",
      channel: status === "Ativo" ? "Playground" : "Não conectado",
      updatedAt: "Agora",
      publishedAt: status === "Ativo" ? now : undefined,
      conversations: 0,
      resolutionRate: 0,
      config: draft.config,
    };
    addAgent(agent);
    window.localStorage.removeItem("zyrva-agent-wizard-draft");
    notify({ title: status === "Ativo" ? "Agente publicado na demonstração" : "Rascunho salvo localmente", description: `${agent.name} foi adicionado ao estado local de ${company?.name}.`, tone: "success" });
    router.push("/agentes");
  };

  const content = (() => {
    switch (step) {
      case 0:
        return <div className="space-y-5"><div className="rounded-lg border border-violet/30 bg-violet/[0.06] p-4"><div className="flex items-center gap-2 text-sm font-semibold"><WandSparkles className="size-4 text-violet-soft" /> Comece com linguagem natural</div><p className="mt-1 text-xs leading-5 text-muted">Descreva o negócio e o resultado esperado. A configuração gerada será declarativa e sempre exigirá revisão humana.</p><Textarea value={brief} onChange={(event) => setBrief(event.target.value)} className="mt-3 min-h-28 bg-background" /><div className="mt-3 flex justify-end"><Button variant="primary" icon={Sparkles} loading={generating} onClick={generate}>Gerar rascunho com IA</Button></div></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Empresa" required><Select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Field label="Nome do agente" required><Input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} placeholder="Ex.: Nina" /></Field><Field label="Função do agente" required><Input value={draft.role} onChange={(event) => updateDraft({ role: event.target.value })} placeholder="Ex.: Consultor de atendimento" /></Field><Field label="Descrição"><Input value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} placeholder="Resumo para identificação interna" /></Field></div></div>;
      case 1:
        return <div className="space-y-5"><Field label="Objetivo principal" hint="Defina um resultado observável, sem prometer ações que dependam de uma pessoa." required><Textarea value={draft.config.objective} onChange={(event) => updateConfig("objective", event.target.value)} className="min-h-32" /></Field><div className="grid gap-3 sm:grid-cols-3">{["Responder dúvidas", "Qualificar leads", "Encaminhar solicitações"].map((objective) => <button key={objective} type="button" className="rounded-md border border-border bg-background/40 p-3 text-left text-sm text-muted-strong hover:border-violet/40 hover:bg-violet/[0.05]" onClick={() => updateConfig("objective", `${draft.config.objective.replace(/\.$/, "")}. ${objective}.`)}>{objective}<ChevronRight className="mt-3 size-3.5 text-violet-soft" /></button>)}</div></div>;
      case 2:
        return <div className="space-y-6"><Field label="Serviços e produtos" hint="Cadastre somente ofertas reais. Preços poderão vir da base de conhecimento." required><TagEditor values={draft.config.services} onChange={(values) => updateConfig("services", values)} placeholder="Ex.: Higienização interna" /></Field><Field label="Tópicos permitidos"><TagEditor values={draft.config.allowedTopics} onChange={(values) => updateConfig("allowedTopics", values)} placeholder="Ex.: Formas de atendimento" /></Field></div>;
      case 3:
        return <div className="space-y-5"><Field label="Público atendido" hint="Ajuda a IA a escolher vocabulário e perguntas adequadas."><Textarea value={audience} onChange={(event) => setAudience(event.target.value)} className="min-h-28" /></Field><div><p className="mb-3 text-sm font-medium text-muted-strong">Princípios de atendimento</p><div className="grid gap-3 sm:grid-cols-2"><Choice checked title="Linguagem acessível" description="Evitar jargões desnecessários e explicar termos técnicos." onChange={() => undefined} /><Choice checked title="Identificação transparente" description="Informar que o atendimento é feito por um assistente virtual." onChange={() => undefined} /><Choice checked title="Oferta de atendimento humano" description="Nunca bloquear o acesso a uma pessoa." onChange={() => undefined} /><Choice checked title="Coleta mínima de dados" description="Solicitar apenas o necessário para o atendimento." onChange={() => undefined} /></div></div></div>;
      case 4:
        return <div className="grid gap-5 sm:grid-cols-2"><Field label="Persona" required className="sm:col-span-2"><Textarea value={draft.config.persona} onChange={(event) => updateConfig("persona", event.target.value)} /></Field><Field label="Tom de voz"><Select value={draft.config.tone} onChange={(event) => updateConfig("tone", event.target.value)}><option>Cordial e objetivo</option><option>Acolhedor e consultivo</option><option>Técnico e direto</option><option>Formal e cuidadoso</option></Select></Field><Field label="Idioma"><Select value={draft.config.language} onChange={(event) => updateConfig("language", event.target.value)}><option>Português do Brasil</option></Select></Field><Field label="Saudação inicial" required className="sm:col-span-2"><Textarea value={draft.config.greeting} onChange={(event) => updateConfig("greeting", event.target.value)} /></Field><Field label="Tamanho máximo da mensagem" hint={`${draft.config.maxMessageLength} caracteres`} className="sm:col-span-2"><input type="range" min="200" max="1200" step="50" value={draft.config.maxMessageLength} onChange={(event) => updateConfig("maxMessageLength", Number(event.target.value))} className="w-full accent-violet" /></Field></div>;
      case 5:
        return <div className="space-y-6"><Field label="Perguntas de qualificação"><TagEditor values={draft.config.qualificationQuestions} onChange={(values) => updateConfig("qualificationQuestions", values)} placeholder="Ex.: Qual o melhor dia?" /></Field><Field label="Informações obrigatórias"><TagEditor values={draft.config.requiredInformation} onChange={(values) => updateConfig("requiredInformation", values)} placeholder="Ex.: Telefone" /></Field><div className="rounded-md border border-cyan/25 bg-cyan/[0.05] p-3 text-xs leading-5 text-muted"><strong className="text-cyan">Boa prática:</strong> o agente perguntará um item por vez e confirmará os dados antes de registrar o lead.</div></div>;
      case 6:
        return <div className="space-y-5"><Field label="Horário de funcionamento"><Input value={draft.config.businessHours} onChange={(event) => updateConfig("businessHours", event.target.value)} /></Field><div className="flex flex-wrap gap-2">{["Segunda a sexta, 08:00-18:00", "Segunda a sábado, 09:00-18:00", "Todos os dias, 08:00-22:00"].map((value) => <Button key={value} size="sm" variant={draft.config.businessHours === value ? "primary" : "secondary"} onClick={() => updateConfig("businessHours", value)}>{value}</Button>)}</div><Field label="Mensagem fora do horário"><Textarea value={draft.config.outOfHoursMessage} onChange={(event) => updateConfig("outOfHoursMessage", event.target.value)} /></Field></div>;
      case 7:
        return <div className="space-y-6"><Field label="Regras de encaminhamento"><TagEditor values={draft.config.handoffRules} onChange={(values) => updateConfig("handoffRules", values)} placeholder="Ex.: Cliente demonstrar irritação" /></Field><Field label={`Confiança mínima: ${Math.round(draft.config.confidenceThreshold * 100)}%`} hint="Abaixo deste nível, o agente não tenta adivinhar e encaminha ou pede esclarecimento."><input type="range" min="0.5" max="0.95" step="0.05" value={draft.config.confidenceThreshold} onChange={(event) => updateConfig("confidenceThreshold", Number(event.target.value))} className="w-full accent-violet" /></Field><Field label="Mensagem de erro"><Textarea value={draft.config.errorMessage} onChange={(event) => updateConfig("errorMessage", event.target.value)} /></Field></div>;
      case 8:
        return <div className="space-y-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">Fontes disponíveis em {company?.name}</p><p className="mt-1 text-xs text-muted">Somente fontes prontas poderão fundamentar respostas.</p></div><LinkButton href="/conhecimento" size="sm" icon={Plus}>Adicionar fonte</LinkButton></div>{scopedKnowledge.length ? <div className="grid gap-3">{scopedKnowledge.map((source) => <Choice key={source.id} checked={draft.config.knowledgeSourceIds.includes(source.id)} onChange={(checked) => updateConfig("knowledgeSourceIds", checked ? [...draft.config.knowledgeSourceIds, source.id] : draft.config.knowledgeSourceIds.filter((id) => id !== source.id))} title={source.name} description={`${source.type} · ${source.status} · ${source.chunks} fragmentos`} />)}</div> : <div className="rounded-lg border border-dashed border-border-strong py-12 text-center"><BookOpen className="mx-auto size-6 text-muted" /><p className="mt-3 text-sm font-medium">Nenhuma fonte nesta empresa</p><p className="mt-1 text-xs text-muted">Você pode continuar e adicionar conhecimento depois.</p></div>}</div>;
      case 9:
        return <div className="space-y-6"><div><p className="mb-3 text-sm font-medium text-muted-strong">Ferramentas autorizadas</p><div className="grid gap-3 sm:grid-cols-2">{availableTools.map((tool) => <Choice key={tool} checked={draft.config.allowedTools.includes(tool)} onChange={(checked) => updateConfig("allowedTools", checked ? [...draft.config.allowedTools, tool] : draft.config.allowedTools.filter((item) => item !== tool))} title={tool} description={["Confirmar agendamento", "Disparar webhook autorizado"].includes(tool) ? "Ação sujeita a confirmação e limites." : undefined} />)}</div></div><Field label="Assuntos proibidos"><TagEditor values={draft.config.forbiddenTopics} onChange={(values) => updateConfig("forbiddenTopics", values)} placeholder="Ex.: Conceder desconto" /></Field><Field label="Regras de resposta"><TagEditor values={draft.config.responseRules} onChange={(values) => updateConfig("responseRules", values)} placeholder="Ex.: Não prometer disponibilidade" /></Field></div>;
      case 10:
        return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]"><div className="overflow-hidden rounded-lg border border-border bg-background"><div className="flex h-12 items-center gap-2 border-b border-border px-4"><span className="size-2 rounded-full bg-success" /><p className="text-sm font-medium">Teste do rascunho</p></div><div className="flex min-h-80 flex-col justify-end gap-3 p-4">{testMessages.length ? testMessages.map((message) => <div key={message.id} className={cn("max-w-[85%] rounded-md px-3 py-2 text-sm leading-5", message.author === "contact" ? "ml-auto bg-violet text-white" : "border border-border-strong bg-surface-raised text-muted-strong")}><p>{message.body}</p>{message.sourceLabels ? <p className="mt-1 text-[10px] text-cyan">{message.sourceLabels.join(" · ")}</p> : null}</div>) : <div className="m-auto text-center"><Bot className="mx-auto size-6 text-muted" /><p className="mt-2 text-sm font-medium">Envie a primeira mensagem</p><p className="mt-1 text-xs text-muted">O teste não usa WhatsApp real.</p></div>}</div><div className="flex gap-2 border-t border-border p-3"><Input value={testInput} onChange={(event) => setTestInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendTest(); }} placeholder="Digite como um cliente..." /><Button variant="primary" icon={Send} loading={testing} onClick={sendTest} aria-label="Enviar mensagem">Enviar</Button></div></div><div><p className="text-sm font-medium">Diagnóstico</p><dl className="mt-3 divide-y divide-border rounded-lg border border-border bg-background/40 px-3"><ReviewRow label="Versão">Rascunho atual</ReviewRow><ReviewRow label="Intenção">Informação comercial</ReviewRow><ReviewRow label="Confiança"><span className="text-success">86%</span></ReviewRow><ReviewRow label="Ferramentas">Nenhuma executada</ReviewRow><ReviewRow label="Fontes">{draft.config.knowledgeSourceIds.length || "Sem fonte"}</ReviewRow></dl></div></div>;
      default:
        return <div className="space-y-5"><div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/[0.06] p-4"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /><div><p className="text-sm font-semibold">Configuração pronta para revisão</p><p className="mt-1 text-xs leading-5 text-muted">No modo demonstrativo, a publicação cria uma versão local para o playground. Persistência e conexão de canal exigem o ambiente completo.</p></div></div><dl className="rounded-lg border border-border bg-background/35 px-4"><ReviewRow label="Empresa">{company?.name}</ReviewRow><ReviewRow label="Agente">{draft.name} · {draft.role}</ReviewRow><ReviewRow label="Objetivo">{draft.config.objective}</ReviewRow><ReviewRow label="Persona">{draft.config.persona} · {draft.config.tone}</ReviewRow><ReviewRow label="Serviços">{draft.config.services.join(", ") || "Nenhum"}</ReviewRow><ReviewRow label="Qualificação">{draft.config.qualificationQuestions.length} perguntas · {draft.config.requiredInformation.length} dados obrigatórios</ReviewRow><ReviewRow label="Conhecimento">{draft.config.knowledgeSourceIds.length} fontes vinculadas</ReviewRow><ReviewRow label="Ferramentas">{draft.config.allowedTools.length} autorizadas</ReviewRow><ReviewRow label="Encaminhamento">Abaixo de {Math.round(draft.config.confidenceThreshold * 100)}% de confiança</ReviewRow></dl><Choice checked={reviewed} onChange={setReviewed} title="Revisei esta configuração e autorizo a publicação demonstrativa" description="A IA não publica nem executa ações sensíveis sem esta confirmação humana." /><div className="rounded-md border border-warning/25 bg-warning/[0.05] p-3 text-xs leading-5 text-muted"><strong className="text-warning">Antes de operar:</strong> configure credenciais oficiais, revise políticas de privacidade e teste cenários críticos.</div></div>;
    }
  })();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Criador de agentes" title="Novo agente" description="Transforme o contexto do negócio em uma configuração segura, revisável e pronta para testes." actions={<Button icon={Save} onClick={() => saveAgent("Rascunho")}>Salvar rascunho</Button>} />
      <div className="lg:hidden"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium">Etapa {step + 1} de 12 · {steps[step].title}</span><span className="text-muted">{progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-raised"><div className="h-full bg-violet transition-[width]" style={{ width: `${progress}%` }} /></div></div>
      <div className="grid overflow-hidden rounded-lg border border-border bg-surface lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-background/35 p-3 lg:block"><p className="px-2 pb-3 text-[10px] font-semibold uppercase text-muted">Configuração · {progress}%</p><ol className="space-y-0.5">{steps.map((item, index) => <li key={item.title}><button type="button" onClick={() => index <= step && setStep(index)} disabled={index > step} className={cn("flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-xs transition-colors", index === step ? "bg-violet/12 text-foreground" : index < step ? "text-muted-strong hover:bg-surface-hover" : "text-muted/45")}><span className={cn("flex size-5 items-center justify-center rounded border", index < step ? "border-success/30 bg-success/10 text-success" : index === step ? "border-violet/40 bg-violet/15 text-violet-soft" : "border-border text-muted/50")}>{index < step ? <Check className="size-3" /> : <item.icon className="size-3" />}</span><span className="truncate">{index + 1}. {item.short}</span></button></li>)}</ol></aside>
        <section className="min-w-0"><header className="border-b border-border px-4 py-4 sm:px-6"><div className="flex items-center gap-2 text-xs font-medium text-violet-soft"><CurrentStepIcon className="size-4" /> Etapa {step + 1} de 12</div><h2 className="mt-1 text-lg font-semibold">{steps[step].title}</h2></header><div className="min-h-[520px] p-4 sm:p-6">{content}</div><footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/30 px-4 py-3 sm:px-6"><Button icon={ArrowLeft} onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>Voltar</Button><p className="hidden text-[11px] text-muted sm:block">Rascunho salvo automaticamente neste navegador</p>{step < 11 ? <Button variant="primary" icon={ArrowRight} onClick={() => setStep((current) => Math.min(11, current + 1))} disabled={!canContinue} className="flex-row-reverse">Continuar</Button> : <Button variant="primary" icon={Send} loading={publishing} disabled={!reviewed} onClick={() => saveAgent("Ativo")}>Publicar versão 1</Button>}</footer></section>
      </div>
    </div>
  );
}
