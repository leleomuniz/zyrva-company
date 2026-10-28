"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Bot,
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronsUpDown,
  FlaskConical,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  Plug,
  ScrollText,
  Settings,
  ShieldCheck,
  UsersRound,
  Workflow,
  X,
  BookOpen,
} from "lucide-react";
import { useAppStore } from "@/hooks/use-app-store";
import { cn, IconButton, ToastViewport } from "@/components/ui";

const navItems = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/agentes", label: "Agentes", icon: Bot },
  { href: "/playground", label: "Playground", icon: FlaskConical },
  { href: "/conversas", label: "Conversas", icon: MessageSquareText },
  { href: "/leads", label: "Leads", icon: UsersRound },
  { href: "/conhecimento", label: "Conhecimento", icon: BookOpen },
  { href: "/automacoes", label: "Automações", icon: Workflow },
  { href: "/metricas", label: "Métricas", icon: ChartNoAxesCombined },
  { href: "/integracoes", label: "Integrações", icon: Plug },
  { href: "/auditoria", label: "Auditoria", icon: ScrollText },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

function ZyrvaMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="ZYRVA Agents - Visão geral">
      <span className="relative flex size-8 items-center justify-center rounded-md border border-violet/50 bg-violet/15 text-xs font-bold text-violet-soft">
        Z<span className="absolute -right-0.5 -top-0.5 size-2 rounded-sm border border-background bg-cyan" />
      </span>
      {!compact ? <span className="text-[15px] font-semibold text-foreground">ZYRVA <span className="font-normal text-muted">Agents</span></span> : null}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const companies = useAppStore((state) => state.companies);
  const selectedCompanyId = useAppStore((state) => state.selectedCompanyId);
  const setSelectedCompany = useAppStore((state) => state.setSelectedCompany);
  const conversations = useAppStore((state) => state.conversations);
  const resetDemo = useAppStore((state) => state.resetDemo);

  useEffect(() => {
    const persist = useAppStore.persist;
    let active = true;
    const finish = () => {
      window.clearTimeout(timeout);
      if (active) setHydrated(true);
    };
    const recover = () => {
      if (!active) return;
      window.localStorage.removeItem("zyrva-demo-state-v1");
      resetDemo();
      finish();
    };
    const timeout = window.setTimeout(recover, 3_000);
    const unsubscribe = persist.onFinishHydration(finish);
    if (persist.hasHydrated()) {
      queueMicrotask(finish);
    } else {
      void Promise.resolve(persist.rehydrate()).then(finish).catch(recover);
    }
    return () => {
      active = false;
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [resetDemo]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setUserOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  const currentLabel = useMemo(() => {
    const exact = navItems.find((item) => pathname === item.href);
    if (exact) return exact.label;
    if (pathname.startsWith("/agentes/")) return "Novo agente";
    return "ZYRVA Agents";
  }, [pathname]);

  const urgentCount = conversations.filter((conversation) => conversation.status === "Aguardando humano").length;

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Carregando contexto">
        <LoaderCircle className="size-5 animate-spin text-cyan" />
      </div>
    );
  }

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); } finally {
      resetDemo();
      useAppStore.persist.clearStorage();
      window.localStorage.removeItem("zyrva-agent-wizard-draft");
      router.replace("/login");
      router.refresh();
    }
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-surface">
      <div className={cn("flex h-16 shrink-0 items-center border-b border-border", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        <ZyrvaMark compact={collapsed} />
        <IconButton icon={X} label="Fechar menu" size="sm" className="lg:hidden" onClick={() => setMobileOpen(false)} />
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Navegação principal">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href === "/agentes" && pathname.startsWith("/agentes/"));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex h-10 items-center rounded-md border text-sm transition-colors",
                    collapsed ? "justify-center px-2" : "gap-3 px-3",
                    active
                      ? "border-violet/30 bg-violet/10 text-foreground"
                      : "border-transparent text-muted hover:bg-surface-hover hover:text-foreground",
                  )}
                >
                  <item.icon className={cn("size-4 shrink-0", active ? "text-violet-soft" : "text-muted group-hover:text-muted-strong")} aria-hidden="true" />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  {!collapsed && item.href === "/conversas" && urgentCount > 0 ? (
                    <span className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-warning/15 px-1.5 text-[10px] font-semibold text-warning">{urgentCount}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-border p-2">
        {!collapsed ? (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2">
            <ShieldCheck className="size-4 shrink-0 text-success" />
            <div className="min-w-0"><p className="text-[11px] font-medium text-muted-strong">Ambiente protegido</p><p className="truncate text-[10px] text-muted">Organização ZYRVA</p></div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="hidden h-9 w-full items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground lg:flex"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <PanelLeftClose className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed ? <span className="ml-2 text-xs">Recolher menu</span> : null}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={cn("fixed inset-y-0 left-0 z-50 hidden border-r border-border transition-[width] duration-200 lg:block", collapsed ? "w-[68px]" : "w-60")}>{sidebar}</aside>
      {mobileOpen ? (
        <><button className="fixed inset-0 z-40 bg-black/75 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" /><aside className="fixed inset-y-0 left-0 z-50 w-[min(86vw,300px)] border-r border-border lg:hidden">{sidebar}</aside></>
      ) : null}

      <div className={cn("min-h-screen transition-[padding] duration-200", collapsed ? "lg:pl-[68px]" : "lg:pl-60")}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur sm:px-5">
          <IconButton icon={Menu} label="Abrir menu" className="lg:hidden" onClick={() => setMobileOpen(true)} />
          <div className="hidden min-w-0 sm:block">
            <p className="text-[10px] font-semibold uppercase text-muted">Área atual</p>
            <p className="truncate text-sm font-medium text-foreground">{currentLabel}</p>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <label className="relative min-w-0">
              <span className="sr-only">Empresa em contexto</span>
              <Building2 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-cyan" />
              <select
                value={selectedCompanyId}
                onChange={(event) => setSelectedCompany(event.target.value)}
                className="h-9 max-w-[145px] appearance-none truncate rounded-md border border-border-strong bg-surface pl-8 pr-7 text-xs font-medium text-foreground hover:bg-surface-hover sm:max-w-[230px] sm:text-sm"
                title="Alterar empresa em contexto"
              >
                <option value="all">Todas as empresas</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
              <ChevronsUpDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted" />
            </label>
            <div className="relative">
              <button onClick={() => setNotificationOpen((value) => !value)} className="relative flex size-9 items-center justify-center rounded-md border border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground" aria-label={`${urgentCount} notificações de atendimento`} aria-expanded={notificationOpen} title="Notificações"><Bell className="size-4" />{urgentCount > 0 ? <span className="absolute right-1.5 top-1.5 size-1.5 rounded-sm bg-warning" /> : null}</button>
              {notificationOpen ? <div className="absolute right-0 top-11 w-72 overflow-hidden rounded-lg border border-border-strong bg-surface-raised shadow-2xl"><div className="border-b border-border px-3 py-2"><p className="text-xs font-semibold">Notificações</p></div><Link href="/conversas" onClick={() => setNotificationOpen(false)} className="block border-b border-border px-3 py-3 hover:bg-surface-hover"><p className="text-xs font-medium text-warning">{urgentCount} atendimento{urgentCount === 1 ? "" : "s"} aguardando</p><p className="mt-1 text-[11px] text-muted">Abra a fila para assumir a conversa.</p></Link><Link href="/integracoes" onClick={() => setNotificationOpen(false)} className="block px-3 py-3 hover:bg-surface-hover"><p className="text-xs font-medium text-danger">Webhook comercial pausado</p><p className="mt-1 text-[11px] text-muted">A última entrega excedeu as tentativas.</p></Link></div> : null}
            </div>
            <div className="relative" ref={userMenuRef}>
              <button className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-1.5 hover:bg-surface-hover" onClick={() => setUserOpen((value) => !value)} aria-expanded={userOpen} aria-haspopup="menu">
                <span className="flex size-6 items-center justify-center rounded bg-cyan/15 text-[10px] font-semibold text-cyan">LA</span>
                <span className="hidden text-xs font-medium text-muted-strong xl:block">Leonardo</span>
                <ChevronDown className="hidden size-3 text-muted xl:block" />
              </button>
              {userOpen ? (
                <div className="absolute right-0 top-11 w-64 rounded-lg border border-border-strong bg-surface-raised p-2 shadow-2xl" role="menu">
                  <div className="border-b border-border px-2 pb-2"><p className="text-sm font-medium">Leonardo Alves</p><p className="text-xs text-muted">leonardo@zyrva.demo</p></div>
                  <Link href="/configuracoes" className="mt-1 flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted hover:bg-surface-hover hover:text-foreground" role="menuitem"><Settings className="size-4" /> Preferências</Link>
                  <button onClick={handleLogout} disabled={loggingOut} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-danger hover:bg-danger/10" role="menuitem"><LogOut className="size-4" /> {loggingOut ? "Saindo..." : "Sair"}</button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="border-b border-warning/20 bg-warning/[0.06] px-4 py-2 text-center text-xs text-warning sm:px-6">
          <span className="font-semibold">Dados de demonstração</span><span className="hidden sm:inline"> · informações fictícias; nenhuma mensagem externa será enviada.</span>
        </div>
        <main className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 lg:p-7">{children}</main>
      </div>
      <ToastViewport />
    </div>
  );
}
