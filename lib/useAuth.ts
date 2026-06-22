'use client'

import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

const ALIAS_KEY = 'av_alias'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [alias, setAliasState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Sesión inicial al montar.
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      // Alias de invitado guardado en localStorage.
      setAliasState(localStorage.getItem(ALIAS_KEY))
      setLoading(false)
    })

    // Mantener el usuario sincronizado con los cambios de auth.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = createClient()
    return supabase.auth.signUp({ email, password })
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createClient()
    return supabase.auth.signInWithPassword({ email, password })
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  // Guarda el alias de invitado en localStorage y en el estado.
  const setAlias = useCallback((value: string) => {
    localStorage.setItem(ALIAS_KEY, value)
    setAliasState(value)
  }, [])

  return { user, alias, loading, signUp, signIn, signOut, setAlias }
}
