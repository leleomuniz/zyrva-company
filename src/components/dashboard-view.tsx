"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Clock3,
  Coins,
  MessageSquareText,
  Plus,
  Radio,
  Sparkles,
  UserRoundCheck,
  UsersRound,
  Workflow,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dashboardSeries } from "@/data/demo";
import { useAppStore } from "@/hooks/use-app-store";
import { Badge, cn, LinkButton, PageHeader, Panel, SectionTitle, statusTone } from "@/components/ui";

function MetricCard({ icon: Icon, label, value, detail, accent }: { icon: typeof Bot; label: string; value: string; detail: string; accent: "violet" | "cyan" | "success" | "warning" | "blue" }) {
  const colors = { violet: "text-violet-soft bg-violet/10 border-violet/25", cyan: "text-cyan bg-cyan/10 border-cyan/25", success: "text-success bg-success/10 border-success/25", warning: "text-warning bg-warning/10 border-warning/25", blue: "text-blue bg-blue/10 border-blue/25" };
  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-medium text-muted">{label}</p><p className="mt-2 text-2xl font-semibold text-foreground">{value}</p></div>
        <span className={cn("flex size-8 items-center justify-center rounded-md border", colors[accent])}><Icon className="size-4" /></span>
      </div>
      <p className="mt-3 text-[11px] text-muted">{detail}</p>
    </article>
  );
}

export function DashboardView() {
  const selectedCompanyId = useAppStore((state) => state.selectedCompanyId);
  const companies = useAppStore((state) => state.companies);
  const agents = useAppStore((state) => state.agents);
  const conversations = useAppStore((state) => state.conversations);
  const leads = useAppStore((state) => state.leads);
  const company = companies.find((item) => item.id === selectedCompanyId);
  const matches = (companyId: string) => selectedCompanyId === "all" || companyId === selectedCompanyId;
  const scopedAgents = agents.filter((agent) => matches(agent.companyId));
  const scopedConversations = conversations.filter((conversation) => matches(conversation.companyId));
  const scopedLeads = leads.filter((lead) => matches(lead.companyId));
  const recent = [...scopedConversations].sort((a, b) => b.unread - a.unread).slice(0, 5);
  const handoffs = scopedConversations.filter((conversation) => conversation.status === "Aguardando humano").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação em tempo real"
        title={company ? `Visão geral - ${company.name}` : "Visão geral consolidada"}
        description="Acompanhe atendimentos, oportunidades e a saúde dos agentes em um único panorama operacional."
        actions={<><LinkButton href="/agentes/novo" icon={Plus}>Novo agente</LinkButton><LinkButton href="/playground" variant="primary" icon={Sparkles}>Testar agente</LinkButton></>}
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7" aria-label="Indicadores principais">
        <MetricCard icon={Bot} label="Agentes ativos" value={String(scopedAgents.filter((agent) => agent.status === "Ativo").length)} detail={`${scopedAgents.length} configurados`} accent="violet" />
        <MetricCard icon={MessageSquareText} label="Conversas" value={String(scopedConversations.length)} detail="No período demonstrado" accent="cyan" />
        <MetricCard icon={UsersRound} label="Leads capturados" value={String(scopedLeads.length)} detail={`${scopedLeads.filter((lead) => lead.stage === "Qualificado").length} qualificados`} accent="success" />
        <MetricCard icon={UserRoundCheck} label="Encaminhadas" value={String(handoffs)} detail="Precisam de uma pessoa" accent="warning" />
        <MetricCard icon={Clock3} label="Resposta média" value="1,6 s" detail="-0,3 s nos últimos 7 dias" accent="blue" />
        <MetricCard icon={AlertTriangle} label="Falhas" value="1" detail="Webhook comercial pausado" accent="warning" />
        <MetricCard icon={Coins} label="Consumo estimado" value="R$ 14,82" detail="Simulação dos últimos 7 dias" accent="violet" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        <Panel className="min-w-0 p-4 sm:p-5">
          <SectionTitle title="Volume de atendimento" description="Conversas e leads dos últimos 7 dias" action={<Badge tone="neutral">Demonstração</Badge>} />
          <div className="mt-5 h-64 w-full" role="img" aria-label="Gráfico de conversas e leads">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardSeries} margin={{ top: 10, right: 6, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="#27303b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="#9ca8b8" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis stroke="#9ca8b8" tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip contentStyle={{ background: "#151a22", border: "1px solid #384453", borderRadius: 6, color: "#f4f7fb", fontSize: 12 }} cursor={{ stroke: "#384453" }} />
                <Area type="monotone" dataKey="conversations" name="Conversas" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.08} strokeWidth={2} />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.06} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center gap-5 text-[11px] text-muted"><span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-cyan" /> Conversas</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-violet" /> Leads</span></div>
        </Panel>

        <Panel className="p-4 sm:p-5">
          <SectionTitle title="Atenção operacional" description="Itens que merecem acompanhamento" />
          <div className="mt-4 divide-y divide-border">
            <div className="flex gap-3 py-3"><span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning"><UserRoundCheck className="size-4" /></span><div><p className="text-sm font-medium">{handoffs || 0} conversa{handoffs === 1 ? "" : "s"} aguardando</p><p className="mt-0.5 text-xs leading-5 text-muted">Um atendente precisa assumir para a IA permanecer pausada.</p><Link href="/conversas" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-warning hover:text-foreground">Abrir fila <ArrowRight className="size-3" /></Link></div></div>
            <div className="flex gap-3 py-3"><span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-danger/10 text-danger"><Radio className="size-4" /></span><div><p className="text-sm font-medium">Webhook comercial pausado</p><p className="mt-0.5 text-xs leading-5 text-muted">A última entrega falhou após três tentativas simuladas.</p><Link href="/integracoes" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-danger hover:text-foreground">Ver integração <ArrowRight className="size-3" /></Link></div></div>
            <div className="flex gap-3 py-3"><span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-cyan/10 text-cyan"><Workflow className="size-4" /></span><div><p className="text-sm font-medium">Automações saudáveis</p><p className="mt-0.5 text-xs leading-5 text-muted">Nenhum loop ou execução duplicada detectada no período.</p></div></div>
          </div>
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4 sm:px-5"><SectionTitle title="Conversas recentes" description="Prioridade por mensagens não lidas e encaminhamentos" /><Link href="/conversas" className="flex items-center gap-1 text-xs font-medium text-cyan hover:text-foreground">Ver todas <ArrowRight className="size-3" /></Link></div>
        <div className="divide-y divide-border">
          {recent.map((conversation) => {
            const companyName = companies.find((item) => item.id === conversation.companyId)?.name;
            return (
              <Link key={conversation.id} href="/conversas" className="grid gap-2 px-4 py-3 transition-colors hover:bg-surface-hover sm:grid-cols-[minmax(150px,0.8fr)_minmax(220px,1.5fr)_auto_auto] sm:items-center sm:px-5">
                <div className="flex items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-raised text-[11px] font-semibold text-muted-strong">{conversation.contactInitials}</span><div className="min-w-0"><p className="truncate text-sm font-medium">{conversation.contactName}</p><p className="text-[11px] text-muted">{companyName}</p></div></div>
                <p className="truncate text-xs text-muted">{conversation.lastMessage}</p>
                <Badge tone={statusTone(conversation.status)} dot>{conversation.status}</Badge>
                <div className="flex items-center justify-end gap-2"><span className="text-[11px] text-muted">{conversation.lastMessageAt}</span>{conversation.unread ? <span className="flex min-w-5 items-center justify-center rounded-full bg-violet px-1.5 text-[10px] font-semibold text-white">{conversation.unread}</span> : null}</div>
              </Link>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
