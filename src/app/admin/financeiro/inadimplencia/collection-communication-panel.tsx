"use client";

import { useMemo, useState } from "react";
import { MessageSquareText, X } from "lucide-react";
import { registerCollectionActionAction } from "@/app/actions/financial";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { CollectionCommunicationType } from "@/lib/collection-communication";

type TemplateOption = {
  type: CollectionCommunicationType;
  label: string;
  title: string;
  body: string;
};

type ChannelOption = {
  value: string;
  label: string;
};

export function CollectionCommunicationPanel({
  chargeId,
  guardianName,
  studentName,
  chargeLabel,
  overdueLabel,
  phone,
  email,
  templates,
  suggestedType,
  channels,
  registeredAtLabel,
  recentContactLabel
}: {
  chargeId: string;
  guardianName: string;
  studentName: string;
  chargeLabel: string;
  overdueLabel: string;
  phone?: string | null;
  email?: string | null;
  templates: TemplateOption[];
  suggestedType: CollectionCommunicationType;
  channels: ChannelOption[];
  registeredAtLabel: string;
  recentContactLabel?: string | null;
}) {
  const initialTemplate = templates.find((template) => template.type === suggestedType) ?? templates[0];
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(initialTemplate.type);
  const [message, setMessage] = useState(initialTemplate.body);
  const [copied, setCopied] = useState(false);
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.type === selectedType) ?? templates[0],
    [selectedType, templates]
  );

  function handleTemplateChange(value: string) {
    const nextTemplate = templates.find((template) => template.type === value) ?? templates[0];
    setSelectedType(nextTemplate.type);
    setMessage(nextTemplate.body);
    setCopied(false);
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
  }

  function closePanel() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md border border-school-primary/20 bg-school-primary/5 px-2 py-1 text-left text-xs font-semibold text-school-primary transition-colors hover:bg-school-primary-soft"
      >
        <MessageSquareText className="h-3.5 w-3.5" />
        Preparar mensagem
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-school-navy/35 p-3 sm:p-5" role="dialog" aria-modal="true">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border p-4">
              <div>
                <p className="text-xs font-semibold uppercase text-text-muted">Comunicacao de cobranca</p>
                <h2 className="mt-1 text-lg font-bold text-school-navy">Preparar mensagem</h2>
                <p className="mt-1 text-sm text-text-secondary">Revise o texto antes de copiar ou registrar o contato.</p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-full border border-border bg-background p-2 text-text-muted transition-colors hover:bg-school-primary-soft hover:text-school-navy"
                aria-label="Fechar painel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto p-4 text-xs">
              <div className="grid gap-2 rounded-md bg-background p-3 sm:grid-cols-2">
                <div>
                  <p className="text-text-muted">Responsavel</p>
                  <p className="font-semibold text-school-navy">{guardianName}</p>
                </div>
                <div>
                  <p className="text-text-muted">Aluno</p>
                  <p className="font-semibold text-school-navy">{studentName}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-text-muted">Cobranca</p>
                  <p className="font-semibold text-school-navy">{chargeLabel}</p>
                </div>
                <div>
                  <p className="text-text-muted">Atraso</p>
                  <p className="font-semibold text-school-navy">{overdueLabel}</p>
                </div>
                <div>
                  <p className="text-text-muted">Registro</p>
                  <p className="font-semibold text-school-navy">{registeredAtLabel}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {phone ? <Badge variant="info">Telefone: {phone}</Badge> : null}
                {email ? <Badge variant="info">E-mail: {email}</Badge> : null}
                {!phone && !email ? <Badge variant="warning">Contato nao informado</Badge> : null}
                {recentContactLabel ? <Badge variant="warning">{recentContactLabel}</Badge> : null}
              </div>

              <form action={registerCollectionActionAction} className="space-y-3">
                <input type="hidden" name="chargeId" value={chargeId} />
                <input type="hidden" name="type" value="CONTACT" />
                <input type="hidden" name="messageTemplate" value={selectedTemplate.type} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="font-semibold text-text-primary">Canal usado manualmente</span>
                    <Select name="channel" defaultValue="WHATSAPP" required>
                      {channels.map((channel) => (
                        <option key={channel.value} value={channel.value}>
                          {channel.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="grid gap-1">
                    <span className="font-semibold text-text-primary">Template</span>
                    <Select name="communicationType" value={selectedType} onChange={(event) => handleTemplateChange(event.target.value)} required>
                      {templates.map((template) => (
                        <option key={template.type} value={template.type}>
                          {template.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                </div>

                <div className="rounded-md border border-border bg-background p-3">
                  <p className="font-semibold text-school-navy">{selectedTemplate.title}</p>
                  <textarea
                    name="messageBody"
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value);
                      setCopied(false);
                    }}
                    className="mt-2 min-h-64 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm leading-6 shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                    required
                  />
                </div>

                <label className="grid gap-1">
                  <span className="font-semibold text-text-primary">Observacao interna opcional</span>
                  <textarea
                    name="note"
                    placeholder="Ex.: mensagem enviada manualmente pelo WhatsApp da secretaria."
                    className="min-h-20 rounded-md border border-input bg-surface px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                  />
                </label>

                <p className="rounded-md bg-background p-2 text-text-muted">
                  A Azura apenas prepara e registra a comunicacao. Nenhum WhatsApp, e-mail ou SMS sera enviado automaticamente.
                </p>

                <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-wrap gap-2 border-t border-border bg-surface p-4">
                  <Button type="button" variant="secondary" onClick={copyMessage}>
                    {copied ? "Mensagem copiada" : "Copiar mensagem"}
                  </Button>
                  <Button type="submit">Registrar comunicacao</Button>
                  <Button type="button" variant="outline" onClick={closePanel}>
                    Fechar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
