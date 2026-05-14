// ─── LOCAL STORAGE HELPER ─────────
const ls = {
  g: (k) => JSON.parse(localStorage.getItem(k)),
  s: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  r: (k) => localStorage.removeItem(k)
};

// ─── PASSWORD HASH (basic, not secure for production) ─────────
function hashPw(pw) {
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    h = ((h << 5) - h) + pw.charCodeAt(i);
    h |= 0;
  }
  return h.toString(36);
}

// ─── LOCAL AUTH STORAGE HELPERS ─────────
function lsUsers() {
  return ls.g('users') || [];
}

function lsSaveUser(u) {
  const users = lsUsers().filter(x => x.email !== u.email);
  users.push(u);
  ls.s('users', users);
}

function lsFindUser(email) {
  return lsUsers().find(u => u.email === email.toLowerCase());
}

function lsSession(u) {
  ls.s('session', {
    uid: u.uid,
    email: u.email,
    name: u.name,
    course: u.course,
    photo_url: u.photo_url || ''
  });
}

function lsGetSession() {
  return ls.g('session');
}

// ─── AUTH FUNCTIONS ─────────

// SIGN UP
function signup(email, password, name, course) {
  email = email.toLowerCase();

  if (lsFindUser(email)) {
    throw new Error("User already exists");
  }

  const user = {
    uid: crypto.randomUUID(),
    email,
    name,
    course,
    passwordHash: hashPw(password),
    photo_url: ""
  };

  lsSaveUser(user);
  lsSession(user);

  return user;
}

// LOGIN
function login(email, password) {
  email = email.toLowerCase();
  const user = lsFindUser(email);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.passwordHash !== hashPw(password)) {
    throw new Error("Invalid password");
  }

  lsSession(user);
  return user;
}

// LOGOUT
function logout() {
  ls.r("session");
}

// GET CURRENT USER
function getCurrentUser() {
  return lsGetSession();
}
