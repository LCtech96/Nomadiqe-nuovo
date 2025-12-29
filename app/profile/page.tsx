"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { 
  Settings, 
  Grid3x3, 
  Square, 
  Users, 
  Share2, 
  Heart,
  MessageCircle,
  Link2,
  Copy,
  Check,
  Bell,
  Upload,
  ImageIcon
} from "lucide-react"
import Link from "next/link"
import ImageCropper from "@/components/image-cropper"

interface Post {
  id: string
  images: string[] | null
  content: string | null
  likes_count: number
  created_at: string
}

interface Property {
  id: string
  title: string
  images: string[] | null
  location_data: any
}

interface Collaboration {
  id: string
  property_id: string
  property: Property
  status: string
}

type TabType = "posts" | "vetrina" | "collab" | "notifications"

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [collaborations, setCollaborations] = useState<Collaboration[]>([])
  const [activeTab, setActiveTab] = useState<TabType>("posts")

  // Se l'utente non è host e prova ad accedere a tab non disponibili, reindirizza a posts
  useEffect(() => {
    if (profile && profile.role !== "host" && (activeTab === "vetrina" || activeTab === "collab")) {
      setActiveTab("posts")
    }
  }, [profile, activeTab])
  
  // Statistics
  const [stats, setStats] = useState({
    followers: 0,
    following: 0,
    postsCount: 0,
    propertiesCount: 0,
  })
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState("")
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [showAvatarCropper, setShowAvatarCropper] = useState(false)
  const [avatarFileToCrop, setAvatarFileToCrop] = useState<File | null>(null)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralLinkCopied, setReferralLinkCopied] = useState(false)
  const [referralLink, setReferralLink] = useState<string>("")
  
  // KOL&BED Preferences (per host)
  const [kolBedPreferences, setKolBedPreferences] = useState<any>(null)
  const [profileLinkCopied, setProfileLinkCopied] = useState(false)
  
  // Notifications
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  
  // Username change tracking
  const [usernameLastChanged, setUsernameLastChanged] = useState<Date | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [profileLoadAttempted, setProfileLoadAttempted] = useState(false)

  useEffect(() => {
    if (status === "loading") {
      return // Wait for session to load
    }
    
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }
    
    if (status === "authenticated" && session?.user?.id && !profileLoadAttempted) {
      setProfileLoadAttempted(true)
      loadData()
    }
  }, [status, session, router, profileLoadAttempted])

  const loadData = async (retryCount = 0) => {
    if (!session?.user?.id) {
      setLoading(false)
      return
    }

    // SICUREZZA: Verifica esplicita che abbiamo un ID utente valido
    const currentUserId = session.user.id
    if (!currentUserId) {
      router.push("/auth/signin")
      return
    }

    setLoading(true)
    try {
      // Load profile with retry mechanism for cache issues
      let profileData = null
      let profileError = null
      
      // SICUREZZA: Usa sempre l'ID dell'utente autenticato, mai parametri dall'URL
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUserId)
        .maybeSingle()
      
      profileData = data
      profileError = error

      // SICUREZZA: Verifica che il profilo caricato corrisponda all'utente autenticato
      if (profileData && profileData.id !== currentUserId) {
        console.error("SECURITY ERROR: Profile ID mismatch!", {
          profileId: profileData.id,
          currentUserId: currentUserId
        })
        router.push("/auth/signin")
        return
      }

      // Retry once if it's a cache/RLS issue (but not if it's a real "not found")
      if (profileError && retryCount === 0 && 
          (profileError.message?.includes("cache") || profileError.message?.includes("RLS") || 
           profileError.code === "PGRST301")) {
        // Wait a bit and retry
        await new Promise(resolve => setTimeout(resolve, 500))
        return loadData(1)
      }

      if (profileError) {
        // Only log non-expected errors (not "not found" errors)
        if (profileError.code !== "PGRST116" && profileError.code !== "PGRST301" && !profileError.message?.includes("406")) {
          console.error("Profile error:", profileError)
        }
        // If profile not found or 406 error, redirect to onboarding
        if (profileError.code === "PGRST116" || profileError.code === "PGRST301" || profileError.message?.includes("406")) {
          router.push("/onboarding")
          return
        }
        throw profileError
      }

      if (!profileData) {
        // Only redirect to onboarding if we're sure the profile doesn't exist
        // Don't log if it's a cache/RLS issue that might resolve
        router.push("/onboarding")
        return
      }

      setProfile(profileData)
      setFullName(profileData.full_name || "")
      setUsername(profileData.username || "")
      setBio(profileData.bio || "")
      // Load avatar_url from database - always use the clean URL from database
      // Add cache buster only for display, not for saving
      if (profileData.avatar_url) {
        // Remove any existing cache busters first
        const cleanUrl = profileData.avatar_url.split('?')[0]
        // Add cache buster for display to force browser reload
        const cacheBuster = `?t=${Date.now()}`
        setAvatarUrl(cleanUrl + cacheBuster)
        console.log("Loaded avatar_url from database:", cleanUrl)
      } else {
        setAvatarUrl("")
        console.log("No avatar_url in database")
      }

      // Carica referral code se esiste
      if (profileData.referral_code) {
        setReferralCode(profileData.referral_code)
        setReferralLink(`${window.location.origin}/auth/signup?ref=${profileData.referral_code}`)
      } else {
        // Prova a caricare dalla tabella referral_codes (se esiste)
        try {
          const { data: refCodeData } = await supabase
            .from("referral_codes")
            .select("code")
            .eq("user_id", session.user.id)
            .maybeSingle()
          
          if (refCodeData?.code) {
            setReferralCode(refCodeData.code)
            setReferralLink(`${window.location.origin}/auth/signup?ref=${refCodeData.code}`)
          }
        } catch (error) {
          // Tabella referral_codes non esiste o errore, ignora silenziosamente
          console.debug("Tabella referral_codes non disponibile:", error)
        }
      }

      // Load posts (don't fail if error, just set empty array)
      // Retry logic in case of PostgREST cache issues
      let postsData = null
      let postsError = null
      
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await supabase
          .from("posts")
          .select("*")
          .eq("author_id", session.user.id)
          .order("created_at", { ascending: false })
        
        postsData = result.data
        postsError = result.error
        
        if (!postsError) {
          break
        }
        
        // If error is about column not existing, wait and retry (PostgREST cache issue)
        if (postsError?.code === '42703' && attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
          continue
        }
        
        break
      }

      if (postsError) {
        console.error("Posts error:", postsError)
        setPosts([])
      } else {
        setPosts(postsData || [])
      }

      // Load properties (don't fail if error, just set empty array)
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id, title, images, location_data")
        .eq("owner_id", session.user.id)

      if (propertiesError) {
        console.error("Properties error:", propertiesError)
        setProperties([])
      } else {
        setProperties(propertiesData || [])
      }

      // Load collaborations (approved/completed where host sponsors)
      const { data: collabsData, error: collabsError } = await supabase
        .from("collaborations")
        .select(`
          id,
          property_id,
          status,
          property:properties(id, title, images, location_data)
        `)
        .eq("host_id", session.user.id)
        .in("status", ["approved", "completed"])

      if (collabsError) {
        console.error("Collaborations error:", collabsError)
        setCollaborations([])
      } else {
        // Map collaborations to correct type structure
        const mappedCollaborations: Collaboration[] = (collabsData || [])
          .filter((c: any) => c.property)
          .map((c: any) => {
            const property = Array.isArray(c.property) ? c.property[0] : c.property
            return {
              id: c.id,
              property_id: c.property_id,
              status: c.status,
              property: {
                id: property.id,
                title: property.title,
                images: property.images || [],
                location_data: property.location_data || {},
              },
            }
          })
          .filter((c: Collaboration) => c.property && c.property.id)
        
        setCollaborations(mappedCollaborations)
      }

      // Load KOL&BED preferences (solo per host)
      if (profileData?.role === "host") {
        const { data: prefsData, error: prefsError } = await supabase
          .from("host_kol_bed_preferences")
          .select("*")
          .eq("host_id", currentUserId)
          .maybeSingle()

        if (!prefsError && prefsData) {
          setKolBedPreferences(prefsData)
        }
      }

      // Load statistics (don't fail if error)
      try {
        await loadStatistics()
      } catch (statsError) {
        console.error("Statistics error:", statsError)
      }

      // Load notifications (don't fail if error)
      try {
        await loadNotifications()
      } catch (notifError) {
        console.error("Notifications error:", notifError)
      }

      // Load username change date (if column exists, otherwise use updated_at as fallback)
      if (profileData.username_changed_at) {
        setUsernameLastChanged(new Date(profileData.username_changed_at))
      } else if (profileData.updated_at && profileData.username) {
        // Fallback: use updated_at if username_changed_at doesn't exist
        // This is not perfect but works as a temporary solution
        setUsernameLastChanged(new Date(profileData.updated_at))
      }
    } catch (error: any) {
      console.error("Error loading data:", error)
      toast({
        title: "Errore",
        description: error?.message || "Impossibile caricare il profilo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStatistics = async () => {
    if (!session?.user?.id) return

    try {
      // Followers count
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", session.user.id)

      // Following count
      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", session.user.id)

      // Posts count
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("author_id", session.user.id)

      // Properties count
      const { count: propertiesCount } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", session.user.id)

      setStats({
        followers: followersCount || 0,
        following: followingCount || 0,
        postsCount: postsCount || 0,
        propertiesCount: propertiesCount || 0,
      })
    } catch (error) {
      console.error("Error loading statistics:", error)
    }
  }

  const loadNotifications = async () => {
    if (!session?.user?.id) return

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error

      setNotifications(data || [])
      const unread = (data || []).filter((n) => !n.read).length
      setUnreadCount(unread)
    } catch (error) {
      console.error("Error loading notifications:", error)
    }
  }

  const canChangeUsername = (): boolean => {
    if (!usernameLastChanged) return true
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    return usernameLastChanged <= oneWeekAgo
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Errore",
          description: "L'immagine è troppo grande. Dimensione massima: 10MB",
          variant: "destructive",
        })
        return
      }
      
      // Open cropper instead of setting file directly
      setAvatarFileToCrop(file)
      setShowAvatarCropper(true)
      
      // Reset input
      e.target.value = ""
    }
  }

  const handleAvatarCropComplete = (croppedFile: File) => {
    setAvatarFile(croppedFile)
    setAvatarPreview(URL.createObjectURL(croppedFile))
    setShowAvatarCropper(false)
    setAvatarFileToCrop(null)
  }


  // Check username availability
  useEffect(() => {
    // Allow empty username during editing - don't check availability if empty
    if (!username || username.trim().length === 0) {
      setUsernameAvailable(null)
      return
    }
    // Only check if username is different from current profile username
    if (username === profile?.username) {
      setUsernameAvailable(null)
      return
    }

    const checkUsername = async () => {
      setCheckingUsername(true)
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", username.toLowerCase().trim())
          .neq("id", session?.user?.id || "")
          .maybeSingle()

        if (error && error.code !== "PGRST116") throw error

        setUsernameAvailable(!data)
      } catch (error) {
        console.error("Error checking username:", error)
        setUsernameAvailable(null)
      } finally {
        setCheckingUsername(false)
      }
    }

    const timeoutId = setTimeout(checkUsername, 500)
    return () => clearTimeout(timeoutId)
  }, [username, profile?.username, session?.user?.id, supabase])

  const handleSave = async () => {
    if (!session?.user?.id) return

    // Check username change limit (only when actually saving a different username)
    if (username && username.trim() && username !== profile?.username && !canChangeUsername()) {
      toast({
        title: "Errore",
        description: "Puoi cambiare lo username solo una volta a settimana. Riprova tra qualche giorno.",
        variant: "destructive",
      })
      return
    }

    // Note: Username availability check is now done inside the update logic
    // to allow saving other fields even if username check is pending

    try {
      let finalAvatarUrl: string | null = null
      let avatarWasUploaded = false

      // Upload avatar if file is provided
      if (avatarFile) {
        const blobToken = process.env.NEW_BLOB_READ_WRITE_TOKEN || process.env.NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN || process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN
        
        if (!blobToken) {
          toast({
            title: "Errore",
            description: "Token Vercel Blob non configurato. Configura NEW_BLOB_READ_WRITE_TOKEN nelle variabili d'ambiente.",
            variant: "destructive",
          })
          return
        }

        try {
          const { put } = await import("@vercel/blob")
          const fileExtension = avatarFile.name.split(".").pop()
          const fileName = `${session.user.id}/avatar.${fileExtension}`
          const blob = await put(fileName, avatarFile, {
            access: "public",
            contentType: avatarFile.type,
            token: blobToken,
          })
          finalAvatarUrl = blob.url
          avatarWasUploaded = true
          console.log("Avatar uploaded successfully:", finalAvatarUrl)
        } catch (uploadError: any) {
          console.error("Avatar upload error:", uploadError)
          toast({
            title: "Errore",
            description: "Errore nel caricamento dell'avatar. Riprova.",
            variant: "destructive",
          })
          return
        }
      } else {
        // No new file uploaded, keep existing avatar_url from profile
        finalAvatarUrl = profile?.avatar_url || null
      }

      // Prepare update data - always update if values are provided
      const updateData: any = {
        updated_at: new Date().toISOString(),
      }

      // Always update full_name if provided (even if same, to ensure it's saved)
      if (fullName !== undefined) {
        updateData.full_name = fullName.trim() || null
      }

      // Always update bio if provided
      if (bio !== undefined) {
        updateData.bio = bio.trim() || null
      }

      // Always update avatar_url if a new one was uploaded
      // IMPORTANT: Only update avatar_url if a new file was uploaded
      // Don't update if no new file - this prevents overwriting with null
      if (avatarWasUploaded && finalAvatarUrl) {
        // Remove any existing cache busters before saving
        const cleanAvatarUrl = finalAvatarUrl.split('?')[0]
        updateData.avatar_url = cleanAvatarUrl
        finalAvatarUrl = cleanAvatarUrl
        console.log("Updating avatar_url to:", cleanAvatarUrl)
      }
      // If no new file was uploaded, don't include avatar_url in updateData
      // This ensures the existing avatar_url in database is preserved

      // Update username if provided and available
      if (username && username.trim()) {
        const newUsername = username.toLowerCase().trim()
        if (newUsername !== profile?.username) {
          // Username is changing - check availability
          if (usernameAvailable === false) {
            toast({
              title: "Errore",
              description: "Username non disponibile. Scegline un altro.",
              variant: "destructive",
            })
            return
          }
          if (checkingUsername || usernameAvailable === null) {
            toast({
              title: "Attendere",
              description: "Verifica username in corso...",
            })
            return
          }
          if (usernameAvailable) {
            updateData.username = newUsername
            updateData.username_changed_at = new Date().toISOString()
          }
        } else {
          // Username is the same, but update it anyway to ensure it's saved
          updateData.username = newUsername
        }
      }

      console.log("Updating profile with data:", updateData)
      console.log("User ID:", session.user.id)

      // Use RPC function as primary method (more reliable with RLS)
      // Prepare RPC parameters - only include fields that are being updated
      const rpcParams: any = {
        p_user_id: session.user.id,
      }
      
      // Only include fields that are in updateData (not undefined)
      if (updateData.full_name !== undefined) {
        rpcParams.p_full_name = updateData.full_name
      }
      if (updateData.username !== undefined) {
        rpcParams.p_username = updateData.username
      }
      if (updateData.bio !== undefined) {
        rpcParams.p_bio = updateData.bio
      }
      if (updateData.avatar_url !== undefined) {
        rpcParams.p_avatar_url = updateData.avatar_url
      }
      
      console.log("Calling RPC function with params:", rpcParams)
      
      // Use RPC function as primary method (bypasses RLS issues)
      const { data: rpcData, error: rpcError } = await supabase.rpc('update_user_profile', rpcParams)
      
      if (rpcError) {
        console.error("❌ RPC function error:", rpcError)
        console.error("Error details:", JSON.stringify(rpcError, null, 2))
        
        // Fallback: try direct update if RPC fails
        console.warn("⚠️ RPC failed, trying direct update as fallback...")
        const { error: updateError, count } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", session.user.id)
        
        if (updateError) {
          console.error("Direct update also failed:", updateError)
          throw new Error(`Update failed: ${rpcError.message}`)
        }
        
        console.log("✅ Direct update succeeded as fallback, rows affected:", count)
      } else {
        console.log("✅ RPC function executed successfully:", rpcData)
      }

      // Wait a moment for database to sync
      await new Promise(resolve => setTimeout(resolve, 200))

      // Now fetch the updated profile to verify
      const { data: updatedData, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (fetchError) {
        console.error("Error fetching updated profile:", fetchError)
        // Don't throw - the update might have worked even if fetch failed
      } else {
        console.log("Profile updated successfully. Fetched data:", updatedData)
        console.log("Avatar URL in database:", updatedData?.avatar_url)
        
        // Verify that the update was successful
        if (updatedData) {
          console.log("Updated profile from database:", updatedData)
          
          // Verify avatar_url was saved correctly
          if (avatarWasUploaded && updatedData.avatar_url) {
            console.log("✅ Avatar URL saved correctly:", updatedData.avatar_url)
          } else if (avatarWasUploaded && !updatedData.avatar_url) {
            console.error("❌ Avatar URL was NOT saved to database!")
            console.error("Update data sent:", updateData.avatar_url)
            console.error("Data received:", updatedData.avatar_url)
          }
          
          // Verify username was saved correctly
          if (updateData.username && updatedData.username === updateData.username) {
            console.log("✅ Username saved correctly:", updatedData.username)
          }
          
          // Verify full_name was saved correctly
          if (updateData.full_name !== undefined && updatedData.full_name === updateData.full_name) {
            console.log("✅ Full name saved correctly:", updatedData.full_name)
          }
        }
      }

      toast({
        title: "Successo",
        description: "Profilo aggiornato con successo!",
      })

      setIsEditing(false)
      setAvatarFile(null)
      setAvatarPreview("")
      
      // Prepare new values
      const newUsername = username && username.trim() ? username.toLowerCase().trim() : (profile?.username || "")
      const newFullName = fullName && fullName.trim() ? fullName.trim() : (profile?.full_name || "")
      
      // Update avatar URL with cache buster immediately for display
      // But remember: finalAvatarUrl is already clean (no cache buster) if uploaded
      if (finalAvatarUrl) {
        // Add cache buster for display only
        const cacheBuster = `?t=${Date.now()}`
        const displayUrl = finalAvatarUrl + (finalAvatarUrl.includes('?') ? '&' : '?') + cacheBuster
        setAvatarUrl(displayUrl)
        console.log("Setting avatarUrl for display:", displayUrl)
      } else if (profile?.avatar_url) {
        // Keep existing avatar with cache buster if no new one uploaded
        const baseUrl = profile.avatar_url.split('?')[0]
        const cacheBuster = `?t=${Date.now()}`
        const displayUrl = baseUrl + cacheBuster
        setAvatarUrl(displayUrl)
      }
      
      // Update all state immediately with new values
      setUsername(newUsername)
      setFullName(newFullName)
      
      // Update profile state immediately - this ensures UI updates right away
      if (profile) {
        setProfile({
          ...profile,
          avatar_url: finalAvatarUrl || profile.avatar_url,
          username: newUsername,
          full_name: newFullName,
          bio: bio.trim() || profile.bio || null,
        })
      }
      
      // Wait a bit for database to update, then reload data
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Reload data to sync with database - this ensures fresh data from DB
      console.log("Reloading data from database...")
      await loadData()
      
      // Verify data was loaded correctly
      console.log("Data reloaded. Profile avatar_url:", profile?.avatar_url)
      console.log("Data reloaded. AvatarUrl state:", avatarUrl)
      
      // Force router refresh to clear cache
      router.refresh()
      
      // Force a re-render by updating avatarUrl with new cache buster
      // This ensures the image component re-renders with new URL
      if (finalAvatarUrl) {
        setTimeout(() => {
          const cleanUrl = finalAvatarUrl.split('?')[0]
          const freshCacheBuster = `?t=${Date.now()}`
          const freshUrl = cleanUrl + freshCacheBuster
          setAvatarUrl(freshUrl)
          console.log("Forced avatarUrl update:", freshUrl)
        }, 100)
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleShareProperty = async (propertyId: string) => {
    const shareUrl = `${window.location.origin}/properties/${propertyId}?ref=${session?.user?.id}`
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareLinkCopied(true)
      toast({
        title: "Link copiato!",
        description: "Condividi questo link per ricevere il 10% sulle prenotazioni",
      })
      setTimeout(() => setShareLinkCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile copiare il link",
        variant: "destructive",
      })
    }
  }

  const handleShareProfile = async () => {
    if (!profile?.username && !profile?.id) {
      toast({
        title: "Errore",
        description: "Username non disponibile",
        variant: "destructive",
      })
      return
    }

    const shareUrl = profile.username 
      ? `${window.location.origin}/profile/${profile.username}`
      : `${window.location.origin}/profile/${profile.id}`
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setProfileLinkCopied(true)
      toast({
        title: "Link profilo copiato!",
        description: "Il link è stato copiato negli appunti",
      })
      setTimeout(() => setProfileLinkCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile copiare il link",
        variant: "destructive",
      })
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <div>Caricamento...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <div>Profilo non trovato</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header - Profile Style */}
        <div className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex justify-center md:justify-start relative">
              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-foreground">
                {(avatarPreview || avatarUrl || profile?.avatar_url) ? (
                  <Image
                    src={avatarPreview || avatarUrl || profile?.avatar_url || ""}
                    alt={(isEditing ? username : (username || profile?.username)) || "Profile"}
                    fill
                    sizes="(max-width: 768px) 96px, 128px"
                    priority
                    className="object-cover"
                    unoptimized={avatarPreview ? true : false}
                    key={`avatar-${profile?.id || 'default'}-${avatarUrl ? avatarUrl.split('?')[0] : (profile?.avatar_url ? profile.avatar_url.split('?')[0] : 'none')}-${avatarPreview ? 'preview' : 'saved'}`}
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <span className="text-3xl md:text-4xl font-bold text-primary">
                      {(username || fullName || "H")[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              {/* Points Badge */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold shadow-lg border-2 border-background">
                ⭐ {profile?.points || 0}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <div className="flex flex-col">
                  <h1 className="text-xl md:text-2xl font-light">
                    {(isEditing ? username : (username || profile?.username)) || "username"}
                  </h1>
                  {((isEditing ? fullName : (fullName || profile?.full_name))) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {isEditing ? fullName : (fullName || profile?.full_name)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-sm"
                  >
                    {isEditing ? "Annulla" : "Modifica profilo"}
                  </Button>
                  {profile?.role === "creator" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/dashboard/creator/settings")}
                      className="text-sm"
                      title="Impostazioni"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  ) : profile?.role === "host" ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/dashboard/host")}
                        className="text-sm"
                        title="Impostazioni"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/communities")}
                        className="text-sm"
                        title="Community"
                      >
                        <Users className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/dashboard/host")}
                      className="text-sm"
                      title="Impostazioni"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div className="flex gap-6 mb-4 flex-wrap">
                <div className="text-center md:text-left">
                  <span className="font-semibold">{stats.postsCount}</span>
                  <span className="text-muted-foreground ml-1">post</span>
                </div>
                <div className="text-center md:text-left">
                  <span className="font-semibold">{stats.followers}</span>
                  <span className="text-muted-foreground ml-1">follower</span>
                </div>
                <div className="text-center md:text-left">
                  <span className="font-semibold">{stats.following}</span>
                  <span className="text-muted-foreground ml-1">following</span>
                </div>
                {/* Mostra "property" solo per host */}
                {profile?.role === "host" && (
                  <div className="text-center md:text-left">
                    <span className="font-semibold">{stats.propertiesCount}</span>
                    <span className="text-muted-foreground ml-1">property</span>
                  </div>
                )}
                <div className="text-center md:text-left">
                  <span className="font-semibold text-primary">{profile?.points || 0}</span>
                  <span className="text-muted-foreground ml-1">punti</span>
                </div>
              </div>

              {/* Bio */}
              <div className="mb-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="fullName">Nome completo</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-1"
                        placeholder="Inserisci username"
                      />
                      {!canChangeUsername() && username && username !== profile?.username && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ⚠️ Puoi salvare un nuovo username solo una volta a settimana
                        </p>
                      )}
                      {checkingUsername && username && username !== profile?.username && (
                        <p className="text-xs text-muted-foreground mt-1">Verifica in corso...</p>
                      )}
                      {usernameAvailable === false && username && username !== profile?.username && (
                        <p className="text-xs text-destructive mt-1">✗ Username non disponibile</p>
                      )}
                      {usernameAvailable === true && username && username !== profile?.username && (
                        <p className="text-xs text-green-600 mt-1">✓ Username disponibile</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="mt-1"
                        placeholder="Racconta qualcosa di te..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="avatar">Foto profilo</Label>
                      <div className="flex items-center gap-4 mt-2">
                        {(avatarPreview || avatarUrl) ? (
                          <img
                            src={avatarPreview || avatarUrl}
                            alt="Preview"
                            className="w-20 h-20 rounded-full object-cover border-2"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <Input
                          id="avatar"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Max 5MB, formato JPG/PNG</p>
                    </div>
                    <Button onClick={handleSave} className="w-full">
                      Salva modifiche
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="font-semibold">{fullName}</p>
                    {bio && <p className="text-sm mt-1 whitespace-pre-line">{bio}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = `${window.location.origin}/profile/${session?.user?.id}`
                          navigator.clipboard.writeText(url)
                          toast({
                            title: "Link copiato!",
                            description: "Condividi questo link per far conoscere il tuo profilo",
                          })
                        }}
                        className="text-xs"
                      >
                        <Link2 className="w-3 h-3 mr-1" />
                        Condividi profilo
                      </Button>
                      {referralCode && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (referralLink) {
                              try {
                                await navigator.clipboard.writeText(referralLink)
                                setReferralLinkCopied(true)
                                toast({
                                  title: "Link referral copiato!",
                                  description: "Condividi questo link per invitare amici e guadagnare punti!",
                                })
                                setTimeout(() => setReferralLinkCopied(false), 2000)
                              } catch (error) {
                                toast({
                                  title: "Errore",
                                  description: "Impossibile copiare il link",
                                  variant: "destructive",
                                })
                              }
                            }
                          }}
                          className="text-xs bg-primary/10 hover:bg-primary/20"
                        >
                          {referralLinkCopied ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Copiato!
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3 h-3 mr-1" />
                              Link Referral
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-b">
          <div className="flex justify-center">
            <button
              onClick={() => setActiveTab("posts")}
              className={`flex-1 py-4 text-sm font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === "posts"
                  ? "border-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Grid3x3 className="w-4 h-4" />
                Post
              </div>
            </button>
            {/* Tab Vetrina solo per host */}
            {profile?.role === "host" && (
              <button
                onClick={() => setActiveTab("vetrina")}
                className={`flex-1 py-4 text-sm font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                  activeTab === "vetrina"
                    ? "border-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Square className="w-4 h-4" />
                  Vetrina
                </div>
              </button>
            )}
            {/* Tab Collab solo per host */}
            {profile?.role === "host" && (
              <button
                onClick={() => setActiveTab("collab")}
                className={`flex-1 py-4 text-sm font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                  activeTab === "collab"
                    ? "border-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Heart className="w-4 h-4" />
                  Collab
                </div>
              </button>
            )}
            <button
              onClick={() => setActiveTab("notifications")}
              className={`flex-1 py-4 text-sm font-semibold uppercase tracking-wider border-b-2 transition-colors relative ${
                activeTab === "notifications"
                  ? "border-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Bell className="w-4 h-4" />
                Messaggi
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="p-4">
          {activeTab === "posts" && (
            <div>
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nessun post pubblicato</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 md:gap-4">
                  {posts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/posts/${post.id}`}
                      className="relative aspect-square group cursor-pointer"
                    >
                      {post.images && post.images.length > 0 ? (
                        <>
                          <Image
                            src={post.images[0]}
                            alt="Post"
                            fill
                            sizes="(max-width: 768px) 33vw, 200px"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100">
                            <div className="flex items-center gap-1 text-white">
                              <Heart className="w-5 h-5 fill-white" />
                              <span className="font-semibold">{post.likes_count || 0}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground text-sm">
                            {post.content?.substring(0, 50)}...
                          </span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "vetrina" && profile?.role === "host" && (
            <div>
              {properties.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">Nessuna struttura disponibile</p>
                  <Button asChild>
                    <Link href="/dashboard/host/properties/new">
                      Aggiungi struttura
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 md:gap-4">
                  {properties.map((property) => (
                    <div
                      key={property.id}
                      className="relative aspect-square group cursor-pointer"
                    >
                      {property.images && property.images.length > 0 ? (
                        <>
                          <Link href={`/properties/${property.id}`}>
                            <Image
                              src={property.images[0]}
                              alt={property.title}
                              fill
                              sizes="(max-width: 768px) 33vw, 200px"
                              className="object-cover"
                            />
                          </Link>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleShareProperty(property.id)
                              }}
                              className="text-white hover:text-white hover:bg-white/20"
                            >
                              {shareLinkCopied ? (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Copiato!
                                </>
                              ) : (
                                <>
                                  <Share2 className="w-4 h-4 mr-2" />
                                  Condividi struttura
                                </>
                              )}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <Link href={`/properties/${property.id}`}>
                          <div className="w-full h-full bg-muted flex flex-col items-center justify-center p-4">
                            <span className="text-muted-foreground text-sm text-center">
                              {property.title}
                            </span>
                          </div>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "collab" && profile?.role === "host" && (
            <div className="space-y-6">
              {/* Link di condivisione profilo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="w-5 h-5" />
                    Condividi il tuo profilo
                  </CardTitle>
                  <CardDescription>
                    Copia e condividi il link del tuo profilo per far conoscere le tue strutture
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      value={profile?.username 
                        ? `${window.location.origin}/profile/${profile.username}`
                        : `${window.location.origin}/profile/${profile?.id}`
                      }
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      onClick={handleShareProfile}
                      variant={profileLinkCopied ? "default" : "outline"}
                    >
                      {profileLinkCopied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copiato!
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4 mr-2" />
                          Copia link
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Impostazioni KOL&BED */}
              {kolBedPreferences && (
                <Card>
                  <CardHeader>
                    <CardTitle>Le tue impostazioni KOL&BED</CardTitle>
                    <CardDescription>
                      Le impostazioni che hai configurato per le collaborazioni con i creator
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {kolBedPreferences.nights_per_collaboration > 0 && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="font-medium">Notti per collaborazione FREE STAY:</span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {kolBedPreferences.nights_per_collaboration}
                        </span>
                      </div>
                    )}

                    {(kolBedPreferences.required_videos > 0 || 
                      kolBedPreferences.required_posts > 0 || 
                      kolBedPreferences.required_stories > 0) && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="font-medium mb-2">Contenuti richiesti:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {kolBedPreferences.required_videos > 0 && (
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {kolBedPreferences.required_videos}
                              </p>
                              <p className="text-xs text-muted-foreground">Video</p>
                            </div>
                          )}
                          {kolBedPreferences.required_posts > 0 && (
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {kolBedPreferences.required_posts}
                              </p>
                              <p className="text-xs text-muted-foreground">Post</p>
                            </div>
                          )}
                          {kolBedPreferences.required_stories > 0 && (
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {kolBedPreferences.required_stories}
                              </p>
                              <p className="text-xs text-muted-foreground">Storie</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {kolBedPreferences.kol_bed_months && kolBedPreferences.kol_bed_months.length > 0 && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="font-medium mb-2">Mesi disponibili per KOL&BED:</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { num: 1, name: "Gen" },
                            { num: 2, name: "Feb" },
                            { num: 3, name: "Mar" },
                            { num: 4, name: "Apr" },
                            { num: 5, name: "Mag" },
                            { num: 6, name: "Giu" },
                            { num: 7, name: "Lug" },
                            { num: 8, name: "Ago" },
                            { num: 9, name: "Set" },
                            { num: 10, name: "Ott" },
                            { num: 11, name: "Nov" },
                            { num: 12, name: "Dic" },
                          ].map((month) => (
                            <Badge
                              key={month.num}
                              variant={kolBedPreferences.kol_bed_months.includes(month.num) ? "default" : "outline"}
                              className="px-3 py-1"
                            >
                              {month.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => router.push("/dashboard/host")}
                      className="w-full"
                    >
                      Modifica impostazioni
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Collaborazioni attive */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Collaborazioni attive</h3>
                {collaborations.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg">
                    <p className="text-muted-foreground">
                      Nessuna collaborazione attiva. Le strutture sponsorizzate appariranno qui.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Riceverai il 10% su ogni prenotazione proveniente dai tuoi link di condivisione.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1 md:gap-4">
                    {collaborations.map((collab) => (
                      <Link
                        key={collab.id}
                        href={`/properties/${collab.property_id}`}
                        className="relative aspect-square group cursor-pointer"
                      >
                        {collab.property.images && collab.property.images.length > 0 ? (
                          <>
                            <Image
                              src={collab.property.images[0]}
                              alt={collab.property.title}
                              fill
                              sizes="(max-width: 768px) 33vw, 200px"
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span className="text-white text-sm font-semibold">
                                {collab.property.title}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <span className="text-muted-foreground text-sm text-center p-4">
                              {collab.property.title}
                            </span>
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="py-4">
              <div className="mb-4">
                <Button
                  variant="outline"
                  onClick={() => router.push("/messages")}
                  className="w-full"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Vai ai Messaggi Diretti
                </Button>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Notifiche</h3>
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nessuna notifica</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <Card
                        key={notification.id}
                        className={`cursor-pointer transition-colors ${
                          !notification.read ? "bg-primary/5 border-primary/20" : ""
                        }`}
                        onClick={async () => {
                          if (!notification.read) {
                            await supabase
                              .from("notifications")
                              .update({ read: true })
                              .eq("id", notification.id)
                            loadNotifications()
                          }
                          
                          // Navigate based on notification type
                          if (notification.related_id) {
                            if (notification.type.includes("post")) {
                              router.push(`/posts/${notification.related_id}`)
                            } else if (notification.type.includes("property")) {
                              router.push(`/properties/${notification.related_id}`)
                            } else if (notification.type.includes("profile")) {
                              router.push(`/profile/${notification.related_id}`)
                            }
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              !notification.read ? "bg-primary" : "bg-transparent"
                            }`} />
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{notification.title}</p>
                              {notification.message && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(notification.created_at).toLocaleDateString("it-IT", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Image Cropper for Avatar */}
      <ImageCropper
        open={showAvatarCropper}
        onOpenChange={setShowAvatarCropper}
        imageFile={avatarFileToCrop}
        onCropComplete={handleAvatarCropComplete}
        aspectRatio={1}
        maxWidth={800}
        maxHeight={800}
        quality={0.85}
      />
    </div>
  )
}
