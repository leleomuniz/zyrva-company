"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  CheckCheck,
  CircleUserRound,
  Info,
  MessageSquareText,
  StickyNote,
  Paperclip,
  RotateCcw,
  Search,
  Send,
  Tags,
  UserRoundCheck,
} from "lucide-react";
import { useAppStore } from "@/hooks/use-app-store";
import type { LeadStage } from "@/types";
import { Badge, Button, IconButton, Input, PageHeader, Select, Textarea, cn, statusTone } from "@/components/ui";

type InboxFilter = "Todas" | "Não lidas" | "Encaminhadas" | "Humano";

export function ConversationsView() {
  const conversations = useAppStore((state) => state.conversations);
  const companies = useAppStore((state) => state.companies);
  const agents = useAppStore((state) => state.agents);
  const leads = useAppStore((state) => state.leads);
  const selectedCompanyId = useAppStore((state) => state.selectedCompanyId);
  const takeover = useAppStore((state) => state.takeoverConversation);
  const returnToAi = useAppStore((state) => state.returnConversationToAi);
  const resolve = useAppStore((state) => state.resolveConversation);
  const sendMessage = useAppStore((state) => state.sendMessage);
  const addNote = useAppStore((state) => state.addConversationNote);
  const updateLeadStage = useAppStore((state) => state.updateLeadStage);
  const notify = useAppStore((state) => state.notify);
  const [selectedId, setSelectedId] = useState(conversations[0]?.id || "");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("Todas");
  const [composer, setComposer] = useState("");
  const [note, setNote] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"list" | "chat" | "details">("list");

  const scoped = useMemo(() => conversations.filter((conversation) => {
    const companyMatch = selectedCompanyId === "all" || conversation.companyId === selectedCompanyId;
    const textMatch = `${conversation.contactName} ${conversation.contactPhone} ${conversation.lastMessage}`.toLowerCase().includes(query.toLowerCase());
    const filterMatch = filter === "Todas" || (filter === "Não lidas" && conversation.unread > 0) || (filter === "Encaminhadas" && conversation.status === "Aguardando humano") || (filter === "Humano" && conversation.status === "Humano atendendo");
    return companyMatch && textMatch && filterMatch;
  }), [conversations, filter, query, selectedCompanyId]);

  const selected = scoped.find((conversation) => conversation.id === selectedId) || scoped[0];
  const selectedLead = leads.find((lead) => lead.id === selected?.leadId);
  const selectedAgent = agents.find((agent) => agent.id === selected?.agentId);
  const selectedCompany = companies.find((company) => company.id === selected?.companyId);
  const humanMode = selected?.status === "Humano atendendo";

  const handleTakeover = () => {
    if (!selected) return;
    takeover(selected.id);
    notify({ title: "Atendimento assumido", description: "A IA foi pausada para esta conversa.", tone: "success" });
  };
  const handleReturn = () => {
    if (!selected) return;
    returnToAi(selected.id);
    notify({ title: "Conversa devolvida à IA", description: "O agente pode voltar a responder com o contexto atual.", tone: "success" });
  };
  const handleSend = () => {
    if (!selected || !composer.trim() || !humanMode) return;
    sendMessage(selected.id, composer.trim());
    setComposer("");
  };
  const handleNote = () => {
    if (!selected || !note.trim()) return;
    addNote(selected.id, note.trim());
    setNote("");
    notify({ title: "Nota interna adicionada", tone: "success" });
  };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Central de atendimento" title="Conversas" description="Acompanhe a IA, priorize encaminhamentos e assuma o atendimento sem perder o histórico." actions={<Badge tone="success" dot>Atualização local ativa</Badge>} />

      <div className="grid min-h-[680px] overflow-hidden rounded-lg border border-border bg-surface xl:h-[calc(100vh-218px)] xl:min-h-[620px] xl:grid-cols-[320px_minmax(420px,1fr)_310px]">
        <aside className={cn("min-w-0 border-r border-border", mobilePanel !== "list" && "hidden xl:block")}>
          <div className="border-b border-border p-3">
            <label className="relative"><span className="sr-only">Buscar conversas</span><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, telefone ou mensagem" className="h-9 pl-9" /></label>
            <div className="mt-2 flex gap-1 overflow-x-auto" role="group" aria-label="Filtrar conversas">{(["Todas", "Não lidas", "Encaminhadas", "Humano"] as InboxFilter[]).map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={cn("shrink-0 rounded-md px-2 py-1.5 text-[10px] font-medium", filter === item ? "bg-violet/15 text-violet-soft" : "text-muted hover:bg-surface-hover")}>{item}</button>)}</div>
          </div>
          <div className="max-h-[calc(100vh-330px)] min-h-[570px] overflow-y-auto xl:max-h-[calc(100vh-320px)] xl:min-h-0">
            {scoped.map((conversation) => {
              const companyName = companies.find((company) => company.id === conversation.companyId)?.name;
              return <button key={conversation.id} type="button" onClick={() => { setSelectedId(conversation.id); setMobilePanel("chat"); }} className={cn("w-full border-b border-border p-3 text-left transition-colors hover:bg-surface-hover", selected?.id === conversation.id && "bg-violet/[0.07]")}>
                <div className="flex gap-3"><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md text-xs font-semibold", conversation.status === "Aguardando humano" ? "bg-warning/12 text-warning" : "bg-surface-raised text-muted-strong")}>{conversation.contactInitials}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-medium">{conversation.contactName}</p><span className="ml-auto shrink-0 text-[10px] text-muted">{conversation.lastMessageAt}</span></div><p className="mt-0.5 truncate text-xs text-muted">{conversation.lastMessage}</p><div className="mt-2 flex items-center gap-2"><Badge tone={statusTone(conversation.status)} dot className="max-w-40 truncate">{conversation.status}</Badge><span className="truncate text-[10px] text-muted">{companyName}</span>{conversation.unread ? <span className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-violet px-1.5 text-[10px] font-semibold text-white">{conversation.unread}</span> : null}</div></div></div>
              </button>;
            })}
            {!scoped.length ? <div className="py-16 text-center"><MessageSquareText className="mx-auto size-6 text-muted" /><p className="mt-3 text-sm font-medium">Nenhuma conversa</p><p className="mt-1 text-xs text-muted">Ajuste a busca ou os filtros.</p></div> : null}
          </div>
        </aside>

        <section className={cn("min-w-0", mobilePanel !== "chat" && "hidden xl:flex", "flex-col")}>
          {selected ? <>
            <header className="flex min-h-16 items-center gap-3 border-b border-border px-3 py-2 sm:px-4">
              <IconButton icon={ArrowLeft} label="Voltar às conversas" className="xl:hidden" onClick={() => setMobilePanel("list")} />
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-raised text-xs font-semibold text-muted-strong">{selected.contactInitials}</span>
              <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{selected.contactName}</p><Badge tone={statusTone(selected.status)} dot className="hidden sm:inline-flex">{selected.status}</Badge></div><p className="truncate text-[11px] text-muted">{selected.contactPhone} · {selectedCompany?.name}</p></div>
              <div className="ml-auto flex items-center gap-2">{humanMode ? <Button size="sm" icon={RotateCcw} onClick={handleReturn}>Devolver à IA</Button> : <Button size="sm" variant="primary" icon={UserRoundCheck} onClick={handleTakeover}>Assumir</Button>}<IconButton icon={Info} label="Ver detalhes" className="xl:hidden" onClick={() => setMobilePanel("details")} /></div>
            </header>
            {humanMode ? <div className="flex items-center justify-center gap-2 border-b border-cyan/20 bg-cyan/[0.05] px-3 py-2 text-xs text-cyan"><CircleUserRound className="size-3.5" /><strong>Modo humano:</strong> a IA está pausada nesta conversa.</div> : <div className="flex items-center justify-center gap-2 border-b border-violet/20 bg-violet/[0.05] px-3 py-2 text-xs text-violet-soft"><Bot className="size-3.5" />{selectedAgent?.name} está conduzindo o atendimento.</div>}
            <div className="flex min-h-[430px] flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-5">
              <div className="my-1 text-center"><span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] text-muted">Hoje</span></div>
              {selected.messages.map((message) => {
                if (message.author === "system") return <div key={message.id} className="mx-auto flex max-w-lg items-center gap-2 rounded-md border border-border bg-background/50 px-3 py-2 text-center text-[10px] text-muted"><Info className="size-3 shrink-0" />{message.body}</div>;
                const outgoing = message.author === "agent" || message.author === "human";
                return <div key={message.id} className={cn("flex max-w-[88%] gap-2", outgoing ? "ml-auto flex-row-reverse" : "mr-auto")}><span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", message.author === "agent" ? "bg-violet/12 text-violet-soft" : message.author === "human" ? "bg-cyan/12 text-cyan" : "bg-surface-raised text-muted-strong")}>{message.author === "agent" ? <Bot className="size-3.5" /> : message.author === "human" ? <UserRoundCheck className="size-3.5" /> : <CircleUserRound className="size-3.5" />}</span><div><div className={cn("rounded-md px-3 py-2 text-sm leading-6", outgoing ? "bg-surface-raised text-muted-strong" : "border border-border bg-background text-foreground")}><p>{message.body}</p></div><div className={cn("mt-1 flex items-center gap-1 text-[10px] text-muted", outgoing && "justify-end")}><span>{message.timestamp}</span>{message.status === "read" ? <CheckCheck className="size-3 text-cyan" /> : message.status ? <Check className="size-3" /> : null}</div>{message.sourceLabels?.length ? <div className="mt-1 flex flex-wrap justify-end gap-1">{message.sourceLabels.map((source) => <Badge key={source} tone="cyan">{source}</Badge>)}</div> : null}</div></div>;
              })}
            </div>
            <div className="border-t border-border bg-background/30 p-3">
              {!humanMode ? <div className="mb-2 flex items-center justify-between gap-3 rounded-md border border-violet/20 bg-violet/[0.05] px-3 py-2"><p className="text-xs text-muted"><Bot className="mr-1.5 inline size-3.5 text-violet-soft" />Assuma a conversa para responder como atendente.</p><Button size="sm" icon={UserRoundCheck} onClick={handleTakeover}>Assumir</Button></div> : null}
              <div className="flex gap-2"><IconButton icon={Paperclip} label="Anexar arquivo" disabled={!humanMode} onClick={() => notify({ title: "Anexos indisponíveis na demonstração", description: "O envio de mídia depende do canal oficial configurado.", tone: "warning" })} /><Input value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") handleSend(); }} placeholder={humanMode ? "Responder como Leonardo..." : "Respostas humanas estão bloqueadas"} disabled={!humanMode} /><Button variant="primary" icon={Send} onClick={handleSend} disabled={!humanMode || !composer.trim()} aria-label="Enviar resposta">Enviar</Button></div>
            </div>
          </> : <div className="m-auto text-center"><MessageSquareText className="mx-auto size-7 text-muted" /><p className="mt-3 font-medium">Selecione uma conversa</p></div>}
        </section>

        <aside className={cn("min-w-0 overflow-y-auto border-l border-border", mobilePanel !== "details" && "hidden xl:block")}>
          {selected ? <>
            <div className="flex h-14 items-center gap-2 border-b border-border px-3"><IconButton icon={ArrowLeft} label="Voltar à conversa" className="xl:hidden" onClick={() => setMobilePanel("chat")} /><p className="text-sm font-semibold">Contexto do atendimento</p></div>
            <div className="divide-y divide-border">
              <section className="p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted"><CircleUserRound className="size-3.5" /> Contato</div><dl className="mt-3 space-y-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-muted">Nome</dt><dd className="text-right text-muted-strong">{selected.contactName}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted">Telefone</dt><dd className="text-right text-muted-strong">{selected.contactPhone}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted">Empresa</dt><dd className="text-right text-muted-strong">{selectedCompany?.name}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted">Agente</dt><dd className="text-right text-muted-strong">{selectedAgent?.name}</dd></div></dl></section>
              <section className="p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted"><Tags className="size-3.5" /> Etiquetas</div><div className="mt-3 flex flex-wrap gap-1.5">{selected.tags.map((tag) => <Badge key={tag} tone="violet">{tag}</Badge>)}</div></section>
              {selectedLead ? <section className="p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted"><UserRoundCheck className="size-3.5" /> Lead</div><Badge tone="success">Capturado</Badge></div><dl className="mt-3 space-y-2 text-xs"><div><dt className="text-muted">Interesse</dt><dd className="mt-1 text-muted-strong">{selectedLead.interest}</dd></div><div><dt className="text-muted">Responsável</dt><dd className="mt-1 text-muted-strong">{selectedLead.owner}</dd></div></dl><Select value={selectedLead.stage} onChange={(event) => { updateLeadStage(selectedLead.id, event.target.value as LeadStage); notify({ title: "Etapa do lead atualizada", tone: "success" }); }} className="mt-3 h-9">{["Novo", "Qualificando", "Qualificado", "Proposta", "Negociação", "Convertido", "Perdido"].map((stage) => <option key={stage}>{stage}</option>)}</Select></section> : null}
              <section className="p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted"><StickyNote className="size-3.5" /> Notas internas</div>{selected.notes.length ? <div className="mt-3 space-y-2">{selected.notes.map((item, index) => <p key={`${item}-${index}`} className="rounded-md border border-border bg-background/50 p-2 text-xs leading-5 text-muted-strong">{item}</p>)}</div> : <p className="mt-3 text-xs text-muted">Nenhuma nota interna.</p>}<Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Adicionar nota privada..." className="mt-3 min-h-20 text-xs" /><Button size="sm" className="mt-2 w-full" onClick={handleNote} disabled={!note.trim()}>Salvar nota</Button></section>
              <section className="p-4"><Button size="sm" icon={Check} variant="success" className="w-full" onClick={() => { resolve(selected.id); notify({ title: "Conversa resolvida", tone: "success" }); }}>Resolver conversa</Button></section>
            </div>
          </> : null}
        </aside>
      </div>
    </div>
  );
}
