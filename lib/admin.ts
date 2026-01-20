export const ADMIN_EMAILS = [
  "luca@facevoice.ai",
  "lucacorrao1996@gmail.com",
]

export const isAdminEmail = (email?: string | null) => {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
