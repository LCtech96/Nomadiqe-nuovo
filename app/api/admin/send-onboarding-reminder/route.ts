import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.nomadiqe.com"

type Locale = "it" | "en" | "ru" | "fr" | "de"

const EMAIL_TEMPLATES: Record<
  Locale,
  { subject: string; title: string; greeting: string; body1: string; body2: string; cta: string; orLogin: string; signoff: string }
> = {
  it: {
    subject: "Nomadiqe BETA — Completa la tua iscrizione",
    title: "Completa la tua iscrizione a Nomadiqe BETA",
    greeting: "Ciao,",
    body1: "La tua richiesta di accesso a Nomadiqe BETA è stata approvata! Per iniziare a utilizzare la piattaforma devi completare l'iscrizione.",
    body2: "Se non l'hai già fatto, registrati con questa email e poi completa l'onboarding per accedere a tutte le funzionalità.",
    cta: "Completa l'iscrizione",
    orLogin: "Oppure accedi direttamente:",
    signoff: "— Team Nomadiqe",
  },
  en: {
    subject: "Nomadiqe BETA — Complete your registration",
    title: "Complete your registration for Nomadiqe BETA",
    greeting: "Hello,",
    body1: "Your access request to Nomadiqe BETA has been approved! To start using the platform you need to complete your registration.",
    body2: "If you haven't already, sign up with this email and then complete the onboarding to access all features.",
    cta: "Complete registration",
    orLogin: "Or sign in directly:",
    signoff: "— Nomadiqe Team",
  },
  ru: {
    subject: "Nomadiqe BETA — Завершите регистрацию",
    title: "Завершите регистрацию в Nomadiqe BETA",
    greeting: "Здравствуйте,",
    body1: "Ваш запрос на доступ к Nomadiqe BETA одобрен! Чтобы начать использовать платформу, необходимо завершить регистрацию.",
    body2: "Если вы ещё не зарегистрировались, создайте учётную запись с этой почтой и завершите онбординг для доступа ко всем функциям.",
    cta: "Завершить регистрацию",
    orLogin: "Или войдите напрямую:",
    signoff: "— Команда Nomadiqe",
  },
  fr: {
    subject: "Nomadiqe BETA — Complétez votre inscription",
    title: "Complétez votre inscription sur Nomadiqe BETA",
    greeting: "Bonjour,",
    body1: "Votre demande d'accès à Nomadiqe BETA a été approuvée ! Pour commencer à utiliser la plateforme, vous devez compléter votre inscription.",
    body2: "Si ce n'est pas déjà fait, inscrivez-vous avec cette adresse e-mail puis complétez l'onboarding pour accéder à toutes les fonctionnalités.",
    cta: "Compléter l'inscription",
    orLogin: "Ou connectez-vous directement :",
    signoff: "— L'équipe Nomadiqe",
  },
  de: {
    subject: "Nomadiqe BETA — Registrierung abschließen",
    title: "Schließen Sie Ihre Registrierung bei Nomadiqe BETA ab",
    greeting: "Hallo,",
    body1: "Ihre Zugangsanfrage für Nomadiqe BETA wurde genehmigt! Um die Plattform zu nutzen, müssen Sie Ihre Registrierung abschließen.",
    body2: "Falls noch nicht geschehen, registrieren Sie sich mit dieser E-Mail und schließen Sie das Onboarding ab, um auf alle Funktionen zugreifen zu können.",
    cta: "Registrierung abschließen",
    orLogin: "Oder direkt anmelden:",
    signoff: "— Nomadiqe Team",
  },
}

const VALID_LOCALES: Locale[] = ["it", "en", "ru", "fr", "de"]

/**
 * POST: invia email di sollecito per completare l'onboarding
 * Body: { email: string, language?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const adminEmail = session?.user?.email || ""

    if (!isAdminEmail(adminEmail)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { email, language } = body as { email?: string; language?: string }

    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json(
        { error: "Email obbligatoria e valida" },
        { status: 400 }
      )
    }

    const locale: Locale = VALID_LOCALES.includes(language as Locale)
      ? (language as Locale)
      : "it"
    const t = EMAIL_TEMPLATES[locale]

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json(
        { error: "Configurazione email non disponibile (RESEND_API_KEY)" },
        { status: 500 }
      )
    }

    const fromEmail =
      process.env.EMAIL_FROM ||
      process.env.RESEND_FROM_EMAIL ||
      "Nomadiqe <noreply@nomadiqe.com>"

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #374151;">${t.title}</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">${t.greeting}</p>
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">${t.body1}</p>
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">${t.body2}</p>
        <p style="margin: 24px 0;">
          <a href="${SITE_URL}/auth/signup" style="display: inline-block; background: linear-gradient(to right, #7c3aed, #6366f1); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">${t.cta}</a>
        </p>
        <p style="font-size: 14px; color: #6b7280;">${t.orLogin} <a href="${SITE_URL}/auth/signin">${SITE_URL}/auth/signin</a></p>
        <p style="margin-top: 32px; font-size: 14px; color: #6b7280;">${t.signoff}</p>
      </div>
    `

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email.trim(),
        subject: t.subject,
        html,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      console.error("Resend error:", errData)
      return NextResponse.json(
        { error: "Errore durante l'invio dell'email" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    console.error("Error in send-onboarding-reminder:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore interno" },
      { status: 500 }
    )
  }
}
