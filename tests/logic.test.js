import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterAndSortProjects,
  calculateCheckoutSummary,
  validateProjectDraft,
  validateApplication,
  buildMemberDirectory,
  normalizeSocialUrl,
  getSocialLinksList,
  resolveOnlineStatus,
  clampString,
  normalizeGroupPayload,
  canManageGroup,
  getGroupMeta,
} from "../js/logic.js";
import { buildMultilingualFields, autoTranslatePhrase, getLocalizedField } from "../js/i18n.js";

test("filterAndSortProjects filters by genre, search, thresholds, and sorts properly", () => {
  const sample = [
    {
      id: "p1",
      genre: "Ação / Beat 'em Up",
      likes: 120,
      favorites: 40,
      donated: 1500,
      progress: 70,
      creator: "Tulio",
      title: { pt: "Edd Contra o Mundo", en: "Edd Against the World", es: "Edd Contra el Mundo" },
      synopsis: { pt: "Pancadaria 2D clássica", en: "Classic 2D brawler", es: "Beat em up 2D" },
      comments: [{ text: "legal" }],
    },
    {
      id: "p2",
      genre: "RPG",
      likes: 30,
      favorites: 5,
      donated: 200,
      progress: 20,
      creator: "Ana",
      title: { pt: "Crônicas do Reino", en: "Kingdom Chronicles", es: "Crónicas del Reino" },
      synopsis: { pt: "Aventura tática", en: "Tactical adventure", es: "Aventura táctica" },
      comments: [],
    },
  ];

  const byGenre = filterAndSortProjects(sample, { genre: "RPG" });
  assert.equal(byGenre.length, 1);
  assert.equal(byGenre[0].id, "p2");

  const bySearch = filterAndSortProjects(sample, { search: "edd" });
  assert.equal(bySearch.length, 1);
  assert.equal(bySearch[0].id, "p1");

  const bySort = filterAndSortProjects(sample, { sort: "most_funded" });
  assert.equal(bySort[0].id, "p1");
});

test("calculateCheckoutSummary applies DREAM50 coupon and 5% platform fee", () => {
  const full = calculateCheckoutSummary(100, "");
  assert.equal(full.finalAmount, 100);
  assert.equal(full.platformFee, 5);
  assert.equal(full.creatorNet, 95);
  assert.equal(full.couponApplied, false);

  const discounted = calculateCheckoutSummary(100, "dream50");
  assert.equal(discounted.finalAmount, 50);
  assert.equal(discounted.platformFee, 2.5);
  assert.equal(discounted.creatorNet, 47.5);
  assert.equal(discounted.couponApplied, true);
});

test("validateProjectDraft enforces +16/+18 content details and anti-AI confirmation", () => {
  const missingAi = validateProjectDraft({
    titlePt: "Meu Jogo",
    synopsisPt: "Uma jornada épica em pixel art.",
    ageRating: "Livre",
    antiAiAccepted: false,
  });
  assert.equal(missingAi.valid, false);

  const missingDetails = validateProjectDraft({
    titlePt: "Sombras Noturnas",
    synopsisPt: "Um survival horror tenso e atmosférico.",
    ageRating: "+18",
    ageDetails: "curto",
    antiAiAccepted: true,
  });
  assert.equal(missingDetails.valid, false);

  const ok = validateProjectDraft({
    titlePt: "Sombras Noturnas",
    synopsisPt: "Um survival horror tenso e atmosférico.",
    ageRating: "+16",
    ageDetails: "Combate intenso contra criaturas e temas sombrios.",
    antiAiAccepted: true,
  });
  assert.equal(ok.valid, true);
});

test("validateApplication validates role and minimum resume length", () => {
  assert.equal(validateApplication({ role: "", resume: "Experiência longa aqui" }).valid, false);
  assert.equal(validateApplication({ role: "Programador", resume: "Curto" }).valid, false);
  assert.equal(
    validateApplication({ role: "Programador", resume: "Desenvolvo em Godot 4 há 3 anos com foco em UI." }).valid,
    true
  );
});

test("autoTranslatePhrase, buildMultilingualFields and getLocalizedField translate accented PT project names", () => {
  assert.equal(autoTranslatePhrase("Um jogo de aventura", "en"), "Um game of adventure");
  const darkForestEn = autoTranslatePhrase("Crônicas da Floresta Sombria", "en");
  assert.match(darkForestEn, /Chronicles of the Forest Dark/i);
  const ironHeartEn = autoTranslatePhrase("Coração de Aço", "en");
  assert.equal(ironHeartEn, "Heart of Steel");
  const ironHeartEs = autoTranslatePhrase("Coração de Aço", "es");
  assert.equal(ironHeartEs, "Corazón de Acero");

  const fields = buildMultilingualFields("Projeto Reino", "Uma história de ação e terror.");
  assert.equal(fields.title.pt, "Projeto Reino");
  assert.match(fields.title.en, /Kingdom/);
  assert.match(fields.synopsis.es, /historia/i);

  assert.equal(
    getLocalizedField({ pt: "Guardiões da Luz", en: "Guardiões da Luz" }, "en"),
    "Guardians of the Light"
  );
});

test("buildMemberDirectory flattens team members across projects", () => {
  const dir = buildMemberDirectory([
    {
      id: "proj-1",
      progress: 50,
      title: { pt: "Teste" },
      team: [{ name: "José", role: "Dev", social: "@jose" }],
    },
  ]);
  assert.equal(dir.length, 1);
  assert.equal(dir[0].memberName, "José");
  assert.equal(dir[0].projectId, "proj-1");
});

test("normalizeSocialUrl and getSocialLinksList build normalized clickable links", () => {
  assert.equal(normalizeSocialUrl("youtube", "@dreamore"), "https://youtube.com/@dreamore");
  assert.equal(normalizeSocialUrl("twitter", "@indiedev"), "https://x.com/indiedev");
  assert.equal(normalizeSocialUrl("portfolio", "https://meujogo.com"), "https://meujogo.com");

  const links = getSocialLinksList({
    site: "dreamore.dev",
    socials: { youtube: "@dreamore", github: "josewillian", itch: "tulioparker" },
  });
  assert.equal(links.length, 4);
  assert.equal(links[0].url, "https://dreamore.dev");
  assert.equal(links[3].url, "https://tulioparker.itch.io");
});

test("resolveOnlineStatus resolves current user navigator status and peer presence", () => {
  const me = { username: "JoseWillian", online: true };
  assert.equal(resolveOnlineStatus(me, me, true).online, true);
  assert.equal(resolveOnlineStatus(me, me, false).online, false);
  assert.equal(resolveOnlineStatus({ username: "Tulio", online: false }, me, true).label, "Offline");
  assert.equal(resolveOnlineStatus({ username: "Caua", online: true }, me, true).label, "Online");
});

test("clampString and normalizeGroupPayload manage photo, members, moderators, and description", () => {
  assert.equal(clampString("  DREAMORE+ Indie  ", 8), "DREAMORE");

  const invalid = normalizeGroupPayload({ name: "A" }, null, { username: "JoseWillian" });
  assert.equal(invalid.valid, false);

  const created = normalizeGroupPayload(
    {
      name: "Equipe Pixel BR",
      desc: "Grupo focado em pixel art e combate 2D.",
      photo: "https://example.com/grp.png",
      members: ["TulioParker", "TulioParker", "CauaMaxakali"],
      moderators: ["JoaoPedro"],
    },
    null,
    { username: "JoseWillian", uid: "uid-jose" }
  );
  assert.equal(created.valid, true);
  assert.equal(created.group.photo, "https://example.com/grp.png");
  assert.equal(created.group.owner, "JoseWillian");
  assert.ok(created.group.moderators.includes("JoseWillian"));
  assert.ok(created.group.moderators.includes("JoaoPedro"));
  assert.ok(created.group.members.includes("JoaoPedro"));
  assert.equal(created.group.members.filter((m) => m === "TulioParker").length, 1);

  assert.equal(canManageGroup(created.group, { username: "JoaoPedro", role: "Desenvolvedor" }), true);
  assert.equal(canManageGroup(created.group, { username: "TulioParker", role: "Desenvolvedor" }), false);

  const meta = getGroupMeta(created.group);
  assert.equal(meta.moderatorCount, 2);
  assert.equal(meta.memberCount, 4);
});

