"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { Search, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SearchResult {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  role: string | null
}

interface UserSearchProps {
  userRole: string | null
}

export default function UserSearch({ userRole }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()
  const supabase = createSupabaseClient()

  // Determina quali ruoli possono essere cercati in base al ruolo dell'utente
  const getAllowedRoles = (): string[] => {
    switch (userRole) {
      case "manager":
        return ["creator", "host"]
      case "host":
        return ["traveler", "creator", "host", "manager"]
      case "creator":
        return ["host", "manager"]
      case "traveler":
        return ["host"]
      default:
        return []
    }
  }

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      performSearch(searchQuery.trim())
    } else {
      setResults([])
      setShowResults(false)
    }
  }, [searchQuery])

  const performSearch = async (query: string) => {
    setLoading(true)
    setShowResults(true)

    try {
      const allowedRoles = getAllowedRoles()
      
      if (allowedRoles.length === 0) {
        setResults([])
        return
      }

      // Cerca per iniziali dell'username (case-insensitive)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, role")
        .in("role", allowedRoles)
        .ilike("username", `${query}%`)
        .neq("id", session?.user?.id || "")
        .limit(10)

      if (error) throw error

      setResults(data || [])
    } catch (error) {
      console.error("Error searching users:", error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleUserClick = (userId: string) => {
    setSearchQuery("")
    setResults([])
    setShowResults(false)
    router.push(`/profile/${userId}`)
  }

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case "host":
        return "bg-blue-500"
      case "creator":
        return "bg-purple-500"
      case "traveler":
        return "bg-green-500"
      case "manager":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground z-10" />
        <Input
          type="text"
          placeholder="Cerca utenti..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.trim().length >= 2 && setShowResults(true)}
          className="pl-10 md:pl-12 pr-4 h-10 md:h-11 text-sm md:text-base"
        />
      </div>

      {/* Results Dropdown */}
      {showResults && (results.length > 0 || loading) && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-[60vh] md:max-h-96 overflow-y-auto shadow-lg border-2">
          <CardContent className="p-2 md:p-3">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Ricerca in corso...
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-1">
                {results.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserClick(user.id)}
                    className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:bg-accent active:bg-accent cursor-pointer transition-colors touch-manipulation"
                  >
                    <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden shrink-0">
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={user.username || "User"}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm md:text-base truncate">
                        {user.full_name || user.username || "Utente"}
                      </p>
                      {user.username && (
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          @{user.username}
                        </p>
                      )}
                    </div>
                    {user.role && (
                      <Badge className={`${getRoleBadgeColor(user.role)} text-white text-xs md:text-sm px-2 py-0.5`}>
                        {user.role}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Click outside to close */}
      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowResults(false)
            setSearchQuery("")
          }}
        />
      )}
    </div>
  )
}
