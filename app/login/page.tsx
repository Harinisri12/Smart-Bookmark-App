"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push("/");
      }
    };

    checkSession();
  }, [router]);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-linear-to-br from-[#0a0a12] via-[#0d0d18] to-[#0a0a12] text-white overflow-hidden">
      {/* Background Glow Elements */}
      <div className="absolute w-96 h-96 bg-pink-500/20 rounded-full blur-[120px] -top-25 -left-25" />
      <div className="absolute w-125 h-125 bg-purple-500/20 rounded-full blur-[150px] -bottom-37.5 -right-37.5" />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-12 shadow-2xl">
        {/* Heading */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
            Welcome to{" "}
            <span className="bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Smart Bookmarks
            </span>
          </h1>

          <p className="text-gray-400 mt-6 text-lg">
            Your personal space to collect, organize, and revisit the internet’s
            best links.
          </p>
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white hover:bg-gray-100 transition-all duration-300 font-semibold text-gray-900 text-lg shadow-lg hover:shadow-xl border border-gray-200"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-6 h-6"
          />
          Continue with Google
        </button>

        {/* Footer Text */}
        <p className="text-xs text-gray-500 text-center mt-8">
          Secure authentication powered by Google OAuth.
        </p>
      </div>
    </div>
  );
}
