import { detectBrowserLanguage } from "./i18n.js";

const PREFS_KEY = "dreamore_prefs_v2";
const SESSION_KEY = "dreamore_session_v2";
const SAVED_ACC_KEY = "dreamore_saved_accounts_v2";

export const DEFAULT_A11Y = {
  contrast: "off",
  zoom: 100,
  font: 0,
  space: 0,
  cursor: 0,
  focus: 0,
  targets: 0,
  gray: 0,
  invert: 0,
  motion: 0,
  sound: 1,
  sr: 0,
  visualAlerts: 0,
  epilepsySafe: 0,
  colorBlind: "none",
};

export const state = {
  page: "lobby",
  selectedProjectId: "proj-eddsworld",
  selectedProfileUsername: null,
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  themeMode: "dark",
  lang: "pt",
  autoLang: true,
  a11y: { ...DEFAULT_A11Y },

  user: null,
  projects: [],
  users: [],
  genres: [],
  defaultBanners: [],
  feedPosts: [],
  chats: {},
  groups: [],
  gamedevHelp: { docs: [], videos: [], courses: [], mentorMessages: [] },
  marketplace: [],
  news: [],
  affiliated: [],
  applications: [],
  courseProgress: {},
  salesHistory: [],
  visitsCount: 1482,

  likedProjects: [],
  favoriteProjects: ["proj-eddsworld", "proj-silkspanner"],
  filterGenre: "ALL",
  filterSearch: "",
  filterMinLikes: 0,
  filterMinFavs: 0,
  filterMinDonated: 0,
  filterSort: "most_approved",
  planBilling: "monthly",

  feedFilterTag: "ALL",
  helpTab: "docs",
  activeDocId: "doc-gdd",
  activeVideoId: "vid-1",
  activeChannelId: "geral",
  chatComposerMode: "",
  chatAttachment: null,
  guideStep: 0,
  projectDetailTab: "overview",
  projectFrameIndex: 1,
  marketingCategory: "ALL",

  activeCheckout: null,
  checkoutDiscount: 0,
  navigatorOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  notifications: [
    {
      id: "notif-welcome",
      sender: "João Pedro",
      channelId: "geral",
      preview: "Bem-vindo! Confira a demo jogável de Edd Contra o Mundo e as novas ferramentas de equipe.",
      ts: Date.now() - 180000,
      read: false,
    },
  ],
  notificationsOpen: false,
  selectedIcon: "gamepad",
};

export function loadSavedPreferences() {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    if (raw && typeof raw === "object") {
      if (raw.themeMode === "light" || raw.themeMode === "dark") state.themeMode = raw.themeMode;
      if (raw.autoLang !== undefined) state.autoLang = Boolean(raw.autoLang);
      if (raw.lang && ["pt", "en", "es"].includes(raw.lang)) {
        state.lang = raw.lang;
      } else if (state.autoLang) {
        state.lang = detectBrowserLanguage();
      }
      if (raw.sidebarCollapsed !== undefined) state.sidebarCollapsed = Boolean(raw.sidebarCollapsed);
      if (raw.a11y) state.a11y = { ...DEFAULT_A11Y, ...raw.a11y };
      if (Array.isArray(raw.likedProjects)) state.likedProjects = raw.likedProjects;
      if (Array.isArray(raw.favoriteProjects)) state.favoriteProjects = raw.favoriteProjects;
    } else {
      state.lang = detectBrowserLanguage();
    }
  } catch (_err) {
    // Use defaults
  }
}

export function savePreferences() {
  try {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        themeMode: state.themeMode,
        lang: state.lang,
        autoLang: state.autoLang,
        sidebarCollapsed: state.sidebarCollapsed,
        a11y: state.a11y,
        likedProjects: state.likedProjects,
        favoriteProjects: state.favoriteProjects,
      })
    );
  } catch (_err) {
    // Ignore
  }
}

export function loadSessionUser() {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (raw && raw.username) return raw;
  } catch (_err) {
    // Ignore
  }
  return null;
}

export function saveSessionUser(user) {
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  } catch (_err) {
    // Ignore
  }
}

export function loadSavedAccounts() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_ACC_KEY) || "[]");
  } catch (_err) {
    return [];
  }
}

export function rememberAccount(user) {
  if (!user || !user.email) return;
  try {
    const list = loadSavedAccounts().filter((a) => a.email !== user.email);
    list.unshift({
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      photo: user.photo || "",
      banner: user.banner || "",
      provider: user.provider || "local",
    });
    localStorage.setItem(SAVED_ACC_KEY, JSON.stringify(list.slice(0, 6)));
  } catch (_err) {
    // Ignore
  }
}

export function removeSavedAccount(email) {
  try {
    const list = loadSavedAccounts().filter((a) => a.email !== email);
    localStorage.setItem(SAVED_ACC_KEY, JSON.stringify(list));
  } catch (_err) {
    // Ignore
  }
}

export function applyThemeAndA11y() {
  const html = document.documentElement;
  html.classList.toggle("dark", state.themeMode === "dark");
  html.dataset.theme = state.themeMode;
  html.lang = { pt: "pt-BR", en: "en", es: "es" }[state.lang] || "pt-BR";

  const a = state.a11y;
  html.dataset.a11yContrast = a.contrast || "off";
  html.style.zoom = a.zoom && a.zoom !== 100 ? String(a.zoom / 100) : "";
  html.dataset.a11yFont = a.font ? "1" : "0";
  html.dataset.a11ySpace = a.space ? "1" : "0";
  html.dataset.a11yCursor = a.cursor ? "1" : "0";
  html.dataset.a11yFocus = a.focus ? "1" : "0";
  html.dataset.a11yTargets = a.targets ? "1" : "0";
  html.dataset.a11yGray = a.gray ? "1" : "0";
  html.dataset.a11yInvert = a.invert ? "1" : "0";
  html.dataset.a11yMotion = a.motion || a.epilepsySafe ? "off" : "on";
  html.dataset.a11yEpilepsy = a.epilepsySafe ? "1" : "0";
  html.dataset.a11yVisualAlerts = a.visualAlerts ? "1" : "0";
  html.dataset.a11yColorblind = a.colorBlind || "none";
}
