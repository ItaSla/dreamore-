import {
  escapeHtml,
  filterAndSortProjects,
  generateProjectSvgCover,
  buildMemberDirectory,
} from "../logic.js";
import { getText, getLocalizedField } from "../i18n.js";
import { state } from "../state.js";
import { icon, PROJECT_ICON_OPTIONS, projectIconBadge } from "../icons.js";
import { presenceBadgeHtml } from "./shell.js";

function projectCoverUrl(proj, frame = 1) {
  const gallery = Array.isArray(proj.gallery) ? proj.gallery.filter(Boolean) : [];
  if (gallery.length > 0 && frame <= gallery.length) {
    return gallery[frame - 1];
  }
  if (proj.cover && frame === 1) return proj.cover;
  const title = getLocalizedField(proj.title, state.lang);
  const c1 = (proj.colors && proj.colors[0]) || "#1e1b4b";
  const c2 = (proj.colors && proj.colors[1]) || "#0f766e";
  return generateProjectSvgCover(title, c1, c2, `${proj.genre} · ${proj.releaseDate || proj.year}`, frame);
}

export function renderProjectCard(proj, featured = false) {
  const l = state.lang;
  const title = getLocalizedField(proj.title, l);
  const synopsis = getLocalizedField(proj.synopsis, l);
  const isLiked = state.likedProjects.includes(proj.id);
  const isFav = state.favoriteProjects.includes(proj.id);
  const cover = projectCoverUrl(proj, 1);
  const releaseLabel = proj.releaseDate || String(proj.year || "2028");

  return `
    <article class="dm-surface rounded-2xl overflow-hidden flex flex-col justify-between transition-colors hover:border-indigo-500/60 ${featured ? "ring-1 ring-indigo-500/40" : ""}">
      <div>
        <button type="button" data-action="open-project" data-id="${escapeHtml(proj.id)}" class="block w-full text-left relative aspect-16/10 bg-slate-900 overflow-hidden group">
          <img src="${escapeHtml(cover)}" alt="${escapeHtml(title)}" referrerPolicy="no-referrer" loading="lazy"
            class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent"></div>
          <div class="absolute bottom-3 left-4 right-4 flex items-end gap-3">
            ${projectIconBadge(proj.icon, proj.colors, 18)}
            <div class="min-w-0 space-y-0.5">
              <div class="text-xs font-medium text-slate-300 truncate">${escapeHtml(proj.genre)} · ${escapeHtml(proj.ageRating)} · ${escapeHtml(releaseLabel)}</div>
              <h3 class="font-display font-bold text-base sm:text-lg text-white leading-snug line-clamp-2">${escapeHtml(title)}</h3>
            </div>
          </div>
        </button>

        <div class="p-5 space-y-4">
          <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span class="truncate">${escapeHtml(proj.creator)}</span>
            <span class="tabular-nums shrink-0">${(proj.team || []).length} devs</span>
          </div>

          <p class="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            ${escapeHtml(synopsis)}
          </p>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500 dark:text-slate-400">${getText(l, "development")}</span>
              <span class="font-mono-num font-semibold text-slate-900 dark:text-white">${proj.progress}%</span>
            </div>
            <div class="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div class="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full" style="width: ${Math.max(4, proj.progress)}%"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <button type="button" data-action="toggle-like" data-id="${escapeHtml(proj.id)}" aria-label="Curtir ${escapeHtml(title)}"
            class="px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 dm-surface-alt transition-colors ${isLiked ? "text-rose-500 border-rose-500/40" : "text-slate-600 dark:text-slate-300"}">
            ${icon("heart", 14, isLiked)}
            <span class="tabular-nums">${proj.likes}</span>
          </button>
          <button type="button" data-action="toggle-fav" data-id="${escapeHtml(proj.id)}" aria-label="Favoritar ${escapeHtml(title)}"
            class="px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 dm-surface-alt transition-colors ${isFav ? "text-amber-500 border-amber-500/40" : "text-slate-600 dark:text-slate-300"}">
            ${icon("star", 14, isFav)}
            <span class="tabular-nums">${proj.favorites}</span>
          </button>
        </div>

        <button type="button" data-action="open-project" data-id="${escapeHtml(proj.id)}"
          class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold whitespace-nowrap transition-colors">
          ${getText(l, "show_more")}
        </button>
      </div>
    </article>
  `;
}

export function renderLobbyView() {
  const l = state.lang;
  const sorted = filterAndSortProjects(state.projects, { sort: state.filterSort });
  const featured = [...state.projects].sort((a, b) => b.likes - a.likes).slice(0, 3);
  const totalRaised = state.projects.reduce((sum, p) => sum + (p.donated || 0), 0);
  const uniqueDevs = new Set(state.projects.flatMap((p) => (p.team || []).map((m) => m.name))).size;

  return `
    <div class="space-y-10">
      <!-- Clean Two-Column Editorial Hero -->
      <section class="dm-surface rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div class="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between gap-6">
          <div class="space-y-4">
            <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">${getText(l, "hero_kicker")}</div>
            <h1 class="font-display text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight" style="text-wrap: balance;">
              ${getText(l, "hero_title")}
            </h1>
            <p class="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              ${getText(l, "hero_sub")}
            </p>
          </div>

          <div class="space-y-6">
            <div class="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 max-w-lg">
              <div>
                <div class="font-mono-num text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">${state.projects.length}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">${getText(l, "stat_projects")}</div>
              </div>
              <div>
                <div class="font-mono-num text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">${uniqueDevs}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">${getText(l, "stat_devs")}</div>
              </div>
              <div>
                <div class="font-mono-num text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">R$ ${Math.round(totalRaised).toLocaleString("pt-BR")}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">${getText(l, "stat_raised")}</div>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <button type="button" data-action="nav" data-page="explore"
                class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold whitespace-nowrap transition-colors">
                ${getText(l, "cta_explore")}
              </button>
              <button type="button" data-action="play-demo" data-id="proj-eddsworld"
                class="px-5 py-2.5 rounded-xl dm-surface-alt hover:border-indigo-500 text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-colors">
                ${icon("play", 15, true)}
                <span>${getText(l, "cta_play_demo")}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="lg:col-span-5 relative min-h-[240px] bg-slate-900">
          <img src="/src/assets/images/hero_indie_studio_1795401148551.jpg" alt="Estúdio independente DREAMORE+" referrerPolicy="no-referrer"
            class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent"></div>
          <div class="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 text-white">
            <div>
              <div class="text-xs text-slate-300">${getText(l, "featured_demo_label")}</div>
              <div class="font-display font-bold text-sm">Edd Contra o Mundo · Demo 0.1</div>
            </div>
            <button type="button" data-action="open-project" data-id="proj-eddsworld"
              class="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-xs">
              ${getText(l, "open_btn")}
            </button>
          </div>
        </div>
      </section>

      <!-- Featured Showcase -->
      <section class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-display text-xl font-bold text-slate-900 dark:text-white">${getText(l, "featured_title")}</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">${getText(l, "featured_sub")}</p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${featured.map((p, idx) => renderProjectCard(p, idx === 0)).join("")}
        </div>
      </section>

      <!-- 39 Genres Quick Navigator -->
      <details class="dm-surface rounded-2xl p-5">
        <summary class="cursor-pointer flex items-center justify-between gap-4 font-display font-bold text-base text-slate-900 dark:text-white select-none">
          <span>Explorar por Gênero (${state.genres.length} categorias)</span>
          <span class="text-xs font-sans font-medium text-indigo-600 dark:text-indigo-400">Expandir lista</span>
        </summary>
        <div class="flex flex-wrap gap-2 pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 max-h-56 overflow-y-auto">
          ${state.genres.map((g) => `
            <button type="button" data-action="filter-genre-jump" data-genre="${escapeHtml(g)}"
              class="px-3 py-1.5 rounded-lg dm-surface-alt hover:bg-indigo-600 hover:text-white text-xs font-medium transition-colors">
              ${escapeHtml(g)}
            </button>
          `).join("")}
        </div>
      </details>

      <!-- Full Project Portfolio Grid -->
      <section class="space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="font-display text-xl font-bold text-slate-900 dark:text-white">${getText(l, "all_projects")} (${sorted.length})</h2>
          </div>
          <div class="flex items-center gap-2">
            <label for="lobby-sort" class="text-xs font-medium text-slate-500 dark:text-slate-400">${getText(l, "sort_label")}</label>
            <select id="lobby-sort" data-action="change-lobby-sort" class="px-3 py-2 rounded-xl dm-surface-alt text-xs font-semibold">
              <option value="most_approved" ${state.filterSort === "most_approved" ? "selected" : ""}>Mais Aprovados</option>
              <option value="least_approved" ${state.filterSort === "least_approved" ? "selected" : ""}>Em Ascensão</option>
              <option value="most_funded" ${state.filterSort === "most_funded" ? "selected" : ""}>Maior Arrecadação</option>
              <option value="progress_desc" ${state.filterSort === "progress_desc" ? "selected" : ""}>Maior Progresso</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${sorted.map((p) => renderProjectCard(p, false)).join("")}
        </div>
      </section>

      <!-- Affiliated Studios -->
      <section class="dm-surface rounded-2xl p-6 space-y-4">
        <div>
          <h2 class="font-display text-lg font-bold text-slate-900 dark:text-white">Projetos & Estúdios de Referência</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Referências técnicas e estúdios que inspiram os padrões da comunidade</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          ${state.affiliated.map((item) => `
            <div class="dm-surface-alt rounded-xl p-4 space-y-1">
              <div class="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">${escapeHtml(item.type)}</div>
              <div class="font-display font-bold text-sm text-slate-900 dark:text-white">${escapeHtml(item.name)}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(item.tag)}</div>
            </div>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

export function renderExploreView() {
  const l = state.lang;
  const filtered = filterAndSortProjects(state.projects, {
    genre: state.filterGenre,
    search: state.filterSearch,
    minLikes: state.filterMinLikes,
    minFavs: state.filterMinFavs,
    minDonated: state.filterMinDonated,
    sort: state.filterSort,
  });
  const members = buildMemberDirectory(state.projects);

  return `
    <div class="space-y-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white">Projetos & Diretório Completo</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Busque entre ${state.genres.length} gêneros, métricas de aprovação e consulte todos os desenvolvedores ativos.</p>
        </div>
        <button type="button" data-action="reset-filters" class="px-4 py-2 rounded-xl dm-surface-alt hover:border-indigo-500 text-xs font-semibold">
          ${getText(l, "clear_filters")}
        </button>
      </div>

      <!-- Filter Workbench -->
      <div class="dm-surface rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label for="f-search" class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Busca</label>
          <input id="f-search" type="search" value="${escapeHtml(state.filterSearch)}" placeholder="Título, criador..."
            data-action="filter-input" data-field="filterSearch"
            class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm" />
        </div>
        <div>
          <label for="f-genre" class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Gênero</label>
          <select id="f-genre" data-action="filter-select" data-field="filterGenre" class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm">
            <option value="ALL">Todos (${state.genres.length})</option>
            ${state.genres.map((g) => `<option value="${escapeHtml(g)}" ${state.filterGenre === g ? "selected" : ""}>${escapeHtml(g)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label for="f-likes" class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Mín. Curtidas</label>
          <input id="f-likes" type="number" min="0" value="${state.filterMinLikes}" data-action="filter-number" data-field="filterMinLikes"
            class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm font-mono-num" />
        </div>
        <div>
          <label for="f-favs" class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Mín. Favoritos</label>
          <input id="f-favs" type="number" min="0" value="${state.filterMinFavs}" data-action="filter-number" data-field="filterMinFavs"
            class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm font-mono-num" />
        </div>
        <div>
          <label for="f-donated" class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Mín. Arrecadado (R$)</label>
          <input id="f-donated" type="number" min="0" step="100" value="${state.filterMinDonated}" data-action="filter-number" data-field="filterMinDonated"
            class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm font-mono-num" />
        </div>
      </div>

      ${filtered.length === 0 ? `
        <div class="dm-surface rounded-2xl p-10 text-center space-y-3">
          <p class="text-sm text-slate-500 dark:text-slate-400">${getText(l, "no_results")}</p>
          <button type="button" data-action="reset-filters" class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">
            ${getText(l, "clear_filters")}
          </button>
        </div>
      ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${filtered.map((p) => renderProjectCard(p, false)).join("")}
        </div>
      `}

      <!-- Member Directory Table -->
      <section class="dm-surface rounded-2xl p-6 space-y-4">
        <div>
          <h2 class="font-display text-lg font-bold text-slate-900 dark:text-white">Diretório de Desenvolvedores (${members.length})</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Integrantes registrados nos projetos da comunidade</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <th class="py-2.5 px-3 font-semibold">Integrante</th>
                <th class="py-2.5 px-3 font-semibold">Função</th>
                <th class="py-2.5 px-3 font-semibold">Projeto</th>
                <th class="py-2.5 px-3 font-semibold text-right">Progresso</th>
                <th class="py-2.5 px-3 font-semibold text-right">Contato</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              ${members.map((m) => `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td class="py-2.5 px-3 font-semibold">
                    <button type="button" data-action="view-public-profile" data-username="${escapeHtml(m.memberName)}" class="hover:text-indigo-500 text-left">
                      ${escapeHtml(m.memberName)}
                    </button>
                  </td>
                  <td class="py-2.5 px-3 text-slate-600 dark:text-slate-300">${escapeHtml(m.role)}</td>
                  <td class="py-2.5 px-3">
                    <button type="button" data-action="open-project" data-id="${escapeHtml(m.projectId)}" class="text-indigo-600 dark:text-indigo-400 hover:underline text-left">
                      ${escapeHtml(m.projectTitle)}
                    </button>
                  </td>
                  <td class="py-2.5 px-3 text-right font-mono-num">${m.progress}%</td>
                  <td class="py-2.5 px-3 text-right font-mono-num text-xs text-slate-500 dark:text-slate-400">${escapeHtml(m.social)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

export function renderCreateProjectView() {
  return `
    <div class="max-w-3xl mx-auto">
      <div class="dm-surface rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Novo Projeto Indie</div>
          <h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white mt-1">Publicar Projeto na DREAMORE+</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Preencha os detalhes abaixo. O sistema gera automaticamente a tradução prévia em Português, Inglês e Espanhol.
          </p>
        </div>

        <form id="create-project-form" class="space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="cp-title" class="block text-xs font-semibold mb-1.5">Nome do Projeto *</label>
              <input id="cp-title" type="text" required minlength="3" placeholder="Ex: Crônicas de Aethelgard"
                class="w-full px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm" />
            </div>
            <div>
              <label for="cp-genre" class="block text-xs font-semibold mb-1.5">Gênero Principal *</label>
              <select id="cp-genre" class="w-full px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm">
                ${state.genres.map((g) => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join("")}
              </select>
            </div>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-semibold">Ícone do Projeto</label>
            <div class="flex flex-wrap gap-2">
              ${PROJECT_ICON_OPTIONS.map((opt) => `
                <button type="button" data-action="pick-create-icon" data-icon="${opt.id}" title="${escapeHtml(opt.label)}"
                  class="px-3 py-2 rounded-xl dm-surface-alt inline-flex items-center gap-2 text-xs font-semibold transition-colors ${state.selectedIcon === opt.id ? "ring-2 ring-indigo-500 text-indigo-600 dark:text-indigo-400" : ""}">
                  ${icon(opt.id, 15)}
                  <span>${escapeHtml(opt.label)}</span>
                </button>
              `).join("")}
            </div>
            <input id="cp-icon" type="hidden" value="${escapeHtml(state.selectedIcon || "gamepad")}" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label for="cp-release-date" class="block text-xs font-semibold mb-1.5">Data de Lançamento Prevista</label>
              <input id="cp-release-date" type="date" value="2028-12-01" class="w-full px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm font-mono-num" />
            </div>
            <div>
              <label for="cp-progress" class="block text-xs font-semibold mb-1.5">Progresso (%)</label>
              <input id="cp-progress" type="number" value="10" min="0" max="100" class="w-full px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm font-mono-num" />
            </div>
            <div>
              <label for="cp-age" class="block text-xs font-semibold mb-1.5">Classificação</label>
              <select id="cp-age" class="w-full px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm">
                <option value="Livre">Livre</option>
                <option value="+13">+13</option>
                <option value="+16">+16 (Exige detalhes)</option>
                <option value="+18">+18 (Exige detalhes)</option>
              </select>
            </div>
          </div>

          <div id="cp-age-details-wrap" class="hidden">
            <label for="cp-age-details" class="block text-xs font-semibold text-rose-500 mb-1.5">Detalhamento de Conteúdo (+16 / +18) *</label>
            <input id="cp-age-details" type="text" placeholder="Descreva os temas maduros com transparência"
              class="w-full px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm border-rose-500/40" />
          </div>

          <div>
            <label for="cp-synopsis" class="block text-xs font-semibold mb-1.5">Sinopse Oficial *</label>
            <textarea id="cp-synopsis" rows="3" required minlength="10" placeholder="Descreva a história, mecânicas e visão do jogo..."
              class="w-full px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm"></textarea>
          </div>

          <div class="dm-surface-alt rounded-xl p-4 space-y-1.5 text-xs">
            <div class="font-semibold text-indigo-600 dark:text-indigo-400">Prévia de Tradução Automática</div>
            <div><strong>EN:</strong> <span id="cp-preview-en" class="text-slate-500 dark:text-slate-400">Aguardando entrada...</span></div>
            <div><strong>ES:</strong> <span id="cp-preview-es" class="text-slate-500 dark:text-slate-400">Esperando entrada...</span></div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="cp-goal" class="block text-xs font-semibold mb-1.5">Meta de Financiamento (R$)</label>
              <input id="cp-goal" type="number" value="8000" min="500" step="100" class="w-full px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm font-mono-num" />
            </div>
            <div>
              <label for="cp-cover-file" class="block text-xs font-semibold mb-1.5">Imagem de Capa (opcional)</label>
              <input id="cp-cover-file" type="file" accept="image/*" class="text-xs w-full" />
            </div>
          </div>

          <label class="flex items-start gap-3 p-4 rounded-xl dm-surface-alt text-xs cursor-pointer">
            <input id="cp-anti-ai" type="checkbox" required class="mt-0.5 accent-indigo-600" />
            <span>Declaro que este projeto <strong>não utiliza IA generativa em artes, sprites ou áudio</strong>, respeita os créditos da equipe em caso de saída de membros e aceita a taxa transparente de 5%.</span>
          </label>

          <button type="submit" class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">
            Publicar Projeto no Lobby
          </button>
        </form>
      </div>
    </div>
  `;
}

export function renderProjectDetailView() {
  const proj = state.projects.find((p) => p.id === state.selectedProjectId) || state.projects[0];
  if (!proj) return "";
  const l = state.lang;
  const title = getLocalizedField(proj.title, l);
  const synopsis = getLocalizedField(proj.synopsis, l);
  const cover = projectCoverUrl(proj, state.projectFrameIndex);
  const isLiked = state.likedProjects.includes(proj.id);
  const isFav = state.favoriteProjects.includes(proj.id);
  const goalPct = Math.min(100, Math.round(((proj.donated || 0) / (proj.goal || 1)) * 100));
  const pendingApps = state.applications.filter((a) => a.projectId === proj.id && a.status === "pending");
  const canEditProject = Boolean(state.user);
  const canManageTeam =
    state.user &&
    (state.user.role === "Administrador" ||
      state.user.role === "Desenvolvedor" ||
      state.user.name === proj.creator ||
      state.user.username === proj.creator);
  const releaseLabel = proj.releaseDate || String(proj.year || "2028");

  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <button type="button" data-action="nav" data-page="lobby" class="px-3.5 py-2 rounded-xl dm-surface-alt text-xs font-semibold inline-flex items-center gap-2 hover:border-indigo-500">
          ${icon("chevronLeft", 14)}
          <span>Voltar ao Lobby</span>
        </button>
        ${canEditProject ? `
          <button type="button" data-action="open-edit-project" data-id="${escapeHtml(proj.id)}"
            class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-2">
            ${icon("edit", 14)}
            <span>${getText(l, "edit_project_btn")}</span>
          </button>
        ` : ""}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Main Column -->
        <div class="lg:col-span-8 space-y-6">
          <div class="dm-surface rounded-2xl overflow-hidden">
            <div class="relative aspect-16/9 bg-slate-900">
              <img src="${escapeHtml(cover)}" alt="${escapeHtml(title)}" referrerPolicy="no-referrer" class="w-full h-full object-cover" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
              <div class="absolute bottom-5 left-5 right-5 flex items-end gap-3.5">
                ${projectIconBadge(proj.icon, proj.colors, 24)}
                <div class="min-w-0 space-y-1">
                  <div class="text-xs font-medium text-slate-300">${escapeHtml(proj.genre)} · Classificação ${escapeHtml(proj.ageRating)} · Lançamento ${escapeHtml(releaseLabel)}</div>
                  <h1 class="font-display text-2xl sm:text-3xl font-bold text-white">${escapeHtml(title)}</h1>
                </div>
              </div>
              <button type="button" data-action="cycle-frame" data-delta="-1" aria-label="Cena anterior"
                class="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white inline-flex items-center justify-center hover:bg-black/80">
                ${icon("chevronLeft", 16)}
              </button>
              <button type="button" data-action="cycle-frame" data-delta="1" aria-label="Próxima cena"
                class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white inline-flex items-center justify-center hover:bg-black/80">
                ${icon("chevronRight", 16)}
              </button>
            </div>

            ${proj.playableDemo ? `
              <div class="p-4 bg-emerald-500/10 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-bold text-slate-900 dark:text-white">${escapeHtml(proj.playableDemo.ver)} disponível no navegador</div>
                  <div class="text-xs text-slate-500 dark:text-slate-400">Jogue diretamente sem instalações externas</div>
                </div>
                <button type="button" data-action="play-demo" data-id="${escapeHtml(proj.id)}"
                  class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-2">
                  ${icon("play", 14, true)}
                  <span>Jogar Demo Agora</span>
                </button>
              </div>
            ` : ""}

            <div class="p-6 space-y-6">
              ${(proj.ageRating === "+16" || proj.ageRating === "+18") ? `
                <div class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300">
                  <strong>Aviso de Classificação (${escapeHtml(proj.ageRating)}):</strong> ${escapeHtml(proj.ageDetails)}
                </div>
              ` : ""}

              <div class="space-y-2">
                <h2 class="font-display text-lg font-bold text-slate-900 dark:text-white">Sinopse Oficial</h2>
                <p class="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">${escapeHtml(synopsis)}</p>
              </div>

              <!-- Team Roster -->
              <div class="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 class="font-display text-lg font-bold text-slate-900 dark:text-white">Equipe (${(proj.team || []).length})</h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Criador principal: ${escapeHtml(proj.creator)} · Saída de membro exige remoção ou crédito autorizado</p>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  ${(proj.team || []).map((m) => {
                    const memberUser = state.users.find((u) => u.name === m.name || u.username === m.name);
                    return `
                      <div class="dm-surface-alt rounded-xl p-3.5 flex items-center justify-between gap-2">
                        <div>
                          <div class="flex items-center gap-2">
                            <button type="button" data-action="view-public-profile" data-username="${escapeHtml(m.name)}" class="font-semibold text-sm hover:text-indigo-500 text-left">
                              ${escapeHtml(m.name)}
                            </button>
                            ${memberUser ? presenceBadgeHtml(memberUser, true) : ""}
                          </div>
                          <div class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(m.role)}</div>
                        </div>
                        <span class="text-xs font-mono-num text-slate-400">${escapeHtml(m.social)}</span>
                      </div>
                    `;
                  }).join("")}
                </div>

                <!-- Enhanced Team Curriculum Application -->
                <form id="apply-team-form" data-id="${escapeHtml(proj.id)}" class="dm-surface-alt rounded-xl p-4 space-y-3">
                  <div class="font-semibold text-sm">Candidatar-se com Currículo para a Equipe</div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select id="apply-role" class="px-3 py-2 rounded-xl dm-surface text-xs font-medium">
                      <option value="Programador(a) Gameplay">Programador(a) Gameplay</option>
                      <option value="Pixel Artist / Ilustrador(a)">Pixel Artist / Ilustrador(a)</option>
                      <option value="Sound Designer / Compositor(a)">Sound Designer / Compositor(a)</option>
                      <option value="Level & Narrative Designer">Level & Narrative Designer</option>
                    </select>
                    <input id="apply-portfolio" type="text" value="${escapeHtml(state.user?.site || "")}" placeholder="Link do portfólio ou @arroba" class="px-3 py-2 rounded-xl dm-surface text-xs" />
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select id="apply-exp" class="px-3 py-2 rounded-xl dm-surface text-xs font-medium">
                      <option value="Iniciante (0-1 ano)">Iniciante (0-1 ano)</option>
                      <option value="Intermediário (2-4 anos)" selected>Intermediário (2-4 anos)</option>
                      <option value="Sênior (5+ anos)">Sênior (5+ anos)</option>
                    </select>
                    <input id="apply-availability" type="text" value="10h/semana" placeholder="Disponibilidade semanal" class="px-3 py-2 rounded-xl dm-surface text-xs" />
                    <input id="apply-skills" type="text" value="${escapeHtml((state.user?.skills || []).join(", "))}" placeholder="Habilidades (Godot, Pixel Art...)" class="px-3 py-2 rounded-xl dm-surface text-xs" />
                  </div>
                  <textarea id="apply-resume" rows="3" required minlength="15" placeholder="Descreva seu currículo completo, projetos anteriores e experiências (mínimo 15 caracteres)..."
                    class="w-full px-3 py-2 rounded-xl dm-surface text-xs">${escapeHtml(state.user?.resume || "")}</textarea>
                  <button type="submit" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
                    ${getText(l, "join_team")}
                  </button>
                </form>

                ${canManageTeam && pendingApps.length ? `
                  <div class="space-y-2.5 pt-2">
                    <div class="text-xs font-semibold text-amber-500">Candidaturas Aguardando Análise de Currículo (${pendingApps.length})</div>
                    ${pendingApps.map((app) => `
                      <div class="dm-surface-alt rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div class="min-w-0 flex-1">
                          <div class="font-bold text-sm">${escapeHtml(app.applicant)} · ${escapeHtml(app.role)}</div>
                          <div class="text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">${escapeHtml(app.experienceLevel || "Intermediário")} · ${escapeHtml(app.resume)}</div>
                        </div>
                        <div class="flex flex-wrap gap-2 shrink-0">
                          <button type="button" data-action="open-app-resume" data-app-id="${escapeHtml(app.id)}"
                            class="px-3 py-1.5 rounded-lg dm-surface border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-semibold inline-flex items-center gap-1.5">
                            ${icon("fileText", 13)}
                            <span>Ver Currículo</span>
                          </button>
                          <button type="button" data-action="resolve-app" data-app-id="${escapeHtml(app.id)}" data-status="accepted" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold">Aceitar</button>
                          <button type="button" data-action="resolve-app" data-app-id="${escapeHtml(app.id)}" data-status="rejected" class="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold">Recusar</button>
                        </div>
                      </div>
                    `).join("")}
                  </div>
                ` : ""}
              </div>
            </div>
          </div>

          <!-- Comments -->
          <div class="dm-surface rounded-2xl p-6 space-y-4">
            <h2 class="font-display text-lg font-bold text-slate-900 dark:text-white">Comentários & Ideias (${(proj.comments || []).length})</h2>
            <form id="project-comment-form" data-id="${escapeHtml(proj.id)}" class="flex flex-col sm:flex-row gap-2">
              <input id="project-comment-input" type="text" required placeholder="Compartilhe seu feedback ou sugestão para a equipe..."
                class="flex-1 px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm" />
              <button type="submit" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">Enviar</button>
            </form>
            <div class="space-y-3">
              ${(proj.comments || []).length === 0 ? `<p class="text-xs text-slate-500 dark:text-slate-400">Nenhum comentário ainda.</p>` :
                proj.comments.map((c) => `
                  <div class="dm-surface-alt rounded-xl p-3.5">
                    <div class="text-xs text-slate-500 dark:text-slate-400">
                      <strong class="text-slate-900 dark:text-white">${escapeHtml(c.author)}</strong> · ${escapeHtml(c.role)} · ${escapeHtml(c.date)}
                    </div>
                    <p class="text-sm mt-1">${escapeHtml(c.text)}</p>
                  </div>
                `).join("")}
            </div>
          </div>
        </div>

        <!-- Sidebar Funding & Actions -->
        <div class="lg:col-span-4 dm-surface rounded-2xl p-6 space-y-5 lg:sticky lg:top-20">
          <div class="space-y-2">
            <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">Meta de Financiamento</div>
            <div class="font-mono-num text-2xl font-bold text-slate-900 dark:text-white">R$ ${(proj.donated || 0).toFixed(2)}</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 tabular-nums">de R$ ${(proj.goal || 0).toFixed(2)} (${goalPct}%)</div>
            <div class="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div class="h-full bg-emerald-500 rounded-full" style="width: ${goalPct}%"></div>
            </div>
          </div>

          <div class="space-y-2">
            <button type="button" data-action="open-checkout" data-item="Doação: ${escapeHtml(title)}" data-price="25" data-currency="R$" data-project-id="${escapeHtml(proj.id)}"
              class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">
              Doar R$ 25,00
            </button>
            <button type="button" data-action="open-checkout" data-item="Apoio Patrocinador: ${escapeHtml(title)}" data-price="100" data-currency="R$" data-project-id="${escapeHtml(proj.id)}"
              class="w-full py-2.5 rounded-xl dm-surface-alt hover:border-indigo-500 text-sm font-semibold transition-colors">
              Apoiar R$ 100,00
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button type="button" data-action="toggle-like" data-id="${escapeHtml(proj.id)}"
              class="py-2 rounded-xl dm-surface-alt text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${isLiked ? "text-rose-500 border-rose-500/40" : ""}">
              ${icon("heart", 14, isLiked)}
              <span class="tabular-nums">Curtir (${proj.likes})</span>
            </button>
            <button type="button" data-action="toggle-fav" data-id="${escapeHtml(proj.id)}"
              class="py-2 rounded-xl dm-surface-alt text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${isFav ? "text-amber-500 border-amber-500/40" : ""}">
              ${icon("star", 14, isFav)}
              <span class="tabular-nums">Favoritar (${proj.favorites})</span>
            </button>
          </div>

          <div class="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
            <div class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">Progresso</span>
              <span class="font-mono-num font-bold">${proj.progress}%</span>
            </div>
            <div class="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div class="h-full bg-indigo-500 rounded-full" style="width: ${Math.max(4, proj.progress)}%"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
