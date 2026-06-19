import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — JAF" },
      { name: "description", content: "JAF is a Nigerian streetwear label built for the situationship era. Designed in Lafia, shipped from Abuja." },
      { property: "og:title", content: "About — JAF" },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
      <p className="text-[10px] tracking-[0.3em] uppercase text-ink-soft mb-6">Our story</p>
      <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-tighter leading-[0.95] mb-12">
        WE TURNED A LOOPHOLE INTO A UNIFORM.
      </h1>

      <div className="prose prose-neutral max-w-none space-y-6 text-base md:text-lg leading-relaxed">
        <p>
          JAF — Just A Friend — started as a private joke between three friends in Lafia. The text "he's literally like a brother to me" showed up in too many group chats. So we printed it on a tee.
        </p>
        <p>
          The drop sold out in a weekend. The next one moved across Abuja, Lagos, and Port Harcourt. We took the joke seriously: heavyweight cotton, 450gsm french terry, embroidery instead of vinyl, garment-washed for the kind of fit your situationship will eventually notice.
        </p>
        <p>
          Designed in Lafia. Photographed in Abuja. Shipped to the rest of Nigeria. No labels, no strings — just very good clothes for the very confused.
        </p>
      </div>

      <div className="mt-16 grid sm:grid-cols-3 gap-6 border-t border-ink/10 pt-10">
        <Stat n="04" l="Drops shipped" />
        <Stat n="2K+" l="Pieces moved" />
        <Stat n="2" l="Cities served" />
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <p className="font-display text-4xl font-semibold tracking-tighter">{n}</p>
      <p className="text-[10px] tracking-widest uppercase text-ink-soft mt-1">{l}</p>
    </div>
  );
}
