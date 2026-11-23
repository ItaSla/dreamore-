import { escapeHtml, sanitizeKey } from "../logic.js";
import { getText } from "../i18n.js";
import { state } from "../state.js";
import { icon } from "../icons.js";

export function renderGameDevHelpView() {
  const help = state.gamedevHelp || { docs: [], videos: [], courses: [], mentorMessages: [] };
  const tab = state.helpTab || "docs";
  const l = state.lang;
  const myKey = sanitizeKey(state.user?.username || "guest");
  const completedModules = (state.courseProgress && state.courseProgress[myKey]) || [];

  return `
    <div class="space-y-6">
      <!-- Banner Header -->
      <section class="dm-surface rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div class="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-center space-y-3">
          <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">${getText(l, "help_eyebrow")}</div>
          <h1 class="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">${getText(l, "help_title")}</h1>
          <p class="text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            ${getText(l, "help_sub")}
          </p>
        </div>
        <div class="lg:col-span-4 min-h-[160px] bg-slate-900 relative">
          <img src="./assets/art/pixel-workshop.svg" alt="Academia Pixel Art & GameDev" referrerPolicy="no-referrer" class="w-full h-full object-cover" />
        </div>
      </section>

      <!-- Section Tabs -->
      <div class="flex flex-wrap gap-1.5 p-1.5 rounded-xl dm-surface w-fit" role="tablist">
        ${[
          ["docs", getText(l, "help_tab_docs")],
          ["videos", getText(l, "help_tab_videos")],
          ["courses", getText(l, "help_tab_courses")],
          ["mentors", getText(l, "help_tab_mentors")],
        ].map(([id, label]) => `
          <button type="button" role="tab" aria-selected="${tab === id}" data-action="set-help-tab" data-tab="${id}"
            class="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
              tab === id ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }">
            ${label}
          </button>
        `).join("")}
      </div>

      ${tab === "docs" ? renderDocsTab(help.docs) : ""}
      ${tab === "videos" ? renderVideosTab(help.videos) : ""}
      ${tab === "courses" ? renderCoursesTab(help.courses, completedModules) : ""}
      ${tab === "mentors" ? renderMentorChatTab(help.mentorMessages) : ""}
    </div>
  `;
}

function renderDocsTab(docs = []) {
  const activeDoc = docs.find((d) => d.id === state.activeDocId) || docs[0];
  if (!activeDoc) return "";

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-4 space-y-2.5">
        ${docs.map((doc) => `
          <button type="button" data-action="select-doc" data-id="${escapeHtml(doc.id)}"
            class="w-full dm-surface rounded-2xl p-4 text-left transition-colors ${
              doc.id === activeDoc.id ? "border-indigo-500 ring-1 ring-indigo-500/30" : "hover:border-indigo-500/50"
            }">
            <div class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">${escapeHtml(doc.category)} · ${escapeHtml(doc.readTime)}</div>
            <div class="font-display font-bold text-sm text-slate-900 dark:text-white mt-1">${escapeHtml(doc.title)}</div>
          </button>
        `).join("")}
      </div>

      <article class="lg:col-span-8 dm-surface rounded-2xl p-6 sm:p-8 space-y-5">
        <div class="space-y-2 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(activeDoc.category)} · ${escapeHtml(activeDoc.author)} · Leitura ${escapeHtml(activeDoc.readTime)}</div>
          <h2 class="font-display text-2xl font-bold text-slate-900 dark:text-white">${escapeHtml(activeDoc.title)}</h2>
          <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">${escapeHtml(activeDoc.summary)}</p>
        </div>

        <div class="space-y-3">
          ${(activeDoc.sections || []).map((s) => `
            <div class="dm-surface-alt rounded-xl p-4 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              ${escapeHtml(s)}
            </div>
          `).join("")}
        </div>
      </article>
    </div>
  `;
}

function renderVideosTab(videos = []) {
  const activeVid = videos.find((v) => v.id === state.activeVideoId) || videos[0];
  if (!activeVid) return "";

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-8 dm-surface rounded-2xl overflow-hidden">
        <div class="relative aspect-16/9 bg-slate-950">
          <img src="${escapeHtml(activeVid.thumbnail)}" alt="${escapeHtml(activeVid.title)}" referrerPolicy="no-referrer" class="w-full h-full object-cover opacity-80" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20 flex flex-col justify-between p-6">
            <div class="text-xs font-mono-num text-slate-200">${escapeHtml(activeVid.topic)} · ${escapeHtml(activeVid.level)} · ${escapeHtml(activeVid.duration)}</div>
            <div class="space-y-3">
              <h2 class="font-display text-xl sm:text-2xl font-bold text-white">${escapeHtml(activeVid.title)}</h2>
              <p class="text-sm text-slate-200 max-w-2xl">${escapeHtml(activeVid.description)}</p>
              <div class="flex flex-wrap gap-2">
                ${(activeVid.chapters || []).map((ch) => `
                  <span class="px-2.5 py-1 rounded-lg bg-white/15 text-white text-xs font-mono-num backdrop-blur-xs">${escapeHtml(ch)}</span>
                `).join("")}
              </div>
            </div>
          </div>
        </div>
        <div class="p-5 flex flex-wrap items-center justify-between gap-3">
          <div class="text-xs text-slate-500 dark:text-slate-400">Instrutor: <strong class="text-slate-900 dark:text-white">${escapeHtml(activeVid.instructor)}</strong></div>
          <button type="button" data-action="set-help-tab" data-tab="mentors" class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">
            Tirar dúvida com o Professor
          </button>
        </div>
      </div>

      <div class="lg:col-span-4 space-y-3">
        ${videos.map((v) => `
          <button type="button" data-action="select-video" data-id="${escapeHtml(v.id)}"
            class="w-full dm-surface rounded-2xl p-4 text-left flex gap-3 items-center transition-colors ${
              v.id === activeVid.id ? "border-indigo-500 ring-1 ring-indigo-500/30" : "hover:border-indigo-500/50"
            }">
            <img src="${escapeHtml(v.thumbnail)}" alt="" referrerPolicy="no-referrer" class="w-20 h-14 rounded-lg object-cover shrink-0" />
            <div class="min-w-0">
              <div class="font-semibold text-xs text-slate-900 dark:text-white line-clamp-2">${escapeHtml(v.title)}</div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono-num">${escapeHtml(v.duration)} · ${escapeHtml(v.level)}</div>
            </div>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderCoursesTab(courses = [], completedModules = []) {
  return `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      ${courses.map((course) => {
        const total = (course.modules || []).length;
        const done = (course.modules || []).filter((m) => completedModules.includes(m.id)).length;
        const pct = total ? Math.round((done / total) * 100) : 0;

        return `
          <div class="dm-surface rounded-2xl p-6 flex flex-col justify-between gap-5">
            <div class="space-y-4">
              <div>
                <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">${escapeHtml(course.platform)} · ${escapeHtml(course.level)} · ${escapeHtml(course.hours)}</div>
                <h2 class="font-display text-lg font-bold text-slate-900 dark:text-white mt-1">${escapeHtml(course.title)}</h2>
                <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">${escapeHtml(course.instructor)}</div>
              </div>

              <div class="space-y-1.5">
                <div class="flex justify-between text-xs">
                  <span class="text-slate-500 dark:text-slate-400">Seu progresso</span>
                  <span class="font-mono-num font-bold">${done}/${total} (${pct}%)</span>
                </div>
                <div class="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div class="h-full bg-emerald-500 rounded-full" style="width: ${pct}%"></div>
                </div>
              </div>

              <div class="space-y-2">
                ${(course.modules || []).map((mod) => {
                  const checked = completedModules.includes(mod.id);
                  return `
                    <button type="button" data-action="toggle-course-module" data-module-id="${escapeHtml(mod.id)}"
                      class="w-full dm-surface-alt rounded-xl p-3 text-left flex items-center justify-between gap-2 hover:border-indigo-500 transition-colors">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <span class="w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${checked ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-400 dark:border-slate-600"}">
                          ${checked ? icon("check", 12) : ""}
                        </span>
                        <span class="text-xs font-medium truncate ${checked ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200"}">${escapeHtml(mod.title)}</span>
                      </div>
                      <span class="text-[11px] font-mono-num text-slate-400 shrink-0">${escapeHtml(mod.duration)}</span>
                    </button>
                  `;
                }).join("")}
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderMentorChatTab(messages = []) {
  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-8 dm-surface rounded-2xl overflow-hidden flex flex-col h-[520px]">
        <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 class="font-display font-bold text-base text-slate-900 dark:text-white">Sala de Mentoria com Professores</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Envie dúvidas sobre código, pixel art, design ou áudio orgânico</p>
          </div>
        </div>

        <div id="mentor-chat-list" class="flex-1 overflow-y-auto p-5 space-y-3">
          ${messages.map((m) => `
            <div class="dm-surface-alt rounded-xl p-3.5 space-y-1">
              <div class="flex items-center justify-between gap-2 text-xs">
                <span class="font-bold text-indigo-600 dark:text-indigo-400">${escapeHtml(m.author)} <span class="text-slate-500 font-normal">· ${escapeHtml(m.role)}</span></span>
                <span class="font-mono-num text-slate-400">${new Date(m.ts || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p class="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">${escapeHtml(m.text)}</p>
            </div>
          `).join("")}
        </div>

        <form id="mentor-chat-form" class="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
          <input id="mentor-chat-input" type="text" required placeholder="Pergunte sobre pixel art, Godot, colisões, áudio ou escopo..."
            class="flex-1 px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm" />
          <button type="submit" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">Enviar</button>
        </form>
      </div>

      <aside class="lg:col-span-4 dm-surface rounded-2xl p-5 space-y-4">
        <h3 class="font-display font-bold text-base text-slate-900 dark:text-white">Professores Disponíveis</h3>
        <div class="space-y-3 text-xs">
          <div class="dm-surface-alt rounded-xl p-3">
            <div class="font-bold text-sm">Prof. João Pedro</div>
            <div class="text-slate-500 dark:text-slate-400 mt-0.5">Game Design, Escopo & UX</div>
          </div>
          <div class="dm-surface-alt rounded-xl p-3">
            <div class="font-bold text-sm">Profa. Mariana Costa</div>
            <div class="text-slate-500 dark:text-slate-400 mt-0.5">Pixel Art & Animação Humana</div>
          </div>
          <div class="dm-surface-alt rounded-xl p-3">
            <div class="font-bold text-sm">Prof. Rafael Nunes</div>
            <div class="text-slate-500 dark:text-slate-400 mt-0.5">Godot, Unity C# & Arquitetura</div>
          </div>
        </div>
      </aside>
    </div>
  `;
}
