import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { createSupabaseServerClient } from "./supabase/server"

// Debug: Log environment variables (only in development)
if (process.env.NODE_ENV === "development") {
  console.log("Auth Config Check:")
  console.log("SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Set" : "✗ Missing")
  console.log("SUPABASE_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓ Set" : "✗ Missing")
  console.log("NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET ? "✓ Set" : "✗ Missing")
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("Missing credentials")
          return null
        }

        try {
          const supabase = createSupabaseServerClient()
          
          if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            console.error("Supabase environment variables not set")
            return null
          }

          console.log("Attempting login for:", credentials.email)
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          })

          if (error) {
            console.error("Supabase auth error:", {
              message: error.message,
              status: error.status,
              name: error.name,
            })
            
            // More specific error handling
            if (error.message.includes("Invalid login credentials")) {
              console.error("Possible causes:")
              console.error("1. User doesn't exist in Supabase")
              console.error("2. Password is incorrect")
              console.error("3. Email not verified (check Supabase settings)")
            }
            
            return null
          }
          
          console.log("Login successful for user:", data.user?.id)

          if (!data?.user) {
            console.error("No user data returned")
            return null
          }

          // Ensure profile exists and get role
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, username, role")
            .eq("id", data.user.id)
            .single()

          if (!profile && !profileError) {
            // Profile doesn't exist, create it
            const { error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: data.user.id,
                email: data.user.email!,
                full_name: data.user.user_metadata?.full_name || data.user.email!.split("@")[0],
                username: data.user.user_metadata?.username || data.user.email!.split("@")[0],
              })

            if (insertError) {
              console.error("Profile creation error:", insertError)
              // Continue anyway - profile might be created later
            }
          }

          // Se l'utente ha già completato l'onboarding (ha un ruolo), permette il login senza verificare email
          // La verifica email è richiesta solo durante la registrazione iniziale
          if (profile?.role) {
            console.log("User has completed onboarding, allowing login without email verification")
            // Utente ha completato l'onboarding, procedi con il login
          } else {
            // Utente non ha ancora completato l'onboarding, verifica che abbia completato la prima verifica email
            const { data: emailVerification } = await supabase
              .from("email_verifications")
              .select("first_verification_completed, second_verification_required, second_verification_completed")
              .eq("user_id", data.user.id)
              .maybeSingle()

            // Se non esiste il record di verifica, significa che l'utente non ha completato la registrazione
            if (!emailVerification || !emailVerification.first_verification_completed) {
              console.error("User has not completed first email verification and has no role")
              return null
            }

            // Se richiede seconda verifica (domini personalizzati), verifica che sia completata
            if (emailVerification.second_verification_required && !emailVerification.second_verification_completed) {
              console.error("User has not completed second email verification and has no role")
              return null
            }
          }

          return {
            id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.full_name || profile?.full_name || data.user.email!.split("@")[0],
          }
        } catch (error: any) {
          console.error("Authorize error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only handle Google OAuth here, credentials are handled in authorize
      if (account?.provider === "google") {
        const supabase = createSupabaseServerClient()
        
        // Check if user exists
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", user.email)
          .single()

        // For Google OAuth, user creation is handled by Supabase automatically
        // We just need to ensure the profile exists
        if (!existingUser) {
          // Get the user from auth
          const { data: { user: authUser } } = await supabase.auth.getUser()
          
          if (authUser) {
            // Create profile
            const { error: profileError } = await supabase
              .from("profiles")
              .insert({
                id: authUser.id,
                email: user.email!,
                full_name: user.name,
                username: user.email!.split("@")[0],
                points: 100, // Sign up bonus
              })

            if (profileError) {
              console.error("Profile creation error:", profileError)
              // Don't fail sign in if profile creation fails
            } else {
              // Add points history
              await supabase.from("points_history").insert({
                user_id: authUser.id,
                points: 100,
                action_type: "sign_up",
                description: "Registrazione completata",
              })
            }
          }
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
}

