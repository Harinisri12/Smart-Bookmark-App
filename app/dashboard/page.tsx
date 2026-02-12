'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Bookmark = {
  id: string
  title: string
  url: string
}

export default function Dashboard() {
  const router = useRouter()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)

  // 🔹 Fetch bookmarks (DECLARE FIRST)
  const fetchBookmarks = async () => {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) {
      setBookmarks(data || [])
    }
  }

  // 🔹 Protect route
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
      } else {
        await fetchBookmarks()
      }

      setLoading(false)
    }

    checkUser()
  }, [router])

  // 🔹 Add bookmark
  const addBookmark = async () => {
    if (!title || !url) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('bookmarks').insert({
      title,
      url,
      user_id: user.id,
    })

    setTitle('')
    setUrl('')
    fetchBookmarks()
  }

  // 🔹 Delete bookmark
  const deleteBookmark = async (id: string) => {
    await supabase.from('bookmarks').delete().eq('id', id)
    fetchBookmarks()
  }

  // 🔹 Logout
  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Bookmarks</h1>
        <button
          onClick={logout}
          className="text-sm text-gray-600 hover:text-black"
        >
          Logout
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="border p-2 flex-1 rounded"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL"
          className="border p-2 flex-1 rounded"
        />
        <button
          onClick={addBookmark}
          className="bg-black text-white px-4 py-2 rounded hover:opacity-80"
        >
          Add
        </button>
      </div>

      <ul className="space-y-3">
        {bookmarks.map((b) => (
          <li
            key={b.id}
            className="border p-4 flex justify-between items-center rounded"
          >
            <div>
              <p className="font-semibold">{b.title}</p>
              <a
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm"
              >
                {b.url}
              </a>
            </div>

            <button
              onClick={() => deleteBookmark(b.id)}
              className="text-red-500 hover:underline"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
