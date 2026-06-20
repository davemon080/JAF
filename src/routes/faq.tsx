import { createFileRoute } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const QA = [
  {
    q: "Where do you deliver?",
    a: "Express delivery to Lafia and Abuja in 1–3 business days. We also ship the rest of Nigeria within 3–7 days.",
  },
  {
    q: "How do I pay?",
    a: "Card, bank transfer or USSD through Paystack at checkout. You can also pay on delivery in Lafia & Abuja by request.",
  },
  {
    q: "What are your sizes?",
    a: "Tees and hoodies run from S to XXL with a boxy oversized cut. Caps are one-size with adjustable straps.",
  },
  {
    q: "Returns?",
    a: "Unworn pieces with tags can be returned within 7 days. Garments-washed pieces are final sale.",
  },
  {
    q: "Will sold-out drops restock?",
    a: "Some pieces return. Drop us a WhatsApp message and we'll add you to the restock list.",
  },
  {
    q: "Do you do wholesale?",
    a: "We work with selected boutiques in Lagos, Abuja and Port Harcourt. Email hello@jaf.ng with your shop details.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — JAF" },
      {
        name: "description",
        content: "Answers about JAF: delivery, returns, sizing, payment and restocks.",
      },
      { property: "og:title", content: "FAQ — JAF" },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: QA.map((x) => ({
            "@type": "Question",
            name: x.q,
            acceptedAnswer: { "@type": "Answer", text: x.a },
          })),
        }),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-tighter mb-10">
        FAQ.
      </h1>
      <Accordion type="single" collapsible className="border-t border-ink/10">
        {QA.map((x, i) => (
          <AccordionItem key={i} value={`i-${i}`} className="border-b border-ink/10">
            <AccordionTrigger className="text-left text-sm font-medium uppercase tracking-wider py-5">
              {x.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-ink-soft leading-relaxed pb-5">
              {x.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
