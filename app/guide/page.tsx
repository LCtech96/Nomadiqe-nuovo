"use client"

import { Suspense } from "react"
import InteractiveGuide from "@/components/onboarding/interactive-guide"
import { useRouter } from "next/navigation"

function GuideContent() {
  const router = useRouter()

  return (
    <InteractiveGuide
      onComplete={() => {
        router.push("/home")
      }}
    />
  )
}

export default function GuidePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Caricamento guida...</p>
        </div>
      </div>
    }>
      <GuideContent />
    </Suspense>
  )
}
