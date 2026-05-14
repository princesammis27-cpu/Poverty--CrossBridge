/**
 * ╔══════════════════════════════════════════╗
 * ║   POVERTY-CROSSBRIDGE PLATFORM        ║
 * ║   Supabase Config & Shared Utilities     ║
 * ╚══════════════════════════════════════════╝
 *
 * SETUP STEPS:
 * 1. Create a project at https://supabase.com
 * 2. Replace SUPABASE_URL and SUPABASE_ANON_KEY below
 * 3. Run the SQL schema from README.md in your SQL Editor
 * 4. Enable Google OAuth: Auth → Providers → Google
 * 5. Set Site URL and Redirect URLs in Auth → URL Configuration
 */

// ── CREDENTIALS ─────────────────────────────────────────────
const SUPABASE_URL = 'https://toozapvqmjrvixpwkffy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvb3phcHZxbWpydml4cHdrZmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDMyODQsImV4cCI6MjA5NDI3OTI4NH0.gLyJ7aj5q4PN9DzGfL-Ku0fj6-Ed_TeNEGfY_x5YUf0';
// ────────────────────────────────────────────────────────────

const { createClient } = window.supabase;
const sb = createClient('https://toozapvqmjrvixpwkffy.supabase.co', eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvb3phcHZxbWpydml4cHdrZmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDMyODQsImV4cCI6MjA5NDI3OTI4NH0.gLyJ7aj5q4PN9DzGfL-Ku0fj6-Ed_TeNEGfY_x5YUf0eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvb3phcHZxbWpydml4cHdrZmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDMyODQsImV4cCI6MjA5NDI3OTI4NH0.gLyJ7aj5q4PN9DzGfL-Ku0fj6-Ed_TeNEGfY_x5YUf0);
const Auth = sb.auth;

/* ── AUTH ─────────────────────────────────────────────────── */
supabase Auth = {
  async signUp(email, password, fullName) {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
  }
};
  async signIn(email, password) {
    return await supabase.auth.signInWithPassword({ email, password });
  },
  async signInWithGoogle() {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/dashboard.html` }
    });
  },
  async signOut() { return await sb.auth.signOut(); },
  async getUser() {
    const { data: { user } } = await sb.auth.getUser();
    return user;
  },
  async getSession() {
    const { data: { session } } = await sb.auth.getSession();
    return session;
  },
  onChange(cb) { return supabase.auth.onAuthStateChange(cb); }
};

/* ── DATABASE ─────────────────────────────────────────────── */
const DB = {
  async getProfile(uid) {
    return await supabase.from('profiles').select('*').eq('id', uid).single();
  },
  async upsertProfile(uid, payload) {
    return await supabase.from('profiles').upsert({ id: uid, ...payload }).select().single();
  },
  async getAllProfiles() {
    return await sb.from('profiles').select('*').order('created_at', { ascending: false });
  },
  async deleteProfile(uid) {
    return await supabase.from('profiles').delete().eq('id', uid);
  },
  async getMessages(limit = 120) {
    return await supabase.from('messages')
      .select('*, profiles:user_id(full_name, avatar_url, email, role)')
      .order('created_at', { ascending: true })
      .limit(limit);
  },
  async sendMessage({ userId, content = null, imageUrl = null, imagePath = null }) {
    const type = imageUrl ? (content ? 'mixed' : 'image') : 'text';
    return await sb.from('messages')
      .insert([{ user_id: userId, content, image_url: imageUrl, image_path: imagePath, message_type: type }])
      .select('*, profiles:user_id(full_name, avatar_url, email, role)')
      .single();
  },
  async deleteMessage(id) {
    return await supabase.from('messages').delete().eq('id', id);
  },
  async getAllMessages() {
    return await supabase.from('messages')
      .select('*, profiles:user_id(full_name, avatar_url, email, role)')
      .order('created_at', { ascending: false });
  },
  async getStats() {
    const [u, m] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true })
    ]);
    return { users: u.count || 0, messages: m.count || 0 };
  }
};

/* ── STORAGE ──────────────────────────────────────────────── */
const Storage = {
  async uploadImage(file, userId) {
    const ALLOWED = ['jpg','jpeg','png','gif','webp'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED.includes(ext)) throw new Error('Only JPG, PNG, GIF or WEBP images allowed.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5 MB.');
    const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('chat-images').upload(path, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(path);
    return { path, url: publicUrl };
  },
  async deleteImage(path) {
    if (!path) return;
    return await supabase.storage.from('chat-images').remove([path]);
  }
};

/* ── REALTIME ─────────────────────────────────────────────── */
const Realtime = {
  subscribeMessages(onInsert, onDelete) {
    return supabase.channel('chat-room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, onInsert)
      .on('postgres_changes', { event: 'DELETE',  schema: 'public', table: 'messages' }, onDelete)
      .subscribe();
  }
};

/* ── ROUTE GUARDS ─────────────────────────────────────────── */
async function requireAuth(redirect = 'index.html') {
  const user = await Auth.getUser();
  if (!user) { window.location.href = redirect; return null; }
  return user;
}
async function requireAdmin(redirect = 'dashboard.html') {
  const user = await requireAuth();
  if (!user) return null;
  const { data: p } = await DB.getProfile(user.id);
  if (p?.role !== 'admin') { window.location.href = redirect; return null; }
  return { user, profile: p };
}

/* ── UTILITIES ────────────────────────────────────────────── */
function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)   return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
}
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
}
const AV_COLORS = ['#00e676','#00b0ff','#7c3aed','#f59e0b','#ef4444','#06b6d4','#a78bfa'];
function avatarColor(name) { return AV_COLORS[(name||'?').charCodeAt(0) % AV_COLORS.length]; }

function toast(msg, type = 'success') {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const t = document.createElement('div');
  t.className = `pcb-toast pcb-toast--${type}`;
  t.innerHTML = `<span class="pcb-toast__icon">${icons[type]||icons.info}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('pcb-toast--show'));
  setTimeout(() => { t.classList.remove('pcb-toast--show'); setTimeout(() => t.remove(), 400); }, 3600);
}

/* ── SHARED CSS TOKENS (injected into <head> by each page) ── */
const SHARED_CSS = `
  :root {
    --bg0:    #030810;
    --bg1:    #060f1e;
    --bg2:    #0a1828;
    --card:   rgba(8,18,36,0.92);
    --border: rgba(0,230,118,0.18);
    --green:  #00e676;
    --green2: #00c853;
    --gold:   #ffd600;
    --blue:   #00b0ff;
    --purple: #a78bfa;
    --red:    #ff5252;
    --text1:  #e8f4ff;
    --text2:  #7a9bb5;
    --text3:  #4a6a85;
    --r:      12px;
    --shadow: 0 8px 32px rgba(0,0,0,0.6);
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'Rajdhani', sans-serif;
    background: var(--bg0);
    color: var(--text1);
    min-height: 100vh;
    font-size: 16px;
    line-height: 1.5;
  }
  h1,h2,h3,h4,h5 { font-family: 'Orbitron', sans-serif; }
  a { color: var(--green); text-decoration: none; }
  img { max-width: 100%; }
  button { cursor: pointer; font-family: 'Rajdhani', sans-serif; }
  input, textarea, select { font-family: 'Rajdhani', sans-serif; }

  /* ── TOAST ── */
  .pcb-toast {
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    display: flex; align-items: center; gap: 10px;
    padding: 14px 20px; border-radius: 10px;
    font-size: 15px; font-weight: 600;
    background: var(--bg2); border: 1px solid var(--border);
    box-shadow: var(--shadow);
    transform: translateX(120%); transition: transform .35s cubic-bezier(.4,0,.2,1);
    max-width: 340px;
  }
  .pcb-toast--show { transform: translateX(0); }
  .pcb-toast--success { border-color: var(--green); }
  .pcb-toast--success .pcb-toast__icon { color: var(--green); }
  .pcb-toast--error   { border-color: var(--red); }
  .pcb-toast--error   .pcb-toast__icon { color: var(--red); }
  .pcb-toast--info    { border-color: var(--blue); }
  .pcb-toast--info    .pcb-toast__icon { color: var(--blue); }
  .pcb-toast__icon { font-size: 18px; flex-shrink: 0; }

  /* ── SCROLLBAR ── */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg1); }
  ::-webkit-scrollbar-thumb { background: #1a3a55; border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--green2); }

  /* ── BUTTON BASE ── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; padding: 12px 24px; border-radius: var(--r);
    font-size: 15px; font-weight: 700; border: none;
    transition: all .2s ease; letter-spacing: .5px;
  }
  .btn-primary {
    background: linear-gradient(135deg, var(--green2), var(--green));
    color: #010a06;
  }
  .btn-primary:hover { filter: brightness(1.12); transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,230,118,.35); }
  .btn-outline {
    background: transparent; border: 1.5px solid var(--border); color: var(--text1);
  }
  .btn-outline:hover { border-color: var(--green); color: var(--green); }
  .btn-danger { background: rgba(255,82,82,.15); border: 1.5px solid var(--red); color: var(--red); }
  .btn-danger:hover { background: var(--red); color: #fff; }
  .btn:disabled { opacity: .5; cursor: not-allowed; transform: none !important; }

  /* ── CARD ── */
  .card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--r); backdrop-filter: blur(16px);
    box-shadow: var(--shadow);
  }

  /* ── BADGE ── */
  .badge {
    display: inline-block; padding: 2px 10px; border-radius: 99px;
    font-size: 12px; font-weight: 700; letter-spacing: .5px;
  }
  .badge-green  { background: rgba(0,230,118,.15); color: var(--green); border: 1px solid rgba(0,230,118,.3); }
  .badge-gold   { background: rgba(255,214,0,.12);  color: var(--gold);  border: 1px solid rgba(255,214,0,.3); }
  .badge-purple { background: rgba(167,139,250,.12);color: var(--purple);border: 1px solid rgba(167,139,250,.3); }
  .badge-red    { background: rgba(255,82,82,.12);  color: var(--red);   border: 1px solid rgba(255,82,82,.3); }
  .badge-blue   { background: rgba(0,176,255,.12);  color: var(--blue);  border: 1px solid rgba(0,176,255,.3); }
`;
