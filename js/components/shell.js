import { escapeHtml, resolveOnlineStatus } from "../logic.js";
import { getText } from "../i18n.js";
import { state, loadSavedAccounts } from "../state.js";
import { icon, googleLogoSvg } from "../icons.js";

export function presenceBadgeHtml(user, compact = false) {
  const { online, label } = resolveOnlineStatus(user, state.user, state.navigatorOnline);
  const dotCls = online ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-500";
  const textCls = online ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400";
  return `<span class="inline-flex items-center gap-1.5 text-[11px] font-medium ${textCls}" title="${escapeHtml(label)}">
    <span class="w-2 h-2 rounded-full ${dotCls} shrink-0" aria-hidden="true"></span>
    ${compact ? "" : `<span>${escapeHtml(label)}</span>`}
  </span>`;
}

export function avatarHtml(user, sizeClass = "w-9 h-9 text-sm") {
  const initial = escapeHtml((user?.name || user?.username || "S").charAt(0).toUpperCase());
  const altLabel = user?.name || user?.username || "Avatar";
  if (user?.photo) {
    return `<img src="${escapeHtml(user.photo)}" alt="${escapeHtml(altLabel)}" referrerPolicy="no-referrer" class="${sizeClass} rounded-xl object-cover shrink-0 border border-slate-300 dark:border-slate-700" />`;
  }
  return `<span class="${sizeClass} rounded-xl bg-indigo-600 text-white font-display font-bold inline-flex items-center justify-center shrink-0">${initial}</span>`;
}

/**
 * Splash Screen exclusively thanking the site developers (José Willian & João Pedro).
 */
export function renderSplashScreen() {
  const l = state.lang;
  return `
    <div id="splash-screen" class="fixed inset-0 z-50 flex items-center justify-center px-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div class="max-w-xl w-full text-center space-y-6 dm-splash-enter">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white font-display font-bold text-2xl shadow-lg">
          D+
        </div>
        <div class="space-y-3">
          <p class="text-xs font-semibold tracking-wider text-indigo-600 dark:text-indigo-400">
            ${getText(l, "splash_eyebrow")}
          </p>
          <h1 class="font-display text-2xl sm:text-4xl font-bold tracking-tight" style="text-wrap: balance;">
            DREAMORE+
          </h1>
          <p class="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            ${getText(l, "splash_credits")}
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div class="dm-surface rounded-2xl p-5 text-left">
            <div class="font-display font-bold text-lg text-slate-900 dark:text-white">José Willian</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">${getText(l, "role_co_arch")}</div>
          </div>
          <div class="dm-surface rounded-2xl p-5 text-left">
            <div class="font-display font-bold text-lg text-slate-900 dark:text-white">João Pedro</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">${getText(l, "role_co_design")}</div>
          </div>
        </div>

        <div class="pt-4 space-y-3">
          <div class="w-48 h-1 mx-auto rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div class="h-full bg-indigo-600 dark:bg-indigo-400 dm-loader-fill"></div>
          </div>
          <button type="button" data-action="skip-splash" class="text-xs font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            ${getText(l, "splash_continue")}
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Auth Screen with Logo-to-Auth-Tabs transition + slowly moving semi-transparent checkerboard background + Google Sign-In.
 */
export function renderAuthGate(activeTab = "login", authError = "", _googleEnabled = false) {
  const l = state.lang;
  const saved = loadSavedAccounts();

  return `
    <div id="auth-gate" class="fixed inset-0 z-40 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-8">
      <div class="fixed inset-0 dm-checkerboard-bg opacity-70 pointer-events-none"></div>

      <div class="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch dm-logo-to-auth">
        <!-- Left Brand & Google Integration Intro -->
        <div class="lg:col-span-5 dm-surface rounded-2xl p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="w-11 h-11 rounded-xl bg-indigo-600 text-white font-display font-bold text-lg inline-flex items-center justify-center">D+</span>
                <div>
                  <div class="font-display font-bold text-lg leading-tight">DREAMORE+</div>
                  <div class="text-xs text-slate-500 dark:text-slate-400">${getText(l, "brand_sub")}</div>
                </div>
              </div>
              <button type="button" data-action="toggle-theme" aria-label="Alternar tema" class="p-2.5 rounded-xl dm-surface-alt hover:border-indigo-500 transition-colors">
                ${state.themeMode === "dark" ? icon("sun", 18) : icon("moon", 18)}
              </button>
            </div>

            <h2 class="font-display text-2xl font-bold tracking-tight pt-2" style="text-wrap: balance;">
              ${getText(l, "auth_welcome")}
            </h2>
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              ${getText(l, "auth_sub")}
            </p>
          </div>

          ${saved.length ? `
            <div class="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">Contas salvas neste dispositivo</div>
              <div class="space-y-2">
                ${saved.map((acc) => `
                  <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl dm-surface-alt">
                    <button type="button" data-action="quick-login" data-email="${escapeHtml(acc.email)}" class="flex items-center gap-2.5 text-left min-w-0 flex-1">
                      ${avatarHtml(acc, "w-8 h-8 text-xs")}
                      <div class="min-w-0">
                        <div class="text-sm font-semibold truncate">${escapeHtml(acc.name || acc.username)}</div>
                        <div class="text-xs text-slate-500 dark:text-slate-400 truncate">${escapeHtml(acc.email)}</div>
                      </div>
                    </button>
                    <button type="button" data-action="remove-saved-acc" data-email="${escapeHtml(acc.email)}" aria-label="Remover conta salva" class="p-1.5 text-slate-400 hover:text-rose-500">
                      ${icon("close", 14)}
                    </button>
                  </div>
                `).join("")}
              </div>
            </div>
          ` : `
            <div class="text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-800">
              ${getText(l, "auth_pledge")}
            </div>
          `}
        </div>

        <!-- Right Auth Card -->
        <div class="lg:col-span-7 dm-surface rounded-2xl p-6 sm:p-8 flex flex-col justify-center space-y-6">
          <div class="flex items-center justify-between gap-4">
            <div class="inline-flex p-1 rounded-xl dm-surface-alt" role="tablist">
              <button type="button" role="tab" aria-selected="${activeTab === "login"}" data-action="switch-auth-tab" data-tab="login"
                class="px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${activeTab === "login" ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"}">
                ${getText(l, "auth_tab_login")}
              </button>
              <button type="button" role="tab" aria-selected="${activeTab === "register"}" data-action="switch-auth-tab" data-tab="register"
                class="px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${activeTab === "register" ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"}">
                ${getText(l, "auth_tab_register")}
              </button>
            </div>

            <select data-action="change-lang" aria-label="Idioma" class="px-3 py-2 rounded-xl dm-surface-alt text-xs font-semibold">
              <option value="pt" ${state.lang === "pt" ? "selected" : ""}>PT-BR</option>
              <option value="en" ${state.lang === "en" ? "selected" : ""}>EN</option>
              <option value="es" ${state.lang === "es" ? "selected" : ""}>ES</option>
            </select>
          </div>

          <button type="button" data-action="google-signin"
            class="w-full py-3 px-4 rounded-xl bg-white text-slate-900 border border-slate-300 hover:bg-slate-100 font-semibold text-sm flex items-center justify-center gap-3 shadow-xs transition-colors">
            ${googleLogoSvg()}
            <span>${getText(l, "auth_google")}</span>
            <span class="text-xs text-slate-500 font-normal">· Firebase Auth</span>
          </button>

          <div class="flex items-center gap-3 text-xs text-slate-400">
            <span class="h-px flex-1 bg-slate-200 dark:bg-slate-800"></span>
            <span>${getText(l, "auth_or")}</span>
            <span class="h-px flex-1 bg-slate-200 dark:bg-slate-800"></span>
          </div>

          ${authError ? `
            <div role="alert" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-600 dark:text-rose-400 font-medium">
              ${escapeHtml(authError)}
            </div>
          ` : ""}

          ${activeTab === "login" ? `
            <form id="login-form" class="space-y-4">
              <div>
                <label for="login-identifier" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">${getText(l, "auth_user_label")}</label>
                <input id="login-identifier" type="text" required placeholder="JoseWillian ou email@exemplo.com"
                  class="w-full px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label for="login-password" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">${getText(l, "auth_pass_label")}</label>
                <input id="login-password" type="password" required placeholder="••••••••"
                  class="w-full px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button type="submit" class="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors">
                ${getText(l, "auth_tab_login")}
              </button>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                ${getText(l, "auth_hint")}
              </p>
            </form>
          ` : `
            <form id="register-form" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="reg-username" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">${getText(l, "auth_user_label")}</label>
                  <input id="reg-username" type="text" required minlength="3" placeholder="Ex: DevIndieBR"
                    class="w-full px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label for="reg-role" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Role</label>
                  <select id="reg-role" class="w-full px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm">
                    <option value="Desenvolvedor">Desenvolvedor</option>
                    <option value="Visitante">Visitante / Apoiador</option>
                  </select>
                </div>
              </div>
              <div>
                <label for="reg-email" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">E-mail</label>
                <input id="reg-email" type="email" required placeholder="voce@estudio.com"
                  class="w-full px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label for="reg-password" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">${getText(l, "auth_pass_label")}</label>
                <input id="reg-password" type="password" required minlength="4" placeholder="Mínimo 4 caracteres"
                  class="w-full px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button type="submit" class="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors">
                ${getText(l, "auth_create_btn")}
              </button>
            </form>
          `}
        </div>
      </div>
    </div>
  `;
}

export function renderSidebar() {
  const l = state.lang;
  const u = state.user || { username: "Sonhador", name: "Sonhador", role: "Visitante" };
  const collapsed = state.sidebarCollapsed;

  const sections = [
    {
      label: getText(l, "sec_discover"),
      items: [
        { id: "lobby", icon: "lobby", label: getText(l, "nav_lobby") },
        { id: "explore", icon: "explore", label: getText(l, "nav_explore") },
        { id: "create", icon: "create", label: getText(l, "nav_create") },
      ],
    },
    {
      label: getText(l, "sec_create"),
      items: [
        { id: "feed", icon: "feed", label: getText(l, "nav_feed") },
        { id: "help", icon: "help", label: getText(l, "nav_help") },
        { id: "chat", icon: "chat", label: getText(l, "nav_chat") },
        { id: "plans", icon: "plans", label: getText(l, "nav_plans") },
        { id: "market", icon: "market", label: getText(l, "nav_market") },
      ],
    },
    {
      label: getText(l, "sec_account"),
      items: [
        { id: "guide", icon: "guide", label: getText(l, "nav_guide") },
        { id: "profile", icon: "profile", label: getText(l, "nav_profile") },
        { id: "settings", icon: "settings", label: getText(l, "nav_settings") },
        { id: "dashboard", icon: "dashboard", label: getText(l, "nav_dashboard") },
      ],
    },
  ];

  const isActive = (id) =>
    state.page === id || (id === "lobby" && state.page === "project-detail");

  return `
    ${state.mobileSidebarOpen ? `<div data-action="close-mobile-sidebar" class="fixed inset-0 z-30 bg-black/50 lg:hidden"></div>` : ""}
    <aside id="app-sidebar" aria-label="Menu principal"
      class="dm-sidebar ${collapsed ? "is-collapsed" : ""} fixed lg:sticky top-0 left-0 z-40 h-screen dm-surface border-r flex flex-col justify-between shrink-0 ${state.mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}">
      <div class="flex flex-col min-h-0 flex-1">
        <!-- Brand Header + Collapse Toggle -->
        <div class="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <button type="button" data-action="nav" data-page="lobby" class="flex items-center gap-3 min-w-0 text-left">
            <span class="w-9 h-9 rounded-xl bg-indigo-600 text-white font-display font-bold text-sm inline-flex items-center justify-center shrink-0">D+</span>
            <div class="dm-brand-sub min-w-0">
              <div class="font-display font-bold text-base leading-none truncate">DREAMORE+</div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">${getText(l, "brand_sub")}</div>
            </div>
          </button>
          <button type="button" data-action="toggle-sidebar-collapse" aria-label="${collapsed ? "Abrir barra lateral" : "Recolher barra lateral"}"
            class="hidden lg:inline-flex p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
            ${collapsed ? icon("chevronRight", 18) : icon("chevronLeft", 18)}
          </button>
          <button type="button" data-action="close-mobile-sidebar" aria-label="Fechar menu"
            class="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            ${icon("close", 18)}
          </button>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          ${sections.map((sec) => `
            <div class="space-y-1">
              <div class="dm-nav-section px-3 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500">${sec.label}</div>
              ${sec.items.map((item) => {
                const active = isActive(item.id);
                return `
                  <button type="button" data-action="nav" data-page="${item.id}" title="${escapeHtml(item.label)}"
                    class="dm-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? "bg-indigo-600 text-white"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    }">
                    <span class="shrink-0">${icon(item.icon, 18)}</span>
                    <span class="dm-nav-label truncate">${escapeHtml(item.label)}</span>
                  </button>
                `;
              }).join("")}
            </div>
          `).join("")}
        </nav>
      </div>

      <!-- Account Footer with Online/Offline Status -->
      <div class="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <button type="button" data-action="nav" data-page="profile" class="flex items-center gap-2.5 min-w-0 text-left flex-1">
          ${avatarHtml(u, "w-9 h-9 text-xs")}
          <div class="dm-user-meta min-w-0">
            <div class="text-sm font-semibold truncate">${escapeHtml(u.name || u.username)}</div>
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
              <span class="truncate">${escapeHtml(u.role || "Visitante")}</span>
              <span>·</span>
              ${presenceBadgeHtml(u)}
            </div>
          </div>
        </button>
        <button type="button" data-action="logout" aria-label="${getText(l, "sign_out")}" title="${getText(l, "sign_out")}"
          class="dm-user-meta p-2 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          ${icon("logout", 16)}
        </button>
      </div>
    </aside>
  `;
}

/**
 * Clean 3-zone Top Header with Notification Bell Icon, Language Switcher, Theme Toggle & Primary CTA.
 */
export function renderTopBar(pageTitle) {
  const l = state.lang;
  const unreadCount = (state.notifications || []).filter((n) => !n.read).length;

  return `
    <header class="sticky top-0 z-20 h-16 px-3 sm:px-8 dm-surface border-b flex items-center justify-between gap-2 sm:gap-4">
      <div class="flex items-center gap-2 sm:gap-3 min-w-0">
        <button type="button" data-action="open-mobile-sidebar" aria-label="Abrir barra lateral"
          class="lg:hidden p-2 rounded-xl dm-surface-alt shrink-0">
          ${icon("menu", 18)}
        </button>
        <button type="button" data-action="toggle-sidebar-collapse" aria-label="Alternar barra lateral"
          class="hidden lg:inline-flex p-2 rounded-xl dm-surface-alt hover:border-indigo-500 transition-colors shrink-0">
          ${icon("menu", 18)}
        </button>
        <div class="flex items-center gap-2 text-sm min-w-0">
          <span class="hidden sm:inline font-display font-bold text-slate-900 dark:text-white whitespace-nowrap shrink-0">DREAMORE+</span>
          <span class="hidden sm:inline text-slate-400" aria-hidden="true">/</span>
          <span class="font-semibold sm:font-medium text-slate-900 sm:text-slate-600 dark:text-white sm:dark:text-slate-300 truncate">${escapeHtml(pageTitle)}</span>
        </div>
      </div>

      <div class="flex items-center gap-1.5 sm:gap-3 shrink-0 relative">
        <!-- Notification Bell Icon + Unread Counter -->
        <button type="button" data-action="toggle-notifications" aria-label="${escapeHtml(getText(l, "notifications_title"))}${unreadCount ? ` (${unreadCount})` : ""}"
          class="relative p-2 rounded-xl dm-surface-alt hover:border-indigo-500 transition-colors shrink-0">
          ${icon("bell", 18)}
          ${unreadCount > 0 ? `
            <span class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-mono-num font-bold inline-flex items-center justify-center">
              ${unreadCount}
            </span>
          ` : ""}
        </button>

        ${state.notificationsOpen ? `
          <div id="notifications-popover" class="absolute right-0 top-12 w-80 sm:w-96 dm-surface rounded-2xl shadow-2xl p-4 space-y-3 z-40">
            <div class="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div class="font-display font-bold text-sm">${escapeHtml(getText(l, "notifications_title"))}</div>
              <button type="button" data-action="mark-notifications-read" class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                ${escapeHtml(getText(l, "notifications_mark_read"))}
              </button>
            </div>
            <div class="max-h-72 overflow-y-auto space-y-2">
              ${(state.notifications || []).length === 0 ? `
                <p class="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">${escapeHtml(getText(l, "notifications_empty"))}</p>
              ` : state.notifications.slice(0, 8).map((n) => `
                <button type="button" data-action="open-notification-chat" data-id="${escapeHtml(n.id)}" data-cid="${escapeHtml(n.channelId || "geral")}"
                  class="w-full dm-surface-alt rounded-xl p-3 text-left space-y-1 hover:border-indigo-500 transition-colors ${n.read ? "opacity-70" : "ring-1 ring-indigo-500/40"}">
                  <div class="flex items-center justify-between gap-2 text-xs">
                    <span class="font-bold text-slate-900 dark:text-white">${escapeHtml(n.sender)}</span>
                    <span class="font-mono-num text-[11px] text-slate-400">${new Date(n.ts || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p class="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">${escapeHtml(n.preview)}</p>
                </button>
              `).join("")}
            </div>
          </div>
        ` : ""}

        <select data-action="change-lang" aria-label="Idioma automático"
          class="px-2 sm:px-2.5 py-2 rounded-xl dm-surface-alt text-xs font-semibold whitespace-nowrap shrink-0">
          <option value="pt" ${state.lang === "pt" ? "selected" : ""}>PT-BR</option>
          <option value="en" ${state.lang === "en" ? "selected" : ""}>EN</option>
          <option value="es" ${state.lang === "es" ? "selected" : ""}>ES</option>
        </select>

        <button type="button" data-action="toggle-theme" aria-label="Alternar tema claro e escuro"
          class="p-2 rounded-xl dm-surface-alt hover:border-indigo-500 transition-colors shrink-0">
          ${state.themeMode === "dark" ? icon("sun", 18) : icon("moon", 18)}
        </button>

        <button type="button" data-action="nav" data-page="create"
          class="px-3 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors">
          ${getText(l, "nav_create")}
        </button>
      </div>
    </header>
  `;
}

export function renderTabLoaderOverlay() {
  const l = state.lang;
  return `
    <div id="tab-loader" class="dm-tab-loader fixed inset-0 z-50 flex items-center justify-center bg-slate-50/85 dark:bg-slate-950/85 backdrop-blur-xs">
      <div class="fixed inset-0 dm-checkerboard-bg opacity-70 pointer-events-none"></div>
      <div class="relative z-10 w-full max-w-md mx-4 dm-surface rounded-2xl p-6 space-y-4 text-center shadow-xl">
        <div class="font-display font-bold text-base text-slate-900 dark:text-white">${getText(l, "loading_title")}</div>
        <div class="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div id="tab-loader-bar" class="h-full bg-indigo-600 dark:bg-indigo-400 dm-loader-fill"></div>
        </div>
        <p id="tab-loader-tip" class="text-xs text-slate-500 dark:text-slate-400">${getText(l, "loading_sub")}</p>
      </div>
    </div>
  `;
}
