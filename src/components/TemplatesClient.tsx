"use client";

import { useState } from "react";
import type { Template } from "@/lib/types";
import { CHANNELS } from "@/lib/templates";

export function TemplatesClient({ initial }: { initial: Template[] }) {
  const [templates, setTemplates] = useState<Template[]>(initial);

  function update(id: string, patch: Partial<Template>) {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  const channels = Array.from(new Set(templates.map((t) => t.channel)));

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Šablony</h1>
      <p className="mb-5 text-sm text-slate-500">
        Akviziční texty. Uprav si je do svého hlasu — uloží se do databáze. Zástupné značky
        jako <code>{"{jmeno}"}</code>, <code>{"{firma}"}</code>, <code>{"{podpis}"}</code> nahraď před odesláním.
      </p>

      <div className="space-y-8">
        {channels.map((ch) => (
          <section key={ch}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              {CHANNELS[ch] ?? ch}
            </h2>
            <div className="space-y-4">
              {templates.filter((t) => t.channel === ch).map((t) => (
                <TemplateCard key={t.id} template={t} onLocalChange={update} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function TemplateCard({
  template, onLocalChange,
}: {
  template: Template;
  onLocalChange: (id: string, patch: Partial<Template>) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: template.name, subject: template.subject, body: template.body }),
    });
    setSaving(false);
  }

  async function copy() {
    const text =
      template.channel === "email" && template.subject
        ? `Předmět: ${template.subject}\n\n${template.body}`
        : template.body;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          className="input max-w-xs font-semibold"
          value={template.name}
          onChange={(e) => onLocalChange(template.id, { name: e.target.value })}
        />
        <button className="btn-ghost ml-auto text-xs" onClick={copy}>
          {copied ? "✓ Zkopírováno" : "Kopírovat"}
        </button>
        <button className="btn-primary text-xs" onClick={save} disabled={saving}>
          {saving ? "Ukládám…" : "Uložit"}
        </button>
      </div>

      {template.channel === "email" && (
        <div className="mb-2">
          <label className="label">Předmět</label>
          <input
            className="input"
            value={template.subject ?? ""}
            onChange={(e) => onLocalChange(template.id, { subject: e.target.value })}
          />
        </div>
      )}

      <textarea
        className="input min-h-[180px] font-mono text-sm leading-relaxed"
        value={template.body}
        onChange={(e) => onLocalChange(template.id, { body: e.target.value })}
      />
    </div>
  );
}
