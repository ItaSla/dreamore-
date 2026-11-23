import { escapeHtml, sanitizeKey, getSocialLinksList } from "../logic.js";
import { getText, getLocalizedField } from "../i18n.js";
import { state } from "../state.js";
import { icon, projectIconBadge } from "../icons.js";
import { avatarHtml, presenceBadgeHtml } from "./shell.js";

const GUIDE_STEPS = [
  {
    title: "1. Explore o Lobby e Projetos",
    desc: "Use o menu lateral retrátil para navegar pelo Lobby, filtrar os 39 gêneros de jogos, testar demos direto no navegador (como Edd Contra o Mundo) e apoiar criadores.",
    actionPage: "lobby",
    actionLabel: "Ir ao Lobby",
  },
  {
    title: "2. Acompanhe e Publique no Feed",
    desc: "No Feed da Comunidade você compartilha avanços técnicos, capturas de tela, builds jogáveis e troca feedback com outros desenvolvedores.",
    actionPage: "feed",
    actionLabel: "Abrir Feed",
  },
  {
    title: "3. Aprenda em Ajuda a GameDevs",
    desc: "Acesse documentações de GDD, pixel art, engines, videoaulas, cursos com progresso salvo e bate-papo ao vivo com professores.",
    actionPage: "help",
    actionLabel: "Abrir Ajuda a GameDevs",
  },
  {
    title: "4. Proteção de IP e Ética Anti-IA",
    desc: "Arte e áudio na DREAMORE+ são 100% humanos. Se alguém sair de um projeto, seus assets exigem remoção ou autorização com créditos.",
    actionPage: "create",
    actionLabel: "Publicar Projeto",
  },
];

export function renderGuideView() {
  const step = GUIDE_STEPS[state.guideStep] || GUIDE_STEPS[0];

  return `
    <div class="space-y-8">
      <div class="max-w-3xl space-y-2">
        <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Documentação & Primeiros Passos</div>
        <h1 class="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Guia Intuitivo da DREAMORE+</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Entenda rapidamente como funciona cada área do site, seus direitos de propriedade intelectual e o papel de cada perfil.
        </p>
      </div>

      <!-- Interactive Tour Stepper -->
      <section class="dm-surface rounded-2xl p-6 sm:p-8 space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap gap-2">
            ${GUIDE_STEPS.map((s, idx) => `
              <button type="button" data-action="set-guide-step" data-step="${idx}"
                class="px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  idx === state.guideStep ? "bg-indigo-600 text-white" : "dm-surface-alt hover:border-indigo-500"
                }">
                Passo ${idx + 1}
              </button>
            `).join("")}
          </div>
          <span class="text-xs font-mono-num text-slate-400">${state.guideStep + 1} / ${GUIDE_STEPS.length}</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div class="md:col-span-8 space-y-2">
            <h2 class="font-display text-xl font-bold text-slate-900 dark:text-white">${escapeHtml(step.title)}</h2>
            <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">${escapeHtml(step.desc)}</p>
          </div>
          <div class="md:col-span-4 flex flex-wrap md:justify-end gap-2">
            <button type="button" data-action="nav" data-page="${step.actionPage}"
              class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
              ${escapeHtml(step.actionLabel)}
            </button>
            ${state.guideStep < GUIDE_STEPS.length - 1 ? `
              <button type="button" data-action="set-guide-step" data-step="${state.guideStep + 1}"
                class="px-4 py-2.5 rounded-xl dm-surface-alt text-xs font-semibold">
                Próximo passo
              </button>
            ` : ""}
          </div>
        </div>
      </section>

      <!-- Roles Matrix -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="dm-surface rounded-2xl p-6 space-y-3">
          <div class="text-xs font-semibold text-sky-600 dark:text-sky-400">Nível 01</div>
          <h3 class="font-display text-lg font-bold">Visitante / Apoiador</h3>
          <ul class="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>· Curtir (1 voto por conta) e favoritar projetos</li>
            <li>· Comentar e sugerir ideias criativas</li>
            <li>· Jogar demos no navegador e apoiar metas</li>
          </ul>
        </div>

        <div class="dm-surface rounded-2xl p-6 space-y-3">
          <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Nível 02</div>
          <h3 class="font-display text-lg font-bold">Desenvolvedor (Dev)</h3>
          <ul class="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>· Publicar e editar projetos com tradução automática</li>
            <li>· Postar avanços e imagens no Feed da Comunidade</li>
            <li>· Recrutar membros com análise de currículo e vender assets</li>
          </ul>
        </div>

        <div class="dm-surface rounded-2xl p-6 space-y-3">
          <div class="text-xs font-semibold text-amber-600 dark:text-amber-400">Nível 03</div>
          <h3 class="font-display text-lg font-bold">Administrador</h3>
          <ul class="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>· Moderar projetos que violem regras éticas</li>
            <li>· Consultar métricas e receita transparente de 5%</li>
            <li>· Apoiar estúdios e gerenciar campanhas do site</li>
          </ul>
        </div>
      </div>

      <!-- Platform Charter -->
      <section class="dm-surface rounded-2xl p-6 space-y-4">
        <h2 class="font-display text-lg font-bold">Diretrizes de Propriedade Intelectual & Ética</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-300">
          <div class="dm-surface-alt rounded-xl p-4">
            <strong class="text-slate-900 dark:text-white">Proibição de IA Generativa em Arte/Áudio:</strong> Sprites, ilustrações, músicas e efeitos sonoros devem ser feitos por humanos. IA é aceita apenas como apoio auxiliar de código.
          </div>
          <div class="dm-surface-alt rounded-xl p-4">
            <strong class="text-slate-900 dark:text-white">Saída de Membros & Créditos:</strong> Ao deixar uma equipe, todo conteúdo criado pelo membro deve ser removido, salvo autorização explícita com os devidos créditos.
          </div>
          <div class="dm-surface-alt rounded-xl p-4">
            <strong class="text-slate-900 dark:text-white">Classificação +16 e +18 Transparente:</strong> Conteúdos maduros exigem descrição detalhada e selo visível. Conteúdo adulto explícito ou apostas são proibidos.
          </div>
          <div class="dm-surface-alt rounded-xl p-4">
            <strong class="text-slate-900 dark:text-white">Taxa Única Transparente de 5%:</strong> Aplicada sobre doações e vendas para manter servidores e divulgação dos jogos independentes.
          </div>
        </div>
      </section>
    </div>
  `;
}

export function renderProfileView(isPublic = false) {
  let profile = state.user;
  if (isPublic && state.selectedProfileUsername) {
    const key = sanitizeKey(state.selectedProfileUsername);
    profile =
      state.users.find(
        (u) => sanitizeKey(u.username) === key || sanitizeKey(u.name) === key
      ) || {
        username: state.selectedProfileUsername,
        name: state.selectedProfileUsername,
        role: "Desenvolvedor",
        bio: "Integrante ativo nos projetos da comunidade DREAMORE+.",
        banner: state.defaultBanners[0],
        followers: [],
        skills: ["Desenvolvimento Indie"],
      };
  }
  if (!profile) return "";

  const l = state.lang;
  const isMe = !isPublic || (state.user && sanitizeKey(profile.username) === sanitizeKey(state.user.username));
  const bannerUrl = profile.banner || state.defaultBanners[0] || "./assets/art/studio-banner.svg";
  const myProjects = state.projects.filter(
    (p) =>
      p.creator === profile.name ||
      p.creator === profile.username ||
      (p.team || []).some((m) => m.name === profile.name || m.name === profile.username)
  );
  const favProjects = state.projects.filter((p) => state.favoriteProjects.includes(p.id));
  const followers = Array.isArray(profile.followers) ? profile.followers : [];
  const amFollowing = state.user ? followers.some((f) => sanitizeKey(f) === sanitizeKey(state.user.username)) : false;

  return `
    <div class="max-w-5xl mx-auto space-y-6">
      ${isPublic ? `
        <button type="button" data-action="nav" data-page="explore" class="px-3.5 py-2 rounded-xl dm-surface-alt text-xs font-semibold inline-flex items-center gap-2">
          ${icon("chevronLeft", 14)}
          <span>Voltar</span>
        </button>
      ` : ""}

      <!-- Profile Hero Card with Custom Banner -->
      <section class="dm-surface rounded-2xl overflow-hidden">
        <div class="relative h-44 sm:h-60 bg-slate-900">
          <img src="${escapeHtml(bannerUrl)}" alt="Banner do perfil" referrerPolicy="no-referrer" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>
        </div>

        <div class="px-6 sm:px-8 pb-6 -mt-12 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div class="flex flex-col sm:flex-row sm:items-end gap-4">
            <div class="ring-4 ring-white dark:ring-slate-900 rounded-2xl w-fit bg-slate-900">
              ${avatarHtml(profile, "w-24 h-24 text-2xl")}
            </div>
            <div class="space-y-1 pt-2 sm:pt-0">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white">${escapeHtml(profile.name || profile.username)}</h1>
                <span class="text-xs font-mono-num text-slate-500 dark:text-slate-400">@${escapeHtml(profile.username)}</span>
                ${presenceBadgeHtml(profile)}
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400">
                ${escapeHtml(profile.role || "Visitante")}
                ${profile.location ? ` · ${escapeHtml(profile.location)}` : ""}
                · <span class="tabular-nums">${followers.length} ${getText(l, "profile_followers")}</span>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            ${isMe ? `
              <label class="px-3.5 py-2.5 rounded-xl dm-surface-alt hover:border-indigo-500 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5">
                ${icon("image", 14)}
                <span>Alterar Foto</span>
                <input id="profile-quick-photo-input" type="file" accept="image/*" class="hidden" />
              </label>
              <button type="button" data-action="open-profile-editor"
                class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
                ${getText(l, "profile_edit_btn")}
              </button>
            ` : `
              <button type="button" data-action="toggle-follow" data-username="${escapeHtml(profile.username)}"
                class="px-4 py-2 rounded-xl ${amFollowing ? "dm-surface-alt" : "bg-indigo-600 text-white"} text-xs font-semibold">
                ${amFollowing ? "Seguindo" : "Seguir Criador"}
              </button>
              <button type="button" data-action="start-dm" data-username="${escapeHtml(profile.username)}"
                class="px-4 py-2 rounded-xl dm-surface-alt hover:border-indigo-500 text-xs font-semibold">
                Enviar Mensagem
              </button>
            `}
          </div>
        </div>

        <div class="px-6 sm:px-8 pb-6 pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-6">
          <div class="md:col-span-7 space-y-3">
            <div>
              <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">${getText(l, "profile_about")}</div>
              <p class="text-sm text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">
                ${escapeHtml(profile.bio || "Nenhuma biografia adicionada ainda. Clique em Editar Perfil para personalizar seu espaço, links e banner.")}
              </p>
            </div>
            ${profile.resume ? `
              <div>
                <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">${getText(l, "profile_resume")}</div>
                <p class="text-sm text-slate-700 dark:text-slate-200 mt-1">${escapeHtml(profile.resume)}</p>
              </div>
            ` : ""}
          </div>

          <div class="md:col-span-5 space-y-3 text-xs">
            ${(() => {
              const links = getSocialLinksList(profile);
              if (!links.length) return "";
              const iconMap = {
                portfolio: "globe",
                youtube: "youtube",
                twitter: "twitter",
                instagram: "instagram",
                linkedin: "linkedin",
                github: "github",
                itch: "gamepad",
              };
              return `
                <div>
                  <div class="text-slate-500 dark:text-slate-400 font-semibold mb-2">${getText(l, "profile_links")}</div>
                  <div class="flex flex-wrap gap-2">
                    ${links.map((lk) => `
                      <a href="${escapeHtml(lk.url)}" target="_blank" rel="noopener noreferrer"
                        class="px-3 py-1.5 rounded-xl dm-surface-alt hover:border-indigo-500 inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 transition-colors">
                        ${icon(iconMap[lk.key] || "link", 14)}
                        <span>${escapeHtml(lk.label)}</span>
                      </a>
                    `).join("")}
                  </div>
                </div>
              `;
            })()}
            ${(profile.skills && profile.skills.length) ? `
              <div>
                <div class="text-slate-500 dark:text-slate-400 font-semibold mb-1">${getText(l, "profile_skills")}</div>
                <div class="text-slate-700 dark:text-slate-200">${profile.skills.map(escapeHtml).join(" · ")}</div>
              </div>
            ` : ""}
          </div>
        </div>
      </section>

      <!-- Projects & Favorites -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section class="dm-surface rounded-2xl p-6 space-y-4">
          <h2 class="font-display font-bold text-lg">Projetos na Plataforma (${myProjects.length})</h2>
          ${myProjects.length === 0 ? `<p class="text-xs text-slate-500 dark:text-slate-400">Nenhum projeto vinculado ainda.</p>` : `
            <div class="space-y-2.5">
              ${myProjects.map((p) => `
                <button type="button" data-action="open-project" data-id="${escapeHtml(p.id)}"
                  class="w-full dm-surface-alt rounded-xl p-3.5 text-left flex items-center justify-between gap-2 hover:border-indigo-500">
                  <div>
                    <div class="font-semibold text-sm">${escapeHtml(p.title.pt)}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(p.genre)} · ${p.progress}%</div>
                  </div>
                  <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Abrir</span>
                </button>
              `).join("")}
            </div>
          `}
        </section>

        <section class="dm-surface rounded-2xl p-6 space-y-4">
          <h2 class="font-display font-bold text-lg">Projetos Favoritos (${favProjects.length})</h2>
          ${favProjects.length === 0 ? `<p class="text-xs text-slate-500 dark:text-slate-400">Explore o Lobby e favorite os projetos que você apoia.</p>` : `
            <div class="space-y-2.5">
              ${favProjects.map((p) => `
                <button type="button" data-action="open-project" data-id="${escapeHtml(p.id)}"
                  class="w-full dm-surface-alt rounded-xl p-3.5 text-left flex items-center justify-between gap-2 hover:border-indigo-500">
                  <div>
                    <div class="font-semibold text-sm">${escapeHtml(p.title.pt)}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(p.creator)}</div>
                  </div>
                  <span class="text-xs font-mono-num text-amber-500">${p.favorites} ★</span>
                </button>
              `).join("")}
            </div>
          `}
        </section>
      </div>
    </div>
  `;
}

export function renderSettingsView() {
  const a = state.a11y;
  const l = state.lang;

  const toggleRow = (key, title, desc) => `
    <div class="dm-surface-alt rounded-xl p-4 flex items-center justify-between gap-4">
      <div>
        <div class="text-sm font-semibold text-slate-900 dark:text-white">${title}</div>
        ${desc ? `<div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${desc}</div>` : ""}
      </div>
      <button type="button" role="switch" aria-checked="${Boolean(a[key])}" data-action="toggle-a11y" data-key="${key}"
        class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
          a[key] ? "bg-indigo-600 text-white" : "dm-surface text-slate-600 dark:text-slate-300"
        }">
        ${a[key] ? "Ligado" : "Desligado"}
      </button>
    </div>
  `;

  return `
    <div class="max-w-4xl mx-auto space-y-8">
      <div>
        <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Preferências & Acessibilidade</div>
        <h1 class="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">Configurações da Conta</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Tema claro/escuro, tradução automática e todos os recursos de acessibilidade reunidos em um único lugar.
        </p>
      </div>

      <!-- Appearance & Language -->
      <section class="dm-surface rounded-2xl p-6 space-y-5">
        <h2 class="font-display font-bold text-lg">Aparência & Idioma Automático</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="dm-surface-alt rounded-xl p-4 space-y-3">
            <div class="text-sm font-semibold">Tema da Interface</div>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" data-action="set-theme" data-mode="light"
                class="py-2.5 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 ${
                  state.themeMode === "light" ? "bg-indigo-600 text-white" : "dm-surface"
                }">
                ${icon("sun", 15)}
                <span>${getText(l, "theme_light")}</span>
              </button>
              <button type="button" data-action="set-theme" data-mode="dark"
                class="py-2.5 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 ${
                  state.themeMode === "dark" ? "bg-indigo-600 text-white" : "dm-surface"
                }">
                ${icon("moon", 15)}
                <span>${getText(l, "theme_dark")}</span>
              </button>
            </div>
          </div>

          <div class="dm-surface-alt rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold">Tradução Automática</div>
              <span class="text-xs text-indigo-600 dark:text-indigo-400 font-medium">${state.lang.toUpperCase()}</span>
            </div>
            <select data-action="change-lang" class="w-full px-3 py-2.5 rounded-xl dm-surface text-xs font-semibold">
              <option value="pt" ${state.lang === "pt" ? "selected" : ""}>Português (Brasil)</option>
              <option value="en" ${state.lang === "en" ? "selected" : ""}>English (Auto-translate)</option>
              <option value="es" ${state.lang === "es" ? "selected" : ""}>Español (Auto-traducir)</option>
            </select>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">${getText(l, "lang_auto_note")}</p>
          </div>
        </div>
      </section>

      <!-- Accessibility Section (Disability Presets + Granular Controls) -->
      <section class="dm-surface rounded-2xl p-6 space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-display font-bold text-lg">Acessibilidade Inclusiva</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Perfis rápidos para surdez, baixa visão, cegueira, epilepsia e daltonismo</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" data-action="speak-page" class="px-3.5 py-2 rounded-xl dm-surface-alt text-xs font-semibold hover:border-indigo-500">
              Ler Página em Voz Alta
            </button>
            <button type="button" data-action="reset-a11y" class="px-3.5 py-2 rounded-xl dm-surface-alt text-xs font-semibold hover:border-rose-500">
              Restaurar Padrões
            </button>
          </div>
        </div>

        <!-- 1-Click Disability Profiles -->
        <div class="space-y-2.5">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">Perfis Rápidos por Necessidade</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button type="button" data-action="apply-a11y-preset" data-preset="deaf"
              class="dm-surface-alt rounded-xl p-4 text-left hover:border-indigo-500 transition-colors ${a.visualAlerts ? "ring-2 ring-indigo-500" : ""}">
              <div class="flex items-center gap-2 font-bold text-sm">
                ${icon("ear", 16)}
                <span>Surdez / Auditiva</span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Ativa alertas visuais de mensagens e legendas visuais na interface.</p>
            </button>

            <button type="button" data-action="apply-a11y-preset" data-preset="low-vision"
              class="dm-surface-alt rounded-xl p-4 text-left hover:border-indigo-500 transition-colors ${Number(a.zoom) >= 125 && a.font ? "ring-2 ring-indigo-500" : ""}">
              <div class="flex items-center gap-2 font-bold text-sm">
                ${icon("eye", 16)}
                <span>Baixa Visão</span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Aplica zoom 125%, fonte legível, alto contraste e botões ampliados.</p>
            </button>

            <button type="button" data-action="apply-a11y-preset" data-preset="blind"
              class="dm-surface-alt rounded-xl p-4 text-left hover:border-indigo-500 transition-colors ${a.sr && a.focus ? "ring-2 ring-indigo-500" : ""}">
              <div class="flex items-center gap-2 font-bold text-sm">
                ${icon("globe", 16)}
                <span>Cegueira / Leitor</span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Ativa foco reforçado, anúncios ARIA ao vivo e leitura automática.</p>
            </button>

            <button type="button" data-action="apply-a11y-preset" data-preset="epilepsy"
              class="dm-surface-alt rounded-xl p-4 text-left hover:border-indigo-500 transition-colors ${a.epilepsySafe ? "ring-2 ring-indigo-500" : ""}">
              <div class="flex items-center gap-2 font-bold text-sm">
                ${icon("shield", 16)}
                <span>Epilepsia Segura</span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Pausa o quadriculado e animações e suaviza brilhos intensos.</p>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="dm-surface-alt rounded-xl p-4 space-y-2">
            <div class="text-xs font-semibold">Contraste</div>
            <div class="grid grid-cols-3 gap-1.5">
              ${[
                ["off", "Padrão"],
                ["high", "Alto Escuro"],
                ["light", "Alto Claro"],
              ].map(([val, label]) => `
                <button type="button" data-action="set-a11y-val" data-key="contrast" data-val="${val}"
                  class="py-2 rounded-lg text-xs font-semibold ${a.contrast === val ? "bg-indigo-600 text-white" : "dm-surface"}">
                  ${label}
                </button>
              `).join("")}
            </div>
          </div>

          <div class="dm-surface-alt rounded-xl p-4 space-y-2">
            <div class="text-xs font-semibold">Zoom de Conteúdo</div>
            <div class="grid grid-cols-4 gap-1.5">
              ${[100, 115, 125, 140].map((z) => `
                <button type="button" data-action="set-a11y-val" data-key="zoom" data-val="${z}"
                  class="py-2 rounded-lg text-xs font-mono-num font-semibold ${Number(a.zoom) === z ? "bg-indigo-600 text-white" : "dm-surface"}">
                  ${z}%
                </button>
              `).join("")}
            </div>
          </div>

          <div class="dm-surface-alt rounded-xl p-4 space-y-2">
            <div class="text-xs font-semibold">Filtro de Daltonismo</div>
            <select data-action="change-colorblind" aria-label="Filtro para daltonismo" class="w-full px-3 py-2 rounded-lg dm-surface text-xs font-semibold">
              <option value="none" ${a.colorBlind === "none" ? "selected" : ""}>Sem filtro</option>
              <option value="protanopia" ${a.colorBlind === "protanopia" ? "selected" : ""}>Protanopia</option>
              <option value="deuteranopia" ${a.colorBlind === "deuteranopia" ? "selected" : ""}>Deuteranopia</option>
              <option value="tritanopia" ${a.colorBlind === "tritanopia" ? "selected" : ""}>Tritanopia</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${toggleRow("visualAlerts", "Alertas Visuais (Surdez)", "Exibe destaque visual e borda luminosa ao receber mensagens")}
          ${toggleRow("sound", "Som de Notificações", "Reproduz alerta sonoro discreto ao receber mensagens")}
          ${toggleRow("epilepsySafe", "Proteção para Epilepsia", "Remove animações rápidas, quadriculado em movimento e picos de brilho")}
          ${toggleRow("font", "Fonte Legível (Verdana/Arial)", "Substitui fontes estilizadas por leitura de alta clareza")}
          ${toggleRow("space", "Espaçamento Ampliado", "Aumenta espaço entre linhas e letras")}
          ${toggleRow("focus", "Foco Reforçado & Sublinhado", "Destaca links e navegação por teclado")}
          ${toggleRow("targets", "Alvos Maiores (Baixa Visão)", "Aumenta altura mínima de botões e campos para 44px+")}
          ${toggleRow("motion", "Reduzir Movimento", "Desativa animações e transições de fundo")}
          ${toggleRow("gray", "Escala de Cinza", "Remove saturação cromática da interface")}
          ${toggleRow("invert", "Inverter Cores", "Aplica inversão cromática de alto impacto")}
          ${toggleRow("sr", "Otimizar para Leitor de Tela (Cegueira)", "Anuncia trocas de tela e move foco automaticamente")}
        </div>
      </section>

      <!-- GitHub & GitHub Pages Integration -->
      <section class="dm-surface rounded-2xl p-6 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-display font-bold text-base">Integração GitHub & GitHub Pages</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Pronto para publicação estática via GitHub Actions (<code>.github/workflows/deploy-pages.yml</code>) com Firebase + cache local.
            </p>
          </div>
          <a href="https://github.com/ItaSla/dreamore-plus" target="_blank" rel="noopener noreferrer"
            class="px-3.5 py-2 rounded-xl dm-surface-alt hover:border-indigo-500 text-xs font-semibold inline-flex items-center gap-2 transition-colors">
            ${icon("github", 15)}
            <span>ItaSla/dreamore-plus</span>
          </a>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div class="dm-surface-alt rounded-xl p-3.5">
            <div class="text-slate-500 dark:text-slate-400">Modo de Dados</div>
            <div class="font-semibold mt-0.5">${window.location.hostname.endsWith("github.io") ? "GitHub Pages (Estático + Firebase)" : "Servidor Express + Firebase"}</div>
          </div>
          <div class="dm-surface-alt rounded-xl p-3.5">
            <div class="text-slate-500 dark:text-slate-400">Build Estático</div>
            <div class="font-mono-num font-semibold mt-0.5">npm run build:pages</div>
          </div>
          <div class="dm-surface-alt rounded-xl p-3.5">
            <div class="text-slate-500 dark:text-slate-400">Arte & Mídia</div>
            <div class="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">100% Vetorial / Zero IA</div>
          </div>
        </div>
      </section>

      <!-- Account Role Tester -->
      <section class="dm-surface rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="font-display font-bold text-base">Função na Plataforma</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Nível atual: <strong>${escapeHtml(state.user?.role || "Visitante")}</strong></p>
        </div>
        <select data-action="switch-role" aria-label="Alternar função da conta" class="px-3.5 py-2 rounded-xl dm-surface-alt text-xs font-semibold">
          <option value="Visitante" ${state.user?.role === "Visitante" ? "selected" : ""}>Visitante / Apoiador</option>
          <option value="Desenvolvedor" ${state.user?.role === "Desenvolvedor" ? "selected" : ""}>Desenvolvedor</option>
          <option value="Administrador" ${state.user?.role === "Administrador" ? "selected" : ""}>Administrador</option>
        </select>
      </section>
    </div>
  `;
}

export function renderDashboardView() {
  const l = state.lang;
  const totalDonated = state.projects.reduce((s, p) => s + (p.donated || 0), 0);
  const totalSales = state.salesHistory.reduce((s, x) => s + (x.amount || 0), 0);
  const platformFee = (totalDonated + totalSales) * 0.05;
  const isAdmin = state.user?.role === "Administrador";

  return `
    <div class="space-y-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white">Painel & Métricas da Plataforma</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Visão consolidada de acessos, projetos humanos e taxa transparente de 5%.</p>
        </div>
        <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Perfil: ${escapeHtml(state.user?.role || "Visitante")}</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div class="dm-surface rounded-2xl p-5">
          <div class="text-xs text-slate-500 dark:text-slate-400">Acessos Registrados</div>
          <div class="font-mono-num text-2xl font-bold mt-1">${state.visitsCount.toLocaleString("pt-BR")}</div>
        </div>
        <div class="dm-surface rounded-2xl p-5">
          <div class="text-xs text-slate-500 dark:text-slate-400">Projetos Verificados</div>
          <div class="font-mono-num text-2xl font-bold mt-1">${state.projects.length}</div>
        </div>
        <div class="dm-surface rounded-2xl p-5">
          <div class="text-xs text-slate-500 dark:text-slate-400">Volume Movimentado</div>
          <div class="font-mono-num text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">R$ ${(totalDonated + totalSales).toFixed(2)}</div>
        </div>
        <div class="dm-surface rounded-2xl p-5">
          <div class="text-xs text-slate-500 dark:text-slate-400">Receita Plataforma (5%)</div>
          <div class="font-mono-num text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">R$ ${platformFee.toFixed(2)}</div>
        </div>
      </div>

      <section class="dm-surface rounded-2xl p-6 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-display font-bold text-lg">Gerenciamento de Projetos (${state.projects.length})</h2>
          ${!isAdmin ? `<button type="button" data-action="enable-admin" class="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">Ativar Modo Administrador</button>` : ""}
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <th class="py-2.5 px-3">Projeto</th>
                <th class="py-2.5 px-3">Criador</th>
                <th class="py-2.5 px-3 text-right">Lançamento</th>
                <th class="py-2.5 px-3 text-right">Progresso</th>
                <th class="py-2.5 px-3 text-right">Arrecadado</th>
                <th class="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              ${state.projects.map((p) => `
                <tr>
                  <td class="py-2.5 px-3 font-semibold">
                    <div class="flex items-center gap-2.5">
                      ${projectIconBadge(p.icon, p.colors, 14)}
                      <button type="button" data-action="open-project" data-id="${escapeHtml(p.id)}" class="hover:text-indigo-500 text-left">
                        ${escapeHtml(getLocalizedField(p.title, l))}
                      </button>
                    </div>
                  </td>
                  <td class="py-2.5 px-3 text-slate-500 dark:text-slate-400">${escapeHtml(p.creator)}</td>
                  <td class="py-2.5 px-3 text-right font-mono-num text-xs">${escapeHtml(p.releaseDate || String(p.year))}</td>
                  <td class="py-2.5 px-3 text-right font-mono-num">${p.progress}%</td>
                  <td class="py-2.5 px-3 text-right font-mono-num">R$ ${(p.donated || 0).toFixed(2)}</td>
                  <td class="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                    <button type="button" data-action="open-edit-project" data-id="${escapeHtml(p.id)}" class="text-xs font-semibold text-indigo-500 hover:underline">Editar</button>
                    ${isAdmin ? `<button type="button" data-action="admin-delete-project" data-id="${escapeHtml(p.id)}" class="text-xs font-semibold text-rose-500 hover:underline">Apagar</button>` : ""}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}
