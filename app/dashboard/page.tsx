"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

type Bookmark = {
  id: string;
  title: string;
  url: string;
  created_at?: string;
};

type Message = { type: "error" | "success"; text: string } | null;

export default function Dashboard() {
  const router = useRouter();

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<Message>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  /* ---------------- AUTO CLEAR TOAST ---------------- */

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  /* ---------------- FETCH ---------------- */

  const fetchBookmarks = async () => {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage({
        type: "error",
        text: "Unable to load your bookmarks. Please refresh.",
      });
      return;
    }

    setBookmarks(data || []);
  };
  

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      await fetchBookmarks();
      setLoading(false);
    };

    checkUser();
  }, [router]);

  /* ---------------- REALTIME ---------------- */

useEffect(() => {
  const setupRealtime = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const channel = supabase
      .channel(`realtime-bookmarks-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchBookmarks(); // ← always refetch
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  setupRealtime();
}, []);


  /* ---------------- URL VALIDATION ---------------- */

  const isValidUrl = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) return false;

    const formatted = trimmed.startsWith("http")
      ? trimmed
      : `https://${trimmed}`;

    try {
      const parsed = new URL(formatted);

      if (!["http:", "https:"].includes(parsed.protocol)) {
        return false;
      }

      if (!parsed.hostname.includes(".")) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  };

  /* ---------------- ADD ---------------- */

  const addBookmark = async () => {
    if (!title.trim() || !url.trim()) {
      setMessage({
        type: "error",
        text: "Please provide both a title and a valid URL.",
      });
      return;
    }

    if (!isValidUrl(url.trim())) {
      setMessage({
        type: "error",
        text: "Please enter a valid URL (example: https://google.com).",
      });
      return;
    }

    const formattedUrl = url.trim().startsWith("http")
      ? url.trim()
      : `https://${url.trim()}`;

    const exists = bookmarks.some(
      (b) => b.url.toLowerCase() === formattedUrl.toLowerCase(),
    );

    if (exists) {
      setMessage({
        type: "error",
        text: "This bookmark already exists in your collection.",
      });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("bookmarks")
      .insert({
        title: title.trim(),
        url: formattedUrl,
        user_id: user.id,
      })
      .select()
      .single();

    if (error || !data) {
      setMessage({
        type: "error",
        text: "Something went wrong while saving. Please try again.",
      });
      return;
    }

    setTitle("");
    setUrl("");
    setMessage({
      type: "success",
      text: "Bookmark added successfully.",
    });
  };

  /* ---------------- DELETE ---------------- */

  const deleteBookmark = async (id: string) => {
    const { error } = await supabase.from("bookmarks").delete().eq("id", id);

    if (error) {
      setMessage({
        type: "error",
        text: "Failed to delete bookmark. Please try again.",
      });
      return;
    }

    setMessage({
      type: "success",
      text: "Bookmark deleted successfully.",
    });
    setDeleteId(null);
  };

  /* ---------------- LOGOUT ---------------- */

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  /* ---------------- FILTER ---------------- */

  const filteredBookmarks = bookmarks.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.url.toLowerCase().includes(search.toLowerCase()),
  );

  /* ---------------- LOADING SCREEN ---------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex flex-col items-center justify-center px-6">
        {/* Logo / Title */}
        <h1 className="text-5xl font-bold mb-12 text-white">
          Smart <span className="text-pink-500">Bookmarks</span>
        </h1>

        {/* Loading Card */}
        <div className="bg-[#16161d] border border-pink-500/30 rounded-2xl px-10 py-12 text-center shadow-xl">
          {/* Pink Circular Loader */}
          <div className="mx-auto mb-6 w-14 h-14 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />

          {/* Message */}
          <p className="text-gray-300 text-sm tracking-wide">
            Loading your bookmarks...
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#0d0d12] text-white px-8 py-12 flex justify-center">
      <div className="w-full max-w-4xl">
        {/* Toast */}
        {message && (
          <div
            className={`fixed top-20 right-8 z-50 px-6 py-4 rounded-xl shadow-xl border ${
              message.type === "error"
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-green-500/10 border-green-500/30 text-green-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-5xl font-bold">
              Smart <span className="text-pink-500">Bookmarks</span>
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              {bookmarks.length} saved link{bookmarks.length !== 1 && "s"}
            </p>
          </div>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="text-sm text-gray-400 hover:text-white transition relative after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-pink-500 after:transition-all after:duration-300 hover:after:w-full"
          >
            Logout
          </button>
        </div>

      {/* Add New Bookmark Card */}
<div className="mb-12 bg-white/5 backdrop-blur-xl border border-pink-500/30 rounded-3xl p-8 shadow-xl">

  <h2 className="text-2xl font-semibold mb-6">
    Add <span className="text-pink-500">New Bookmark</span>
  </h2>

  <div className="flex flex-col md:flex-row gap-4">
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      placeholder="Enter bookmark title"
      className="bg-white/5 border border-white/10 backdrop-blur-md px-5 py-4 rounded-xl flex-1 outline-none focus:border-pink-500/50 transition"
    />

    <input
      value={url}
      onChange={(e) => setUrl(e.target.value)}
      placeholder="https://example.com"
      className="bg-white/5 border border-white/10 backdrop-blur-md px-5 py-4 rounded-xl flex-1 outline-none focus:border-pink-500/50 transition"
    />

    <button
      onClick={addBookmark}
      className="px-8 py-4 rounded-xl bg-pink-500 hover:bg-pink-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-pink-500/30"
    >
      Add +
    </button>
  </div>
</div>


        {/* Section Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
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

          {/* Fading Pink Line */}
          <div className="mt-3 h-0.5 w-full bg-linear-to-r from-pink-500/80 via-pink-500/40 to-transparent rounded-full" />
        </div>

        {/* Drag List */}
        <DragDropContext
          onDragEnd={(result) => {
            if (!result.destination) return;
            const items = Array.from(bookmarks);
            const [reordered] = items.splice(result.source.index, 1);
            items.splice(result.destination.index, 0, reordered);
            setBookmarks(items);
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
                  let domain = "";
                  try {
                    domain = new URL(b.url).hostname;
                  } catch {}

                  return (
                    <Draggable key={b.id} draggableId={b.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => window.open(b.url, "_blank")}
                          className="flex items-center justify-between bg-[#16161d] border border-pink-500/20 rounded-2xl px-6 py-6 hover:border-pink-500 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-full border-2 border-pink-500/60 flex items-center justify-center bg-[#1a1a22]">
                              <img
                                src={
                                  domain
                                    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
                                    : "https://cdn-icons-png.flaticon.com/512/5920/5920153.png"
                                }
                                alt="favicon"
                                className="w-7 h-7 object-contain"
                                onLoad={(e) => {
                                  const img = e.currentTarget;
                                  // If Google returns tiny default globe (16x16), replace it
                                  if (img.naturalWidth <= 16) {
                                    img.src =
                                      "https://cdn-icons-png.flaticon.com/512/5920/5920153.png";
                                  }
                                }}
                                onError={(e) => {
                                  e.currentTarget.src =
                                    "https://cdn-icons-png.flaticon.com/512/5920/5920153.png";
                                }}
                              />
                            </div>

                            <div>
                              <p className="text-lg font-semibold">{b.title}</p>
                              <p className="text-gray-400 text-sm">{domain}</p>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(b.id);
                              setDeleteTitle(b.title);
                            }}
                            className="text-red-500 hover:text-red-400 transition hover:scale-110"
                          >
                            🗑
                          </button>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {filteredBookmarks.length === 0 && (
      <div className="mt-6">
  <div className="bg-white/5 backdrop-blur-md border border-pink-500/30 rounded-3xl p-12 text-center shadow-xl">

    <div className="mx-auto mb-6 w-14 h-14 rounded-full border border-pink-500/40 flex items-center justify-center">
      <div className="w-6 h-6 bg-pink-500 rounded-sm rotate-45" />
    </div>

    <h3 className="text-2xl font-semibold mb-3">
      No bookmarks yet
    </h3>

    <p className="text-gray-400 text-sm max-w-md mx-auto">
      Your saved links will appear here.  
      Add your first bookmark above to get started.
    </p>

  </div>
</div>

        )}

        {deleteId && (
          <Modal
            title="Delete Bookmark"
            message={`Are you sure you want to permanently delete "${deleteTitle}"?`}
            confirmText="Delete"
            onCancel={() => setDeleteId(null)}
            onConfirm={() => deleteBookmark(deleteId)}
          />
        )}

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
  );
}

/* ---------------- MODAL ---------------- */

type ModalProps = {
  title: string;
  message: string;
  confirmText: string;
  onCancel: () => void;
  onConfirm: () => void;
};

function Modal({
  title,
  message,
  confirmText,
  onCancel,
  onConfirm,
}: ModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
      <div className="bg-[#16161d] border border-[#2a2a35] rounded-2xl p-8 w-105 shadow-xl">
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
  );
}
