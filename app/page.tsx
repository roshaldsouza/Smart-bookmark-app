'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bookmark, User } from '@/lib/types'
import {
  Bookmark as BookmarkIcon,
  Plus,
  Trash2,
  ExternalLink,
  LogOut,
  Loader2
} from 'lucide-react'


function AnimatedBackground({ variant = 'login' }: { variant?: 'login' | 'main' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let W = 0, H = 0

    // Floating orbs
    const orbs = Array.from({ length: variant === 'login' ? 6 : 9 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 180 + Math.random() * 220,
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.00015,
      color: [
        'rgba(200,255,62,',
        'rgba(56,217,245,',
        'rgba(139,92,246,',
        'rgba(255,95,126,',
      ][i % 4],
      opacity: 0.045 + Math.random() * 0.055,
    }))

    // Particles (small dots)
    const particles = Array.from({ length: variant === 'login' ? 40 : 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.5 + Math.random() * 1.2,
      vy: -0.00008 - Math.random() * 0.00012,
      opacity: 0.15 + Math.random() * 0.25,
    }))

    const resize = () => {
      W = canvas.width  = canvas.offsetWidth
      H = canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Orbs
      orbs.forEach(o => {
        o.x += o.vx; o.y += o.vy
        if (o.x < -0.1) o.x = 1.1
        if (o.x > 1.1)  o.x = -0.1
        if (o.y < -0.1) o.y = 1.1
        if (o.y > 1.1)  o.y = -0.1

        const grd = ctx.createRadialGradient(o.x*W, o.y*H, 0, o.x*W, o.y*H, o.r)
        grd.addColorStop(0, o.color + o.opacity + ')')
        grd.addColorStop(1, o.color + '0)')
        ctx.fillStyle = grd
        ctx.beginPath()
        ctx.arc(o.x*W, o.y*H, o.r, 0, Math.PI*2)
        ctx.fill()
      })

      // Particles
      particles.forEach(p => {
        p.y += p.vy
        if (p.y < -0.02) p.y = 1.02
        ctx.beginPath()
        ctx.arc(p.x*W, p.y*H, p.r, 0, Math.PI*2)
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`
        ctx.fill()
      })

      // Fine grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.025)'
      ctx.lineWidth = 1
      const step = 48
      for (let x = 0; x < W; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }
      for (let y = 0; y < H; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [variant])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      }}
    />
  )
}


export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newBookmark, setNewBookmark] = useState({ url: '', title: '' })
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const supabase = createClient()

 
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    checkAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

 
  const fetchBookmarks = async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('bookmarks').select('*').order('created_at', { ascending: false })
    if (!error && data) setBookmarks(data)
  }

 
  useEffect(() => {
    if (!user) return
    fetchBookmarks()
    const channel = supabase
      .channel('bookmarks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookmarks', filter: `user_id=eq.${user.id}` }, () => fetchBookmarks())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])


  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback`, skipBrowserRedirect: false },
    })
    if (error) { console.error('Error signing in:', error.message); alert('Sign in error: ' + error.message) }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setBookmarks([])
  }


  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBookmark.url || !newBookmark.title || !user) return
    setSubmitting(true)
    const { error } = await supabase.from('bookmarks').insert([{ url: newBookmark.url, title: newBookmark.title, user_id: user.id }])
    if (!error) {
      setNewBookmark({ url: '', title: '' })
      setShowAddForm(false)
      await fetchBookmarks()
    } else {
      console.error('Error adding bookmark:', error)
    }
    setSubmitting(false)
  }

  
  const handleDeleteBookmark = async (id: string) => {
    setDeletingId(id)
    const { error } = await supabase.from('bookmarks').delete().eq('id', id)
    if (error) { console.error('Error deleting bookmark:', error) }
    else { await fetchBookmarks() }
    setDeletingId(null)
  }

  
  const base: React.CSSProperties = {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: '#0d0d14',
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
  }

  
  if (loading) {
    return (
      <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
        <AnimatedBackground variant="login" />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            border: '3px solid rgba(200,255,62,.2)',
            borderTopColor: '#c8ff3e',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: '#c8ff3e', fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7 }}>
            Loading
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

 
  if (!user) {
    return (
      <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <AnimatedBackground variant="login" />

        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: 420, width: '100%',
          animation: 'fadeUp .7s cubic-bezier(.4,0,.2,1) both',
        }}>
          <div style={{
            background: 'linear-gradient(145deg, rgba(28,28,46,.95) 0%, rgba(46,46,70,.9) 100%)',
            backdropFilter: 'blur(24px)',
            borderRadius: 28, padding: '52px 44px', textAlign: 'center',
            border: '1px solid rgba(255,255,255,.09)',
            boxShadow: '0 40px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(200,255,62,.06), inset 0 1px 0 rgba(255,255,255,.08)',
          }}>
            {/* Icon */}
            <div style={{
              width: 80, height: 80, borderRadius: 22, margin: '0 auto 28px',
              background: '#c8ff3e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 12px rgba(200,255,62,.1), 0 0 48px rgba(200,255,62,.35)',
              animation: 'glowPulse 3s ease-in-out infinite',
            }}>
              <BookmarkIcon style={{ width: 36, height: 36, color: '#0d0d14' }} />
            </div>

            <h1 style={{
              fontSize: 30, fontWeight: 800, color: '#fff',
              lineHeight: 1.15, marginBottom: 12, letterSpacing: '-0.02em',
              fontFamily: "'Syne','DM Sans',sans-serif",
            }}>
              Smart Bookmark<br />
              <span style={{ color: '#c8ff3e' }}>Manager</span>
            </h1>

            <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 14, lineHeight: 1.7, marginBottom: 36, fontWeight: 300 }}>
              Save and organize your favorite links with real-time synchronization across all your devices.
            </p>

            <button
              onClick={handleSignIn}
              style={{
                width: '100%', padding: '15px 24px', borderRadius: 14, border: 'none',
                background: '#c8ff3e', color: '#0d0d14',
                fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.01em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 8px 24px rgba(200,255,62,.35)',
                transition: 'all .22s cubic-bezier(.4,0,.2,1)',
                fontFamily: "'Syne','DM Sans',sans-serif",
              }}
              onMouseEnter={e => {
                const b = e.currentTarget as HTMLButtonElement
                b.style.transform = 'translateY(-2px)'
                b.style.boxShadow = '0 16px 36px rgba(200,255,62,.5)'
              }}
              onMouseLeave={e => {
                const b = e.currentTarget as HTMLButtonElement
                b.style.transform = 'translateY(0)'
                b.style.boxShadow = '0 8px 24px rgba(200,255,62,.35)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#0d0d14"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#0d0d14"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#0d0d14"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#0d0d14"/>
              </svg>
              Sign in with Google
            </button>

            <p style={{ marginTop: 20, color: 'rgba(255,255,255,.18)', fontSize: 11, letterSpacing: '0.1em' }}>
              REAL-TIME SYNC · SECURE · PRIVATE
            </p>
          </div>
        </div>

        <style>{`
          @keyframes fadeUp { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:translateY(0) } }
          @keyframes glowPulse { 0%,100% { box-shadow: 0 0 0 12px rgba(200,255,62,.1),0 0 48px rgba(200,255,62,.35) } 50% { box-shadow: 0 0 0 18px rgba(200,255,62,.15),0 0 72px rgba(200,255,62,.55) } }
          @keyframes spin { to { transform: rotate(360deg) } }
        `}</style>
      </div>
    )
  }

  
  const avatarLetter = user.email?.[0]?.toUpperCase() ?? '?'

  return (
    <div style={{ ...base }}>
      <AnimatedBackground variant="main" />

      
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,13,20,.8)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,.07)',
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11,
              background: '#c8ff3e', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(200,255,62,.4)',
            }}>
              <BookmarkIcon style={{ width: 20, height: 20, color: '#0d0d14' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', fontFamily: "'Syne','DM Sans',sans-serif" }}>
                My Bookmarks
              </h1>
              <p style={{ fontSize: 12, color: 'rgba(200,255,62,.75)', fontWeight: 500, letterSpacing: '0.03em' }}>
                {bookmarks.length} saved {bookmarks.length === 1 ? 'link' : 'links'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #38d9f5, #c8ff3e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, color: '#0d0d14', fontFamily: "'Syne',sans-serif",
            }}>
              {avatarLetter}
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{
                width: 34, height: 34, borderRadius: 8,
                border: '1px solid rgba(255,255,255,.08)',
                background: 'rgba(255,255,255,.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all .2s',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget as HTMLButtonElement
                b.style.background = 'rgba(255,95,126,.15)'
                b.style.borderColor = 'rgba(255,95,126,.4)'
              }}
              onMouseLeave={e => {
                const b = e.currentTarget as HTMLButtonElement
                b.style.background = 'rgba(255,255,255,.04)'
                b.style.borderColor = 'rgba(255,255,255,.08)'
              }}
            >
              <LogOut style={{ width: 15, height: 15, color: 'rgba(255,255,255,.5)' }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px 80px', position: 'relative', zIndex: 1 }}>

        {/* ADD BUTTON */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              width: '100%', padding: '18px 24px', borderRadius: 16, marginBottom: 28,
              border: '1.5px dashed rgba(200,255,62,.25)', background: 'rgba(200,255,62,.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              cursor: 'pointer', transition: 'all .25s',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement
              b.style.background = 'rgba(200,255,62,.07)'
              b.style.borderColor = 'rgba(200,255,62,.5)'
              b.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement
              b.style.background = 'rgba(200,255,62,.03)'
              b.style.borderColor = 'rgba(200,255,62,.25)'
              b.style.transform = 'translateY(0)'
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: '#c8ff3e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus style={{ width: 15, height: 15, color: '#0d0d14' }} />
            </div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: '#c8ff3e', letterSpacing: '0.02em' }}>
              Add New Bookmark
            </span>
          </button>
        ) : (
          <form
            onSubmit={handleAddBookmark}
            style={{
              background: 'linear-gradient(145deg, rgba(28,28,46,.97), rgba(46,46,70,.95))',
              backdropFilter: 'blur(20px)',
              borderRadius: 20, padding: 28, marginBottom: 28,
              border: '1px solid rgba(200,255,62,.2)',
              boxShadow: '0 24px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(200,255,62,.06)',
              animation: 'formReveal .3s cubic-bezier(.4,0,.2,1) both',
            }}
          >
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 18, letterSpacing: '-0.01em' }}>
              New Bookmark
            </h2>

            {(['url', 'title'] as const).map((field) => (
              <input
                key={field}
                type={field === 'url' ? 'url' : 'text'}
                required
                value={newBookmark[field]}
                onChange={e => setNewBookmark({ ...newBookmark, [field]: e.target.value })}
                placeholder={field === 'url' ? 'https://example.com' : 'Bookmark title'}
                style={{
                  display: 'block', width: '100%', padding: '13px 16px',
                  marginBottom: 12, borderRadius: 10,
                  border: '1px solid rgba(255,255,255,.1)',
                  background: 'rgba(0,0,0,.3)', color: '#fff',
                  fontSize: 14, outline: 'none', transition: 'border-color .2s',
                  boxSizing: 'border-box',
                  fontFamily: "'DM Sans',sans-serif",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(200,255,62,.55)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)')}
              />
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  flex: 1, padding: '12px 20px', borderRadius: 10, border: 'none',
                  background: submitting ? 'rgba(200,255,62,.45)' : '#c8ff3e',
                  color: '#0d0d14', fontFamily: "'Syne',sans-serif", fontWeight: 700,
                  fontSize: 14, cursor: submitting ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all .2s',
                }}
              >
                {submitting && <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />}
                {submitting ? 'Saving…' : 'Add Bookmark'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setNewBookmark({ url: '', title: '' }) }}
                style={{
                  padding: '12px 18px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,.1)',
                  background: 'transparent', color: 'rgba(255,255,255,.5)',
                  fontSize: 14, cursor: 'pointer', transition: 'background .2s',
                  fontFamily: "'DM Sans',sans-serif",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.06)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        
        {bookmarks.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,.07)' }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.22)', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Saved Links
            </span>
            <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,.07)' }} />
          </div>
        )}

        
        {bookmarks.length === 0 && !showAddForm && (
          <div style={{ textAlign: 'center', padding: '72px 24px' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'rgba(200,255,62,.07)', border: '1px solid rgba(200,255,62,.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
            }}>
              <BookmarkIcon style={{ width: 30, height: 30, color: 'rgba(200,255,62,.45)' }} />
            </div>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,.35)', marginBottom: 8 }}>No bookmarks yet</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.18)' }}>Hit the button above to save your first link.</p>
          </div>
        )}

        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bookmarks.map((bookmark, idx) => {
            const isDeleting = deletingId === bookmark.id
            const isHovered = hoveredId === bookmark.id
            let hostname = ''
            try { hostname = new URL(bookmark.url).hostname } catch {}

            return (
              <div
                key={bookmark.id}
                onMouseEnter={() => setHoveredId(bookmark.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: isHovered
                    ? 'linear-gradient(135deg, rgba(32,32,54,.98), rgba(50,50,76,.98))'
                    : 'linear-gradient(135deg, rgba(28,28,46,.88), rgba(46,46,70,.75))',
                  backdropFilter: 'blur(12px)',
                  borderRadius: 16,
                  border: isHovered ? '1px solid rgba(200,255,62,.22)' : '1px solid rgba(255,255,255,.07)',
                  padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  transition: 'all .25s cubic-bezier(.4,0,.2,1)',
                  transform: isDeleting ? 'scale(.96) translateX(8px)' : isHovered ? 'translateY(-3px)' : 'none',
                  opacity: isDeleting ? 0.35 : 1,
                  boxShadow: isHovered ? '0 16px 48px rgba(0,0,0,.45), 0 0 0 1px rgba(200,255,62,.08)' : '0 2px 12px rgba(0,0,0,.25)',
                  animationDelay: `${idx * 0.06}s`,
                }}
              >
                {/* Favicon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                    alt="" width={20} height={20}
                    style={{ objectFit: 'contain' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700,
                    color: '#fff', marginBottom: 3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {bookmark.title}
                  </h3>
                  <a
                    href={bookmark.url} target="_blank" rel="noreferrer"
                    style={{
                      fontSize: 12, color: isHovered ? '#c8ff3e' : 'rgba(255,255,255,.32)',
                      textDecoration: 'none', display: 'block',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      transition: 'color .2s',
                    }}
                  >
                    {hostname}
                  </a>
                </div>

                {/* Action buttons — fade in on hover */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, opacity: isHovered ? 1 : 0, transition: 'opacity .2s' }}>
                  <a
                    href={bookmark.url} target="_blank" rel="noreferrer"
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,.09)',
                      background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all .2s', textDecoration: 'none',
                    }}
                    onMouseEnter={e => {
                      const a = e.currentTarget as HTMLAnchorElement
                      a.style.background = 'rgba(56,217,245,.15)'
                      a.style.borderColor = 'rgba(56,217,245,.35)'
                    }}
                    onMouseLeave={e => {
                      const a = e.currentTarget as HTMLAnchorElement
                      a.style.background = 'rgba(255,255,255,.04)'
                      a.style.borderColor = 'rgba(255,255,255,.09)'
                    }}
                  >
                    <ExternalLink style={{ width: 13, height: 13, color: '#38d9f5' }} />
                  </a>

                  <button
                    onClick={() => handleDeleteBookmark(bookmark.id)}
                    disabled={isDeleting}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,.09)',
                      background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: isDeleting ? 'wait' : 'pointer', transition: 'all .2s',
                    }}
                    onMouseEnter={e => {
                      const b = e.currentTarget as HTMLButtonElement
                      b.style.background = 'rgba(255,95,126,.15)'
                      b.style.borderColor = 'rgba(255,95,126,.38)'
                    }}
                    onMouseLeave={e => {
                      const b = e.currentTarget as HTMLButtonElement
                      b.style.background = 'rgba(255,255,255,.04)'
                      b.style.borderColor = 'rgba(255,255,255,.09)'
                    }}
                  >
                    {isDeleting
                      ? <Loader2 style={{ width: 13, height: 13, color: '#ff5f7e', animation: 'spin 1s linear infinite' }} />
                      : <Trash2 style={{ width: 13, height: 13, color: '#ff5f7e' }} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes fadeUp    { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:translateY(0) } }
        @keyframes glowPulse { 0%,100% { box-shadow: 0 0 0 12px rgba(200,255,62,.1),0 0 48px rgba(200,255,62,.35) } 50% { box-shadow: 0 0 0 18px rgba(200,255,62,.15),0 0 72px rgba(200,255,62,.55) } }
        @keyframes formReveal { from { opacity:0; transform:scaleY(.93) translateY(-10px) } to { opacity:1; transform:scaleY(1) translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}