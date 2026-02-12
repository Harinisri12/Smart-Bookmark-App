'use client'

import { supabase } from '@/lib/supabase'

export default function Login() {
  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/dashboard`,
      },
    })
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <button
        onClick={signIn}
        className="bg-black text-white px-6 py-3 rounded-lg hover:opacity-80 transition"
      >
        Sign in with Google
      </button>
    </div>
  )
}
