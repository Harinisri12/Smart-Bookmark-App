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
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="bg-gray-900/60 backdrop-blur-md p-10 rounded-2xl shadow-2xl border border-pink-500/20">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Smart Bookmark 💖
        </h1>

        <button
          onClick={signIn}
          className="w-full bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-lg transition-all duration-300 shadow-lg shadow-pink-500/30"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
