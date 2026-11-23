/**
 * Pure domain logic for DREAMORE+ (no DOM or browser globals).
 * Unit-tested via node:test in /tests/logic.test.js.
 */

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeKey(val) {
  return String(val || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");
}

export function filterAndSortProjects(projects, criteria = {}) {
  const {
    genre = "ALL",
    search = "",
    minLikes = 0,
    minFavs = 0,
    minComments = 0,
    minDonated = 0,
    sort = "most_approved",
  } = criteria;

  const q = String(search || "").trim().toLowerCase();

  const filtered = (projects || []).filter((p) => {
    if (genre !== "ALL" && p.genre !== genre) return false;
    if ((p.likes || 0) < Number(minLikes || 0)) return false;
    if ((p.favorites || 0) < Number(minFavs || 0)) return false;
    if (((p.comments || []).length) < Number(minComments || 0)) return false;
    if ((p.donated || 0) < Number(minDonated || 0)) return false;
    if (q) {
      const titles = [p.title?.pt, p.title?.en, p.title?.es].filter(Boolean).join(" ").toLowerCase();
      const syn = [p.synopsis?.pt, p.synopsis?.en, p.synopsis?.es].filter(Boolean).join(" ").toLowerCase();
      const creator = String(p.creator || "").toLowerCase();
      const g = String(p.genre || "").toLowerCase();
      if (!titles.includes(q) && !syn.includes(q) && !creator.includes(q) && !g.includes(q)) {
        return false;
      }
    }
    return true;
  });

  return filtered.sort((a, b) => {
    if (sort === "least_approved") return (a.likes || 0) - (b.likes || 0);
    if (sort === "most_funded") return (b.donated || 0) - (a.donated || 0);
    if (sort === "progress_desc") return (b.progress || 0) - (a.progress || 0);
    return (b.likes || 0) - (a.likes || 0);
  });
}

export function calculateCheckoutSummary(basePrice, couponCode = "") {
  const base = Math.max(0, Number(basePrice) || 0);
  const code = String(couponCode || "").trim().toUpperCase();
  const discountPercent = code === "DREAM50" ? 50 : 0;
  const finalAmount = Number((base * (1 - discountPercent / 100)).toFixed(2));
  const platformFee = Number((finalAmount * 0.05).toFixed(2));
  const creatorNet = Number((finalAmount - platformFee).toFixed(2));
  return {
    base,
    discountPercent,
    finalAmount,
    platformFee,
    creatorNet,
    couponApplied: discountPercent > 0,
  };
}

export function validateProjectDraft(draft) {
  const titlePt = String(draft?.titlePt || "").trim();
  const synopsisPt = String(draft?.synopsisPt || "").trim();
  const ageRating = String(draft?.ageRating || "Livre");
  const ageDetails = String(draft?.ageDetails || "").trim();
  const antiAiAccepted = Boolean(draft?.antiAiAccepted);

  if (titlePt.length < 3) {
    return { valid: false, error: "O título do projeto precisa ter pelo menos 3 caracteres." };
  }
  if (synopsisPt.length < 10) {
    return { valid: false, error: "A sinopse precisa ter pelo menos 10 caracteres." };
  }
  if ((ageRating === "+16" || ageRating === "+18") && ageDetails.length < 8) {
    return { valid: false, error: "Projetos +16 ou +18 exigem detalhamento claro do conteúdo." };
  }
  if (!antiAiAccepted) {
    return { valid: false, error: "É obrigatório confirmar a política 100% livre de IA generativa em arte e áudio." };
  }
  return { valid: true, error: null };
}

export function validateApplication(app) {
  const role = String(app?.role || "").trim();
  const resume = String(app?.resume || "").trim();
  if (!role) return { valid: false, error: "Selecione uma função na equipe." };
  if (resume.length < 15) {
    return { valid: false, error: "Descreva sua experiência ou currículo com pelo menos 15 caracteres." };
  }
  return { valid: true, error: null };
}

export function generateProjectSvgCover(title, c1 = "#1e1b4b", c2 = "#0f766e", subtitle = "", frame = 1) {
  const safeTitle = escapeHtml(String(title || "Projeto Indie").slice(0, 40));
  const safeSub = escapeHtml(String(subtitle || "").slice(0, 48));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
    <defs>
      <linearGradient id="g${frame}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="800" height="450" fill="url(#g${frame})"/>
    <g stroke="rgba(255,255,255,0.08)" stroke-width="1">
      <line x1="0" y1="90" x2="800" y2="90"/>
      <line x1="0" y1="180" x2="800" y2="180"/>
      <line x1="0" y1="270" x2="800" y2="270"/>
      <line x1="0" y1="360" x2="800" y2="360"/>
      <line x1="160" y1="0" x2="160" y2="450"/>
      <line x1="320" y1="0" x2="320" y2="450"/>
      <line x1="480" y1="0" x2="480" y2="450"/>
      <line x1="640" y1="0" x2="640" y2="450"/>
    </g>
    <circle cx="${160 + ((frame % 3) * 180)}" cy="140" r="64" fill="rgba(255,255,255,0.1)"/>
    <rect x="44" y="44" width="712" height="362" rx="16" fill="rgba(9,13,24,0.42)" stroke="rgba(255,255,255,0.18)"/>
    <text x="72" y="96" fill="#a5b4fc" font-family="monospace" font-size="14" font-weight="bold">DREAMORE+ · CENA 0${frame}</text>
    <text x="72" y="290" fill="#ffffff" font-family="sans-serif" font-size="30" font-weight="bold">${safeTitle}</text>
    <text x="72" y="330" fill="#cbd5e1" font-family="monospace" font-size="16">${safeSub}</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

export function buildMemberDirectory(projects) {
  const members = [];
  (projects || []).forEach((p) => {
    (p.team || []).forEach((m) => {
      members.push({
        memberName: m.name,
        role: m.role,
        social: m.social || "",
        projectTitle: p.title?.pt || "",
        projectId: p.id,
        progress: p.progress || 0,
      });
    });
  });
  return members;
}

export function normalizeSocialUrl(platform, rawValue) {
  const val = String(rawValue || "").trim();
  if (!val) return "";
  if (/^https?:\/\//i.test(val)) return val;
  const handle = val.replace(/^@/, "");
  const bases = {
    youtube: `https://youtube.com/@${handle}`,
    twitter: `https://x.com/${handle}`,
    instagram: `https://instagram.com/${handle}`,
    linkedin: `https://linkedin.com/in/${handle}`,
    github: `https://github.com/${handle}`,
    itch: `https://${handle}.itch.io`,
    portfolio: `https://${val}`,
  };
  return bases[platform] || `https://${val}`;
}

export function getSocialLinksList(user) {
  if (!user) return [];
  const s = user.socials || {};
  const entries = [
    { key: "portfolio", label: "Portfólio", url: normalizeSocialUrl("portfolio", user.site || s.portfolio) },
    { key: "youtube", label: "YouTube", url: normalizeSocialUrl("youtube", s.youtube) },
    { key: "twitter", label: "Twitter / X", url: normalizeSocialUrl("twitter", s.twitter) },
    { key: "instagram", label: "Instagram", url: normalizeSocialUrl("instagram", s.instagram) },
    { key: "linkedin", label: "LinkedIn", url: normalizeSocialUrl("linkedin", s.linkedin) },
    { key: "github", label: "GitHub", url: normalizeSocialUrl("github", s.github) },
    { key: "itch", label: "Itch.io", url: normalizeSocialUrl("itch", s.itch) },
  ];
  return entries.filter((item) => Boolean(item.url));
}

export function resolveOnlineStatus(user, currentUser, navigatorOnline = true) {
  if (!user) return { online: false, label: "Offline" };
  if (currentUser && sanitizeKey(user.username) === sanitizeKey(currentUser.username)) {
    const isOnline = navigatorOnline !== false && currentUser.status !== "offline";
    return { online: isOnline, label: isOnline ? "Online" : "Offline" };
  }
  if (typeof user.online === "boolean") {
    return { online: user.online, label: user.online ? "Online" : "Offline" };
  }
  if (user.lastSeen) {
    const recent = Date.now() - Number(user.lastSeen) < 120000;
    return { online: recent, label: recent ? "Online" : "Offline" };
  }
  return { online: false, label: "Offline" };
}

export function clampString(value, maxLength = 500) {
  const str = String(value ?? "").trim();
  if (!maxLength || str.length <= maxLength) return str;
  return str.slice(0, maxLength);
}

export function normalizeGroupPayload(input = {}, existingGroup = null, currentUser = null) {
  const owner = clampString(
    existingGroup?.owner || input.owner || currentUser?.username || "Dev",
    64
  );
  const ownerUid = clampString(
    existingGroup?.ownerUid || input.ownerUid || currentUser?.uid || sanitizeKey(owner),
    128
  );
  const name = clampString(input.name ?? existingGroup?.name ?? "", 60);
  if (name.length < 2) {
    return { valid: false, error: "O nome do grupo precisa ter pelo menos 2 caracteres." };
  }

  const desc = clampString(input.desc ?? existingGroup?.desc ?? "", 300);
  const photo = clampString(input.photo ?? input.img ?? existingGroup?.photo ?? existingGroup?.img ?? "", 260000);
  const visibility = (input.visibility || existingGroup?.visibility) === "private" ? "private" : "public";

  const rawMembers = Array.isArray(input.members)
    ? input.members
    : Array.isArray(existingGroup?.members)
      ? existingGroup.members
      : [];
  const rawMods = Array.isArray(input.moderators)
    ? input.moderators
    : Array.isArray(input.mods)
      ? input.mods
      : Array.isArray(existingGroup?.moderators)
        ? existingGroup.moderators
        : Array.isArray(existingGroup?.mods)
          ? existingGroup.mods
          : [];

  const dedupePreserve = (list, mustInclude = []) => {
    const seen = new Set();
    const out = [];
    [...mustInclude, ...list].forEach((entry) => {
      const clean = clampString(entry, 64);
      const k = sanitizeKey(clean);
      if (clean && !seen.has(k)) {
        seen.add(k);
        out.push(clean);
      }
    });
    return out;
  };

  const moderators = dedupePreserve(rawMods, [owner]).slice(0, 25);
  const members = dedupePreserve([...rawMembers, ...moderators], [owner]).slice(0, 100);

  return {
    valid: true,
    error: null,
    group: {
      ...(existingGroup || {}),
      id: existingGroup?.id || input.id || `grp-${Date.now()}`,
      name,
      desc,
      photo,
      owner,
      ownerUid,
      moderators,
      mods: moderators.filter((m) => sanitizeKey(m) !== sanitizeKey(owner)),
      members,
      visibility,
    },
  };
}

export function canManageGroup(group, currentUser) {
  if (!group || !currentUser) return false;
  if (currentUser.role === "Administrador") return true;
  const meKey = sanitizeKey(currentUser.username);
  if (sanitizeKey(group.owner) === meKey) return true;
  if (currentUser.uid && group.ownerUid === currentUser.uid) return true;
  const mods = [...(group.moderators || []), ...(group.mods || [])];
  if (mods.some((m) => sanitizeKey(m) === meKey)) return true;
  if (currentUser.uid && Array.isArray(group.moderatorUids) && group.moderatorUids.includes(currentUser.uid)) {
    return true;
  }
  return false;
}

export function getGroupMeta(group) {
  const members = Array.isArray(group?.members) ? group.members : [];
  const moderators = Array.isArray(group?.moderators)
    ? group.moderators
    : Array.isArray(group?.mods)
      ? group.mods
      : [];
  const photo = group?.photo || group?.img || "";
  return {
    memberCount: members.length,
    moderatorCount: moderators.length,
    members,
    moderators,
    photo,
  };
}
