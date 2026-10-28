"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Copy, Download, Eye, Info, Search, ShieldCheck } from "lucide-react";
import { demoAudit } from "@/data/demo";
import { useAppStore } from "@/hooks/use-app-store";
import type { AuditEntry } from "@/types";
import { Badge, Button, IconButton, Input, Modal, PageHeader, Select, cn } from "@/components/ui";

const severityMeta = { info: { label: "Informação", tone: "blue" as const, icon: Info }, success: { label: "Sucesso", tone: "success" as const, icon: CheckCircle2 }, warning: { label: "Atenção", tone: "warning" as const, icon: AlertTriangle }, error: { label: "Erro", tone: "danger" as const, icon: CircleAlert } };

export function AuditView() {
  const selectedCompanyId = useAppStore((state) => state.selectedCompanyId);
  const companies = useAppStore((state) => state.companies);
  const notify = useAppStore((state) => state.notify);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<"Todas" | AuditEntry["severity"]>("Todas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = useMemo(() => demoAudit.filter((entry) => (selectedCompanyId === "all" || entry.companyId === selectedCompanyId) && `${entry.actor} ${entry.action} ${entry.resource} ${entry.detail} ${entry.correlationId}`.toLowerCase().includes(query.toLowerCase()) && (severity === "Todas" || entry.severity === severity)), [query, selectedCompanyId, severity]);
  const selected = demoAudit.find((entry) => entry.id === selectedId);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Rastreabilidade" title="Auditoria" description="Investigue alterações, decisões do agente e falhas técnicas por identificador de correlação." actions={<Button icon={Download} onClick={() => notify({ title: "Relatório de auditoria preparado", description: "Exportação simulada sem conteúdo sensível.", tone: "success" })}>Exportar relatório</Button>} />
      <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/[0.04] p-3"><ShieldCheck className="size-4 shrink-0 text-success" /><p className="text-xs text-muted"><strong className="text-muted-strong">Registro somente leitura.</strong> Eventos são demonstrativos e não contêm tokens, senhas ou conteúdo pessoal completo.</p></div>
      <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Buscar na auditoria</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ator, ação, recurso ou correlação" className="pl-9" /></label><Select value={severity} onChange={(event) => setSeverity(event.target.value as typeof severity)} className="sm:w-44"><option value="Todas">Todos os níveis</option><option value="info">Informação</option><option value="success">Sucesso</option><option value="warning">Atenção</option><option value="error">Erro</option></Select></div>
      <div className="overflow-hidden rounded-lg border border-border bg-surface"><div className="hidden grid-cols-[145px_160px_minmax(180px,1fr)_minmax(220px,1.3fr)_110px_40px] border-b border-border bg-background/40 px-4 py-3 text-[10px] font-semibold uppercase text-muted lg:grid"><span>Data e hora</span><span>Ator</span><span>Ação / recurso</span><span>Detalhe</span><span>Correlação</span><span /></div><div className="divide-y divide-border">{filtered.map((entry) => { const meta = severityMeta[entry.severity]; const Icon = meta.icon; return <article key={entry.id} className="grid gap-3 p-4 hover:bg-surface-hover lg:grid-cols-[145px_160px_minmax(180px,1fr)_minmax(220px,1.3fr)_110px_40px] lg:items-center"><div className="flex items-center gap-2 text-[11px] text-muted"><Icon className={cn("size-3.5 shrink-0", entry.severity === "error" ? "text-danger" : entry.severity === "warning" ? "text-warning" : entry.severity === "success" ? "text-success" : "text-blue")} />{entry.timestamp}</div><div><p className="truncate text-xs font-medium text-muted-strong">{entry.actor}</p><p className="text-[10px] text-muted">{companies.find((company) => company.id === entry.companyId)?.name}</p></div><div className="min-w-0"><code className="block truncate text-[11px] text-cyan">{entry.action}</code><p className="truncate text-xs text-muted">{entry.resource}</p></div><p className="text-xs leading-5 text-muted">{entry.detail}</p><button type="button" className="flex items-center gap-1 font-mono text-[10px] text-muted hover:text-foreground" onClick={() => { navigator.clipboard?.writeText(entry.correlationId); notify({ title: "Correlação copiada", tone: "success" }); }}><Copy className="size-3" />{entry.correlationId}</button><IconButton icon={Eye} label="Ver evento" size="sm" onClick={() => setSelectedId(entry.id)} /></article>; })}</div>{!filtered.length ? <div className="py-16 text-center"><ShieldCheck className="mx-auto size-6 text-muted" /><p className="mt-3 text-sm font-medium">Nenhum evento encontrado</p></div> : null}</div>
      <Modal open={Boolean(selected)} onClose={() => setSelectedId(null)} title="Detalhes do evento" description={selected?.correlationId} footer={<Button onClick={() => setSelectedId(null)}>Fechar</Button>}>
        {selected ? <dl className="divide-y divide-border rounded-md border border-border bg-background/40 px-4 text-sm"><div className="grid grid-cols-[120px_1fr] py-3"><dt className="text-muted">Nível</dt><dd><Badge tone={severityMeta[selected.severity].tone}>{severityMeta[selected.severity].label}</Badge></dd></div><div className="grid grid-cols-[120px_1fr] py-3"><dt className="text-muted">Data</dt><dd>{selected.timestamp}</dd></div><div className="grid grid-cols-[120px_1fr] py-3"><dt className="text-muted">Ator</dt><dd>{selected.actor}</dd></div><div className="grid grid-cols-[120px_1fr] py-3"><dt className="text-muted">Ação</dt><dd><code className="text-xs text-cyan">{selected.action}</code></dd></div><div className="grid grid-cols-[120px_1fr] py-3"><dt className="text-muted">Recurso</dt><dd>{selected.resource}</dd></div><div className="grid grid-cols-[120px_1fr] py-3"><dt className="text-muted">Detalhe</dt><dd className="leading-6 text-muted-strong">{selected.detail}</dd></div></dl> : null}
      </Modal>
    </div>
  );
}
