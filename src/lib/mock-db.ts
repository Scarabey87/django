// Client-side mock database simulation
// In a real app, this would be an API communicating with PostgreSQL/MySQL

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // In real app, this should be hashed!
  role: "user" | "admin" | "vip";
  avatar: string;
}

export interface Video {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  isVip: boolean;
  videoUrl: string;
  views: number;
}

const USERS_STORAGE_KEY = "live_ai_users";
const SESSION_STORAGE_KEY = "live_ai_session";
const VIDEOS_STORAGE_KEY = "live_ai_videos";

// Seed initial data if empty (Users)
const seedUsers = () => {
  if (typeof window === "undefined") return [];
  const existing = localStorage.getItem(USERS_STORAGE_KEY);
  if (!existing) {
    const adminName = process.env.NEXT_PUBLIC_ADMIN_NAME || "Charlie Admin";
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@liveai.art";
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin";

    const initialUsers: User[] = [
      { id: "u1", name: "Alice Smith", email: "alice@example.com", password: "password123", role: "user", avatar: "https://i.pravatar.cc/150?u=a" },
      { id: "u2", name: "Bob Johnson", email: "bob@example.com", password: "password123", role: "vip", avatar: "https://i.pravatar.cc/150?u=b" },
      { id: "u3", name: adminName, email: adminEmail, password: adminPassword, role: "admin", avatar: "https://i.pravatar.cc/150?u=c" },
    ];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialUsers));
    return initialUsers;
  }
  return JSON.parse(existing);
};

// Seed initial data if empty (Videos)
const seedVideos = (): Video[] => {
  if (typeof window === "undefined") return [];
  const existing = localStorage.getItem(VIDEOS_STORAGE_KEY);
  if (!existing) {
    const initialVideos: Video[] = []; // Start empty as per request
    localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(initialVideos));
    return initialVideos;
  }
  return JSON.parse(existing);
};

export const db = {
  // --- USERS ---
  getUsers: (): User[] => {
    return seedUsers();
  },

  addUser: (user: User): boolean => {
    const users = db.getUsers();
    if (users.find(u => u.email === user.email)) return false; // Email exists
    users.push(user);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    return true;
  },

  updateUser: (id: string, updates: Partial<Pick<User, 'email' | 'password' | 'name'>>): void => {
    const users = db.getUsers();
    const updated = users.map(u => {
      if (u.id === id) {
        return { ...u, ...updates };
      }
      return u;
    });
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));

    // Update session if the current user is editing their own profile
    const session = db.getSession();
    if (session && session.id === id) {
      db.setSession({ ...session, ...updates });
    }
  },

  updateUserRole: (userId: string, newRole: User["role"]): void => {
    const users = db.getUsers();
    const updated = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
  },

  login: (email: string, password: string): User | null => {
    const users = db.getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    return user || null;
  },

  googleLogin: (): User => {
    // Simulating a Google Login response
    const users = db.getUsers();
    const googleEmail = "user@gmail.com";
    
    let user = users.find(u => u.email === googleEmail);
    
    if (!user) {
      // Register automatically if first time logging in with Google
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: "Google User",
        email: googleEmail,
        password: "", // No password for OAuth users
        role: "user",
        avatar: "https://i.pravatar.cc/150?u=google",
      };
      db.addUser(newUser);
      user = newUser;
    }
    
    return user;
  },

  setSession: (user: User) => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  },

  getSession: (): User | null => {
    if (typeof window === "undefined") return null;
    const session = localStorage.getItem(SESSION_STORAGE_KEY);
    return session ? JSON.parse(session) : null;
  },

  clearSession: () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  },

  // --- VIDEOS ---
  getVideos: (): Video[] => {
    return seedVideos();
  },

  addVideo: (video: Video): void => {
    const videos = db.getVideos();
    videos.push(video);
    localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(videos));
  },

  deleteVideo: (id: string): void => {
    const videos = db.getVideos().filter(v => v.id !== id);
    localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(videos));
  },

  updateVideo: (id: string, updates: Partial<Pick<Video, 'title' | 'isVip' | 'thumbnail' | 'videoUrl' | 'author'>>): void => {
    const videos = db.getVideos();
    const updated = videos.map(v => {
      if (v.id === id) {
        return { ...v, ...updates };
      }
      return v;
    });
    localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(updated));
  },

  incrementVideoViews: (id: string): void => {
    const videos = db.getVideos();
    const updated = videos.map(v => {
      if (v.id === id) {
        return { ...v, views: (v.views || 0) + 1 };
      }
      return v;
    });
    localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(updated));
  }
};