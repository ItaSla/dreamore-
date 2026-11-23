/**
 * Client-side Database Bridge (/js/database.js).
 * Connects UI state to the backend database (/database/database.js via /api/*)
 * when running on Express, and seamlessly falls back to Static + localStorage mode
 * when deployed statically on GitHub Pages (*.github.io).
 */
import { createStaticBootstrap } from "./static-seed.js";
import { sanitizeKey } from "./logic.js";

const CACHE_KEY = "dreamore_client_cache_v2";
const STATIC_STORE_KEY = "dreamore_static_store_v3";

let staticModeActive =
  typeof window !== "undefined" &&
  (window.location.hostname.endsWith("github.io") || window.location.protocol === "file:");

function loadStaticStore() {
  try {
    const raw = localStorage.getItem(STATIC_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.projects) && Array.isArray(parsed.users)) {
        return parsed;
      }
    }
  } catch (_err) {
    // Ignore parse errors
  }
  const fresh = createStaticBootstrap();
  saveStaticStore(fresh);
  return fresh;
}

function saveStaticStore(store) {
  try {
    localStorage.setItem(STATIC_STORE_KEY, JSON.stringify(store));
  } catch (_err) {
    // Ignore storage quota errors
  }
}

function staticResponse(handler) {
  const store = loadStaticStore();
  const result = handler(store);
  saveStaticStore(store);
  return result;
}

async function apiFetch(url, options = {}) {
  if (staticModeActive) {
    throw new Error("STATIC_MODE");
  }
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    staticModeActive = true;
    throw new Error("STATIC_MODE");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erro HTTP ${res.status}`);
  }
  return data;
}

async function withStaticFallback(apiFn, staticFn) {
  if (staticModeActive) {
    return staticResponse(staticFn);
  }
  try {
    return await apiFn();
  } catch (err) {
    if (err.message === "STATIC_MODE" || err.name === "TypeError" || /Failed to fetch/i.test(err.message || "")) {
      staticModeActive = true;
      return staticResponse(staticFn);
    }
    throw err;
  }
}

export const DreamoreDB = {
  isStaticMode() {
    return staticModeActive;
  },

  async bootstrap() {
    const data = await withStaticFallback(
      () => apiFetch("/api/bootstrap"),
      (store) => {
        store.meta = store.meta || { version: 2, visitsCount: 1482 };
        store.meta.visitsCount = (store.meta.visitsCount || 0) + 1;
        return store;
      }
    );
    this.saveCache(data);
    return data;
  },

  async sync() {
    return withStaticFallback(
      () => apiFetch("/api/sync"),
      (store) => ({
        users: store.users || [],
        chats: store.chats || {},
        groups: store.groups || [],
        applications: store.applications || [],
        projects: store.projects || [],
        mentorMessages: store.gamedevHelp?.mentorMessages || [],
      })
    );
  },

  saveCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        projects: data.projects,
        feedPosts: data.feedPosts,
        users: data.users,
      }));
    } catch (_err) {
      // Ignore storage quota errors
    }
  },

  async getGoogleConfig() {
    return withStaticFallback(
      () => apiFetch("/api/auth/google/config"),
      () => ({ enabled: false, clientId: null })
    );
  },

  async loginLocal(identifier, password) {
    return withStaticFallback(
      () => apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      }),
      (store) => {
        const id = String(identifier || "").trim().toLowerCase();
        const user = (store.users || []).find(
          (u) => u.username.toLowerCase() === id || (u.email || "").toLowerCase() === id
        );
        if (!user) throw new Error("Conta não encontrada. Cadastre-se primeiro.");
        if (user.localPass && user.localPass !== password) {
          throw new Error("Senha incorreta.");
        }
        if (!user.localPass && password !== "dreamore123") {
          throw new Error("Senha incorreta.");
        }
        user.online = true;
        user.lastSeen = Date.now();
        return { user };
      }
    );
  },

  async registerLocal(payload) {
    return withStaticFallback(
      () => apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
      (store) => {
        const cleanUser = String(payload?.username || "").trim();
        const cleanEmail = String(payload?.email || "").trim().toLowerCase();
        if (!cleanUser || !cleanEmail) throw new Error("Nome de usuário e e-mail são obrigatórios.");
        const exists = (store.users || []).some(
          (u) => u.username.toLowerCase() === cleanUser.toLowerCase() || (u.email || "").toLowerCase() === cleanEmail
        );
        if (exists) throw new Error("Nome de usuário ou e-mail já cadastrado.");
        const newUser = {
          id: "usr-" + Date.now(),
          username: cleanUser,
          name: cleanUser,
          email: cleanEmail,
          role: payload?.role === "Desenvolvedor" ? "Desenvolvedor" : "Visitante",
          bio: "",
          location: "",
          site: "",
          photo: payload?.photo || "",
          banner: (store.defaultBanners || [])[0] || "./assets/art/studio-banner.svg",
          provider: "local",
          localPass: payload?.password || "",
          socials: {},
          resume: "",
          skills: [],
          followers: [],
          online: true,
          lastSeen: Date.now(),
        };
        store.users.push(newUser);
        const pub = { ...newUser };
        delete pub.localPass;
        return { user: pub };
      }
    );
  },

  async loginGoogle(payload) {
    return withStaticFallback(
      () => apiFetch("/api/auth/google", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
      (store) => {
        const cleanEmail = String(payload?.email || "").trim().toLowerCase();
        if (!cleanEmail) throw new Error("E-mail do Google inválido.");
        let user = (store.users || []).find((u) => (u.email || "").toLowerCase() === cleanEmail);
        if (!user) {
          const baseHandle = (payload?.name || cleanEmail.split("@")[0]).replace(/[^a-zA-Z0-9_]/g, "") || "Sonhador";
          let candidate = baseHandle;
          let suffix = 1;
          while ((store.users || []).some((u) => u.username.toLowerCase() === candidate.toLowerCase())) {
            candidate = `${baseHandle}${suffix++}`;
          }
          user = {
            id: "usr-g-" + (payload?.sub || Date.now()),
            username: candidate,
            name: payload?.name || candidate,
            email: cleanEmail,
            role: "Desenvolvedor",
            bio: "Conta conectada via Google na DREAMORE+.",
            location: "",
            site: "",
            photo: payload?.photo || "",
            banner: (store.defaultBanners || [])[1] || "./assets/art/cyberpunk-skyline.svg",
            provider: "google",
            socials: {},
            resume: "",
            skills: [],
            followers: [],
            online: true,
            lastSeen: Date.now(),
          };
          store.users.push(user);
        } else {
          if (payload?.photo && !user.photo) user.photo = payload.photo;
          if (payload?.name && !user.name) user.name = payload.name;
          user.provider = "google";
          user.online = true;
          user.lastSeen = Date.now();
        }
        return { user };
      }
    );
  },

  async setPresence(username, online = true) {
    return withStaticFallback(
      () => apiFetch("/api/presence", {
        method: "POST",
        body: JSON.stringify({ username, online }),
      }),
      (store) => {
        const user = (store.users || []).find(
          (u) => sanitizeKey(u.username) === sanitizeKey(username) || u.id === username
        );
        if (user) {
          user.online = Boolean(online);
          user.lastSeen = Date.now();
        }
        return { user: user || null, users: store.users || [] };
      }
    );
  },

  async updateUser(username, patch) {
    return withStaticFallback(
      () => apiFetch(`/api/users/${encodeURIComponent(username)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
      (store) => {
        const user = (store.users || []).find(
          (u) => sanitizeKey(u.username) === sanitizeKey(username) || u.id === username
        );
        if (!user) throw new Error("Usuário não encontrado.");
        const allowed = ["name", "bio", "location", "site", "photo", "banner", "role", "socials", "resume", "skills", "device", "online"];
        allowed.forEach((f) => {
          if (patch[f] !== undefined) user[f] = patch[f];
        });
        user.lastSeen = Date.now();
        return { user };
      }
    );
  },

  async toggleFollow(targetUsername, follower) {
    return withStaticFallback(
      () => apiFetch(`/api/users/${encodeURIComponent(targetUsername)}/follow`, {
        method: "POST",
        body: JSON.stringify({ follower }),
      }),
      (store) => {
        const target = (store.users || []).find((u) => sanitizeKey(u.username) === sanitizeKey(targetUsername));
        if (!target) throw new Error("Perfil não encontrado.");
        target.followers = Array.isArray(target.followers) ? target.followers : [];
        const idx = target.followers.findIndex((f) => sanitizeKey(f) === sanitizeKey(follower));
        if (idx >= 0) target.followers.splice(idx, 1);
        else target.followers.push(follower);
        return { user: target, following: idx < 0 };
      }
    );
  },

  async createProject(payload) {
    return withStaticFallback(
      () => apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
      (store) => {
        const releaseDate = payload.releaseDate || `${Number(payload.year) || 2028}-12-01`;
        const cover = payload.cover || "";
        const project = {
          id: "proj-" + Date.now(),
          icon: payload.icon || "gamepad",
          title: payload.title,
          year: Number(payload.year) || Number(String(releaseDate).slice(0, 4)) || 2028,
          releaseDate,
          genre: payload.genre || "Aventura",
          ageRating: payload.ageRating || "Livre",
          ageDetails: payload.ageDetails || "",
          progress: Math.min(100, Math.max(0, Number(payload.progress) || 5)),
          creator: payload.creator || "Desenvolvedor",
          likes: 1,
          favorites: 0,
          donated: 0,
          goal: Math.max(500, Number(payload.goal) || 5000),
          colors: payload.colors || ["#312e81", "#0f766e"],
          cover,
          gallery: Array.isArray(payload.gallery) ? payload.gallery : cover ? [cover] : [],
          synopsis: payload.synopsis,
          team: payload.team || [{ name: payload.creator || "Desenvolvedor", role: "Criador Principal", social: "@dreamore" }],
          comments: [],
        };
        store.projects.unshift(project);
        return { project };
      }
    );
  },

  async updateProject(id, patch) {
    return withStaticFallback(
      () => apiFetch(`/api/projects/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
      (store) => {
        const proj = (store.projects || []).find((p) => p.id === id);
        if (!proj) throw new Error("Projeto não encontrado.");
        Object.assign(proj, patch);
        return { project: proj };
      }
    );
  },

  async deleteProject(id) {
    return withStaticFallback(
      () => apiFetch(`/api/projects/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
      (store) => {
        store.projects = (store.projects || []).filter((p) => p.id !== id);
        return { ok: true };
      }
    );
  },

  async addProjectComment(id, comment) {
    return withStaticFallback(
      () => apiFetch(`/api/projects/${encodeURIComponent(id)}/comments`, {
        method: "POST",
        body: JSON.stringify(comment),
      }),
      (store) => {
        const proj = (store.projects || []).find((p) => p.id === id);
        if (!proj) throw new Error("Projeto não encontrado.");
        proj.comments = proj.comments || [];
        proj.comments.unshift(comment);
        return { project: proj, comment };
      }
    );
  },

  async submitApplication(projectId, application) {
    return withStaticFallback(
      () => apiFetch(`/api/projects/${encodeURIComponent(projectId)}/apply`, {
        method: "POST",
        body: JSON.stringify(application),
      }),
      (store) => {
        const item = {
          id: "app-" + Date.now(),
          projectId,
          ...application,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        store.applications = store.applications || [];
        store.applications.unshift(item);
        return { application: item };
      }
    );
  },

  async resolveApplication(appId, status) {
    return withStaticFallback(
      () => apiFetch(`/api/applications/${encodeURIComponent(appId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
      (store) => {
        const app = (store.applications || []).find((a) => a.id === appId);
        if (!app) throw new Error("Candidatura não encontrada.");
        app.status = status;
        let updatedProj = null;
        if (status === "accepted") {
          const proj = (store.projects || []).find((p) => p.id === app.projectId);
          if (proj && !proj.team.some((m) => m.name.toLowerCase() === app.applicant.toLowerCase())) {
            proj.team.push({
              name: app.applicant,
              role: app.role,
              social: app.portfolio || `@${app.username || app.applicant}`,
            });
          }
          updatedProj = proj || null;
        }
        return { application: app, project: updatedProj, projects: store.projects };
      }
    );
  },

  async createFeedPost(post) {
    return withStaticFallback(
      () => apiFetch("/api/feed", {
        method: "POST",
        body: JSON.stringify(post),
      }),
      (store) => {
        const item = {
          id: "feed-" + Date.now(),
          likes: 0,
          comments: [],
          createdAt: new Date().toISOString(),
          ...post,
        };
        store.feedPosts = store.feedPosts || [];
        store.feedPosts.unshift(item);
        return { post: item };
      }
    );
  },

  async likeFeedPost(id) {
    return withStaticFallback(
      () => apiFetch(`/api/feed/${encodeURIComponent(id)}/like`, {
        method: "POST",
      }),
      (store) => {
        const post = (store.feedPosts || []).find((f) => f.id === id);
        if (!post) throw new Error("Post não encontrado.");
        post.likes = (post.likes || 0) + 1;
        return { post };
      }
    );
  },

  async commentFeedPost(id, comment) {
    return withStaticFallback(
      () => apiFetch(`/api/feed/${encodeURIComponent(id)}/comments`, {
        method: "POST",
        body: JSON.stringify(comment),
      }),
      (store) => {
        const post = (store.feedPosts || []).find((f) => f.id === id);
        if (!post) throw new Error("Post não encontrado.");
        post.comments = post.comments || [];
        post.comments.push(comment);
        return { post };
      }
    );
  },

  async sendChatMessage(channelId, message) {
    return withStaticFallback(
      () => apiFetch(`/api/chat/${encodeURIComponent(channelId)}`, {
        method: "POST",
        body: JSON.stringify(message),
      }),
      (store) => {
        store.chats = store.chats || {};
        store.chats[channelId] = store.chats[channelId] || [];
        const item = {
          id: "msg-" + Date.now() + "-" + Math.floor(Math.random() * 999),
          user: message.user,
          role: message.role || "Membro",
          text: message.text || "",
          attachment: message.attachment || null,
          ts: Date.now(),
        };
        store.chats[channelId].push(item);
        return { message: item };
      }
    );
  },

  async deleteChatMessage(channelId, msgId) {
    return withStaticFallback(
      () => apiFetch(`/api/chat/${encodeURIComponent(channelId)}/${encodeURIComponent(msgId)}`, {
        method: "DELETE",
      }),
      (store) => {
        if (store.chats?.[channelId]) {
          store.chats[channelId] = store.chats[channelId].filter((m) => m.id !== msgId);
        }
        return { ok: true };
      }
    );
  },

  async createGroup(group) {
    return withStaticFallback(
      () => apiFetch("/api/groups", {
        method: "POST",
        body: JSON.stringify(group),
      }),
      (store) => {
        const owner = group.owner || "Dev";
        const moderators = Array.from(new Set([owner, ...(group.moderators || [])].filter(Boolean)));
        const members = Array.from(new Set([owner, ...(group.members || []), ...moderators].filter(Boolean)));
        const item = {
          id: group.id || "grp-" + Date.now(),
          name: group.name,
          desc: group.desc || "",
          photo: group.photo || "",
          owner,
          ownerUid: group.ownerUid || "",
          moderators,
          mods: moderators.filter((m) => sanitizeKey(m) !== sanitizeKey(owner)),
          members,
          visibility: group.visibility === "private" ? "private" : "public",
        };
        store.groups = store.groups || [];
        store.groups.push(item);
        return { group: item };
      }
    );
  },

  async updateGroup(id, patch) {
    return withStaticFallback(
      () => apiFetch(`/api/groups/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
      (store) => {
        const grp = (store.groups || []).find((g) => g.id === id);
        if (!grp) throw new Error("Grupo não encontrado.");
        Object.assign(grp, patch);
        return { group: grp };
      }
    );
  },

  async sendMentorMessage(message) {
    return withStaticFallback(
      () => apiFetch("/api/gamedev-help/chat", {
        method: "POST",
        body: JSON.stringify(message),
      }),
      (store) => {
        store.gamedevHelp = store.gamedevHelp || { docs: [], videos: [], courses: [], mentorMessages: [] };
        store.gamedevHelp.mentorMessages.push({
          id: "gm-" + Date.now(),
          ...message,
          ts: Date.now(),
        });
        return { messages: store.gamedevHelp.mentorMessages };
      }
    );
  },

  async toggleCourseModule(username, moduleId) {
    return withStaticFallback(
      () => apiFetch("/api/gamedev-help/progress", {
        method: "POST",
        body: JSON.stringify({ username, moduleId }),
      }),
      (store) => {
        store.courseProgress = store.courseProgress || {};
        const key = sanitizeKey(username || "guest");
        const list = store.courseProgress[key] || [];
        const idx = list.indexOf(moduleId);
        if (idx >= 0) list.splice(idx, 1);
        else list.push(moduleId);
        store.courseProgress[key] = list;
        return { completed: list };
      }
    );
  },

  async recordCheckout(payload) {
    return withStaticFallback(
      () => apiFetch("/api/checkout", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
      (store) => {
        const numeric = Number(payload.amount) || 0;
        if (payload.projectId) {
          const proj = (store.projects || []).find((p) => p.id === payload.projectId);
          if (proj) proj.donated = Number(((proj.donated || 0) + numeric).toFixed(2));
        }
        const sale = {
          buyer: payload.buyer || "Sonhador",
          item: payload.item,
          amount: numeric,
          date: new Date().toLocaleDateString("pt-BR"),
        };
        store.salesHistory = store.salesHistory || [];
        store.salesHistory.unshift(sale);
        return { sale, projects: store.projects };
      }
    );
  },
};
