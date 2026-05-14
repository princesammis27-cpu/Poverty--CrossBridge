/**
 * POVERTY-CROSSBRIDGE PLATFORM
 * Supabase Config (CLEAN VERSION)
 */

// ── CREDENTIALS ─────────────────────────────
const SUPABASE_URL = 'https://toozapvqmjrvixpwkffy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvb3phcHZxbWpydml4cHdrZmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDMyODQsImV4cCI6MjA5NDI';

// ── CLIENT INIT ─────────────────────────────
const { createClient } = window.supabase;

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ── AUTH WRAPPER ────────────────────────────
export const Auth = {
  async signUp(email, password, fullName) {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
  },

  async signIn(email, password) {
    return await supabase.auth.signInWithPassword({
      email,
      password
    });
  },

  async signInWithGoogle() {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/dashboard.html`
      }
    });
  },

  async signOut() {
    return await supabase.auth.signOut();
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  onChange(cb) {
    return supabase.auth.onAuthStateChange(cb);
  }
};

// ── DATABASE ────────────────────────────────
export const DB = {
  getProfile(uid) {
    return supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
  },

  upsertProfile(uid, payload) {
    return supabase
      .from('profiles')
      .upsert({ id: uid, ...payload })
      .select()
      .single();
  },

  getAllProfiles() {
    return supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
  },

  deleteProfile(uid) {
    return supabase
      .from('profiles')
      .delete()
      .eq('id', uid);
  },

  getMessages(limit = 120) {
    return supabase
      .from('messages')
      .select('*, profiles:user_id(full_name, avatar_url, email, role)')
      .order('created_at', { ascending: true })
      .limit(limit);
  },

  sendMessage({ userId, content, imageUrl, imagePath }) {
    const type = imageUrl ? (content ? 'mixed' : 'image') : 'text';

    return supabase
      .from('messages')
      .insert([{
        user_id: userId,
        content,
        image_url: imageUrl,
        image_path: imagePath,
        message_type: type
      }])
      .select('*, profiles:user_id(full_name, avatar_url, email, role)')
      .single();
  },

  deleteMessage(id) {
    return supabase
      .from('messages')
      .delete()
      .eq('id', id);
  },

  getAllMessages() {
    return supabase
      .from('messages')
      .select('*, profiles:user_id(full_name, avatar_url, email, role)')
      .order('created_at', { ascending: false });
  },

  async getStats() {
    const [users, messages] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true })
    ]);

    return {
      users: users.count || 0,
      messages: messages.count || 0
    };
  }
};

// ── STORAGE ────────────────────────────────
export const Storage = {
  async uploadImage(file, userId) {
    const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const ext = file.name.split('.').pop().toLowerCase();

    if (!allowed.includes(ext)) {
      throw new Error('Only JPG, PNG, GIF or WEBP allowed.');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image must be under 5MB.');
    }

    const path = `${userId}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('chat-images')
      .upload(path, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from('chat-images')
      .getPublicUrl(path);

    return {
      path,
      url: data.publicUrl
    };
  },

  deleteImage(path) {
    if (!path) return;
    return supabase.storage.from('chat-images').remove([path]);
  }
};

// ── REALTIME ───────────────────────────────
export const Realtime = {
  subscribeMessages(onInsert, onDelete) {
    return supabase
      .channel('chat-room')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, onInsert)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages'
      }, onDelete)
      .subscribe();
  }
};

// ── ROUTE GUARDS ───────────────────────────
export async function requireAuth(redirect = 'index.html') {
  const user = await Auth.getUser();

  if (!user) {
    window.location.href = redirect;
    return null;
  }

  return user;
}

export async function requireAdmin(redirect = 'dashboard.html') {
  const user = await requireAuth();
  if (!user) return null;

  const { data: profile } = await DB.getProfile(user.id);

  if (profile?.role !== 'admin') {
    window.location.href = redirect;
    return null;
  }

  return { user, profile };
}

// ── UTILITIES ──────────────────────────────
export function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);

  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;

  return new Date(date).toLocaleDateString();
}

export function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const COLORS = [
  '#00e676', '#00b0ff', '#7c3aed',
  '#f59e0b', '#ef4444', '#06b6d4'
];

export function avatarColor(name) {
  return COLORS[(name || '?').charCodeAt(0) % COLORS.length];
}

export function toast(msg, type = 'success') {
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  const t = document.createElement('div');
  t.className = `pcb-toast pcb-toast--${type}`;

  t.innerHTML = `
    <span class="pcb-toast__icon">${icons[type] || 'ℹ'}</span>
    <span>${msg}</span>
  `;

  document.body.appendChild(t);

  requestAnimationFrame(() =>
    t.classList.add('pcb-toast--show')
  );

  setTimeout(() => {
    t.classList.remove('pcb-toast--show');
    setTimeout(() => t.remove(), 400);
  }, 3600);
      }
