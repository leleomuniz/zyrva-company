"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bot, CheckCircle2, Clock3, Copy, MoreHorizontal, Pause, Play, Plus, Search, Send, TestTube2 } from "lucide-react";
import { useAppStore } from "@/hooks/use-app-store";
import type { AgentStatus } from "@/types";
import { Badge, Button, IconButton, Input, LinkButton, Modal, PageHeader, Select, cn, statusTone } from "@/components/ui";

export function AgentsView() {
  const agents = useAppStore((state) => state.agents);
  const companies = useAppStore((state) => state.companies);
  const selectedCompanyId = useAppStore((state) => state.selectedCompanyId);
  const updateAgent = useAppStore((state) => state.updateAgent);
  const notify = useAppStore((state) => state.notify);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"Todos" | AgentStatus>("Todos");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const filtered = useMemo(() => agents.filter((agent) => {
    const inCompany = selectedCompanyId === "all" || agent.companyId === selectedCompanyId;
    return inCompany && `${agent.name} ${agent.role}`.toLowerCase().includes(query.toLowerCase()) && (status === "Todos" || agent.status === status);
  }), [agents, query, selectedCompanyId, status]);
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);

  const toggleAgent = (agentId: string, current: AgentStatus) => {
    const next = current === "Ativo" ? "Pausado" : "Ativo";
    updateAgent(agentId, { status: next, updatedAt: "Agora" });
    notify({ title: next === "Ativo" ? "Agente ativado" : "Agente pausado", description: next === "Ativo" ? "O agente pode voltar a responder nos canais conectados." : "Novas mensagens não serão respondidas automaticamente.", tone: next === "Ativo" ? "success" : "warning" });
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Equipe digital" title="Agentes" description="Crie, revise, teste e publique configurações declarativas para cada empresa." actions={<LinkButton href="/agentes/novo" variant="primary" icon={Plus}>Novo agente</LinkButton>} />
      <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Buscar agentes</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou função" className="pl-9" /></label><Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="sm:w-44"><option>Todos</option><option>Ativo</option><option>Rascunho</option><option>Pausado</option></Select></div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((agent) => {
          const company = companies.find((item) => item.id === agent.companyId);
          return (
            <article key={agent.id} className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong">
              <div className="flex items-start gap-3"><span className="relative flex size-10 shrink-0 items-center justify-center rounded-md border border-violet/35 bg-violet/10 text-violet-soft"><Bot className="size-5" />{agent.status === "Ativo" ? <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-sm border-2 border-surface bg-success" /> : null}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="truncate font-semibold">{agent.name}</h2><Badge tone={statusTone(agent.status)} dot>{agent.status}</Badge></div><p className="truncate text-xs text-muted">{agent.role}</p></div><IconButton icon={MoreHorizontal} label={`Opções de ${agent.name}`} size="sm" onClick={() => setSelectedAgentId(agent.id)} /></div>
              <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-muted">{agent.description}</p>
              <dl className="mt-4 grid grid-cols-3 border-y border-border py-3 text-center"><div><dt className="text-[10px] uppercase text-muted">Versão</dt><dd className="mt-1 text-sm font-medium">v{agent.version}</dd></div><div className="border-x border-border"><dt className="text-[10px] uppercase text-muted">Conversas</dt><dd className="mt-1 text-sm font-medium">{agent.conversations}</dd></div><div><dt className="text-[10px] uppercase text-muted">Resolução</dt><dd className="mt-1 text-sm font-medium text-success">{agent.resolutionRate}%</dd></div></dl>
              <div className="mt-3 flex items-center justify-between text-xs"><span className="truncate text-muted">{company?.name}</span><span className="flex items-center gap-1 text-muted"><Clock3 className="size-3" /> {agent.updatedAt}</span></div>
              <div className="mt-4 flex gap-2"><LinkButton href="/playground" icon={TestTube2} size="sm" className="flex-1">Testar</LinkButton><Button size="sm" variant={agent.status === "Ativo" ? "ghost" : "success"} icon={agent.status === "Ativo" ? Pause : Play} onClick={() => toggleAgent(agent.id, agent.status)}>{agent.status === "Ativo" ? "Pausar" : "Ativar"}</Button></div>
            </article>
          );
        })}
        <Link href="/agentes/novo" className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border-strong p-6 text-center transition-colors hover:border-violet/50 hover:bg-violet/[0.04]"><span className="flex size-10 items-center justify-center rounded-md border border-border-strong bg-surface text-muted"><Plus className="size-5" /></span><p className="mt-4 font-medium">Criar novo agente</p><p className="mt-1 max-w-xs text-sm text-muted">Comece por uma descrição do negócio ou configure cada etapa.</p></Link>
      </div>

      <Modal open={Boolean(selectedAgent)} onClose={() => setSelectedAgentId(null)} title={selectedAgent ? `${selectedAgent.name} - versões` : "Versões"} description="Histórico demonstrativo de configurações revisadas e publicadas." footer={<Button onClick={() => setSelectedAgentId(null)}>Fechar</Button>}>
        {selectedAgent ? <div className="space-y-3">{Array.from({ length: selectedAgent.version }).reverse().map((_, index) => { const version = selectedAgent.version - index; const published = version === selectedAgent.version && selectedAgent.status === "Ativo"; return <div key={version} className="flex items-center gap-3 rounded-md border border-border bg-background/50 p-3"><span className={cn("flex size-8 items-center justify-center rounded-md", published ? "bg-success/10 text-success" : "bg-surface-raised text-muted")}><Send className="size-3.5" /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-medium">Versão {version}</p>{published ? <Badge tone="success">Publicada</Badge> : <Badge>Arquivada</Badge>}</div><p className="text-xs text-muted">Alterada por Leonardo Alves</p></div>{!published ? <Button size="sm" icon={Copy} onClick={() => notify({ title: `Versão ${version} restaurada como rascunho`, tone: "success" })}>Restaurar</Button> : <CheckCircle2 className="size-4 text-success" />}</div>; })}</div> : null}
      </Modal>
    </div>
  );
}
