"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  BookOpen,
  Box,
  CheckCircle2,
  CircleHelp,
  FileText,
  Link2,
  MoreHorizontal,
  Plus,
  Search,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { useAppStore } from "@/hooks/use-app-store";
import type { KnowledgeSource, KnowledgeType } from "@/types";
import { Badge, Button, Field, IconButton, Input, Modal, PageHeader, Select, Textarea, cn, statusTone } from "@/components/ui";

const typeIcons = { Documento: FileText, Texto: FileText, FAQ: CircleHelp, Catalogo: Box, Link: Link2 };
const typeLabel = (type: KnowledgeType) => type === "Catalogo" ? "Catálogo" : type;

export function KnowledgeView() {
  const sources = useAppStore((state) => state.knowledge);
  const agents = useAppStore((state) => state.agents);
  const companies = useAppStore((state) => state.companies);
  const selectedCompanyId = useAppStore((state) => state.selectedCompanyId);
  const addKnowledge = useAppStore((state) => state.addKnowledge);
  const notify = useAppStore((state) => state.notify);
  const companyId = selectedCompanyId === "all" ? companies[0]?.id || "" : selectedCompanyId;
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"Todas" | KnowledgeType>("Todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"arquivo" | "texto" | "faq" | "catalogo">("arquivo");
  const [form, setForm] = useState({ name: "", content: "", answer: "", fileName: "", agentId: "" });

  const filtered = useMemo(() => sources.filter((source) => {
    const companyMatch = selectedCompanyId === "all" || source.companyId === selectedCompanyId;
    return companyMatch && source.name.toLowerCase().includes(query.toLowerCase()) && (view === "Todas" || source.type === view);
  }), [query, selectedCompanyId, sources, view]);
  const companyAgents = agents.filter((agent) => agent.companyId === companyId);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const type: KnowledgeType = mode === "arquivo" ? "Documento" : mode === "texto" ? "Texto" : mode === "faq" ? "FAQ" : "Catalogo";
    const name = mode === "arquivo" ? (form.fileName || form.name) : form.name;
    const source: KnowledgeSource = {
      id: `knowledge-${Date.now()}`,
      companyId,
      agentId: form.agentId || undefined,
      name: name.trim(),
      type,
      status: mode === "arquivo" ? "Processando" : "Pronto",
      chunks: mode === "arquivo" ? 0 : Math.max(1, Math.ceil((form.content.length + form.answer.length) / 450)),
      size: mode === "arquivo" ? "Arquivo local" : `${Math.max(1, Math.ceil((form.content.length + form.answer.length) / 1024))} KB`,
      updatedAt: "Agora",
      content: mode === "faq" ? `${form.content}\n${form.answer}` : form.content,
    };
    addKnowledge(source);
    setModalOpen(false);
    setForm({ name: "", content: "", answer: "", fileName: "", agentId: "" });
    notify({ title: mode === "arquivo" ? "Arquivo recebido" : "Conhecimento adicionado", description: mode === "arquivo" ? "O processamento está simulado neste ambiente." : "A fonte está pronta para vinculação.", tone: "success" });
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Conteúdo fundamentado" title="Base de conhecimento" description="Organize documentos, textos, perguntas frequentes e catálogos sem misturar dados entre empresas." actions={<Button variant="primary" icon={Plus} onClick={() => setModalOpen(true)}>Adicionar conhecimento</Button>} />

      <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Buscar fontes</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar fontes por nome" className="pl-9" /></label><div className="flex gap-1 overflow-x-auto rounded-md border border-border bg-surface p-1">{(["Todas", "Documento", "Texto", "FAQ", "Catalogo"] as const).map((item) => <button key={item} type="button" onClick={() => setView(item)} className={cn("shrink-0 rounded px-3 py-1.5 text-xs font-medium", view === item ? "bg-surface-hover text-foreground" : "text-muted hover:text-foreground")}>{item === "Catalogo" ? "Catálogo" : item}</button>)}</div></div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="hidden grid-cols-[minmax(220px,1.4fr)_110px_110px_100px_90px_44px] border-b border-border bg-background/40 px-4 py-3 text-[10px] font-semibold uppercase text-muted md:grid"><span>Fonte</span><span>Tipo</span><span>Status</span><span>Fragmentos</span><span>Atualizada</span><span /></div>
          <div className="divide-y divide-border">{filtered.map((source) => { const Icon = typeIcons[source.type]; const agent = agents.find((item) => item.id === source.agentId); return <article key={source.id} className="grid gap-3 p-4 hover:bg-surface-hover md:grid-cols-[minmax(220px,1.4fr)_110px_110px_100px_90px_44px] md:items-center"><div className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted"><Icon className="size-4" /></span><div className="min-w-0"><h2 className="truncate text-sm font-medium">{source.name}</h2><p className="truncate text-[11px] text-muted">{agent ? `Vinculada a ${agent.name}` : "Disponível para a empresa"} · {source.size}</p></div></div><span className="text-xs text-muted-strong">{typeLabel(source.type)}</span><Badge tone={statusTone(source.status)} dot>{source.status}</Badge><span className="text-xs text-muted">{source.chunks || "-"}</span><span className="text-[11px] text-muted">{source.updatedAt}</span><IconButton icon={MoreHorizontal} label={`Detalhes de ${source.name}`} size="sm" onClick={() => notify({ title: source.name, description: `${typeLabel(source.type)} · ${source.chunks} fragmentos · ${source.size}`, tone: source.status === "Pronto" ? "success" : "warning" })} /></article>; })}</div>
          {!filtered.length ? <div className="py-16 text-center"><BookOpen className="mx-auto size-6 text-muted" /><p className="mt-3 text-sm font-medium">Nenhuma fonte encontrada</p><p className="mt-1 text-xs text-muted">Adicione conteúdo ou ajuste os filtros.</p></div> : null}
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-border bg-surface p-4"><div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" /><h2 className="text-sm font-semibold">Estado da base</h2></div><dl className="mt-4 space-y-3 text-xs"><div className="flex justify-between"><dt className="text-muted">Fontes prontas</dt><dd className="font-medium text-success">{filtered.filter((source) => source.status === "Pronto").length}</dd></div><div className="flex justify-between"><dt className="text-muted">Em processamento</dt><dd className="font-medium text-warning">{filtered.filter((source) => source.status === "Processando").length}</dd></div><div className="flex justify-between"><dt className="text-muted">Fragmentos indexados</dt><dd className="font-medium">{filtered.reduce((sum, source) => sum + source.chunks, 0)}</dd></div></dl></section>
          <section className="rounded-lg border border-warning/25 bg-warning/[0.05] p-4"><div className="flex items-center gap-2"><ShieldAlert className="size-4 text-warning" /><h2 className="text-sm font-semibold">Proteção de conteúdo</h2></div><p className="mt-2 text-xs leading-5 text-muted">Documentos são tratados como dados não confiáveis. Instruções encontradas nas fontes não alteram as regras do agente.</p></section>
          <section className="rounded-lg border border-border bg-surface p-4"><p className="text-xs font-semibold uppercase text-muted">Formatos aceitos</p><p className="mt-2 text-xs leading-5 text-muted-strong">PDF, DOCX, TXT e CSV. Links externos exigem autorização explícita antes da coleta.</p></section>
        </aside>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Adicionar conhecimento" description="O conteúdo ficará isolado na empresa em contexto." size="lg" footer={<><Button onClick={() => setModalOpen(false)}>Cancelar</Button><Button form="knowledge-form" type="submit" variant="primary">Adicionar fonte</Button></>}>
        <form id="knowledge-form" onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Tipo de conhecimento">{([{ id: "arquivo", label: "Arquivo", icon: Upload }, { id: "texto", label: "Texto", icon: FileText }, { id: "faq", label: "FAQ", icon: CircleHelp }, { id: "catalogo", label: "Catálogo", icon: Box }] as const).map((item) => <button key={item.id} type="button" onClick={() => setMode(item.id)} className={cn("flex h-16 flex-col items-center justify-center gap-1 rounded-md border text-xs", mode === item.id ? "border-violet/45 bg-violet/[0.08] text-violet-soft" : "border-border bg-background text-muted hover:border-border-strong")}><item.icon className="size-4" />{item.label}</button>)}</div>
          {mode === "arquivo" ? <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-background/40 p-5 text-center hover:border-cyan/50"><Upload className="size-6 text-cyan" /><span className="mt-3 text-sm font-medium">{form.fileName || "Selecione um arquivo"}</span><span className="mt-1 text-xs text-muted">PDF, DOCX, TXT ou CSV · até 10 MB</span><input type="file" accept=".pdf,.docx,.txt,.csv" className="sr-only" required={!form.fileName} onChange={(event) => setForm({ ...form, fileName: event.target.files?.[0]?.name || "" })} /></label> : <div className="grid gap-4"><Field label={mode === "faq" ? "Pergunta" : mode === "catalogo" ? "Nome do catálogo" : "Título"} required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field><Field label={mode === "faq" ? "Pergunta" : mode === "catalogo" ? "Itens e condições" : "Conteúdo"} required><Textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} className="min-h-32" required /></Field>{mode === "faq" ? <Field label="Resposta confiável" required><Textarea value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} required /></Field> : null}</div>}
          <Field label="Vincular a um agente" hint="Opcional; sem vínculo, a fonte fica disponível para todos os agentes da empresa."><Select value={form.agentId} onChange={(event) => setForm({ ...form, agentId: event.target.value })}><option value="">Todos os agentes</option>{companyAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</Select></Field>
        </form>
      </Modal>
    </div>
  );
}
