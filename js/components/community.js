import { escapeHtml, sanitizeKey, getGroupMeta } from "../logic.js";
import { getText, SONHADOR_PLANS } from "../i18n.js";
import { state } from "../state.js";
import { icon } from "../icons.js";
import { avatarHtml, presenceBadgeHtml } from "./shell.js";

const CHANNELS = [
  { id: "geral", name: "Geral", desc: "Conversa aberta da comunidade indie" },
  { id: "devs", name: "Devs & Código", desc: "Engines, física e dúvidas técnicas" },
  { id: "arte", name: "Arte & Áudio", desc: "Pixel art quadro-a-quadro e foley" },
  { id: "feedback", name: "Feedback", desc: "Compartilhe demos e receba avaliações" },
];

function groupAvatarHtml(group, sizeClass = "w-8 h-8 text-xs") {
  const { photo } = getGroupMeta(group);
  const initial = escapeHtml((group?.name || "G").charAt(0).toUpperCase());
  if (photo) {
    return `<img src="${escapeHtml(photo)}" alt="${escapeHtml(group?.name || "Grupo")}" referrerPolicy="no-referrer" class="${sizeClass} rounded-xl object-cover shrink-0 border border-slate-300 dark:border-slate-700" />`;
  }
  return `<span class="${sizeClass} rounded-xl bg-emerald-600 text-white font-display font-bold inline-flex items-center justify-center shrink-0">${initial}</span>`;
}

export function renderChatView() {
  const activeChannel = CHANNELS.find((c) => c.id === state.activeChannelId);
  const activeGroup = (state.groups || []).find((g) => `grp:${g.id}` === state.activeChannelId);
  const isDm = state.activeChannelId.startsWith("dm:");
  const meKey = sanitizeKey(state.user?.username || "guest");

  let headerTitle = "# Geral";
  let headerDesc = "Conversa aberta da comunidade indie";
  if (activeChannel) {
    headerTitle = `# ${activeChannel.name}`;
    headerDesc = activeChannel.desc;
  } else if (activeGroup) {
    const meta = getGroupMeta(activeGroup);
    headerTitle = activeGroup.name;
    headerDesc = `${meta.memberCount} membros · ${meta.moderatorCount} moderadores · ${activeGroup.desc || "Grupo colaborativo"}`;
  } else if (isDm) {
    const peerKey = state.activeChannelId.slice(3).split("__").find((k) => k !== meKey) || "Dev";
    const peer = state.users.find((u) => sanitizeKey(u.username) === peerKey);
    headerTitle = peer ? peer.name : peerKey;
    headerDesc = "Conversa direta privada";
  }

  const msgs = (state.chats && state.chats[state.activeChannelId]) || [];
  const dmChannels = Object.keys(state.chats || {}).filter(
    (k) => k.startsWith("dm:") && k.slice(3).split("__").includes(meKey)
  );
  const allUsers = state.users || [];

  return `
    <div class="dm-surface rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[calc(100vh-8.5rem)] min-h-[540px]">
      <!-- Channels & DMs Rail -->
      <aside class="md:col-span-4 lg:col-span-3 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto">
        <div class="grid grid-cols-2 gap-2">
          <button type="button" data-action="chat-mode" data-mode="dm" class="px-3 py-2 rounded-xl dm-surface-alt hover:border-indigo-500 text-xs font-semibold">+ Conversa</button>
          <button type="button" data-action="chat-mode" data-mode="group" class="px-3 py-2 rounded-xl dm-surface-alt hover:border-indigo-500 text-xs font-semibold">+ Grupo</button>
        </div>

        <div class="space-y-1">
          <div class="text-[11px] font-semibold text-slate-400 px-2 pb-1">Canais</div>
          ${CHANNELS.map((c) => `
            <button type="button" data-action="open-chat" data-cid="${c.id}"
              class="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2 transition-colors ${
                state.activeChannelId === c.id ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }">
              <span>#</span>
              <span class="truncate">${escapeHtml(c.name)}</span>
            </button>
          `).join("")}
        </div>

        <div class="space-y-1">
          <div class="text-[11px] font-semibold text-slate-400 px-2 pb-1">Grupos (${(state.groups || []).length})</div>
          ${(state.groups || []).map((g) => {
            const cid = `grp:${g.id}`;
            const meta = getGroupMeta(g);
            return `
              <button type="button" data-action="open-chat" data-cid="${escapeHtml(cid)}"
                class="w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between gap-2 transition-colors ${
                  state.activeChannelId === cid ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }">
                <div class="flex items-center gap-2.5 min-w-0">
                  ${groupAvatarHtml(g, "w-7 h-7 text-[11px]")}
                  <span class="truncate">${escapeHtml(g.name)}</span>
                </div>
                <span class="text-[10px] font-mono-num opacity-75 shrink-0">${meta.memberCount}</span>
              </button>
            `;
          }).join("")}
        </div>

        <div class="space-y-1">
          <div class="text-[11px] font-semibold text-slate-400 px-2 pb-1">Conversas Diretas</div>
          ${dmChannels.length === 0 ? `<div class="text-xs text-slate-400 px-2">Nenhuma DM iniciada.</div>` : dmChannels.map((cid) => {
            const peerKey = cid.slice(3).split("__").find((k) => k !== meKey) || "Dev";
            const peer = state.users.find((u) => sanitizeKey(u.username) === peerKey);
            return `
              <button type="button" data-action="open-chat" data-cid="${escapeHtml(cid)}"
                class="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between gap-2 transition-colors ${
                  state.activeChannelId === cid ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }">
                <span class="truncate">${escapeHtml(peer ? peer.name : peerKey)}</span>
                ${peer ? presenceBadgeHtml(peer, true) : ""}
              </button>
            `;
          }).join("")}
        </div>
      </aside>

      <!-- Main Chat Area -->
      <div class="md:col-span-8 lg:col-span-9 flex flex-col min-h-0">
        <div class="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            ${activeGroup && !state.chatComposerMode ? groupAvatarHtml(activeGroup, "w-10 h-10 text-sm") : ""}
            <div class="min-w-0">
              <h2 class="font-display font-bold text-base text-slate-900 dark:text-white truncate">${escapeHtml(headerTitle)}</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 truncate">${escapeHtml(headerDesc)}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            ${activeGroup && !state.chatComposerMode ? `
              <button type="button" data-action="open-group-editor" data-id="${escapeHtml(activeGroup.id)}"
                class="px-3 py-1.5 rounded-xl dm-surface-alt hover:border-indigo-500 text-xs font-semibold inline-flex items-center gap-1.5">
                ${icon("edit", 13)}
                <span>Gerenciar Grupo</span>
              </button>
            ` : ""}
            ${state.chatComposerMode ? `
              <button type="button" data-action="chat-mode" data-mode="" class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Voltar ao chat</button>
            ` : ""}
          </div>
        </div>

        ${activeGroup && !state.chatComposerMode ? (() => {
          const meta = getGroupMeta(activeGroup);
          return `
            <div class="px-5 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              <span><strong>Dono:</strong> @${escapeHtml(activeGroup.owner || "Dev")}</span>
              <span><strong>Moderadores (${meta.moderatorCount}):</strong> ${meta.moderators.length ? meta.moderators.map((m) => `@${escapeHtml(m)}`).join(", ") : "Nenhum"}</span>
              <span><strong>Membros (${meta.memberCount}):</strong> ${meta.members.slice(0, 6).map((m) => `@${escapeHtml(m)}`).join(", ")}${meta.members.length > 6 ? ` +${meta.members.length - 6}` : ""}</span>
            </div>
          `;
        })() : ""}

        ${state.chatComposerMode === "dm" ? `
          <div class="p-6 space-y-3 overflow-y-auto">
            <h3 class="font-display font-bold text-sm">Iniciar Conversa Direta</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              ${state.users.filter((u) => sanitizeKey(u.username) !== meKey).map((u) => `
                <button type="button" data-action="start-dm" data-username="${escapeHtml(u.username)}"
                  class="dm-surface-alt rounded-xl p-3 text-left flex items-center justify-between gap-3 hover:border-indigo-500">
                  <div class="flex items-center gap-3 min-w-0">
                    ${avatarHtml(u, "w-9 h-9 text-xs")}
                    <div class="min-w-0">
                      <div class="text-sm font-bold truncate">${escapeHtml(u.name)}</div>
                      <div class="text-xs text-slate-500 dark:text-slate-400 truncate">@${escapeHtml(u.username)}</div>
                    </div>
                  </div>
                  ${presenceBadgeHtml(u)}
                </button>
              `).join("")}
            </div>
          </div>
        ` : state.chatComposerMode === "group" ? `
          <form id="create-group-form" class="p-6 space-y-4 overflow-y-auto max-w-2xl">
            <h3 class="font-display font-bold text-lg">Criar Novo Grupo Colaborativo</h3>

            <div class="flex flex-col sm:flex-row sm:items-center gap-4 dm-surface-alt rounded-xl p-4">
              <div id="grp-photo-preview-box" class="w-16 h-16 rounded-xl overflow-hidden bg-emerald-600 text-white font-display font-bold text-xl flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-700">
                G
              </div>
              <div class="flex-1 space-y-2">
                <div class="text-xs font-semibold">Foto do Grupo</div>
                <div class="flex flex-wrap items-center gap-2">
                  <label class="px-3 py-1.5 rounded-lg dm-surface text-xs font-semibold cursor-pointer hover:border-indigo-500 inline-flex items-center gap-1.5">
                    ${icon("image", 13)}
                    <span>Enviar Foto</span>
                    <input id="grp-photo-file" type="file" accept="image/*" class="hidden" />
                  </label>
                  <input id="grp-photo-url" type="text" placeholder="ou cole URL da imagem..." class="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg dm-surface text-xs" />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="grp-name" class="block text-xs font-semibold mb-1">Nome do grupo *</label>
                <input id="grp-name" type="text" required minlength="2" maxlength="60" placeholder="Ex: Equipe Metroidvania" class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm" />
              </div>
              <div>
                <label for="grp-visibility" class="block text-xs font-semibold mb-1">Visibilidade</label>
                <select id="grp-visibility" class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm">
                  <option value="public">Público na comunidade</option>
                  <option value="private">Privado (apenas membros)</option>
                </select>
              </div>
            </div>

            <div>
              <label for="grp-desc" class="block text-xs font-semibold mb-1">Descrição</label>
              <textarea id="grp-desc" rows="2" maxlength="300" placeholder="Objetivo, horários de playtest e regras do grupo..." class="w-full px-3 py-2 rounded-xl dm-surface-alt text-sm"></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="dm-surface-alt rounded-xl p-3.5 space-y-2">
                <div class="text-xs font-semibold">Membros Iniciais</div>
                <div class="max-h-36 overflow-y-auto space-y-1.5">
                  ${allUsers.map((u) => {
                    const isSelf = sanitizeKey(u.username) === meKey;
                    return `
                      <label class="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" name="grp-members" value="${escapeHtml(u.username)}" ${isSelf ? "checked disabled" : ""} class="rounded accent-indigo-600" />
                        ${avatarHtml(u, "w-5 h-5 text-[10px]")}
                        <span class="truncate">${escapeHtml(u.name || u.username)} ${isSelf ? "(Criador)" : ""}</span>
                      </label>
                    `;
                  }).join("")}
                </div>
              </div>

              <div class="dm-surface-alt rounded-xl p-3.5 space-y-2">
                <div class="text-xs font-semibold">Moderadores do Grupo</div>
                <div class="max-h-36 overflow-y-auto space-y-1.5">
                  ${allUsers.map((u) => {
                    const isSelf = sanitizeKey(u.username) === meKey;
                    return `
                      <label class="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" name="grp-mods" value="${escapeHtml(u.username)}" ${isSelf ? "checked disabled" : ""} class="rounded accent-emerald-600" />
                        ${avatarHtml(u, "w-5 h-5 text-[10px]")}
                        <span class="truncate">${escapeHtml(u.name || u.username)} ${isSelf ? "(Dono)" : ""}</span>
                      </label>
                    `;
                  }).join("")}
                </div>
              </div>
            </div>

            <button type="submit" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">Criar Grupo</button>
          </form>
        ` : `
          <div id="chat-messages-box" class="flex-1 overflow-y-auto p-5 space-y-3">
            ${msgs.length === 0 ? `<p class="text-sm text-slate-500 dark:text-slate-400">Nenhuma mensagem ainda. Comece a conversa!</p>` : msgs.map((m) => `
              <div class="flex items-start gap-3">
                ${avatarHtml({ name: m.user, username: m.user }, "w-8 h-8 text-xs")}
                <div class="dm-surface-alt rounded-xl px-4 py-2.5 max-w-2xl space-y-1">
                  <div class="flex items-center gap-2 text-xs">
                    <strong class="text-slate-900 dark:text-white">${escapeHtml(m.user)}</strong>
                    <span class="text-slate-400 font-mono-num">${new Date(m.ts || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  ${m.text ? `<p class="text-sm text-slate-700 dark:text-slate-200">${escapeHtml(m.text)}</p>` : ""}
                  ${m.attachment?.type === "image" ? `
                    <button type="button" data-action="open-lightbox" data-src="${escapeHtml(m.attachment.data)}" data-alt="Imagem enviada no chat" class="block mt-2">
                      <img src="${escapeHtml(m.attachment.data)}" alt="Anexo" class="max-h-56 rounded-lg border border-slate-300 dark:border-slate-700" />
                    </button>
                  ` : ""}
                </div>
              </div>
            `).join("")}
          </div>

          <form id="chat-send-form" class="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            ${state.chatAttachment ? `
              <div class="text-xs text-indigo-500 flex items-center justify-between dm-surface-alt px-3 py-1.5 rounded-lg">
                <span>Imagem anexada pronta para envio</span>
                <button type="button" data-action="clear-chat-att" class="font-semibold text-rose-500">Remover</button>
              </div>
            ` : ""}
            <div class="flex items-center gap-2">
              <label class="p-2.5 rounded-xl dm-surface-alt hover:border-indigo-500 cursor-pointer" title="Anexar imagem">
                ${icon("image", 16)}
                <input id="chat-img-input" type="file" accept="image/*" class="hidden" />
              </label>
              <input id="chat-msg-input" type="text" placeholder="Escreva sua mensagem para o canal..."
                class="flex-1 px-3.5 py-2.5 rounded-xl dm-surface-alt text-sm" />
              <button type="submit" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">Enviar</button>
            </div>
          </form>
        `}
      </div>
    </div>
  `;
}

export function renderPlansView() {
  const l = state.lang;
  return `
    <div class="space-y-8">
      <div class="text-center max-w-2xl mx-auto space-y-3">
        <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Assinaturas & Impulsionamento</div>
        <h1 class="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">${getText(l, "plans_title")}</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">${getText(l, "plans_sub")}</p>

        <div class="inline-flex p-1 rounded-xl dm-surface mt-2">
          <button type="button" data-action="set-billing" data-billing="monthly"
            class="px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${state.planBilling === "monthly" ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-300"}">
            ${getText(l, "monthly")}
          </button>
          <button type="button" data-action="set-billing" data-billing="annual"
            class="px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${state.planBilling === "annual" ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-300"}">
            ${getText(l, "annual")}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        ${SONHADOR_PLANS.map((plan, idx) => {
          const loc = plan[l] || plan.pt;
          const price = state.planBilling === "monthly" ? loc.monthly : loc.annual;
          const numPrice = state.planBilling === "monthly" ? loc.numericMonthly : loc.numericAnnual;
          const period = state.planBilling === "monthly" ? "/mês" : "/ano";
          const popular = idx === 1;

          return `
            <div class="dm-surface rounded-2xl p-6 flex flex-col justify-between gap-6 ${popular ? "ring-2 ring-indigo-500" : ""}">
              <div class="space-y-4">
                <div class="flex items-center justify-between text-xs font-semibold">
                  <span class="text-indigo-600 dark:text-indigo-400">${escapeHtml(plan.tier)}</span>
                  <span class="text-slate-500 dark:text-slate-400">${escapeHtml(plan.audience[l] || plan.audience.pt)}</span>
                </div>
                <h2 class="font-display text-xl font-bold text-slate-900 dark:text-white">${escapeHtml(loc.name)}</h2>
                <p class="text-xs italic text-slate-500 dark:text-slate-400 leading-relaxed dm-surface-alt rounded-xl p-3.5">
                  ${escapeHtml(loc.quote)}
                </p>

                <div class="pt-1">
                  <span class="font-mono-num text-3xl font-bold text-slate-900 dark:text-white">${escapeHtml(price)}</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400">${period}</span>
                </div>

                <ul class="space-y-2.5 text-sm">
                  ${loc.benefits.map((b) => `
                    <li class="flex items-start gap-2.5">
                      <span class="text-emerald-500 mt-0.5 shrink-0">${icon("check", 15)}</span>
                      <span class="text-slate-700 dark:text-slate-300">${escapeHtml(b)}</span>
                    </li>
                  `).join("")}
                </ul>
              </div>

              <button type="button" data-action="open-checkout"
                data-item="${escapeHtml(loc.name)} (${state.planBilling === "monthly" ? "Mensal" : "Anual"})"
                data-price="${numPrice}" data-currency="${escapeHtml(loc.currency)}"
                class="w-full py-3 rounded-xl ${popular ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "dm-surface-alt hover:border-indigo-500"} text-sm font-semibold transition-colors">
                ${getText(l, "subscribe")}
              </button>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

export function renderMarketingMarketplaceView() {
  const cats = ["ALL", "Pixel Art 2D (100% Humano)", "Áudio / Foley WAV", "Código / Arquitetura", "Propriedade / Ideia de Jogo"];
  const assets = (state.marketplace || []).filter(
    (a) => state.marketingCategory === "ALL" || a.type === state.marketingCategory
  );

  return `
    <div class="space-y-10">
      <!-- Marketing & Campaign Header -->
      <section class="dm-surface rounded-2xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div class="lg:col-span-8 space-y-2">
          <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Divulgação & Comércio Ético</div>
          <h1 class="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Marketing, Notícias & Marketplace Humano</h1>
          <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            Negocie spritesheets, trilhas sonoras foley, sistemas modulares e acompanhe campanhas de divulgação da comunidade — 100% livres de IA generativa e com taxa justa de 5%.
          </p>
        </div>
        <div class="lg:col-span-4 dm-surface-alt rounded-xl p-4 space-y-2">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">Kit de Campanha Rápida</div>
          <p class="text-xs text-slate-600 dark:text-slate-300">Gere links de divulgação rastreáveis para seu projeto com cupom <span class="font-mono-num font-bold">DREAM50</span>.</p>
          <button type="button" data-action="copy-campaign-link" class="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
            Copiar Link de Divulgação
          </button>
        </div>
      </section>

      <!-- Marketplace Filter + Grid -->
      <section class="space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="font-display text-xl font-bold text-slate-900 dark:text-white">Marketplace de Assets (${assets.length})</h2>
          <div class="flex flex-wrap gap-1.5">
            ${cats.map((c) => `
              <button type="button" data-action="filter-market-cat" data-cat="${escapeHtml(c)}"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  state.marketingCategory === c ? "bg-indigo-600 text-white" : "dm-surface-alt hover:border-indigo-500"
                }">
                ${c === "ALL" ? "Todos" : escapeHtml(c.split(" (")[0])}
              </button>
            `).join("")}
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          ${assets.map((asset) => `
            <article class="dm-surface rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-indigo-500/60 transition-colors">
              <div class="space-y-2">
                <div class="text-xs font-medium text-indigo-600 dark:text-indigo-400">${escapeHtml(asset.type)}</div>
                <h3 class="font-display font-bold text-base text-slate-900 dark:text-white leading-snug">${escapeHtml(asset.title)}</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">Autor: ${escapeHtml(asset.author)} · ${escapeHtml(asset.fmt)}</p>
                <p class="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">${escapeHtml(asset.d)}</p>
              </div>

              <div class="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="font-mono-num text-lg font-bold text-slate-900 dark:text-white">R$ ${asset.price.toFixed(2)}</span>
                  <span class="text-xs font-mono-num text-slate-500 dark:text-slate-400">${asset.rate.toFixed(1)} · ${asset.sales} vendas</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button type="button" data-action="open-asset-modal" data-id="${escapeHtml(asset.id)}" class="py-2 rounded-xl dm-surface-alt text-xs font-semibold hover:border-indigo-500">
                    Detalhes
                  </button>
                  <button type="button" data-action="open-checkout" data-item="Asset: ${escapeHtml(asset.title)}" data-price="${asset.price}" data-currency="R$"
                    class="py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
                    Comprar
                  </button>
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      </section>

      <!-- Gaming & Indie News -->
      <section class="space-y-4">
        <h2 class="font-display text-xl font-bold text-slate-900 dark:text-white">Notícias & Destaques do Ecossistema</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          ${(state.news || []).map((item) => `
            <article class="dm-surface rounded-2xl p-5 space-y-2">
              <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">${escapeHtml(item.tag)} · ${escapeHtml(item.date)}</div>
              <h3 class="font-display font-bold text-base text-slate-900 dark:text-white">${escapeHtml(item.title)}</h3>
              <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">${escapeHtml(item.summary)}</p>
            </article>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}
