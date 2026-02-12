'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  DragDropContext,
  Droppable,
  Draggable
} from '@hello-pangea/dnd'

type Bookmark = {
  id: string
  title: string
  url: string
  created_at?: string
}

type Message =
  | { type: 'error' | 'success'; text: string }
  | null

export default function Dashboard() {
  const router = useRouter()

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<Message>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteTitle, setDeleteTitle] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  /* ---------------- FETCH ---------------- */

  const fetchBookmarks = async () => {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage({
        type: 'error',
        text: 'Unable to load your bookmarks. Please refresh.'
      })
      return
    }

    setBookmarks(data || [])
  }

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      await fetchBookmarks()
      setLoading(false)
    }

    checkUser()
  }, [router])

  /* ---------------- REALTIME ---------------- */

useEffect(() => {
  const channel = supabase
    .channel('realtime-bookmarks')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'bookmarks' },
      (payload) => {
        setBookmarks((prev) => [payload.new as Bookmark, ...prev])
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'bookmarks' },
      (payload) => {
        setBookmarks((prev) =>
          prev.filter((b) => b.id !== payload.old.id)
        )
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
  /* ---------------- ADD ---------------- */

  const addBookmark = async () => {
    if (!title.trim() || !url.trim()) {
      setMessage({
        type: 'error',
        text: 'Please provide both a title and a valid URL.'
      })
      return
    }

    const formattedUrl = url.startsWith('http')
      ? url
      : `https://${url}`

    const exists = bookmarks.some(
      (b) => b.url.toLowerCase() === formattedUrl.toLowerCase()
    )

    if (exists) {
      setMessage({
        type: 'error',
        text: 'This bookmark already exists in your collection.'
      })
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        title: title.trim(),
        url: formattedUrl,
        user_id: user.id
      })
      .select()
      .single()

    if (error || !data) {
      setMessage({
        type: 'error',
        text: 'Something went wrong while saving. Please try again.'
      })
      return
    }

    setBookmarks((prev) => [data, ...prev])
    setTitle('')
    setUrl('')
    setMessage({
      type: 'success',
      text: 'Bookmark added successfully.'
    })
  }

  /* ---------------- DELETE ---------------- */

  const deleteBookmark = async (id: string) => {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id)

    if (error) {
      setMessage({
        type: 'error',
        text: 'Failed to delete bookmark. Please try again.'
      })
      return
    }

    setBookmarks((prev) => prev.filter((b) => b.id !== id))
    setMessage({
      type: 'success',
      text: 'Bookmark deleted successfully.'
    })
    setDeleteId(null)
  }

  /* ---------------- LOGOUT ---------------- */

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  /* ---------------- FILTER ---------------- */

  const filteredBookmarks = bookmarks.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.url.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0b12] text-white">
        Loading your bookmarks...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0d12] text-white px-8 py-12 flex justify-center">
      <div className="w-full max-w-4xl">

        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-5xl font-bold">
              Smart <span className="text-pink-500">Bookmarks</span>
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              {bookmarks.length} saved link{bookmarks.length !== 1 && 's'}
            </p>
          </div>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Logout
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-xl border ${
              message.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-green-500/10 border-green-500/30 text-green-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Add Section */}
        <div className="mb-10 flex gap-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter bookmark title"
            className="bg-[#16161d] border border-[#2a2a35] px-5 py-4 rounded-xl flex-1 outline-none"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="bg-[#16161d] border border-[#2a2a35] px-5 py-4 rounded-xl flex-1 outline-none"
          />
          <button
            onClick={addBookmark}
            className="px-8 py-4 rounded-xl bg-pink-500 hover:bg-pink-600 transition font-semibold"
          >
            Add +
          </button>
        </div>

        {/* Section Header + Search */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold">
            Saved Links ({filteredBookmarks.length})
          </h2>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-64 bg-[#16161d] border border-[#2a2a35] px-4 py-2 rounded-lg outline-none text-sm"
          />
        </div>

        {/* Drag List */}
        <DragDropContext
          onDragEnd={(result) => {
            if (!result.destination) return
            const items = Array.from(bookmarks)
            const [reordered] = items.splice(result.source.index, 1)
            items.splice(result.destination.index, 0, reordered)
            setBookmarks(items)
          }}
        >
          <Droppable droppableId="bookmarks">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-5"
              >
                {filteredBookmarks.map((b, index) => {
                  let domain = ''
                  try {
                    domain = new URL(b.url).hostname
                  } catch {}

                  return (
                    <Draggable key={b.id} draggableId={b.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => window.open(b.url, '_blank')}
                          className="flex items-center justify-between bg-[#16161d] border border-pink-500/20 rounded-2xl px-6 py-6 hover:border-pink-500 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-6">

                          {/* Pink Round Favicon */}
<div className="w-14 h-14 rounded-full border-2 border-pink-500/60 flex items-center justify-center bg-[#1a1a22]">
  <img
    src={
      domain
        ? `https://${domain}/favicon.ico`
        : 'https://cdn-icons-png.flaticon.com/512/5920/5920153.png'
    }
    alt="favicon"
    className="w-7 h-7 object-contain"
    onError={(e) => {
      e.currentTarget.onerror = null
      e.currentTarget.src =
        'https://cdn-icons-png.flaticon.com/512/5920/5920153.png'
    }}
  />
</div>


                            <div>
                              <p className="text-lg font-semibold">
                                {b.title}
                              </p>
                              <p className="text-gray-400 text-sm">
                                {domain}
                              </p>
                            </div>
                          </div>

                          {/* Bin Icon */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteId(b.id)
                              setDeleteTitle(b.title)
                            }}
                            className="text-red-500 hover:text-red-400 transition hover:scale-110"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-6 h-6"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 7h12M9 7V5h6v2m-7 4v6m4-6v6m4-10l-1 12H7L6 7"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                    </Draggable>
                  )
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Empty */}
        {filteredBookmarks.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg font-medium">
              {search
                ? 'No bookmarks match your search.'
                : 'You haven’t saved any bookmarks yet.'}
            </p>
          </div>
        )}

        {/* DELETE MODAL */}
        {deleteId && (
          <Modal
            title="Delete Bookmark"
            message={`Are you sure you want to permanently delete "${deleteTitle}"?`}
            confirmText="Delete"
            onCancel={() => setDeleteId(null)}
            onConfirm={() => deleteBookmark(deleteId)}
          />
        )}

        {/* LOGOUT MODAL */}
        {showLogoutConfirm && (
          <Modal
            title="Confirm Logout"
            message="Are you sure you want to log out?"
            confirmText="Logout"
            onCancel={() => setShowLogoutConfirm(false)}
            onConfirm={logout}
          />
        )}
      </div>
    </div>
  )
}

/* ---------------- MODAL ---------------- */

type ModalProps = {
  title: string
  message: string
  confirmText: string
  onCancel: () => void
  onConfirm: () => void
}

function Modal({
  title,
  message,
  confirmText,
  onCancel,
  onConfirm
}: ModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
      <div className="bg-[#16161d] border border-[#2a2a35] rounded-2xl p-8 w-[420px] shadow-xl">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <p className="text-gray-400 mb-8">{message}</p>

        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white transition"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
