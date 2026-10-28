"use client";

import { useMemo, useState } from "react";
import { Activity, Bot, Clock3, Coins, Download, MessageSquareText, ThumbsUp, UserRoundCheck, UsersRound } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dashboardSeries, hourlySeries } from "@/data/demo";
import { useAppStore } from "@/hooks/use-app-store";
import { Badge, Button, PageHeader, Panel, Select, cn } from "@/components/ui";

const intents = [
  { label: "Informação sobre serviços", value: 34, color: "bg-cyan" },
  { label: "Solicitação de orçamento", value: 26, color: "bg-violet" },
  { label: "Agendamento", value: 18, color: "bg-success" },
  { label: "Atendimento humano", value: 13, color: "bg-warning" },
  { label: "Outros", value: 9, color: "bg-blue" },
];

function Metric({ icon: Icon, label, value, detail, color }: { icon: typeof Activity; label: string; value: string; detail: string; color: string }) {
  return <article className="rounded-lg border border-border bg-surface p-4"><div className="flex items-center gap-2 text-xs font-medium text-muted"><Icon className={cn("size-4", color)} />{label}</div><p className="mt-3 text-2xl font-semibold">{value}</p><p className="mt-2 text-[11px] text-muted">{detail}</p></article>;
}

export function MetricsView() {
  const selectedCompanyId = useAppStore((state) => state.selectedCompanyId);
  const agents = useAppStore((state) => state.agents);
  const conversations = useAppStore((state) => state.conversations);
  const leads = useAppStore((state) => state.leads);
  const notify = useAppStore((state) => state.notify);
  const [period, setPeriod] = useState("7 dias");
  const scopedAgents = useMemo(() => agents.filter((agent) => selectedCompanyId === "all" || agent.companyId === selectedCompanyId), [agents, selectedCompanyId]);
  const scopedConversations = conversations.filter((conversation) => selectedCompanyId === "all" || conversation.companyId === selectedCompanyId);
  const scopedLeads = leads.filter((lead) => selectedCompanyId === "all" || lead.companyId === selectedCompanyId);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Desempenho e consumo" title="Métricas" description="Investigue qualidade, volume e custo estimado sem expor conteúdo sensível das conversas." actions={<><Select value={period} onChange={(event) => setPeriod(event.target.value)} className="w-36"><option>Hoje</option><option>7 dias</option><option>30 dias</option></Select><Button icon={Download} onClick={() => notify({ title: "Relatório preparado", description: "Exportação demonstrativa concluída.", tone: "success" })}>Exportar</Button></>} />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6"><Metric icon={MessageSquareText} label="Mensagens" value="892" detail={`Período: ${period}`} color="text-cyan" /><Metric icon={Clock3} label="Resposta média" value="1,6 s" detail="P95 de 3,4 s" color="text-blue" /><Metric icon={UsersRound} label="Leads" value={String(scopedLeads.length)} detail="Capturas demonstrativas" color="text-success" /><Metric icon={UserRoundCheck} label="Encaminhamentos" value={String(scopedConversations.filter((item) => item.status === "Aguardando humano" || item.status === "Humano atendendo").length)} detail="13% das conversas" color="text-warning" /><Metric icon={ThumbsUp} label="Avaliação positiva" value="91%" detail="32 respostas avaliadas" color="text-violet-soft" /><Metric icon={Coins} label="Custo estimado" value="R$ 14,82" detail="Sem cobrança real" color="text-warning" /></section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel className="min-w-0 p-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Conversas e leads</h2><p className="mt-1 text-xs text-muted">Evolução nos últimos 7 dias demonstrativos</p></div><Badge tone="neutral">Demonstração</Badge></div><div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={dashboardSeries} margin={{ top: 8, right: 4, bottom: 0, left: -26 }}><CartesianGrid vertical={false} stroke="#27303b" strokeDasharray="3 3" /><XAxis dataKey="day" stroke="#9ca8b8" axisLine={false} tickLine={false} fontSize={10} /><YAxis stroke="#9ca8b8" axisLine={false} tickLine={false} fontSize={10} /><Tooltip contentStyle={{ background: "#151a22", border: "1px solid #384453", borderRadius: 6, fontSize: 12 }} /><Bar dataKey="conversations" name="Conversas" fill="#22d3ee" radius={[3, 3, 0, 0]} /><Bar dataKey="leads" name="Leads" fill="#8b5cf6" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel>
        <Panel className="min-w-0 p-4"><div><h2 className="text-sm font-semibold">Volume e latência por horário</h2><p className="mt-1 text-xs text-muted">Mensagens processadas e tempo médio de resposta</p></div><div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={hourlySeries} margin={{ top: 8, right: 4, bottom: 0, left: -26 }}><CartesianGrid vertical={false} stroke="#27303b" strokeDasharray="3 3" /><XAxis dataKey="hour" stroke="#9ca8b8" axisLine={false} tickLine={false} fontSize={10} /><YAxis stroke="#9ca8b8" axisLine={false} tickLine={false} fontSize={10} /><Tooltip contentStyle={{ background: "#151a22", border: "1px solid #384453", borderRadius: 6, fontSize: 12 }} /><Line type="monotone" dataKey="messages" name="Mensagens" stroke="#22d3ee" strokeWidth={2} dot={{ fill: "#22d3ee", r: 2 }} /><Line type="monotone" dataKey="latency" name="Latência (s)" stroke="#fbbf24" strokeWidth={2} dot={{ fill: "#fbbf24", r: 2 }} /></LineChart></ResponsiveContainer></div></Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <Panel className="overflow-hidden"><div className="border-b border-border p-4"><h2 className="text-sm font-semibold">Desempenho por agente</h2><p className="mt-1 text-xs text-muted">Comparativo da empresa em contexto</p></div><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead className="bg-background/40 text-[10px] font-semibold uppercase text-muted"><tr><th className="px-4 py-3">Agente</th><th className="px-4 py-3">Conversas</th><th className="px-4 py-3">Resolução</th><th className="px-4 py-3">Confiança</th><th className="px-4 py-3">Tokens</th><th className="px-4 py-3">Versão</th></tr></thead><tbody className="divide-y divide-border">{scopedAgents.map((agent, index) => <tr key={agent.id}><td className="px-4 py-3"><div className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-md bg-violet/10 text-violet-soft"><Bot className="size-3.5" /></span><div><p className="text-sm font-medium">{agent.name}</p><p className="text-[10px] text-muted">{agent.role}</p></div></div></td><td className="px-4 py-3 text-xs text-muted-strong">{agent.conversations}</td><td className="px-4 py-3 text-xs font-medium text-success">{agent.resolutionRate}%</td><td className="px-4 py-3 text-xs text-muted-strong">{[89, 92, 81][index % 3]}%</td><td className="px-4 py-3 text-xs text-muted-strong">{["42,8 mil", "31,2 mil", "8,7 mil"][index % 3]}</td><td className="px-4 py-3"><Badge tone="violet">v{agent.version}</Badge></td></tr>)}</tbody></table></div></Panel>
        <Panel className="p-4"><h2 className="text-sm font-semibold">Intenções detectadas</h2><p className="mt-1 text-xs text-muted">Distribuição das mensagens classificadas</p><div className="mt-5 space-y-4">{intents.map((intent) => <div key={intent.label}><div className="flex items-center justify-between text-xs"><span className="text-muted-strong">{intent.label}</span><span className="font-medium">{intent.value}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background"><div className={cn("h-full", intent.color)} style={{ width: `${intent.value}%` }} /></div></div>)}</div></Panel>
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4"><Activity className="mt-0.5 size-4 shrink-0 text-success" /><div><p className="text-sm font-medium">Observabilidade sem conteúdo desnecessário</p><p className="mt-1 text-xs leading-5 text-muted">Os indicadores usam dados fictícios e identificadores técnicos. Tokens, senhas e conteúdo pessoal completo nunca aparecem nesta tela.</p></div></div>
    </div>
  );
}
