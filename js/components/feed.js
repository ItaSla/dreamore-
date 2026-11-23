import { escapeHtml } from "../logic.js";
import { state } from "../state.js";
import { icon } from "../icons.js";
import { avatarHtml } from "./shell.js";

const FEED_TAGS = ["ALL", "Build Jogável", "Progresso Técnico", "Arte & Atmosfera", "Áudio", "Atualização"];

export function renderFeedView() {
  const posts = (state.feedPosts || []).filter(
    (p) => state.feedFilterTag === "ALL" || p.tag === state.feedFilterTag
  );

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-8 space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white">Feed da Comunidade</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Avanços de desenvolvimento, capturas de tela, builds e mensagens dos criadores.
            </p>
          </div>
        </div>

        <!-- Composer -->
        <form id="feed-post-form" class="dm-surface rounded-2xl p-5 space-y-4">
          <div class="flex items-center gap-3">
            ${avatarHtml(state.user, "w-10 h-10 text-sm")}
            <div>
              <div class="font-semibold text-sm">${escapeHtml(state.user?.name || state.user?.username || "Sonhador")}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">Compartilhe um avanço, arte humana ou mensagem</div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select id="feed-project" class="px-3 py-2 rounded-xl dm-surface-alt text-xs font-medium">
              <option value="">Atualização Geral</option>
              ${state.projects.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.title.pt)}</option>`).join("")}
            </select>
            <select id="feed-tag" class="px-3 py-2 rounded-xl dm-surface-alt text-xs font-medium">
              ${FEED_TAGS.filter((t) => t !== "ALL").map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("")}
            </select>
            <input id="feed-milestone" type="text" placeholder="Marco (ex: Demo 0.2 pronta)" class="px-3 py-2 rounded-xl dm-surface-alt text-xs" />
          </div>

          <textarea id="feed-content" rows="3" required placeholder="O que você desenvolveu hoje? Conte para a comunidade..."
            class="w-full px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm"></textarea>

          <div id="feed-image-preview-wrap" class="hidden relative">
            <div id="feed-image-preview-slot"></div>
            <button type="button" data-action="clear-feed-img" aria-label="Remover imagem"
              class="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white hover:bg-black">
              ${icon("close", 14)}
            </button>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label class="px-3.5 py-2 rounded-xl dm-surface-alt hover:border-indigo-500 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer">
              ${icon("image", 15)}
              <span>Anexar Imagem</span>
              <input id="feed-img-input" type="file" accept="image/*" class="hidden" />
            </label>
            <button type="submit" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors">
              Publicar no Feed
            </button>
          </div>
        </form>

        <!-- Filter Bar -->
        <div class="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl dm-surface">
          ${FEED_TAGS.map((tag) => `
            <button type="button" data-action="filter-feed-tag" data-tag="${escapeHtml(tag)}"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                state.feedFilterTag === tag
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }">
              ${tag === "ALL" ? "Tudo" : escapeHtml(tag)}
            </button>
          `).join("")}
        </div>

        <!-- Stream -->
        <div class="space-y-5">
          ${posts.length === 0 ? `
            <div class="dm-surface rounded-2xl p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhuma publicação encontrada nesta categoria.
            </div>
          ` : posts.map((post) => `
            <article class="dm-surface rounded-2xl p-5 sm:p-6 space-y-4">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  ${avatarHtml({ name: post.author, username: post.username }, "w-10 h-10 text-sm")}
                  <div>
                    <div class="flex flex-wrap items-center gap-2 text-sm">
                      <button type="button" data-action="view-public-profile" data-username="${escapeHtml(post.username || post.author)}"
                        class="font-bold text-slate-900 dark:text-white hover:text-indigo-500">
                        ${escapeHtml(post.author)}
                      </button>
                      <span class="text-xs text-slate-500 dark:text-slate-400">· ${escapeHtml(post.role || "Dev")} · ${escapeHtml(post.tag)}</span>
                    </div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">
                      ${post.projectId ? `<button type="button" data-action="open-project" data-id="${escapeHtml(post.projectId)}" class="text-indigo-600 dark:text-indigo-400 hover:underline">${escapeHtml(post.projectTitle)}</button>` : escapeHtml(post.projectTitle || "Comunidade")}
                      ${post.milestone ? ` · ${escapeHtml(post.milestone)}` : ""}
                    </div>
                  </div>
                </div>
                <span class="text-xs font-mono-num text-slate-400 shrink-0">${new Date(post.createdAt || Date.now()).toLocaleDateString("pt-BR")}</span>
              </div>

              <p class="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">${escapeHtml(post.content)}</p>

              ${post.image ? `
                <button type="button" data-action="open-lightbox" data-src="${escapeHtml(post.image)}" data-alt="${escapeHtml(post.milestone || post.projectTitle)}" class="block w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.milestone || "Atualização")}" referrerPolicy="no-referrer" loading="lazy"
                    class="w-full max-h-80 object-cover hover:scale-[1.01] transition-transform" />
                </button>
              ` : ""}

              <div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <button type="button" data-action="like-feed" data-id="${escapeHtml(post.id)}"
                  class="px-3 py-1.5 rounded-lg dm-surface-alt text-xs font-semibold inline-flex items-center gap-1.5 hover:text-rose-500">
                  ${icon("heart", 14)}
                  <span class="tabular-nums">${post.likes || 0}</span>
                </button>
                <span class="text-xs text-slate-500 dark:text-slate-400 tabular-nums">${(post.comments || []).length} comentários</span>
              </div>

              <div class="space-y-2.5">
                ${(post.comments || []).map((c) => `
                  <div class="dm-surface-alt rounded-xl px-3.5 py-2.5 text-xs">
                    <span class="font-bold text-slate-900 dark:text-white">${escapeHtml(c.author)}</span>
                    <span class="text-slate-400 ml-1">· ${escapeHtml(c.date || "Agora")}</span>
                    <p class="text-slate-600 dark:text-slate-300 mt-1 text-sm">${escapeHtml(c.text)}</p>
                  </div>
                `).join("")}
                <form class="feed-comment-form flex gap-2" data-id="${escapeHtml(post.id)}">
                  <input type="text" required placeholder="Comentar avanço..." class="flex-1 px-3 py-2 rounded-xl dm-surface-alt text-xs" />
                  <button type="submit" class="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">Enviar</button>
                </form>
              </div>
            </article>
          `).join("")}
        </div>
      </div>

      <!-- Right Context Sidebar -->
      <aside class="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
        <div class="dm-surface rounded-2xl p-5 space-y-3">
          <h2 class="font-display font-bold text-base text-slate-900 dark:text-white">Compromisso do Feed</h2>
          <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Este espaço unifica devlogs, capturas de progresso e debates técnicos. Toda imagem publicada deve ser criação humana ou registro real do jogo em desenvolvimento.
          </p>
        </div>

        <div class="dm-surface rounded-2xl p-5 space-y-3">
          <h2 class="font-display font-bold text-base text-slate-900 dark:text-white">Projetos Mais Ativos</h2>
          <div class="space-y-2.5">
            ${state.projects.slice(0, 4).map((p) => `
              <button type="button" data-action="open-project" data-id="${escapeHtml(p.id)}"
                class="w-full dm-surface-alt rounded-xl p-3 text-left flex items-center justify-between gap-2 hover:border-indigo-500 transition-colors">
                <div class="min-w-0">
                  <div class="text-xs font-bold truncate">${escapeHtml(p.title.pt)}</div>
                  <div class="text-[11px] text-slate-500 dark:text-slate-400">${escapeHtml(p.genre)}</div>
                </div>
                <span class="font-mono-num text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">${p.progress}%</span>
              </button>
            `).join("")}
          </div>
        </div>
      </aside>
    </div>
  `;
}
