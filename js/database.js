/**
 * Client-side Database Bridge (/js/database.js).
 * Connects UI state directly to the dedicated backend database (/database/database.js via /api/*)
 * with resilient localStorage caching for instant startup.
 */

const CACHE_KEY = "dreamore_client_cache_v2";

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erro HTTP ${res.status}`);
  }
  return data;
}

export const DreamoreDB = {
  async bootstrap() {
    const data = await apiFetch("/api/bootstrap");
    this.saveCache(data);
    return data;
  },

  async sync() {
    return apiFetch("/api/sync");
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
    return apiFetch("/api/auth/google/config");
  },

  async loginLocal(identifier, password) {
    return apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
  },

  async registerLocal(payload) {
    return apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async loginGoogle(payload) {
    return apiFetch("/api/auth/google", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async setPresence(username, online = true) {
    return apiFetch("/api/presence", {
      method: "POST",
      body: JSON.stringify({ username, online }),
    });
  },

  async updateUser(username, patch) {
    return apiFetch(`/api/users/${encodeURIComponent(username)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async toggleFollow(targetUsername, follower) {
    return apiFetch(`/api/users/${encodeURIComponent(targetUsername)}/follow`, {
      method: "POST",
      body: JSON.stringify({ follower }),
    });
  },

  async createProject(payload) {
    return apiFetch("/api/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateProject(id, patch) {
    return apiFetch(`/api/projects/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async deleteProject(id) {
    return apiFetch(`/api/projects/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async addProjectComment(id, comment) {
    return apiFetch(`/api/projects/${encodeURIComponent(id)}/comments`, {
      method: "POST",
      body: JSON.stringify(comment),
    });
  },

  async submitApplication(projectId, application) {
    return apiFetch(`/api/projects/${encodeURIComponent(projectId)}/apply`, {
      method: "POST",
      body: JSON.stringify(application),
    });
  },

  async resolveApplication(appId, status) {
    return apiFetch(`/api/applications/${encodeURIComponent(appId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async createFeedPost(post) {
    return apiFetch("/api/feed", {
      method: "POST",
      body: JSON.stringify(post),
    });
  },

  async likeFeedPost(id) {
    return apiFetch(`/api/feed/${encodeURIComponent(id)}/like`, {
      method: "POST",
    });
  },

  async commentFeedPost(id, comment) {
    return apiFetch(`/api/feed/${encodeURIComponent(id)}/comments`, {
      method: "POST",
      body: JSON.stringify(comment),
    });
  },

  async sendChatMessage(channelId, message) {
    return apiFetch(`/api/chat/${encodeURIComponent(channelId)}`, {
      method: "POST",
      body: JSON.stringify(message),
    });
  },

  async deleteChatMessage(channelId, msgId) {
    return apiFetch(`/api/chat/${encodeURIComponent(channelId)}/${encodeURIComponent(msgId)}`, {
      method: "DELETE",
    });
  },

  async createGroup(group) {
    return apiFetch("/api/groups", {
      method: "POST",
      body: JSON.stringify(group),
    });
  },

  async updateGroup(id, patch) {
    return apiFetch(`/api/groups/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async sendMentorMessage(message) {
    return apiFetch("/api/gamedev-help/chat", {
      method: "POST",
      body: JSON.stringify(message),
    });
  },

  async toggleCourseModule(username, moduleId) {
    return apiFetch("/api/gamedev-help/progress", {
      method: "POST",
      body: JSON.stringify({ username, moduleId }),
    });
  },

  async recordCheckout(payload) {
    return apiFetch("/api/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
