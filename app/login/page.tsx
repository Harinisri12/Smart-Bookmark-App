'use client'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google'
    })
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <button
        onClick={signIn}
        className="bg-black text-white px-6 py-3 rounded"
      >
        Sign in with Google
      </button>
    </div>
  )
}
