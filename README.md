# Smart Bookmark App

smart-bookmark-app-kohl-iota.vercel.app
---------------------------------------------------------------------
A real-time bookmark manager built with Next.js (App Router), Supabase,
and Tailwind CSS.

This project demonstrates secure authentication, strict per-user data
isolation, stable real-time synchronization, and thoughtful UX
implementation.

------------------------------------------------------------------------

## Overview

The application allows users to:

-   Sign in using Google OAuth
-   Add bookmarks (title + URL)
-   Delete their own bookmarks
-   View only their own data
-   See updates instantly across multiple browser tabs
-   Access a deployed production build

The system prioritizes database integrity, predictable state behavior,
and clean UI interactions.

------------------------------------------------------------------------

## Requirements Implemented

### Authentication

-   Google OAuth (no email/password flow)
-   Protected dashboard route
-   Redirect for unauthenticated users

------------------------------------------------------------------------

### Private Bookmarks Per User

Implemented using Supabase Row-Level Security (RLS).

Policies ensure:

-   Users can read only their own bookmarks
-   Users can insert only their own bookmarks
-   Users can delete only their own bookmarks

Isolation is enforced at the database level using:

    auth.uid() = user_id

------------------------------------------------------------------------

### Real-Time Cross-Tab Synchronization

Bookmarks update instantly across multiple open browser tabs using
Supabase `postgres_changes`.

To ensure stability and consistency:

-   Realtime events are filtered per user
-   State updates are centralized through database refetching
-   Optimistic mutations were removed to prevent race conditions
-   `REPLICA IDENTITY FULL` enabled for reliable delete events

Realtime subscription example:

``` ts
filter: `user_id=eq.${user.id}`
```

Replica identity configuration:

``` sql
ALTER TABLE bookmarks REPLICA IDENTITY FULL;
```

------------------------------------------------------------------------

## Additional Enhancements

### URL Validation & Normalization

-   Automatically prepends `https://` if missing
-   Validates protocol (http/https only)
-   Ensures hostname format correctness
-   Prevents invalid submissions
-   Blocks duplicate URLs (case-insensitive comparison)

------------------------------------------------------------------------

### Duplicate Prevention

Before insertion, URLs are checked against existing bookmarks to prevent
duplicates for the same user.

------------------------------------------------------------------------

### Search Filtering

Client-side search filters bookmarks by:

-   Title
-   URL

Filtering updates instantly as the user types.

------------------------------------------------------------------------

### Drag-and-Drop Reordering (UI Level)

Implemented using `@hello-pangea/dnd`.

Users can visually reorder bookmarks for improved organization.

------------------------------------------------------------------------

### Toast Notifications

Custom feedback system with:

-   Success and error variants
-   Auto-dismiss after 3 seconds
-   Clear user messaging for all actions

------------------------------------------------------------------------

### Confirmation Modals

-   Delete confirmation modal
-   Logout confirmation modal

Prevents accidental destructive actions.

------------------------------------------------------------------------

### Favicon Auto-Fetch

Website icons are dynamically fetched using:

    https://www.google.com/s2/favicons

Includes:

-   Fallback icon handling
-   Low-resolution replacement
-   Graceful error handling

------------------------------------------------------------------------

### Loading Experience

-   Dedicated loading screen
-   Animated spinner
-   Prevents layout flash
-   Smooth transition after authentication check

------------------------------------------------------------------------

## Problems Encountered & Solutions

### 1. Realtime Cross-Tab Inconsistency

**Problem:**  
When adding or deleting bookmarks in one tab, changes were not consistently reflected across other open tabs. In some cases:
- Items appeared in one tab but not another
- Deletes were not syncing properly
- State became inconsistent

**Root Cause:**  
The initial implementation combined local state mutations with realtime updates, causing race conditions and state conflicts.

**Solution:**  
Refactored the architecture to treat the database as the single source of truth:
- Removed optimistic local state mutations
- Refetched bookmarks when realtime events were received
- Filtered realtime events by `user_id`
- Enabled `REPLICA IDENTITY FULL` to ensure DELETE events propagated correctly

This stabilized cross-tab synchronization.

---

### 2. DELETE Events Not Propagating

**Problem:**  
Realtime DELETE events were not consistently received across tabs.

**Root Cause:**  
PostgreSQL does not broadcast full row data for DELETE operations unless replica identity is configured properly.

**Solution:**  
Configured:

```sql
ALTER TABLE bookmarks REPLICA IDENTITY FULL;
```
------------------------------------------------------------------------


## Database Schema

### Table: `bookmarks`

| Column     | Type      | Description                          |
|------------|-----------|--------------------------------------|
| id         | uuid      | Primary key (auto-generated)         |
| user_id    | uuid      | References authenticated user        |
| url        | text      | Bookmark URL                         |
| title      | text      | Bookmark title                       |
| created_at | timestamp | Creation timestamp (default now())   |
----

### SQL Definition

``` sql
create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  title text not null,
  created_at timestamp with time zone default now()
);
```

------------------------------------------------------------------------

### Row-Level Security (RLS)

``` sql
alter table bookmarks enable row level security;
```

#### Read Policy

``` sql
create policy "Users can read their own bookmarks"
on bookmarks
for select
using (auth.uid() = user_id);
```

#### Insert Policy

``` sql
create policy "Users can insert their own bookmarks"
on bookmarks
for insert
with check (auth.uid() = user_id);
```

#### Delete Policy

``` sql
create policy "Users can delete their own bookmarks"
on bookmarks
for delete
using (auth.uid() = user_id);
```

------------------------------------------------------------------------

### Realtime Configuration

``` sql
alter table bookmarks replica identity full;
```

------------------------------------------------------------------------

## Tech Stack

Frontend: - Next.js (App Router) - React Hooks - Tailwind CSS -
@hello-pangea/dnd

Backend: - Supabase (Auth, PostgreSQL, Realtime)

Deployment: - Vercel

------------------------------------------------------------------------

## Engineering Decisions

### Single Source of Truth

The database is treated as the authoritative state.

Instead of manually mutating local state after insert/delete, the UI
refetches bookmarks when realtime events are received. This prevents:

-   Race conditions
-   Cross-tab inconsistencies
-   Duplicate entries
-   Stale UI states

------------------------------------------------------------------------

## Local Setup

Clone the repository:

``` bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
npm install
```

Create a `.env.local` file:

    NEXT_PUBLIC_SUPABASE_URL=your_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

Run locally:

``` bash
npm run dev
```

------------------------------------------------------------------------

## Deployment

The application is deployed on Vercel.

Environment variables are configured in the Vercel dashboard to match
local development.
