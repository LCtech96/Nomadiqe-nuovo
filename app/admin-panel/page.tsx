import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import WaitlistAdminPanel from "@/components/admin/waitlist-admin-panel"
import ApprovedNotCompletedPanel from "@/components/admin/approved-not-completed-panel"
import CleanerApprovalsPanel from "@/components/admin/cleaner-approvals-panel"
import CreatorVerificationPanel from "@/components/admin/creator-verification-panel"
import UsersPanel from "@/components/admin/users-panel"
import SupportPanel from "@/components/admin/support-panel"
import PostApprovalPanel from "@/components/admin/post-approval-panel"
import BioLinkApprovalPanel from "@/components/admin/bio-link-approval-panel"

export default async function AdminPanelPage() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email || ""

  if (!isAdminEmail(email)) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Admin Panel</h1>
            <p className="text-muted-foreground mb-8">
              Gestisci waitlist, richieste Cleaner e verifica creator.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-4">Approvazione post</h2>
            <PostApprovalPanel />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Link nella bio host</h2>
            <BioLinkApprovalPanel />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Richieste assistenza</h2>
            <SupportPanel />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Utenti</h2>
            <UsersPanel />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Verifica creator</h2>
            <CreatorVerificationPanel />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Richieste Cleaner</h2>
            <CleanerApprovalsPanel />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Approvati - Onboarding da completare</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Utenti approvati che non hanno ancora completato la registrazione o l&apos;onboarding. Puoi inviare un&apos;email di sollecito.
            </p>
            <ApprovedNotCompletedPanel />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Waitlist (in attesa di approvazione)</h2>
            <WaitlistAdminPanel />
          </section>
        </div>
      </div>
    </div>
  )
}
