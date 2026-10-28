"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { createContext, useContext, useEffect, useId } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Check, Info, LoaderCircle, X } from "lucide-react";
import { useAppStore } from "@/hooks/use-app-store";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
}

export function Button({
  className,
  variant = "secondary",
  size = "md",
  icon: Icon,
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variants: Record<ButtonVariant, string> = {
    primary: "border-violet bg-violet text-white hover:border-[#6d28d9] hover:bg-[#6d28d9]",
    secondary: "border-border-strong bg-surface-raised text-foreground hover:bg-surface-hover hover:border-muted",
    ghost: "border-transparent bg-transparent text-muted-strong hover:bg-surface-hover hover:text-foreground",
    danger: "border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
    success: "border-success/40 bg-success/10 text-success hover:bg-success/20",
  };
  const sizes: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-9 px-3.5 text-sm gap-2",
    lg: "h-11 px-4 text-sm gap-2",
  };

  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border font-medium transition-colors",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function LinkButton({ href, children, icon: Icon, variant = "secondary", size = "md", className, onClick }: { href: string; children: ReactNode; icon?: LucideIcon; variant?: ButtonVariant; size?: ButtonSize; className?: string; onClick?: () => void }) {
  const variants: Record<ButtonVariant, string> = {
    primary: "border-violet bg-violet text-white hover:border-[#6d28d9] hover:bg-[#6d28d9]",
    secondary: "border-border-strong bg-surface-raised text-foreground hover:bg-surface-hover hover:border-muted",
    ghost: "border-transparent bg-transparent text-muted-strong hover:bg-surface-hover hover:text-foreground",
    danger: "border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
    success: "border-success/40 bg-success/10 text-success hover:bg-success/20",
  };
  const sizes: Record<ButtonSize, string> = { sm: "h-8 px-3 text-xs gap-1.5", md: "h-9 px-3.5 text-sm gap-2", lg: "h-11 px-4 text-sm gap-2" };
  return <Link href={href} onClick={onClick} className={cn("inline-flex shrink-0 items-center justify-center rounded-md border font-medium transition-colors", variants[variant], sizes[size], className)}>{Icon ? <Icon className="size-4" aria-hidden="true" /> : null}{children}</Link>;
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  size?: "sm" | "md";
  active?: boolean;
}

export function IconButton({ icon: Icon, label, className, size = "md", active, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border transition-colors",
        size === "sm" ? "size-8" : "size-9",
        active
          ? "border-violet/50 bg-violet/15 text-violet-soft"
          : "border-border bg-surface text-muted hover:border-border-strong hover:bg-surface-hover hover:text-foreground",
        className,
      )}
      {...props}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden="true" />
    </button>
  );
}

type BadgeTone = "neutral" | "violet" | "cyan" | "success" | "warning" | "danger" | "blue";

export function Badge({ children, tone = "neutral", dot = false, className }: { children: ReactNode; tone?: BadgeTone; dot?: boolean; className?: string }) {
  const tones: Record<BadgeTone, string> = {
    neutral: "border-border bg-surface-raised text-muted-strong",
    violet: "border-violet/30 bg-violet/10 text-violet-soft",
    cyan: "border-cyan/30 bg-cyan/10 text-cyan",
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
    danger: "border-danger/30 bg-danger/10 text-danger",
    blue: "border-blue/30 bg-blue/10 text-blue",
  };
  const dots: Record<BadgeTone, string> = {
    neutral: "bg-muted", violet: "bg-violet", cyan: "bg-cyan", success: "bg-success", warning: "bg-warning", danger: "bg-danger", blue: "bg-blue",
  };
  return (
    <span className={cn("inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium", tones[tone], className)}>
      {dot ? <span className={cn("size-1.5 rounded-full", dots[tone])} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function statusTone(status: string): BadgeTone {
  if (["Ativa", "Ativo", "Conectado", "Pronto", "Resolvido", "Convertido"].includes(status)) return "success";
  if (["Implantação", "Pendente", "Processando", "Aguardando humano", "Atenção", "Proposta"].includes(status)) return "warning";
  if (["Pausada", "Pausado", "Falha", "Perdido"].includes(status)) return "danger";
  if (["Rascunho", "Simulado", "IA atendendo", "Qualificado"].includes(status)) return "violet";
  if (["Humano atendendo", "Qualificando"].includes(status)) return "cyan";
  if (["Planejado", "Aguardando cliente"].includes(status)) return "blue";
  return "neutral";
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

interface FieldContextValue {
  controlId: string;
  descriptionId?: string;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  const generatedId = useId();
  const controlId = `${generatedId}-control`;
  const descriptionId = error || hint ? `${generatedId}-description` : undefined;

  return (
    <div className={cn("grid gap-1.5 text-sm", className)}>
      <label htmlFor={controlId} className="font-medium text-muted-strong">
        {label} {required ? <span className="text-danger" aria-hidden="true">*</span> : null}
      </label>
      <FieldContext.Provider value={{ controlId, descriptionId }}>
        {children}
      </FieldContext.Provider>
      {error ? <span id={descriptionId} className="text-xs text-danger">{error}</span> : hint ? <span id={descriptionId} className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

const controlClass =
  "w-full rounded-md border border-border-strong bg-background px-3 text-sm text-foreground placeholder:text-muted/70 transition-colors hover:border-muted focus:border-cyan";

export function Input({ className, id, "aria-describedby": describedBy, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const field = useContext(FieldContext);
  return <input id={id ?? field?.controlId} aria-describedby={describedBy ?? field?.descriptionId} className={cn(controlClass, "h-10", className)} {...props} />;
}

export function Textarea({ className, id, "aria-describedby": describedBy, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const field = useContext(FieldContext);
  return <textarea id={id ?? field?.controlId} aria-describedby={describedBy ?? field?.descriptionId} className={cn(controlClass, "min-h-24 resize-y py-2.5", className)} {...props} />;
}

export function Select({ className, children, id, "aria-describedby": describedBy, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const field = useContext(FieldContext);
  return <select id={id ?? field?.controlId} aria-describedby={describedBy ?? field?.descriptionId} className={cn(controlClass, "h-10 pr-8", className)} {...props}>{children}</select>;
}

export function Toggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full border transition-colors", checked ? "border-success/50 bg-success/25" : "border-border-strong bg-background")}
    >
      <span className={cn("absolute top-0.5 size-4.5 rounded-full transition-transform", checked ? "translate-x-5 bg-success" : "translate-x-0.5 bg-muted")} />
    </button>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase text-cyan">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-[2rem]">{title}</h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-border bg-surface", className)}>{children}</section>;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 flex size-10 items-center justify-center rounded-md border border-border bg-surface-raised text-muted"><Icon className="size-5" /></div>
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, footer, size = "md" }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" }) {
  useEffect(() => {
    if (!open) return;
    const handle = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, onClose]);
  if (!open) return null;
  const max = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl";
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={cn("max-h-[90vh] w-full overflow-hidden rounded-lg border border-border-strong bg-surface shadow-2xl", max)} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div><h2 id="modal-title" className="font-semibold text-foreground">{title}</h2>{description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}</div>
          <IconButton icon={X} label="Fechar" size="sm" onClick={onClose} />
        </div>
        <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-5">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-border bg-background/40 px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

function ToastItem({ id, title, description, tone = "neutral" }: { id: string; title: string; description?: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const dismiss = useAppStore((state) => state.dismissToast);
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(id), 4400);
    return () => window.clearTimeout(timer);
  }, [dismiss, id]);
  const Icon = tone === "success" ? Check : tone === "warning" || tone === "danger" ? AlertTriangle : Info;
  const color = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-cyan";
  return (
    <div className="flex w-full gap-3 rounded-lg border border-border-strong bg-surface-raised p-3 shadow-xl sm:w-96" role="status">
      <Icon className={cn("mt-0.5 size-4 shrink-0", color)} />
      <div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground">{title}</p>{description ? <p className="mt-0.5 text-xs leading-5 text-muted">{description}</p> : null}</div>
      <button className="self-start text-muted hover:text-foreground" onClick={() => dismiss(id)} aria-label="Dispensar notificacao"><X className="size-4" /></button>
    </div>
  );
}

export function ToastViewport() {
  const toasts = useAppStore((state) => state.toasts);
  return <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5">{toasts.map((toast) => <div key={toast.id} className="pointer-events-auto w-full"><ToastItem {...toast} /></div>)}</div>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-hover", className)} aria-hidden="true" />;
}
