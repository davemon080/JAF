import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  message: z.string().trim().min(5).max(1000),
});

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — JAF" },
      { name: "description", content: "Talk to JAF. WhatsApp, email or message us directly. Based in Lafia & Abuja." },
      { property: "og:title", content: "Contact — JAF" },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0] as string, i.message])));
      return;
    }
    setErrors({});
    toast.success("Message sent. We'll reply within 24 hours.");
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-20">
      <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-tighter mb-12">CONTACT.</h1>

      <div className="grid lg:grid-cols-2 gap-12">
        <form onSubmit={submit} className="space-y-4 max-w-md">
          <Field label="Name" error={errors.name}>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </Field>
          <Field label="Email" error={errors.email}>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          </Field>
          <Field label="Message" error={errors.message}>
            <textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="input" />
          </Field>
          <button className="bg-ink text-canvas px-6 py-3 text-xs font-medium tracking-widest uppercase">Send</button>
        </form>

        <aside className="space-y-8 text-sm">
          <div>
            <p className="text-[10px] tracking-widest uppercase text-ink-soft mb-2">WhatsApp</p>
            <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer" className="text-lg font-medium">
              +234 800 000 0000
            </a>
          </div>
          <div>
            <p className="text-[10px] tracking-widest uppercase text-ink-soft mb-2">Email</p>
            <a href="mailto:hello@jaf.ng" className="text-lg font-medium">hello@jaf.ng</a>
          </div>
          <div>
            <p className="text-[10px] tracking-widest uppercase text-ink-soft mb-2">Hubs</p>
            <p>Lafia HQ — KM 5 Jos Rd</p>
            <p>Abuja Hub — Wuse II</p>
          </div>
          <div className="aspect-video bg-zinc-200 overflow-hidden">
            <iframe
              title="JAF Abuja map"
              src="https://www.openstreetmap.org/export/embed.html?bbox=7.45,9.05,7.55,9.10&layer=mapnik"
              className="w-full h-full"
              loading="lazy"
            />
          </div>
        </aside>
      </div>

      <style>{`
        .input { width: 100%; background: transparent; border: 1px solid rgba(24,24,27,0.2); padding: 0.6rem 0.8rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: var(--color-ink); }
      `}</style>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-widest uppercase font-medium block mb-1.5">{label}</span>
      {children}
      {error && <span className="text-[10px] text-destructive mt-1 block">{error}</span>}
    </label>
  );
}
