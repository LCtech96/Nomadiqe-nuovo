"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

const faqKeys: { q: string; a: string }[] = [
  { q: "faq.q1", a: "faq.a1" },
  { q: "faq.q2", a: "faq.a2" },
  { q: "faq.q3", a: "faq.a3" },
  { q: "faq.q4", a: "faq.a4" },
  { q: "faq.q5", a: "faq.a5" },
  { q: "faq.q6", a: "faq.a6" },
  { q: "faq.q7", a: "faq.a7" },
  { q: "faq.q8", a: "faq.a8" },
  { q: "faq.q9", a: "faq.a9" },
  { q: "faq.q10", a: "faq.a10" },
  { q: "faq.q11", a: "faq.a11" },
  { q: "faq.q12", a: "faq.a12" },
  { q: "faq.q13", a: "faq.a13" },
  { q: "faq.q14", a: "faq.a14" },
  { q: "faq.q15", a: "faq.a15" },
  { q: "faq.q16", a: "faq.a16" },
  { q: "faq.q17", a: "faq.a17" },
  { q: "faq.q18", a: "faq.a18" },
  { q: "faq.q19", a: "faq.a19" },
  { q: "faq.q20", a: "faq.a20" },
]

export default function FAQPage() {
  const { t } = useI18n()
  const faqs = faqKeys.map(({ q, a }) => ({ q: t(q), a: t(a) }))
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{t("faq.title")}</CardTitle>
            <CardDescription>
              {t("faq.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group border rounded-lg overflow-hidden [&:not(:last-child)]:mb-2"
              >
                <summary className="flex items-center justify-between gap-2 cursor-pointer list-none px-4 py-3 hover:bg-muted/50 transition-colors">
                  <span className="font-medium text-sm">{faq.q}</span>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-3 pt-0 text-sm text-muted-foreground">
                  {faq.a}
                </div>
              </details>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
