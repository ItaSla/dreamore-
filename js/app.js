import {
  sanitizeKey,
  escapeHtml,
  calculateCheckoutSummary,
  validateProjectDraft,
  validateApplication,
  normalizeSocialUrl,
  normalizeGroupPayload,
  canManageGroup,
  getGroupMeta,
  clampString,
} from "./logic.js";
import { buildMultilingualFields, getText, getLocalizedField, autoTranslatePhrase } from "./i18n.js";
import { DreamoreDB } from "./database.js";
import { DreamoreFirebase } from "./firebase.js";
import {
  DEFAULT_A11Y,
  state,
  loadSavedPreferences,
  savePreferences,
  loadSessionUser,
  saveSessionUser,
  rememberAccount,
  removeSavedAccount,
  applyThemeAndA11y,
} from "./state.js";
import { icon, PROJECT_ICON_OPTIONS, projectIconBadge } from "./icons.js";
import {
  renderSplashScreen,
  renderAuthGate,
  renderSidebar,
  renderTopBar,
  renderTabLoaderOverlay,
  presenceBadgeHtml,
  avatarHtml,
} from "./components/shell.js";
import {
  renderLobbyView,
  renderExploreView,
  renderCreateProjectView,
  renderProjectDetailView,
} from "./components/projects.js";
import { renderFeedView } from "./components/feed.js";
import { renderGameDevHelpView } from "./components/gamedevHelp.js";
import {
  renderChatView,
  renderPlansView,
  renderMarketingMarketplaceView,
} from "./components/community.js";
import {
  renderGuideView,
  renderProfileView,
  renderSettingsView,
  renderDashboardView,
} from "./components/account.js";

const runtime = {
  screen: "splash", // "splash" | "auth" | "app"
  authTab: "login",
  authError: "",
  googleEnabled: false,
  googleClientId: "",
  loaderTimer: null,
  splashTimer: null,
  syncTimer: null,
  draftCoverDataUrl: "",
  draftFeedImage: "",
  draftGroupPhoto: "",
  editGroupPhoto: "",
  editProjectDraft: null,
  knownMsgIds: new Set(),
  audioCtx: null,
};

const PAGE_TITLES = {
  lobby: "nav_lobby",
  explore: "nav_explore",
  create: "nav_create",
  "project-detail": "nav_lobby",
  feed: "nav_feed",
  help: "nav_help",
  chat: "nav_chat",
  plans: "nav_plans",
  market: "nav_market",
  guide: "nav_guide",
  profile: "nav_profile",
  "public-profile": "nav_profile",
  settings: "nav_settings",
  dashboard: "nav_dashboard",
};

function playNotificationSound() {
  if (!state.a11y.sound) return;
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    if (!runtime.audioCtx) runtime.audioCtx = new AudioCtor();
    const ctx = runtime.audioCtx;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const playNote = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.09, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };
    playNote(587.33, now, 0.16);
    playNote(880, now + 0.11, 0.24);
  } catch (_err) {
    // Audio playback unavailable
  }
}

function triggerVisualAlert() {
  if (!state.a11y.visualAlerts) return;
  document.body.classList.remove("dm-visual-cue-active");
  void document.body.offsetWidth;
  document.body.classList.add("dm-visual-cue-active");
  setTimeout(() => document.body.classList.remove("dm-visual-cue-active"), 950);
}

function announceSr(text) {
  const el = document.getElementById("sr-announcer");
  if (el && text) el.textContent = String(text);
}

function showToast(message, tone = "info", actionOpts = null) {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const toneClass =
    tone === "error"
      ? "bg-rose-600 text-white"
      : tone === "success"
      ? "bg-emerald-600 text-white"
      : tone === "message"
      ? "bg-indigo-600 text-white border border-indigo-400/50"
      : "bg-slate-900 dark:bg-slate-800 text-white border border-slate-700";

  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.className = `pointer-events-auto px-4 py-3 rounded-xl shadow-xl text-xs sm:text-sm font-medium flex items-center gap-3 max-w-sm transition-all ${toneClass}`;
  el.innerHTML = `
    ${tone === "message" ? `<span class="shrink-0">${icon("bell", 16)}</span>` : ""}
    <span class="flex-1 line-clamp-2">${escapeHtml(message)}</span>
    ${
      actionOpts?.channelId
        ? `<button type="button" data-action="open-notification-chat" data-id="${escapeHtml(actionOpts.notifId || "")}" data-cid="${escapeHtml(actionOpts.channelId)}"
            class="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold shrink-0">
            ${escapeHtml(actionOpts.label || "Abrir")}
          </button>`
        : ""
    }
  `;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    setTimeout(() => el.remove(), 220);
  }, tone === "message" ? 4500 : 3200);
}

function notifyIncomingMessage({ sender, preview, channelId = "geral" }) {
  const notif = {
    id: "notif-" + Date.now() + "-" + Math.floor(Math.random() * 999),
    sender: sender || "Comunidade",
    preview: String(preview || "Nova mensagem recebida"),
    channelId,
    ts: Date.now(),
    read: false,
  };
  state.notifications = [notif, ...(state.notifications || [])].slice(0, 20);
  playNotificationSound();
  triggerVisualAlert();
  announceSr(`Nova mensagem de ${notif.sender}: ${notif.preview}`);

  if (runtime.screen === "app" && !document.getElementById("active-modal-backdrop")) {
    renderApp();
  }
  showToast(`${notif.sender}: ${notif.preview}`, "message", {
    label: "Abrir",
    channelId: notif.channelId,
    notifId: notif.id,
  });
}

function collectKnownMessageIds() {
  const ids = new Set();
  Object.values(state.chats || {}).forEach((list) => {
    (list || []).forEach((m) => m.id && ids.add(m.id));
  });
  (state.gamedevHelp?.mentorMessages || []).forEach((m) => m.id && ids.add(m.id));
  runtime.knownMsgIds = ids;
}

function compressImageFile(file, maxW = 1200, maxH = 720, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler arquivo de imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(reader.result || ""));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

function renderActivePageHtml() {
  switch (state.page) {
    case "explore":
      return renderExploreView();
    case "create":
      return renderCreateProjectView();
    case "project-detail":
      return renderProjectDetailView();
    case "feed":
      return renderFeedView();
    case "help":
      return renderGameDevHelpView();
    case "chat":
      return renderChatView();
    case "plans":
      return renderPlansView();
    case "market":
      return renderMarketingMarketplaceView();
    case "guide":
      return renderGuideView();
    case "profile":
      return renderProfileView(false);
    case "public-profile":
      return renderProfileView(true);
    case "settings":
      return renderSettingsView();
    case "dashboard":
      return renderDashboardView();
    case "lobby":
    default:
      return renderLobbyView();
  }
}

function renderApp(opts = {}) {
  const root = document.getElementById("app-root");
  if (!root) return;

  applyThemeAndA11y();

  if (runtime.screen === "splash") {
    root.innerHTML = renderSplashScreen();
    return;
  }

  if (runtime.screen === "auth" || !state.user) {
    root.innerHTML = renderAuthGate(runtime.authTab, runtime.authError, runtime.googleEnabled);
    return;
  }

  const pageTitleKey = PAGE_TITLES[state.page] || "nav_lobby";
  const pageTitle = getText(state.lang, pageTitleKey);
  const pageAnimClass = opts.animatePage && !state.a11y.motion && !state.a11y.epilepsySafe ? "dm-page-enter" : "";

  root.innerHTML = `
    <div class="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      ${renderSidebar()}
      <div class="flex-1 min-w-0 flex flex-col">
        ${renderTopBar(pageTitle)}
        <main id="main-content" tabindex="-1" class="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1440px] w-full mx-auto focus:outline-none ${pageAnimClass}">
          ${renderActivePageHtml()}
        </main>
        <footer class="px-4 sm:px-8 py-5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <span>DREAMORE+ · Ecossistema Indie 100% livre de IA generativa em arte e áudio</span>
          <span>Desenvolvido por José Willian & João Pedro</span>
        </footer>
      </div>
    </div>
    ${renderTabLoaderOverlay()}
  `;

  if (state.page === "chat") {
    const box = document.getElementById("chat-messages-box");
    if (box) box.scrollTop = box.scrollHeight;
  }
  if (state.page === "help" && state.helpTab === "mentors") {
    const mbox = document.getElementById("mentor-chat-list");
    if (mbox) mbox.scrollTop = mbox.scrollHeight;
  }
}

function navigateTo(page, opts = {}) {
  state.mobileSidebarOpen = false;
  state.notificationsOpen = false;
  if (runtime.loaderTimer) {
    clearTimeout(runtime.loaderTimer);
    runtime.loaderTimer = null;
  }

  const performSwitch = () => {
    state.page = page;
    renderApp({ animatePage: true });
    window.scrollTo({ top: 0, behavior: state.a11y.motion || state.a11y.epilepsySafe ? "auto" : "smooth" });
    const pageTitle = getText(state.lang, PAGE_TITLES[page] || "nav_lobby");
    announceSr(`Página carregada: ${pageTitle}`);
    if (state.a11y.sr) {
      const main = document.getElementById("main-content");
      if (main) main.focus();
    }
  };

  const loaderEl = document.getElementById("tab-loader");
  if (
    opts.skipLoader ||
    state.a11y.motion ||
    state.a11y.epilepsySafe ||
    !loaderEl ||
    runtime.screen !== "app" ||
    (state.page === page && !opts.forceLoader)
  ) {
    performSwitch();
    return;
  }

  loaderEl.classList.add("is-visible");
  const bar = document.getElementById("tab-loader-bar");
  if (bar) {
    bar.classList.remove("dm-loader-fill");
    void bar.offsetWidth;
    bar.classList.add("dm-loader-fill");
  }

  runtime.loaderTimer = setTimeout(() => {
    runtime.loaderTimer = null;
    performSwitch();
  }, 240);
}

function syncUserToStore(user) {
  if (!user) return;
  state.user = user;
  const idx = state.users.findIndex((u) => sanitizeKey(u.username) === sanitizeKey(user.username));
  if (idx >= 0) state.users[idx] = user;
  else state.users.push(user);
  saveSessionUser(user);
  rememberAccount(user);
}

function openModal(html, label = "Diálogo") {
  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) return;
  modalRoot.innerHTML = `
    <div id="active-modal-backdrop" role="dialog" aria-modal="true" aria-label="${escapeHtml(label)}"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div class="dm-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700">
        ${html}
      </div>
    </div>
  `;
}

function closeModal() {
  const modalRoot = document.getElementById("modal-root");
  if (modalRoot) modalRoot.innerHTML = "";
}

function openProfileEditorModal() {
  const u = state.user;
  if (!u) return;
  const currentBanner = u.banner || state.defaultBanners[0] || "";
  const socials = u.socials || {};

  openModal(
    `
    <div class="p-6 sm:p-8 space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-display font-bold text-xl">Editar Perfil, Foto, Banner e Links</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Personalize como a comunidade visualiza seu estúdio, foto, currículo e redes sociais</p>
        </div>
        <button type="button" data-action="close-modal" aria-label="Fechar" class="p-2 rounded-xl dm-surface-alt">
          ${icon("close", 16)}
        </button>
      </div>

      <form id="profile-editor-form" class="space-y-5">
        <!-- Profile Avatar Photo Preview & Upload -->
        <div class="dm-surface-alt rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div id="pe-photo-preview-box" class="shrink-0">
            ${avatarHtml(u, "w-16 h-16 text-xl")}
          </div>
          <div class="flex-1 space-y-2">
            <div class="text-xs font-semibold">Foto de Perfil</div>
            <div class="flex flex-wrap items-center gap-2">
              <label class="px-3 py-1.5 rounded-lg dm-surface text-xs font-semibold cursor-pointer hover:border-indigo-500 inline-flex items-center gap-1.5">
                ${icon("image", 13)}
                <span>Enviar Foto</span>
                <input id="pe-photo-file" type="file" accept="image/*" class="hidden" />
              </label>
              <button type="button" data-action="clear-pe-photo" class="px-3 py-1.5 rounded-lg dm-surface text-xs font-semibold text-rose-500 hover:border-rose-500">
                Remover
              </button>
              <input id="pe-photo-url" type="text" value="${escapeHtml(u.photo || "")}" placeholder="ou cole URL da foto de perfil..." class="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg dm-surface text-xs" />
            </div>
            <input id="pe-photo-value" type="hidden" value="${escapeHtml(u.photo || "")}" />
          </div>
        </div>

        <!-- Banner Preview & Picker -->
        <div class="space-y-2.5">
          <label class="block text-xs font-semibold">Banner do Perfil</label>
          <div class="relative h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900">
            <img id="pe-banner-preview" src="${escapeHtml(currentBanner)}" alt="Prévia do banner" class="w-full h-full object-cover" />
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            ${(state.defaultBanners || []).map((bUrl, idx) => `
              <button type="button" data-action="pick-banner-preset" data-banner="${escapeHtml(bUrl)}"
                class="h-12 rounded-lg overflow-hidden border-2 transition-all ${bUrl === currentBanner ? "border-indigo-500" : "border-transparent opacity-80 hover:opacity-100"}">
                <img src="${escapeHtml(bUrl)}" alt="Banner ${idx + 1}" class="w-full h-full object-cover" />
              </button>
            `).join("")}
          </div>
          <label class="inline-flex items-center gap-2 px-3 py-2 rounded-xl dm-surface-alt text-xs font-semibold cursor-pointer hover:border-indigo-500">
            ${icon("image", 14)}
            <span>Enviar Banner Personalizado</span>
            <input id="pe-banner-file" type="file" accept="image/*" class="hidden" />
          </label>
          <input id="pe-banner-value" type="hidden" value="${escapeHtml(currentBanner)}" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="pe-name" class="block text-xs font-semibold mb-1">Nome de Exibição</label>
            <input id="pe-name" type="text" required value="${escapeHtml(u.name || u.username)}" class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm" />
          </div>
          <div>
            <label for="pe-location" class="block text-xs font-semibold mb-1">Localização / Estúdio</label>
            <input id="pe-location" type="text" value="${escapeHtml(u.location || "")}" placeholder="Ex: São Paulo, BR" class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm" />
          </div>
        </div>

        <div>
          <label for="pe-site" class="block text-xs font-semibold mb-1">Portfólio / Site Principal</label>
          <input id="pe-site" type="text" value="${escapeHtml(u.site || "")}" placeholder="https://seuportfolio.com" class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm" />
        </div>

        <!-- Social & Platform Links -->
        <div class="dm-surface-alt rounded-xl p-4 space-y-3">
          <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Redes Sociais & Links Públicos</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="pe-youtube" class="block text-[11px] font-semibold mb-1">YouTube</label>
              <input id="pe-youtube" type="text" value="${escapeHtml(socials.youtube || "")}" placeholder="@seucanal ou https://youtube.com/..." class="w-full px-3 py-2 rounded-lg dm-surface text-xs" />
            </div>
            <div>
              <label for="pe-twitter" class="block text-[11px] font-semibold mb-1">Twitter / X</label>
              <input id="pe-twitter" type="text" value="${escapeHtml(socials.twitter || "")}" placeholder="@seuusuario" class="w-full px-3 py-2 rounded-lg dm-surface text-xs" />
            </div>
            <div>
              <label for="pe-instagram" class="block text-[11px] font-semibold mb-1">Instagram</label>
              <input id="pe-instagram" type="text" value="${escapeHtml(socials.instagram || "")}" placeholder="@seuusuario" class="w-full px-3 py-2 rounded-lg dm-surface text-xs" />
            </div>
            <div>
              <label for="pe-linkedin" class="block text-[11px] font-semibold mb-1">LinkedIn</label>
              <input id="pe-linkedin" type="text" value="${escapeHtml(socials.linkedin || "")}" placeholder="seu-perfil ou https://linkedin.com/in/..." class="w-full px-3 py-2 rounded-lg dm-surface text-xs" />
            </div>
            <div>
              <label for="pe-github" class="block text-[11px] font-semibold mb-1">GitHub</label>
              <input id="pe-github" type="text" value="${escapeHtml(socials.github || "")}" placeholder="usuario ou https://github.com/..." class="w-full px-3 py-2 rounded-lg dm-surface text-xs" />
            </div>
            <div>
              <label for="pe-itch" class="block text-[11px] font-semibold mb-1">Itch.io</label>
              <input id="pe-itch" type="text" value="${escapeHtml(socials.itch || "")}" placeholder="estudio ou https://estudio.itch.io" class="w-full px-3 py-2 rounded-lg dm-surface text-xs" />
            </div>
          </div>
        </div>

        <div>
          <label for="pe-skills" class="block text-xs font-semibold mb-1">Especialidades (separadas por vírgula)</label>
          <input id="pe-skills" type="text" value="${escapeHtml((u.skills || []).join(", "))}" placeholder="Pixel Art, Godot, Sound Design"
            class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm" />
        </div>

        <div>
          <label for="pe-bio" class="block text-xs font-semibold mb-1">Biografia</label>
          <textarea id="pe-bio" rows="2" class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm">${escapeHtml(u.bio || "")}</textarea>
        </div>

        <div>
          <label for="pe-resume" class="block text-xs font-semibold mb-1">Currículo & Experiência para Equipes</label>
          <textarea id="pe-resume" rows="3" class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm">${escapeHtml(u.resume || "")}</textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" data-action="close-modal" class="px-4 py-2.5 rounded-xl dm-surface-alt text-xs font-semibold">Cancelar</button>
          <button type="submit" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">Salvar Alterações</button>
        </div>
      </form>
    </div>
    `,
    "Editar Perfil"
  );
}

function renderEditGalleryThumbs() {
  const list = runtime.editProjectDraft?.gallery || [];
  if (!list.length) {
    return `<p class="text-xs text-slate-500 dark:text-slate-400">Nenhuma imagem extra na galeria. Adicione capturas abaixo ou defina a capa principal.</p>`;
  }
  return `
    <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
      ${list
        .map(
          (src, idx) => `
        <div class="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-16/10 bg-slate-900">
          <img src="${escapeHtml(src)}" alt="Cena ${idx + 1}" class="w-full h-full object-cover" />
          <button type="button" data-action="ep-remove-gallery" data-idx="${idx}" aria-label="Remover imagem ${idx + 1}"
            class="absolute top-1 right-1 p-1 rounded-md bg-black/75 text-white hover:bg-rose-600 transition-colors">
            ${icon("close", 12)}
          </button>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function openEditProjectModal(projectId) {
  const proj = state.projects.find((p) => p.id === projectId);
  if (!proj) return;

  const currentIcon = proj.icon || "gamepad";
  const initialGallery = Array.isArray(proj.gallery) && proj.gallery.length ? [...proj.gallery] : proj.cover ? [proj.cover] : [];
  runtime.editProjectDraft = {
    projectId: proj.id,
    icon: currentIcon,
    cover: proj.cover || initialGallery[0] || "",
    gallery: initialGallery,
  };

  const titlePt = proj.title?.pt || "";
  const titleEn = getLocalizedField(proj.title, "en");
  const titleEs = getLocalizedField(proj.title, "es");
  const releaseDateVal = proj.releaseDate || `${proj.year || 2028}-12-01`;

  openModal(
    `
    <div class="p-6 sm:p-8 space-y-5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div id="ep-icon-preview">${projectIconBadge(currentIcon, proj.colors, 18)}</div>
          <div>
            <h2 class="font-display font-bold text-xl">Editar Projeto</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Altere nome, ícone, lançamento, progresso e imagens</p>
          </div>
        </div>
        <button type="button" data-action="close-modal" aria-label="Fechar" class="p-2 rounded-xl dm-surface-alt">
          ${icon("close", 16)}
        </button>
      </div>

      <form id="edit-project-form" data-id="${escapeHtml(proj.id)}" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="ep-title" class="block text-xs font-semibold mb-1">Nome do Projeto (PT-BR) *</label>
            <input id="ep-title" type="text" required value="${escapeHtml(titlePt)}" class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm" />
          </div>
          <div>
            <label for="ep-creator" class="block text-xs font-semibold mb-1">Criador / Estúdio</label>
            <input id="ep-creator" type="text" required value="${escapeHtml(proj.creator || "")}" class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm" />
          </div>
        </div>

        <!-- Auto-translated Title Fields (auto-update as PT name changes) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 dm-surface-alt rounded-xl p-3">
          <div>
            <label for="ep-title-en" class="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Título em Inglês (EN · Auto)</label>
            <input id="ep-title-en" type="text" value="${escapeHtml(titleEn)}" class="w-full px-2.5 py-1.5 rounded-lg dm-surface text-xs" />
          </div>
          <div>
            <label for="ep-title-es" class="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Título em Espanhol (ES · Auto)</label>
            <input id="ep-title-es" type="text" value="${escapeHtml(titleEs)}" class="w-full px-2.5 py-1.5 rounded-lg dm-surface text-xs" />
          </div>
        </div>

        <!-- Project Icon Picker -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold">Ícone do Projeto</label>
          <div class="flex flex-wrap gap-1.5">
            ${PROJECT_ICON_OPTIONS.map((opt) => `
              <button type="button" data-action="pick-edit-icon" data-icon="${opt.id}" title="${escapeHtml(opt.label)}"
                class="px-2.5 py-1.5 rounded-lg dm-surface-alt inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${currentIcon === opt.id ? "ring-2 ring-indigo-500 text-indigo-600 dark:text-indigo-400" : ""}">
                ${icon(opt.id, 14)}
                <span>${escapeHtml(opt.label)}</span>
              </button>
            `).join("")}
          </div>
          <input id="ep-icon" type="hidden" value="${escapeHtml(currentIcon)}" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label for="ep-genre" class="block text-xs font-semibold mb-1">Gênero</label>
            <select id="ep-genre" class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm">
              ${state.genres.map((g) => `<option value="${escapeHtml(g)}" ${proj.genre === g ? "selected" : ""}>${escapeHtml(g)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label for="ep-release-date" class="block text-xs font-semibold mb-1">Data de Lançamento</label>
            <input id="ep-release-date" type="date" value="${escapeHtml(releaseDateVal)}" class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm font-mono-num" />
          </div>
          <div>
            <label for="ep-age" class="block text-xs font-semibold mb-1">Classificação</label>
            <select id="ep-age" class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm">
              ${["Livre", "+13", "+16", "+18"].map((a) => `<option value="${a}" ${proj.ageRating === a ? "selected" : ""}>${a}</option>`).join("")}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <div class="flex items-center justify-between text-xs font-semibold mb-1">
              <label for="ep-progress">Desenvolvimento (%)</label>
              <span id="ep-progress-label" class="font-mono-num text-indigo-600 dark:text-indigo-400">${proj.progress}%</span>
            </div>
            <div class="flex items-center gap-3">
              <input id="ep-progress-range" type="range" min="0" max="100" value="${proj.progress}" class="flex-1 accent-indigo-600" />
              <input id="ep-progress" type="number" min="0" max="100" value="${proj.progress}" class="w-20 px-2.5 py-2 rounded-xl dm-surface-alt text-sm font-mono-num" />
            </div>
          </div>
          <div>
            <label for="ep-goal" class="block text-xs font-semibold mb-1">Meta de Financiamento (R$)</label>
            <input id="ep-goal" type="number" min="100" value="${proj.goal}" class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm font-mono-num" />
          </div>
        </div>

        <div>
          <label for="ep-synopsis" class="block text-xs font-semibold mb-1">Sinopse</label>
          <textarea id="ep-synopsis" rows="3" required class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm">${escapeHtml(proj.synopsis?.pt || "")}</textarea>
        </div>

        <!-- Cover & Gallery Images -->
        <div class="dm-surface-alt rounded-xl p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="text-xs font-semibold">Capa & Galeria de Imagens</div>
            <div class="flex flex-wrap gap-2">
              <label class="px-3 py-1.5 rounded-lg dm-surface text-xs font-semibold cursor-pointer hover:border-indigo-500 inline-flex items-center gap-1.5">
                ${icon("image", 13)}
                <span>Enviar Nova Capa</span>
                <input id="ep-cover-file" type="file" accept="image/*" class="hidden" />
              </label>
              <label class="px-3 py-1.5 rounded-lg dm-surface text-xs font-semibold cursor-pointer hover:border-indigo-500 inline-flex items-center gap-1.5">
                ${icon("create", 13)}
                <span>Adicionar à Galeria</span>
                <input id="ep-add-gallery-file" type="file" accept="image/*" class="hidden" />
              </label>
            </div>
          </div>

          <div>
            <label for="ep-cover-url" class="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">URL ou caminho da imagem de capa principal</label>
            <input id="ep-cover-url" type="text" value="${escapeHtml(runtime.editProjectDraft.cover)}" placeholder="/src/assets/images/... ou https://..." class="w-full px-3 py-2 rounded-lg dm-surface text-xs" />
          </div>

          <div id="ep-gallery-list">
            ${renderEditGalleryThumbs()}
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" data-action="close-modal" class="px-4 py-2 rounded-xl dm-surface-alt text-xs font-semibold">Cancelar</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">Salvar Projeto</button>
        </div>
      </form>
    </div>
    `,
    "Editar Projeto"
  );
}

function openApplicationResumeModal(appId) {
  const app = (state.applications || []).find((a) => a.id === appId);
  if (!app) return;
  const proj = state.projects.find((p) => p.id === app.projectId);
  const candidate = state.users.find(
    (u) => sanitizeKey(u.username) === sanitizeKey(app.username || app.applicant) || sanitizeKey(u.name) === sanitizeKey(app.applicant)
  );
  const portfolioHref = normalizeSocialUrl("portfolio", app.portfolio || candidate?.site);
  const skillsList = String(app.skills || (candidate?.skills || []).join(", "))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  openModal(
    `
    <div class="p-6 sm:p-8 space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Análise de Currículo · Recrutamento</div>
          <div class="flex flex-wrap items-center gap-2 mt-1">
            <h2 class="font-display font-bold text-xl">${escapeHtml(app.applicant)}</h2>
            ${candidate ? presenceBadgeHtml(candidate) : ""}
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Vaga pretendida: <strong>${escapeHtml(app.role)}</strong>
            ${proj ? ` · Projeto: <strong>${escapeHtml(getLocalizedField(proj.title, state.lang))}</strong>` : ""}
          </p>
        </div>
        <button type="button" data-action="close-modal" aria-label="Fechar" class="p-2 rounded-xl dm-surface-alt">
          ${icon("close", 16)}
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div class="dm-surface-alt rounded-xl p-3">
          <div class="text-slate-500 dark:text-slate-400">Nível de Experiência</div>
          <div class="font-semibold mt-0.5">${escapeHtml(app.experienceLevel || "Intermediário")}</div>
        </div>
        <div class="dm-surface-alt rounded-xl p-3">
          <div class="text-slate-500 dark:text-slate-400">Disponibilidade</div>
          <div class="font-semibold mt-0.5">${escapeHtml(app.availability || "Flexível")}</div>
        </div>
        <div class="dm-surface-alt rounded-xl p-3">
          <div class="text-slate-500 dark:text-slate-400">Enviado em</div>
          <div class="font-mono-num font-semibold mt-0.5">${new Date(app.ts || Date.now()).toLocaleDateString("pt-BR")}</div>
        </div>
      </div>

      ${skillsList.length ? `
        <div class="space-y-1.5">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">Especialidades Declaradas</div>
          <div class="flex flex-wrap gap-1.5">
            ${skillsList.map((s) => `<span class="px-2.5 py-1 rounded-lg dm-surface-alt text-xs font-semibold">${escapeHtml(s)}</span>`).join("")}
          </div>
        </div>
      ` : ""}

      <div class="dm-surface-alt rounded-xl p-4 space-y-2">
        <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">Currículo & Experiência Apresentada</div>
        <p class="text-sm leading-relaxed whitespace-pre-line">${escapeHtml(app.resume)}</p>
        ${candidate?.resume && candidate.resume !== app.resume ? `
          <div class="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            <strong>Resumo do perfil:</strong> ${escapeHtml(candidate.resume)}
          </div>
        ` : ""}
      </div>

      ${portfolioHref ? `
        <div class="flex items-center justify-between gap-3 dm-surface-alt rounded-xl p-3 text-xs">
          <span class="text-slate-500 dark:text-slate-400">Portfólio / Contato:</span>
          <a href="${escapeHtml(portfolioHref)}" target="_blank" rel="noopener noreferrer" class="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1.5">
            ${icon("link", 13)}
            <span>${escapeHtml(app.portfolio || portfolioHref)}</span>
          </a>
        </div>
      ` : ""}

      <div class="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <button type="button" data-action="close-modal" class="px-4 py-2 rounded-xl dm-surface-alt text-xs font-semibold">Fechar</button>
        <button type="button" data-action="resolve-app" data-app-id="${escapeHtml(app.id)}" data-status="rejected"
          class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold">
          Recusar Candidatura
        </button>
        <button type="button" data-action="resolve-app" data-app-id="${escapeHtml(app.id)}" data-status="accepted"
          class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
          Aceitar na Equipe
        </button>
      </div>
    </div>
    `,
    `Currículo de ${app.applicant}`
  );
}

function openCheckoutModal({ item, price, currency = "R$", projectId = "" }, coupon = "") {
  const summary = calculateCheckoutSummary(price, coupon);
  state.activeCheckout = { item, price: Number(price), currency, projectId };

  openModal(
    `
    <div class="p-6 sm:p-8 space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Checkout Transparente DREAMORE+</div>
          <h2 class="font-display font-bold text-xl mt-0.5">${escapeHtml(item)}</h2>
        </div>
        <button type="button" data-action="close-modal" aria-label="Fechar" class="p-2 rounded-xl dm-surface-alt">
          ${icon("close", 16)}
        </button>
      </div>

      <div class="dm-surface-alt rounded-xl p-4 space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-slate-500 dark:text-slate-400">Valor base</span>
          <span class="font-mono-num">${escapeHtml(currency)} ${summary.base.toFixed(2)}</span>
        </div>
        ${summary.couponApplied ? `
          <div class="flex justify-between text-emerald-500">
            <span>Cupom DREAM50 (-50%)</span>
            <span class="font-mono-num">Aplicado</span>
          </div>
        ` : ""}
        <div class="flex justify-between">
          <span class="text-slate-500 dark:text-slate-400">Repasse ao criador (95%)</span>
          <span class="font-mono-num">${escapeHtml(currency)} ${summary.creatorNet.toFixed(2)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500 dark:text-slate-400">Taxa da plataforma (5%)</span>
          <span class="font-mono-num">${escapeHtml(currency)} ${summary.platformFee.toFixed(2)}</span>
        </div>
        <div class="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-bold text-base">
          <span>Total a pagar</span>
          <span class="font-mono-num text-indigo-600 dark:text-indigo-400">${escapeHtml(currency)} ${summary.finalAmount.toFixed(2)}</span>
        </div>
      </div>

      <div class="flex gap-2">
        <input id="checkout-coupon-input" type="text" value="${escapeHtml(coupon)}" placeholder="Cupom promocional (ex: DREAM50)"
          class="flex-1 px-3 py-2 rounded-xl dm-surface-alt text-xs uppercase" />
        <button type="button" data-action="apply-coupon" class="px-4 py-2 rounded-xl dm-surface-alt text-xs font-semibold hover:border-indigo-500">
          Aplicar Cupom
        </button>
      </div>

      <button type="button" data-action="confirm-checkout" data-amount="${summary.finalAmount}"
        class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors">
        Confirmar Pagamento Seguro
      </button>
    </div>
    `,
    "Checkout"
  );
}

function openAssetDetailModal(assetId) {
  const asset = (state.marketplace || []).find((a) => a.id === assetId);
  if (!asset) return;

  openModal(
    `
    <div class="p-6 sm:p-8 space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">${escapeHtml(asset.type)}</div>
          <h2 class="font-display font-bold text-xl mt-1">${escapeHtml(asset.title)}</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Por ${escapeHtml(asset.author)} · ${escapeHtml(asset.fmt)}</p>
        </div>
        <button type="button" data-action="close-modal" aria-label="Fechar" class="p-2 rounded-xl dm-surface-alt">
          ${icon("close", 16)}
        </button>
      </div>

      <p class="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">${escapeHtml(asset.d)}</p>

      <div class="dm-surface-alt rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span>Verificado 100% livre de IA generativa</span>
        <span class="font-mono-num font-bold">Avaliação ${asset.rate.toFixed(1)} · ${asset.sales} licenças</span>
      </div>

      <div class="flex items-center justify-between pt-2">
        <div class="font-mono-num text-2xl font-bold">R$ ${asset.price.toFixed(2)}</div>
        <button type="button" data-action="open-checkout" data-item="Asset: ${escapeHtml(asset.title)}" data-price="${asset.price}" data-currency="R$"
          class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
          Adquirir Licença
        </button>
      </div>
    </div>
    `,
    asset.title
  );
}

function openDemoPlayerModal(projectId) {
  const proj = state.projects.find((p) => p.id === projectId);
  if (!proj || !proj.playableDemo) return;
  const title = getLocalizedField(proj.title, state.lang);

  openModal(
    `
    <div class="p-4 sm:p-6 space-y-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-xs font-semibold text-emerald-500">${escapeHtml(proj.playableDemo.ver)} · Demo Jogável</div>
          <h2 class="font-display font-bold text-lg">${escapeHtml(title)}</h2>
        </div>
        <button type="button" data-action="close-modal" aria-label="Fechar jogo" class="px-3.5 py-2 rounded-xl dm-surface-alt text-xs font-semibold">
          Fechar Demo
        </button>
      </div>
      <div class="aspect-16/10 w-full rounded-xl overflow-hidden border border-slate-700 bg-black">
        <iframe src="${escapeHtml(proj.playableDemo.src)}" title="${escapeHtml(title)}" class="w-full h-full border-0"></iframe>
      </div>
    </div>
    `,
    `Demo: ${title}`
  );
}

function openLightboxModal(src, alt = "Imagem") {
  openModal(
    `
    <div class="p-4 space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">${escapeHtml(alt)}</span>
        <button type="button" data-action="close-modal" class="p-2 rounded-xl dm-surface-alt">${icon("close", 16)}</button>
      </div>
      <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="w-full max-h-[75vh] object-contain rounded-xl bg-black/40" />
    </div>
    `,
    alt
  );
}

function openGroupEditorModal(groupId) {
  const grp = (state.groups || []).find((g) => g.id === groupId);
  if (!grp) return;
  const meta = getGroupMeta(grp);
  const canEdit = canManageGroup(grp, state.user);
  runtime.editGroupPhoto = meta.photo || "";
  const ownerKey = sanitizeKey(grp.owner);
  const allUsers = [...(state.users || [])];
  meta.members.forEach((m) => {
    if (!allUsers.some((u) => sanitizeKey(u.username) === sanitizeKey(m))) {
      allUsers.push({ username: m, name: m });
    }
  });
  const memberSet = new Set(meta.members.map(sanitizeKey));
  const modSet = new Set(meta.moderators.map(sanitizeKey));

  openModal(
    `
    <div class="p-6 sm:p-8 space-y-5">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="font-display font-bold text-xl">${canEdit ? "Gerenciar Grupo" : "Detalhes do Grupo"}</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Foto, descrição, membros (${meta.memberCount}) e moderadores (${meta.moderatorCount})</p>
        </div>
        <button type="button" data-action="close-modal" aria-label="Fechar" class="p-2 rounded-xl dm-surface-alt">
          ${icon("close", 16)}
        </button>
      </div>

      <form id="edit-group-form" data-id="${escapeHtml(grp.id)}" class="space-y-4">
        <div class="dm-surface-alt rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div id="eg-photo-preview-box" class="w-16 h-16 rounded-xl overflow-hidden bg-emerald-600 text-white font-display font-bold text-xl flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-700">
            ${meta.photo ? `<img src="${escapeHtml(meta.photo)}" alt="${escapeHtml(grp.name)}" class="w-full h-full object-cover" />` : escapeHtml((grp.name || "G").charAt(0).toUpperCase())}
          </div>
          ${canEdit ? `
            <div class="flex-1 space-y-2">
              <div class="text-xs font-semibold">Foto do Grupo</div>
              <div class="flex flex-wrap items-center gap-2">
                <label class="px-3 py-1.5 rounded-lg dm-surface text-xs font-semibold cursor-pointer hover:border-indigo-500 inline-flex items-center gap-1.5">
                  ${icon("image", 13)}
                  <span>Enviar Foto</span>
                  <input id="eg-photo-file" type="file" accept="image/*" class="hidden" />
                </label>
                <button type="button" data-action="clear-eg-photo" class="px-3 py-1.5 rounded-lg dm-surface text-xs font-semibold text-rose-500">Remover</button>
                <input id="eg-photo-url" type="text" value="${escapeHtml(meta.photo)}" placeholder="ou cole URL da imagem..." class="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg dm-surface text-xs" />
              </div>
            </div>
          ` : `
            <div>
              <div class="font-display font-bold text-base">${escapeHtml(grp.name)}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">Dono: @${escapeHtml(grp.owner || "Dev")}</div>
            </div>
          `}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="eg-name" class="block text-xs font-semibold mb-1">Nome do Grupo</label>
            <input id="eg-name" type="text" required minlength="2" maxlength="60" ${canEdit ? "" : "disabled"} value="${escapeHtml(grp.name)}" class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm" />
          </div>
          <div>
            <label for="eg-visibility" class="block text-xs font-semibold mb-1">Visibilidade</label>
            <select id="eg-visibility" ${canEdit ? "" : "disabled"} class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm">
              <option value="public" ${grp.visibility !== "private" ? "selected" : ""}>Público na comunidade</option>
              <option value="private" ${grp.visibility === "private" ? "selected" : ""}>Privado</option>
            </select>
          </div>
        </div>

        <div>
          <label for="eg-desc" class="block text-xs font-semibold mb-1">Descrição</label>
          <textarea id="eg-desc" rows="2" maxlength="300" ${canEdit ? "" : "disabled"} class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm">${escapeHtml(grp.desc || "")}</textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="dm-surface-alt rounded-xl p-3.5 space-y-2">
            <div class="text-xs font-semibold">Membros (${meta.memberCount})</div>
            <div class="max-h-40 overflow-y-auto space-y-1.5">
              ${allUsers.map((u) => {
                const k = sanitizeKey(u.username);
                const isOwner = k === ownerKey;
                const checked = isOwner || memberSet.has(k);
                return `
                  <label class="flex items-center gap-2 text-xs ${canEdit ? "cursor-pointer" : "opacity-80"}">
                    <input type="checkbox" name="eg-members" value="${escapeHtml(u.username)}" ${checked ? "checked" : ""} ${!canEdit || isOwner ? "disabled" : ""} class="rounded accent-indigo-600" />
                    ${avatarHtml(u, "w-5 h-5 text-[10px]")}
                    <span class="truncate">${escapeHtml(u.name || u.username)} ${isOwner ? "(Dono)" : ""}</span>
                  </label>
                `;
              }).join("")}
            </div>
          </div>

          <div class="dm-surface-alt rounded-xl p-3.5 space-y-2">
            <div class="text-xs font-semibold">Moderadores (${meta.moderatorCount})</div>
            <div class="max-h-40 overflow-y-auto space-y-1.5">
              ${allUsers.map((u) => {
                const k = sanitizeKey(u.username);
                const isOwner = k === ownerKey;
                const checked = isOwner || modSet.has(k);
                return `
                  <label class="flex items-center gap-2 text-xs ${canEdit ? "cursor-pointer" : "opacity-80"}">
                    <input type="checkbox" name="eg-mods" value="${escapeHtml(u.username)}" ${checked ? "checked" : ""} ${!canEdit || isOwner ? "disabled" : ""} class="rounded accent-emerald-600" />
                    ${avatarHtml(u, "w-5 h-5 text-[10px]")}
                    <span class="truncate">${escapeHtml(u.name || u.username)} ${isOwner ? "(Dono)" : ""}</span>
                  </label>
                `;
              }).join("")}
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" data-action="close-modal" class="px-4 py-2 rounded-xl dm-surface-alt text-xs font-semibold">Fechar</button>
          ${canEdit ? `<button type="submit" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">Salvar Grupo</button>` : ""}
        </div>
      </form>
    </div>
    `,
    `Grupo: ${grp.name}`
  );
}

function bindGlobalEvents() {
  document.addEventListener("click", async (e) => {
    const backdrop = e.target.closest("#active-modal-backdrop");
    if (backdrop && e.target === backdrop) {
      closeModal();
      return;
    }

    if (state.notificationsOpen && !e.target.closest("#notifications-popover") && !e.target.closest('[data-action="toggle-notifications"]')) {
      state.notificationsOpen = false;
      renderApp();
    }

    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    if (action === "toggle-notifications") {
      state.notificationsOpen = !state.notificationsOpen;
      renderApp();
      return;
    }

    if (action === "mark-notifications-read") {
      state.notifications = (state.notifications || []).map((n) => ({ ...n, read: true }));
      renderApp();
      return;
    }

    if (action === "open-notification-chat") {
      const notifId = target.dataset.id;
      const cid = target.dataset.cid || "geral";
      if (notifId) {
        state.notifications = (state.notifications || []).map((n) => (n.id === notifId ? { ...n, read: true } : n));
      }
      state.notificationsOpen = false;
      if (cid === "help:mentors") {
        state.helpTab = "mentors";
        navigateTo("help");
      } else {
        state.activeChannelId = cid;
        state.chatComposerMode = "";
        navigateTo("chat");
      }
      return;
    }

    if (action === "skip-splash") {
      if (runtime.splashTimer) clearTimeout(runtime.splashTimer);
      runtime.screen = state.user ? "app" : "auth";
      renderApp();
      return;
    }

    if (action === "switch-auth-tab") {
      runtime.authTab = target.dataset.tab || "login";
      runtime.authError = "";
      renderApp();
      return;
    }

    if (action === "google-signin") {
      try {
        runtime.authError = "";
        const fbInfo = await DreamoreFirebase.signInWithGoogle();
        const { user } = await DreamoreDB.loginGoogle({
          email: fbInfo.email,
          name: fbInfo.name,
          photo: fbInfo.photo,
          sub: fbInfo.uid,
        });
        user.uid = fbInfo.uid;
        user.photo = user.photo || fbInfo.photo || "";
        user.online = state.navigatorOnline !== false;
        syncUserToStore(user);
        DreamoreDB.setPresence(user.username, user.online).catch(() => {});
        DreamoreFirebase.seedIfEmpty({ projects: state.projects, groups: state.groups }).catch(() => {});
        attachFirebaseLiveSync();
        runtime.screen = "app";
        closeModal();
        navigateTo("lobby", { skipLoader: true });
        showToast(`Conectado via Google como ${user.name}!`, "success");
      } catch (err) {
        const msg = err?.code === "auth/popup-closed-by-user"
          ? "Login Google cancelado."
          : err?.code === "auth/popup-blocked"
          ? "Pop-up bloqueado pelo navegador. Permita pop-ups para continuar com Google."
          : err?.message || "Falha ao autenticar com o Google.";
        runtime.authError = msg;
        renderApp();
        showToast(msg, "error");
      }
      return;
    }

    if (action === "quick-login") {
      const email = target.dataset.email;
      const found = state.users.find((u) => u.email.toLowerCase() === String(email || "").toLowerCase());
      if (found) {
        found.online = state.navigatorOnline !== false;
        syncUserToStore(found);
        DreamoreDB.setPresence(found.username, found.online).catch(() => {});
        runtime.screen = "app";
        navigateTo("lobby", { skipLoader: true });
        showToast(`Sessão restaurada: ${found.name}`, "success");
      } else {
        const input = document.getElementById("login-identifier");
        if (input) input.value = email || "";
      }
      return;
    }

    if (action === "remove-saved-acc") {
      removeSavedAccount(target.dataset.email);
      renderApp();
      return;
    }

    if (action === "logout") {
      if (state.user?.username) {
        const outUser = state.user.username;
        state.users = state.users.map((u) => (sanitizeKey(u.username) === sanitizeKey(outUser) ? { ...u, online: false } : u));
        DreamoreDB.setPresence(outUser, false).catch(() => {});
      }
      await DreamoreFirebase.signOut();
      state.user = null;
      saveSessionUser(null);
      runtime.screen = "auth";
      runtime.authTab = "login";
      runtime.authError = "";
      renderApp();
      return;
    }

    if (action === "toggle-sidebar-collapse") {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      savePreferences();
      renderApp();
      return;
    }

    if (action === "open-mobile-sidebar") {
      state.mobileSidebarOpen = true;
      renderApp();
      return;
    }

    if (action === "close-mobile-sidebar") {
      state.mobileSidebarOpen = false;
      renderApp();
      return;
    }

    if (action === "toggle-theme") {
      state.themeMode = state.themeMode === "dark" ? "light" : "dark";
      savePreferences();
      renderApp();
      return;
    }

    if (action === "set-theme") {
      state.themeMode = target.dataset.mode === "light" ? "light" : "dark";
      savePreferences();
      renderApp();
      return;
    }

    if (action === "nav") {
      const page = target.dataset.page || "lobby";
      navigateTo(page);
      return;
    }

    if (action === "open-project") {
      state.selectedProjectId = target.dataset.id;
      state.projectFrameIndex = 1;
      navigateTo("project-detail");
      return;
    }

    if (action === "cycle-frame") {
      const delta = Number(target.dataset.delta || 1);
      const proj = state.projects.find((p) => p.id === state.selectedProjectId);
      const galleryCount = Array.isArray(proj?.gallery) ? proj.gallery.filter(Boolean).length : 0;
      const total = Math.max(3, galleryCount);
      state.projectFrameIndex = ((state.projectFrameIndex - 1 + delta + total) % total) + 1;
      renderApp();
      return;
    }

    if (action === "toggle-like") {
      const id = target.dataset.id;
      const proj = state.projects.find((p) => p.id === id);
      if (!proj) return;
      const already = state.likedProjects.includes(id);
      if (already) {
        state.likedProjects = state.likedProjects.filter((x) => x !== id);
        proj.likes = Math.max(0, (proj.likes || 0) - 1);
      } else {
        state.likedProjects = [...state.likedProjects, id];
        proj.likes = (proj.likes || 0) + 1;
      }
      savePreferences();
      renderApp();
      DreamoreDB.updateProject(id, { likes: proj.likes }).catch(() => {});
      DreamoreFirebase.updateProjectMetrics(id, { likes: proj.likes }).catch(() => {});
      return;
    }

    if (action === "toggle-fav") {
      const id = target.dataset.id;
      const proj = state.projects.find((p) => p.id === id);
      if (!proj) return;
      const already = state.favoriteProjects.includes(id);
      if (already) {
        state.favoriteProjects = state.favoriteProjects.filter((x) => x !== id);
        proj.favorites = Math.max(0, (proj.favorites || 0) - 1);
      } else {
        state.favoriteProjects = [...state.favoriteProjects, id];
        proj.favorites = (proj.favorites || 0) + 1;
      }
      savePreferences();
      renderApp();
      DreamoreDB.updateProject(id, { favorites: proj.favorites }).catch(() => {});
      DreamoreFirebase.updateProjectMetrics(id, { favorites: proj.favorites }).catch(() => {});
      return;
    }

    if (action === "filter-genre-jump") {
      state.filterGenre = target.dataset.genre || "ALL";
      navigateTo("explore");
      return;
    }

    if (action === "reset-filters") {
      state.filterGenre = "ALL";
      state.filterSearch = "";
      state.filterMinLikes = 0;
      state.filterMinFavs = 0;
      state.filterMinDonated = 0;
      renderApp();
      return;
    }

    if (action === "play-demo") {
      openDemoPlayerModal(target.dataset.id);
      return;
    }

    if (action === "open-edit-project") {
      openEditProjectModal(target.dataset.id);
      return;
    }

    if (action === "pick-create-icon") {
      const chosen = target.dataset.icon || "gamepad";
      state.selectedIcon = chosen;
      const hidden = document.getElementById("cp-icon");
      if (hidden) hidden.value = chosen;
      document.querySelectorAll('[data-action="pick-create-icon"]').forEach((btn) => {
        const active = btn.dataset.icon === chosen;
        btn.classList.toggle("ring-2", active);
        btn.classList.toggle("ring-indigo-500", active);
        btn.classList.toggle("text-indigo-600", active);
        btn.classList.toggle("dark:text-indigo-400", active);
      });
      return;
    }

    if (action === "pick-edit-icon") {
      const chosen = target.dataset.icon || "gamepad";
      if (runtime.editProjectDraft) runtime.editProjectDraft.icon = chosen;
      const hidden = document.getElementById("ep-icon");
      if (hidden) hidden.value = chosen;
      const preview = document.getElementById("ep-icon-preview");
      const proj = state.projects.find((p) => p.id === runtime.editProjectDraft?.projectId);
      if (preview) preview.innerHTML = projectIconBadge(chosen, proj?.colors, 18);
      document.querySelectorAll('[data-action="pick-edit-icon"]').forEach((btn) => {
        const active = btn.dataset.icon === chosen;
        btn.classList.toggle("ring-2", active);
        btn.classList.toggle("ring-indigo-500", active);
        btn.classList.toggle("text-indigo-600", active);
        btn.classList.toggle("dark:text-indigo-400", active);
      });
      return;
    }

    if (action === "ep-remove-gallery") {
      const idx = Number(target.dataset.idx);
      if (runtime.editProjectDraft && !Number.isNaN(idx)) {
        runtime.editProjectDraft.gallery.splice(idx, 1);
        const listEl = document.getElementById("ep-gallery-list");
        if (listEl) listEl.innerHTML = renderEditGalleryThumbs();
      }
      return;
    }

    if (action === "admin-delete-project") {
      const id = target.dataset.id;
      try {
        await DreamoreDB.deleteProject(id);
        DreamoreFirebase.deleteProject(id).catch(() => {});
        state.projects = state.projects.filter((p) => p.id !== id);
        renderApp();
        showToast("Projeto removido pela moderação.", "info");
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (action === "open-app-resume") {
      openApplicationResumeModal(target.dataset.appId);
      return;
    }

    if (action === "resolve-app") {
      const appId = target.dataset.appId;
      const status = target.dataset.status;
      try {
        const res = await DreamoreDB.resolveApplication(appId, status);
        state.applications = state.applications.map((a) => (a.id === appId ? res.application : a));
        if (res.project) {
          state.projects = state.projects.map((p) => (p.id === res.project.id ? res.project : p));
          DreamoreFirebase.saveProject(res.project).catch(() => {});
        }
        closeModal();
        renderApp();
        showToast(status === "accepted" ? "Integrante adicionado à equipe!" : "Candidatura recusada.", "success");
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (action === "filter-feed-tag") {
      state.feedFilterTag = target.dataset.tag || "ALL";
      renderApp();
      return;
    }

    if (action === "clear-feed-img") {
      runtime.draftFeedImage = "";
      const wrap = document.getElementById("feed-image-preview-wrap");
      const input = document.getElementById("feed-img-input");
      if (wrap) wrap.classList.add("hidden");
      if (input) input.value = "";
      return;
    }

    if (action === "like-feed") {
      const id = target.dataset.id;
      try {
        const res = await DreamoreDB.likeFeedPost(id);
        if (res.post) {
          state.feedPosts = state.feedPosts.map((p) => (p.id === id ? res.post : p));
          DreamoreFirebase.saveFeedPost(res.post).catch(() => {});
        }
        renderApp();
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (action === "open-lightbox") {
      openLightboxModal(target.dataset.src, target.dataset.alt);
      return;
    }

    if (action === "set-help-tab") {
      state.helpTab = target.dataset.tab || "docs";
      renderApp();
      return;
    }

    if (action === "select-doc") {
      state.activeDocId = target.dataset.id;
      renderApp();
      return;
    }

    if (action === "select-video") {
      state.activeVideoId = target.dataset.id;
      renderApp();
      return;
    }

    if (action === "toggle-course-module") {
      const moduleId = target.dataset.moduleId;
      const username = state.user?.username || "guest";
      try {
        const res = await DreamoreDB.toggleCourseModule(username, moduleId);
        state.courseProgress[sanitizeKey(username)] = res.completed;
        renderApp();
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (action === "open-chat") {
      state.activeChannelId = target.dataset.cid || "geral";
      state.chatComposerMode = "";
      renderApp();
      return;
    }

    if (action === "chat-mode") {
      state.chatComposerMode = target.dataset.mode || "";
      if (state.chatComposerMode === "group") runtime.draftGroupPhoto = "";
      renderApp();
      return;
    }

    if (action === "open-group-editor") {
      openGroupEditorModal(target.dataset.id);
      return;
    }

    if (action === "clear-pe-photo") {
      const hidden = document.getElementById("pe-photo-value");
      const urlEl = document.getElementById("pe-photo-url");
      const box = document.getElementById("pe-photo-preview-box");
      if (hidden) hidden.value = "";
      if (urlEl) urlEl.value = "";
      if (box && state.user) box.innerHTML = avatarHtml({ ...state.user, photo: "" }, "w-16 h-16 text-xl");
      return;
    }

    if (action === "clear-eg-photo") {
      runtime.editGroupPhoto = "";
      const urlEl = document.getElementById("eg-photo-url");
      const box = document.getElementById("eg-photo-preview-box");
      const nameVal = document.getElementById("eg-name")?.value || "G";
      if (urlEl) urlEl.value = "";
      if (box) box.textContent = nameVal.charAt(0).toUpperCase();
      return;
    }

    if (action === "start-dm") {
      const peer = sanitizeKey(target.dataset.username);
      const me = sanitizeKey(state.user?.username || "guest");
      const cid = `dm:${[me, peer].sort().join("__")}`;
      if (!state.chats[cid]) state.chats[cid] = [];
      state.activeChannelId = cid;
      state.chatComposerMode = "";
      if (state.page !== "chat") navigateTo("chat");
      else renderApp();
      return;
    }

    if (action === "clear-chat-att") {
      state.chatAttachment = null;
      renderApp();
      return;
    }

    if (action === "set-billing") {
      state.planBilling = target.dataset.billing === "annual" ? "annual" : "monthly";
      renderApp();
      return;
    }

    if (action === "filter-market-cat") {
      state.marketingCategory = target.dataset.cat || "ALL";
      renderApp();
      return;
    }

    if (action === "open-asset-modal") {
      openAssetDetailModal(target.dataset.id);
      return;
    }

    if (action === "copy-campaign-link") {
      const url = `${window.location.origin}/?ref=${encodeURIComponent(state.user?.username || "dreamore")}&coupon=DREAM50`;
      try {
        await navigator.clipboard.writeText(url);
      } catch (_err) {
        // Fallback when clipboard unavailable
      }
      showToast("Link de campanha com cupom DREAM50 copiado!", "success");
      return;
    }

    if (action === "open-checkout") {
      openCheckoutModal({
        item: target.dataset.item,
        price: Number(target.dataset.price || 0),
        currency: target.dataset.currency || "R$",
        projectId: target.dataset.projectId || "",
      });
      return;
    }

    if (action === "apply-coupon") {
      if (!state.activeCheckout) return;
      const code = document.getElementById("checkout-coupon-input")?.value || "";
      openCheckoutModal(state.activeCheckout, code);
      return;
    }

    if (action === "confirm-checkout") {
      if (!state.activeCheckout) return;
      const amount = Number(target.dataset.amount || state.activeCheckout.price || 0);
      try {
        const res = await DreamoreDB.recordCheckout({
          user: state.user?.username || "Sonhador",
          item: state.activeCheckout.item,
          amount,
          projectId: state.activeCheckout.projectId || null,
        });
        state.salesHistory.push(res.sale);
        if (res.project) {
          state.projects = state.projects.map((p) => (p.id === res.project.id ? res.project : p));
        }
        closeModal();
        renderApp();
        showToast(`Pagamento confirmado: ${state.activeCheckout.item}`, "success");
        state.activeCheckout = null;
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (action === "view-public-profile") {
      state.selectedProfileUsername = target.dataset.username;
      navigateTo("public-profile");
      return;
    }

    if (action === "open-profile-editor") {
      openProfileEditorModal();
      return;
    }

    if (action === "pick-banner-preset") {
      const bUrl = target.dataset.banner || "";
      const hidden = document.getElementById("pe-banner-value");
      const preview = document.getElementById("pe-banner-preview");
      if (hidden) hidden.value = bUrl;
      if (preview) preview.src = bUrl;
      document.querySelectorAll('[data-action="pick-banner-preset"]').forEach((btn) => {
        btn.classList.toggle("border-indigo-500", btn === target);
        btn.classList.toggle("border-transparent", btn !== target);
      });
      return;
    }

    if (action === "toggle-follow") {
      const peer = target.dataset.username;
      try {
        const res = await DreamoreDB.toggleFollow(peer, state.user?.username);
        state.users = state.users.map((u) => (u.username === res.user.username ? res.user : u));
        renderApp();
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (action === "set-guide-step") {
      state.guideStep = Number(target.dataset.step || 0);
      renderApp();
      return;
    }

    if (action === "apply-a11y-preset") {
      const preset = target.dataset.preset;
      if (preset === "deaf") {
        const active = Boolean(state.a11y.visualAlerts);
        state.a11y.visualAlerts = active ? 0 : 1;
        savePreferences();
        renderApp();
        if (!active) {
          triggerVisualAlert();
          showToast("Modo Surdez ativado: alertas visuais ligados.", "success");
        } else {
          showToast("Modo Surdez desativado.", "info");
        }
      } else if (preset === "low-vision") {
        const active = Number(state.a11y.zoom) >= 125 && Boolean(state.a11y.font);
        if (active) {
          Object.assign(state.a11y, { zoom: 100, font: 0, space: 0, targets: 0, contrast: "off" });
          savePreferences();
          renderApp();
          showToast("Modo Baixa Visão desativado.", "info");
        } else {
          Object.assign(state.a11y, {
            zoom: 125,
            font: 1,
            space: 1,
            targets: 1,
            contrast: state.themeMode === "dark" ? "high" : "light",
          });
          savePreferences();
          renderApp();
          showToast("Modo Baixa Visão ativado: zoom 125%, alto contraste e alvos 44px+.", "success");
        }
      } else if (preset === "blind") {
        const active = Boolean(state.a11y.sr && state.a11y.focus);
        if (active) {
          Object.assign(state.a11y, { sr: 0, focus: 0 });
          savePreferences();
          renderApp();
          showToast("Modo Leitor de Tela desativado.", "info");
        } else {
          Object.assign(state.a11y, { sr: 1, focus: 1, space: 1, sound: 1 });
          savePreferences();
          renderApp();
          announceSr("Modo para cegueira e leitor de tela ativado.");
          showToast("Modo Cegueira / Leitor de Tela ativado.", "success");
        }
      } else if (preset === "epilepsy") {
        const active = Boolean(state.a11y.epilepsySafe);
        if (active) {
          Object.assign(state.a11y, { epilepsySafe: 0, motion: 0 });
          savePreferences();
          renderApp();
          showToast("Modo Epilepsia Segura desativado.", "info");
        } else {
          Object.assign(state.a11y, { epilepsySafe: 1, motion: 1, contrast: "off" });
          savePreferences();
          renderApp();
          showToast("Modo Epilepsia Segura ativado: animações pausadas e contraste suavizado.", "success");
        }
      }
      return;
    }

    if (action === "toggle-a11y") {
      const key = target.dataset.key;
      state.a11y[key] = state.a11y[key] ? 0 : 1;
      savePreferences();
      renderApp();
      if (key === "visualAlerts" && state.a11y.visualAlerts) triggerVisualAlert();
      return;
    }

    if (action === "set-a11y-val") {
      const key = target.dataset.key;
      const val = key === "zoom" ? Number(target.dataset.val) : target.dataset.val;
      state.a11y[key] = val;
      savePreferences();
      renderApp();
      return;
    }

    if (action === "reset-a11y") {
      state.a11y = { ...DEFAULT_A11Y };
      savePreferences();
      renderApp();
      showToast("Configurações de acessibilidade restauradas.", "info");
      return;
    }

    if (action === "speak-page") {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const text = document.getElementById("main-content")?.innerText?.slice(0, 900) || "DREAMORE+";
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = { pt: "pt-BR", en: "en-US", es: "es-ES" }[state.lang] || "pt-BR";
        window.speechSynthesis.speak(utter);
        showToast("Leitura em voz alta iniciada.", "info");
      } else {
        showToast("Leitor de voz indisponível neste navegador.", "error");
      }
      return;
    }

    if (action === "enable-admin") {
      if (!state.user) return;
      try {
        const res = await DreamoreDB.updateUser(state.user.username, { role: "Administrador" });
        syncUserToStore(res.user);
        renderApp();
        showToast("Modo Administrador ativado.", "success");
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (action === "close-modal") {
      closeModal();
    }
  });

  document.addEventListener("change", async (e) => {
    const el = e.target;

    if (el.matches('[data-action="change-lang"]')) {
      state.lang = el.value;
      state.autoLang = false;
      savePreferences();
      renderApp();
      return;
    }

    if (el.matches('[data-action="change-lobby-sort"]')) {
      state.filterSort = el.value;
      renderApp();
      return;
    }

    if (el.matches('[data-action="filter-select"], [data-action="filter-number"]')) {
      const field = el.dataset.field;
      state[field] = el.type === "number" ? Number(el.value || 0) : el.value;
      renderApp();
      return;
    }

    if (el.matches('[data-action="switch-role"]')) {
      if (!state.user) return;
      try {
        const res = await DreamoreDB.updateUser(state.user.username, { role: el.value });
        syncUserToStore(res.user);
        renderApp();
        showToast(`Perfil alterado para ${el.value}.`, "success");
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (el.id === "cp-age") {
      const wrap = document.getElementById("cp-age-details-wrap");
      if (wrap) wrap.classList.toggle("hidden", el.value !== "+16" && el.value !== "+18");
      return;
    }

    if (el.id === "cp-cover-file" && el.files?.[0]) {
      runtime.draftCoverDataUrl = await compressImageFile(el.files[0], 1000, 625, 0.82);
      showToast("Capa carregada para publicação.", "success");
      return;
    }

    if (el.id === "feed-img-input" && el.files?.[0]) {
      runtime.draftFeedImage = await compressImageFile(el.files[0], 1200, 760, 0.82);
      const wrap = document.getElementById("feed-image-preview-wrap");
      const preview = document.getElementById("feed-image-preview");
      if (preview && wrap) {
        preview.src = runtime.draftFeedImage;
        wrap.classList.remove("hidden");
      }
      return;
    }

    if (el.id === "chat-img-input" && el.files?.[0]) {
      const dataUrl = await compressImageFile(el.files[0], 1000, 700, 0.8);
      state.chatAttachment = { type: "image", data: dataUrl };
      renderApp();
      return;
    }

    if (el.id === "pe-banner-file" && el.files?.[0]) {
      const dataUrl = await compressImageFile(el.files[0], 1280, 460, 0.82);
      const hidden = document.getElementById("pe-banner-value");
      const preview = document.getElementById("pe-banner-preview");
      if (hidden) hidden.value = dataUrl;
      if (preview) preview.src = dataUrl;
      return;
    }

    if (el.matches('[data-action="change-colorblind"]')) {
      state.a11y.colorBlind = el.value || "none";
      savePreferences();
      renderApp();
      showToast(`Filtro de daltonismo: ${el.options[el.selectedIndex]?.text || el.value}`, "info");
      return;
    }

    if (el.id === "ep-cover-file" && el.files?.[0]) {
      const dataUrl = await compressImageFile(el.files[0], 1000, 625, 0.82);
      if (runtime.editProjectDraft) runtime.editProjectDraft.cover = dataUrl;
      const urlInput = document.getElementById("ep-cover-url");
      if (urlInput) urlInput.value = dataUrl;
      showToast("Nova capa carregada. Clique em Salvar Projeto para aplicar.", "success");
      return;
    }

    if (el.id === "ep-add-gallery-file" && el.files?.[0]) {
      const dataUrl = await compressImageFile(el.files[0], 1000, 625, 0.82);
      if (runtime.editProjectDraft && dataUrl) {
        runtime.editProjectDraft.gallery.push(dataUrl);
        const listEl = document.getElementById("ep-gallery-list");
        if (listEl) listEl.innerHTML = renderEditGalleryThumbs();
      }
      return;
    }

    if (el.id === "pe-photo-file" && el.files?.[0]) {
      const dataUrl = await compressImageFile(el.files[0], 256, 256, 0.72);
      const hidden = document.getElementById("pe-photo-value");
      const urlEl = document.getElementById("pe-photo-url");
      const box = document.getElementById("pe-photo-preview-box");
      if (hidden) hidden.value = dataUrl;
      if (urlEl) urlEl.value = dataUrl;
      if (box && state.user) box.innerHTML = avatarHtml({ ...state.user, photo: dataUrl }, "w-16 h-16 text-xl");
      showToast("Nova foto de perfil pronta para salvar.", "info");
      return;
    }

    if (el.id === "profile-quick-photo-input" && el.files?.[0] && state.user) {
      const dataUrl = await compressImageFile(el.files[0], 256, 256, 0.72);
      try {
        const res = await DreamoreDB.updateUser(state.user.username, { photo: dataUrl });
        syncUserToStore({ ...state.user, ...res.user, photo: dataUrl });
        DreamoreFirebase.syncCurrentUserProfile(state.user).catch(() => {});
        renderApp();
        showToast("Foto de perfil atualizada!", "success");
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (el.id === "grp-photo-file" && el.files?.[0]) {
      const dataUrl = await compressImageFile(el.files[0], 320, 320, 0.75);
      runtime.draftGroupPhoto = dataUrl;
      const urlEl = document.getElementById("grp-photo-url");
      const box = document.getElementById("grp-photo-preview-box");
      if (urlEl) urlEl.value = dataUrl;
      if (box) box.innerHTML = `<img src="${escapeHtml(dataUrl)}" alt="Foto do grupo" class="w-full h-full object-cover" />`;
      return;
    }

    if (el.id === "eg-photo-file" && el.files?.[0]) {
      const dataUrl = await compressImageFile(el.files[0], 320, 320, 0.75);
      runtime.editGroupPhoto = dataUrl;
      const urlEl = document.getElementById("eg-photo-url");
      const box = document.getElementById("eg-photo-preview-box");
      if (urlEl) urlEl.value = dataUrl;
      if (box) box.innerHTML = `<img src="${escapeHtml(dataUrl)}" alt="Foto do grupo" class="w-full h-full object-cover" />`;
    }
  });

  document.addEventListener("input", (e) => {
    const el = e.target;

    if (el.matches('[data-action="filter-input"]')) {
      const field = el.dataset.field;
      const selStart = el.selectionStart;
      state[field] = el.value;
      renderApp();
      const restored = document.getElementById("f-search");
      if (restored) {
        restored.focus();
        if (typeof selStart === "number") restored.setSelectionRange(selStart, selStart);
      }
      return;
    }

    if (el.id === "ep-progress-range") {
      const num = document.getElementById("ep-progress");
      const lbl = document.getElementById("ep-progress-label");
      if (num) num.value = el.value;
      if (lbl) lbl.textContent = `${el.value}%`;
      return;
    }

    if (el.id === "ep-progress") {
      const clamped = Math.max(0, Math.min(100, Number(el.value || 0)));
      const rng = document.getElementById("ep-progress-range");
      const lbl = document.getElementById("ep-progress-label");
      if (rng) rng.value = String(clamped);
      if (lbl) lbl.textContent = `${clamped}%`;
      return;
    }

    if (el.id === "ep-title") {
      const pt = el.value.trim();
      const enEl = document.getElementById("ep-title-en");
      const esEl = document.getElementById("ep-title-es");
      if (enEl && enEl.dataset.manual !== "1") enEl.value = autoTranslatePhrase(pt, "en");
      if (esEl && esEl.dataset.manual !== "1") esEl.value = autoTranslatePhrase(pt, "es");
      return;
    }

    if (el.id === "ep-title-en" || el.id === "ep-title-es") {
      el.dataset.manual = "1";
      return;
    }

    if (el.id === "cp-title" || el.id === "cp-synopsis") {
      const titlePt = document.getElementById("cp-title")?.value || "";
      const synPt = document.getElementById("cp-synopsis")?.value || "";
      const ml = buildMultilingualFields(titlePt, synPt);
      const enEl = document.getElementById("cp-preview-en");
      const esEl = document.getElementById("cp-preview-es");
      if (enEl) enEl.textContent = `${ml.title.en || "..."} — ${ml.synopsis.en || "..."}`;
      if (esEl) esEl.textContent = `${ml.title.es || "..."} — ${ml.synopsis.es || "..."}`;
      return;
    }

    if (el.id === "pe-photo-url") {
      const val = el.value.trim();
      const hidden = document.getElementById("pe-photo-value");
      const box = document.getElementById("pe-photo-preview-box");
      if (hidden) hidden.value = val;
      if (box && state.user) box.innerHTML = avatarHtml({ ...state.user, photo: val }, "w-16 h-16 text-xl");
      return;
    }

    if (el.id === "grp-photo-url") {
      const val = el.value.trim();
      runtime.draftGroupPhoto = val;
      const box = document.getElementById("grp-photo-preview-box");
      if (box) {
        box.innerHTML = val
          ? `<img src="${escapeHtml(val)}" alt="Foto do grupo" class="w-full h-full object-cover" />`
          : "G";
      }
      return;
    }

    if (el.id === "eg-photo-url") {
      const val = el.value.trim();
      runtime.editGroupPhoto = val;
      const box = document.getElementById("eg-photo-preview-box");
      const nameVal = document.getElementById("eg-name")?.value || "G";
      if (box) {
        box.innerHTML = val
          ? `<img src="${escapeHtml(val)}" alt="Foto do grupo" class="w-full h-full object-cover" />`
          : escapeHtml(nameVal.charAt(0).toUpperCase());
      }
    }
  });

  document.addEventListener("submit", async (e) => {
    const form = e.target;
    e.preventDefault();

    if (form.id === "login-form") {
      const identifier = document.getElementById("login-identifier")?.value.trim();
      const password = document.getElementById("login-password")?.value || "";
      try {
        const { user } = await DreamoreDB.loginLocal(identifier, password);
        user.online = state.navigatorOnline !== false;
        syncUserToStore(user);
        runtime.authError = "";
        runtime.screen = "app";
        navigateTo("lobby", { skipLoader: true });
        showToast(`Bem-vindo de volta, ${user.name}!`, "success");
      } catch (err) {
        runtime.authError = err.message;
        renderApp();
      }
      return;
    }

    if (form.id === "register-form") {
      const username = document.getElementById("reg-username")?.value.trim();
      const email = document.getElementById("reg-email")?.value.trim();
      const password = document.getElementById("reg-password")?.value || "";
      const role = document.getElementById("reg-role")?.value || "Desenvolvedor";
      try {
        const { user } = await DreamoreDB.registerLocal({ username, email, password, role });
        user.online = state.navigatorOnline !== false;
        syncUserToStore(user);
        DreamoreDB.setPresence(user.username, user.online).catch(() => {});
        runtime.authError = "";
        runtime.screen = "app";
        navigateTo("lobby", { skipLoader: true });
        showToast("Conta criada com sucesso na DREAMORE+!", "success");
      } catch (err) {
        runtime.authError = err.message;
        renderApp();
      }
      return;
    }

    if (form.id === "create-project-form") {
      const draft = {
        titlePt: document.getElementById("cp-title")?.value,
        synopsisPt: document.getElementById("cp-synopsis")?.value,
        ageRating: document.getElementById("cp-age")?.value,
        ageDetails: document.getElementById("cp-age-details")?.value,
        antiAiAccepted: document.getElementById("cp-anti-ai")?.checked,
      };
      const check = validateProjectDraft(draft);
      if (!check.valid) {
        showToast(check.error, "error");
        return;
      }
      const ml = buildMultilingualFields(draft.titlePt.trim(), draft.synopsisPt.trim());
      const releaseDate = document.getElementById("cp-release-date")?.value || "2028-12-01";
      const projIcon = document.getElementById("cp-icon")?.value || state.selectedIcon || "gamepad";
      try {
        const res = await DreamoreDB.createProject({
          ...ml,
          icon: projIcon,
          releaseDate,
          genre: document.getElementById("cp-genre")?.value || "Plataforma",
          year: Number(String(releaseDate).slice(0, 4)) || 2028,
          progress: Number(document.getElementById("cp-progress")?.value || 10),
          ageRating: draft.ageRating,
          ageDetails: draft.ageDetails || "",
          goal: Number(document.getElementById("cp-goal")?.value || 5000),
          creator: state.user?.name || state.user?.username || "Criador",
          cover: runtime.draftCoverDataUrl || "",
          gallery: runtime.draftCoverDataUrl ? [runtime.draftCoverDataUrl] : [],
          team: [{ name: state.user?.name || state.user?.username, role: "Criador(a)", social: `@${state.user?.username}` }],
        });
        state.projects.unshift(res.project);
        DreamoreFirebase.saveProject(res.project).catch(() => {});
        runtime.draftCoverDataUrl = "";
        state.selectedIcon = "gamepad";
        state.selectedProjectId = res.project.id;
        navigateTo("project-detail");
        showToast("Projeto publicado no Lobby!", "success");
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (form.id === "edit-project-form") {
      const id = form.dataset.id;
      const existing = state.projects.find((p) => p.id === id);
      const titlePt = document.getElementById("ep-title")?.value.trim() || "";
      const synPt = document.getElementById("ep-synopsis")?.value.trim() || "";
      const ml = buildMultilingualFields(titlePt, synPt);
      const customEn = document.getElementById("ep-title-en")?.value.trim();
      const customEs = document.getElementById("ep-title-es")?.value.trim();
      const synUnchanged = existing?.synopsis?.pt && synPt === String(existing.synopsis.pt).trim();
      const nextSynopsis =
        synUnchanged && existing.synopsis.en && existing.synopsis.es
          ? existing.synopsis
          : ml.synopsis;
      const releaseDate = document.getElementById("ep-release-date")?.value || "2028-12-01";
      const coverUrl = document.getElementById("ep-cover-url")?.value.trim() || "";
      const existingGallery = runtime.editProjectDraft?.gallery || [];
      const gallery = coverUrl
        ? [coverUrl, ...existingGallery.filter((g) => g && g !== coverUrl)]
        : existingGallery;

      try {
        const res = await DreamoreDB.updateProject(id, {
          title: {
            pt: titlePt,
            en: customEn || ml.title.en,
            es: customEs || ml.title.es,
          },
          synopsis: nextSynopsis,
          icon: document.getElementById("ep-icon")?.value || runtime.editProjectDraft?.icon || "gamepad",
          creator: document.getElementById("ep-creator")?.value.trim() || "Criador",
          genre: document.getElementById("ep-genre")?.value,
          releaseDate,
          year: Number(String(releaseDate).slice(0, 4)) || 2028,
          progress: Math.max(0, Math.min(100, Number(document.getElementById("ep-progress")?.value || 0))),
          goal: Math.max(100, Number(document.getElementById("ep-goal")?.value || 1000)),
          ageRating: document.getElementById("ep-age")?.value,
          cover: coverUrl,
          gallery,
        });
        state.projects = state.projects.map((p) => (p.id === id ? res.project : p));
        DreamoreFirebase.saveProject(res.project).catch(() => {});
        runtime.editProjectDraft = null;
        closeModal();
        renderApp();
        showToast("Projeto atualizado com sucesso!", "success");
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (form.id === "project-comment-form") {
      const id = form.dataset.id;
      const text = document.getElementById("project-comment-input")?.value.trim();
      if (!text) return;
      try {
        const res = await DreamoreDB.addProjectComment(id, {
          author: state.user?.name || state.user?.username,
          role: state.user?.role || "Visitante",
          text,
        });
        state.projects = state.projects.map((p) =>
          p.id === id ? res.project || { ...p, comments: [res.comment, ...(p.comments || [])] } : p
        );
        renderApp();
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (form.id === "apply-team-form") {
      const id = form.dataset.id;
      const role = document.getElementById("apply-role")?.value;
      const portfolio = document.getElementById("apply-portfolio")?.value.trim();
      const experienceLevel = document.getElementById("apply-exp")?.value || "Intermediário (2-4 anos)";
      const availability = document.getElementById("apply-availability")?.value.trim() || "Flexível";
      const skills = document.getElementById("apply-skills")?.value.trim() || "";
      const resume = document.getElementById("apply-resume")?.value.trim();
      const check = validateApplication({ role, resume });
      if (!check.valid) {
        showToast(check.error, "error");
        return;
      }
      try {
        const res = await DreamoreDB.submitApplication(id, {
          applicant: state.user?.name || state.user?.username,
          username: state.user?.username,
          role,
          experienceLevel,
          availability,
          skills,
          portfolio,
          resume,
        });
        state.applications.unshift(res.application);
        renderApp();
        showToast("Currículo enviado para análise do estúdio!", "success");
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (form.id === "feed-post-form") {
      const projectId = document.getElementById("feed-project")?.value || "";
      const proj = state.projects.find((p) => p.id === projectId);
      const tag = document.getElementById("feed-tag")?.value || "Atualização";
      const milestone = document.getElementById("feed-milestone")?.value.trim() || "";
      const content = document.getElementById("feed-content")?.value.trim() || "";
      if (!content) return;
      try {
        const res = await DreamoreDB.createFeedPost({
          author: state.user?.name || state.user?.username,
          username: state.user?.username,
          role: state.user?.role || "Desenvolvedor",
          projectId,
          projectTitle: proj ? proj.title.pt : "Comunidade Geral",
          tag,
          milestone,
          content,
          image: runtime.draftFeedImage || "",
        });
        state.feedPosts.unshift(res.post);
        DreamoreFirebase.saveFeedPost(res.post).catch(() => {});
        runtime.draftFeedImage = "";
        renderApp();
        showToast("Avanço publicado no Feed!", "success");
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (form.classList.contains("feed-comment-form")) {
      const id = form.dataset.id;
      const input = form.querySelector("input");
      const text = input?.value.trim();
      if (!text) return;
      try {
        const res = await DreamoreDB.commentFeedPost(id, {
          author: state.user?.name || state.user?.username,
          text,
        });
        if (res.post) {
          state.feedPosts = state.feedPosts.map((p) => (p.id === id ? res.post : p));
          DreamoreFirebase.saveFeedPost(res.post).catch(() => {});
        }
        renderApp();
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (form.id === "mentor-chat-form") {
      const input = document.getElementById("mentor-chat-input");
      const text = input?.value.trim();
      if (!text) return;
      try {
        const res = await DreamoreDB.sendMentorMessage({
          author: state.user?.name || state.user?.username,
          role: state.user?.role || "Dev",
          text,
        });
        const msgs = res.messages || [];
        msgs.forEach((m) => m.id && runtime.knownMsgIds.add(m.id));
        state.gamedevHelp.mentorMessages.push(...msgs);
        renderApp();
        const reply = msgs.find((m) => m.author !== (state.user?.name || state.user?.username));
        if (reply) {
          notifyIncomingMessage({
            sender: reply.author,
            preview: reply.text,
            channelId: "help:mentors",
          });
        }
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (form.id === "chat-send-form") {
      const input = document.getElementById("chat-msg-input");
      const text = input?.value.trim() || "";
      if (!text && !state.chatAttachment) return;
      try {
        const res = await DreamoreDB.sendChatMessage(state.activeChannelId, {
          user: state.user?.name || state.user?.username,
          role: state.user?.role || "Membro",
          text,
          attachment: state.chatAttachment,
        });
        if (res.message?.id) runtime.knownMsgIds.add(res.message.id);
        if (!state.chats[state.activeChannelId]) state.chats[state.activeChannelId] = [];
        state.chats[state.activeChannelId].push(res.message);
        const activeGrp = state.activeChannelId.startsWith("grp:")
          ? (state.groups || []).find((g) => `grp:${g.id}` === state.activeChannelId)
          : null;
        DreamoreFirebase.sendChatMessage(state.activeChannelId, res.message, activeGrp).catch(() => {});
        state.chatAttachment = null;
        renderApp();
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (form.id === "create-group-form") {
      const name = document.getElementById("grp-name")?.value.trim() || "";
      const desc = document.getElementById("grp-desc")?.value.trim() || "";
      const visibility = document.getElementById("grp-visibility")?.value || "public";
      const photo = clampString(
        document.getElementById("grp-photo-url")?.value.trim() || runtime.draftGroupPhoto || "",
        260000
      );
      const selectedMembers = Array.from(form.querySelectorAll('input[name="grp-members"]:checked')).map((el) => el.value);
      const selectedMods = Array.from(form.querySelectorAll('input[name="grp-mods"]:checked')).map((el) => el.value);

      const check = normalizeGroupPayload(
        { name, desc, photo, visibility, members: selectedMembers, moderators: selectedMods },
        null,
        state.user
      );
      if (!check.valid) {
        showToast(check.error, "error");
        return;
      }

      try {
        const res = await DreamoreDB.createGroup(check.group);
        state.groups.push(res.group);
        DreamoreFirebase.createOrUpdateGroup(res.group).catch(() => {});
        runtime.draftGroupPhoto = "";
        state.activeChannelId = `grp:${res.group.id}`;
        state.chatComposerMode = "";
        renderApp();
        showToast(`Grupo "${res.group.name}" criado com foto e moderadores!`, "success");
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (form.id === "edit-group-form") {
      const id = form.dataset.id;
      const existingGrp = (state.groups || []).find((g) => g.id === id);
      if (!existingGrp) return;
      const name = document.getElementById("eg-name")?.value.trim() || "";
      const desc = document.getElementById("eg-desc")?.value.trim() || "";
      const visibility = document.getElementById("eg-visibility")?.value || "public";
      const photo = clampString(
        document.getElementById("eg-photo-url")?.value.trim() || runtime.editGroupPhoto || "",
        260000
      );
      const selectedMembers = Array.from(form.querySelectorAll('input[name="eg-members"]:checked')).map((el) => el.value);
      const selectedMods = Array.from(form.querySelectorAll('input[name="eg-mods"]:checked')).map((el) => el.value);

      const check = normalizeGroupPayload(
        { name, desc, photo, visibility, members: selectedMembers, moderators: selectedMods },
        existingGrp,
        state.user
      );
      if (!check.valid) {
        showToast(check.error, "error");
        return;
      }

      try {
        const res = await DreamoreDB.updateGroup(id, check.group);
        state.groups = state.groups.map((g) => (g.id === id ? res.group : g));
        DreamoreFirebase.createOrUpdateGroup(res.group).catch(() => {});
        runtime.editGroupPhoto = "";
        closeModal();
        renderApp();
        showToast(`Grupo "${res.group.name}" atualizado!`, "success");
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    if (form.id === "profile-editor-form" && state.user) {
      const skillsRaw = document.getElementById("pe-skills")?.value || "";
      const photoVal =
        document.getElementById("pe-photo-value")?.value ??
        document.getElementById("pe-photo-url")?.value.trim() ??
        state.user.photo;
      const patch = {
        name: document.getElementById("pe-name")?.value.trim() || state.user.name,
        location: document.getElementById("pe-location")?.value.trim() || "",
        site: document.getElementById("pe-site")?.value.trim() || "",
        bio: document.getElementById("pe-bio")?.value.trim() || "",
        resume: document.getElementById("pe-resume")?.value.trim() || "",
        banner: document.getElementById("pe-banner-value")?.value || state.user.banner,
        photo: clampString(photoVal, 260000),
        socials: {
          youtube: document.getElementById("pe-youtube")?.value.trim() || "",
          twitter: document.getElementById("pe-twitter")?.value.trim() || "",
          instagram: document.getElementById("pe-instagram")?.value.trim() || "",
          linkedin: document.getElementById("pe-linkedin")?.value.trim() || "",
          github: document.getElementById("pe-github")?.value.trim() || "",
          itch: document.getElementById("pe-itch")?.value.trim() || "",
        },
        skills: skillsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      try {
        const res = await DreamoreDB.updateUser(state.user.username, patch);
        syncUserToStore({ ...state.user, ...res.user });
        DreamoreFirebase.syncCurrentUserProfile(state.user).catch(() => {});
        closeModal();
        renderApp();
        showToast("Perfil, foto, banner e links atualizados!", "success");
      } catch (err) {
        showToast(err.message, "error");
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

async function pollLiveUpdates() {
  if (runtime.screen !== "app" || !state.user || !state.navigatorOnline) return;
  try {
    const syncData = await DreamoreDB.sync();
    if (Array.isArray(syncData.users)) {
      state.users = syncData.users;
      const freshMe = state.users.find((u) => sanitizeKey(u.username) === sanitizeKey(state.user.username));
      if (freshMe) state.user = { ...state.user, ...freshMe, online: state.navigatorOnline };
    }
    if (Array.isArray(syncData.groups)) state.groups = syncData.groups;
    if (Array.isArray(syncData.applications)) state.applications = syncData.applications;

    const myName = state.user?.name || state.user?.username || "";
    const incoming = [];
    if (syncData.chats) {
      Object.entries(syncData.chats).forEach(([cid, msgs]) => {
        (msgs || []).forEach((m) => {
          if (m.id && !runtime.knownMsgIds.has(m.id)) {
            runtime.knownMsgIds.add(m.id);
            if (m.user && m.user !== myName && m.user !== state.user?.username) {
              incoming.push({ sender: m.user, preview: m.text || "Imagem recebida", channelId: cid });
            }
          }
        });
      });
      state.chats = syncData.chats;
    }

    if (incoming.length) {
      incoming.forEach((item) => notifyIncomingMessage(item));
    }
  } catch (_err) {
    // Silent background sync retry on next interval
  }
}

function attachFirebaseLiveSync() {
  if (!DreamoreFirebase.getCurrentAuthUser()) return;
  DreamoreFirebase.attachListeners({
    onUsers(remoteUsers) {
      if (!remoteUsers.length) return;
      state.users = DreamoreFirebase.mergeUsersByUsername(state.users, remoteUsers);
      if (state.user) {
        const me = state.users.find((u) => sanitizeKey(u.username) === sanitizeKey(state.user.username));
        if (me) state.user = { ...state.user, ...me, online: state.navigatorOnline };
      }
      if (runtime.screen === "app" && !document.getElementById("active-modal-backdrop")) renderApp();
    },
    onProjects(remoteProjects) {
      if (!remoteProjects.length) return;
      const byId = new Map((state.projects || []).map((p) => [p.id, p]));
      remoteProjects.forEach((rp) => {
        const prev = byId.get(rp.id) || {};
        byId.set(rp.id, { ...prev, ...rp });
      });
      state.projects = Array.from(byId.values());
      if (runtime.screen === "app" && !document.getElementById("active-modal-backdrop")) renderApp();
    },
    onGroups(remoteGroups) {
      if (!remoteGroups.length) return;
      const byId = new Map((state.groups || []).map((g) => [g.id, g]));
      remoteGroups.forEach((rg) => {
        const prev = byId.get(rg.id) || {};
        byId.set(rg.id, { ...prev, ...rg });
      });
      state.groups = Array.from(byId.values());
      if (runtime.screen === "app" && !document.getElementById("active-modal-backdrop")) renderApp();
    },
    onFeedPosts(remoteFeed) {
      if (!remoteFeed.length) return;
      const byId = new Map((state.feedPosts || []).map((f) => [f.id, f]));
      remoteFeed.forEach((rf) => {
        const prev = byId.get(rf.id) || {};
        byId.set(rf.id, { ...prev, ...rf });
      });
      state.feedPosts = Array.from(byId.values());
      if (runtime.screen === "app" && !document.getElementById("active-modal-backdrop")) renderApp();
    },
  });
}

async function init() {
  loadSavedPreferences();
  applyThemeAndA11y();
  bindGlobalEvents();

  DreamoreFirebase.init().catch(() => {});

  window.addEventListener("online", () => {
    state.navigatorOnline = true;
    if (state.user) {
      state.user.online = true;
      syncUserToStore(state.user);
      DreamoreDB.setPresence(state.user.username, true).catch(() => {});
      DreamoreFirebase.syncCurrentUserProfile(state.user).catch(() => {});
    }
    renderApp();
    showToast("Conexão restabelecida · Status Online", "success");
  });

  window.addEventListener("offline", () => {
    state.navigatorOnline = false;
    if (state.user) {
      state.user.online = false;
      syncUserToStore(state.user);
    }
    renderApp();
    showToast("Sem conexão · Status Offline", "info");
  });

  const params = new URLSearchParams(window.location.search);
  const autostart = params.get("autostart") === "1";
  const requestedPage = params.get("page");

  try {
    const [boot, gCfg] = await Promise.all([
      DreamoreDB.bootstrap(),
      DreamoreDB.getGoogleConfig().catch(() => ({ enabled: false, clientId: "" })),
    ]);

    state.projects = boot.projects || [];
    state.users = boot.users || [];
    state.genres = boot.genres || [];
    state.defaultBanners = boot.defaultBanners || [];
    state.feedPosts = boot.feedPosts || [];
    state.chats = boot.chats || {};
    state.groups = boot.groups || [];
    state.gamedevHelp = boot.gamedevHelp || { docs: [], videos: [], courses: [], mentorMessages: [] };
    state.marketplace = boot.marketplace || [];
    state.news = boot.news || [];
    state.affiliated = boot.affiliated || [];
    state.applications = boot.applications || [];
    state.courseProgress = boot.courseProgress || {};
    state.salesHistory = boot.salesHistory || [];
    state.visitsCount = boot.visitsCount || 1482;

    collectKnownMessageIds();

    runtime.googleEnabled = Boolean(gCfg.enabled || DreamoreFirebase.isConfigured());
    runtime.googleClientId = gCfg.clientId || "";
  } catch (err) {
    showToast("Falha ao sincronizar banco de dados local.", "error");
    console.error(err);
  }

  DreamoreFirebase.onAuthChanged(async (fbUser) => {
    if (fbUser && !state.user && !autostart) {
      try {
        const { user } = await DreamoreDB.loginGoogle({
          email: fbUser.email,
          name: fbUser.displayName,
          photo: fbUser.photoURL,
          sub: fbUser.uid,
        });
        user.uid = fbUser.uid;
        user.photo = user.photo || fbUser.photoURL || "";
        user.online = state.navigatorOnline !== false;
        syncUserToStore(user);
        attachFirebaseLiveSync();
        runtime.screen = "app";
        if (requestedPage) state.page = requestedPage;
        renderApp();
      } catch (_err) {
        // Ignore silent auth restore fallback
      }
    } else if (fbUser && state.user) {
      state.user.uid = fbUser.uid;
      attachFirebaseLiveSync();
    }
  });

  runtime.syncTimer = setInterval(pollLiveUpdates, 8000);

  const savedSession = loadSessionUser();
  if (autostart) {
    const devUser =
      savedSession ||
      state.users.find((u) => u.username === "JoseWillian") ||
      state.users[0] || {
        username: "JoseWillian",
        name: "José Willian",
        email: "jose.willian@dreamore.dev",
        role: "Administrador",
        banner: state.defaultBanners[0] || "",
      };
    devUser.online = state.navigatorOnline !== false;
    syncUserToStore(devUser);
    DreamoreDB.setPresence(devUser.username, devUser.online).catch(() => {});
    runtime.screen = "app";
    if (requestedPage) state.page = requestedPage;
    renderApp();
    return;
  }

  if (savedSession) {
    const fresh = state.users.find((u) => sanitizeKey(u.username) === sanitizeKey(savedSession.username));
    const active = fresh || savedSession;
    active.online = state.navigatorOnline !== false;
    syncUserToStore(active);
    DreamoreDB.setPresence(active.username, active.online).catch(() => {});
    runtime.screen = "app";
    if (requestedPage) state.page = requestedPage;
    renderApp();
    return;
  }

  runtime.screen = "splash";
  renderApp();
  runtime.splashTimer = setTimeout(() => {
    if (runtime.screen === "splash") {
      runtime.screen = "auth";
      renderApp();
    }
  }, 2600);
}

init();
