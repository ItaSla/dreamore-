const express = require("express");
const path = require("path");
const { DreamoreDatabase } = require("./database/database");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const db = new DreamoreDatabase();

app.use(express.json({ limit: "8mb" }));
app.use(express.static(__dirname));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "dreamore-plus" });
});

app.get("/api/bootstrap", (_req, res) => {
  res.json(db.getBootstrap());
});

app.get("/api/sync", (_req, res) => {
  res.json({
    users: db.data.users.map((u) => db.sanitizeUser(u)),
    chats: db.data.chats,
    groups: db.data.groups,
    applications: db.data.applications,
    projects: db.data.projects,
    mentorMessages: db.data.gamedevHelp?.mentorMessages || [],
  });
});

app.get("/api/auth/google/config", (_req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  res.json({ enabled: Boolean(clientId), clientId: clientId || null });
});

app.post("/api/auth/login", (req, res) => {
  const { identifier, password } = req.body || {};
  const result = db.authenticateLocal(identifier, password);
  if (result.error) return res.status(401).json(result);
  res.json(result);
});

app.post("/api/auth/register", (req, res) => {
  const result = db.registerUser(req.body || {});
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential, accessToken, email, name, photo } = req.body || {};
    if (credential) {
      const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (!verifyRes.ok) {
        return res.status(401).json({ error: "Token Google inválido ou expirado." });
      }
      const info = await verifyRes.json();
      if (process.env.GOOGLE_CLIENT_ID && info.aud !== process.env.GOOGLE_CLIENT_ID) {
        return res.status(401).json({ error: "Client ID Google divergente." });
      }
      return res.json(
        db.upsertGoogleUser({
          email: info.email,
          name: info.name,
          photo: info.picture,
          sub: info.sub,
        })
      );
    }

    if (accessToken) {
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!userInfoRes.ok) {
        return res.status(401).json({ error: "Falha ao obter dados da conta Google." });
      }
      const info = await userInfoRes.json();
      return res.json(
        db.upsertGoogleUser({
          email: info.email,
          name: info.name,
          photo: info.picture,
          sub: info.sub,
        })
      );
    }

    if (email) {
      return res.json(db.upsertGoogleUser({ email, name, photo }));
    }

    return res.status(400).json({ error: "Dados de login Google ausentes." });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Erro interno no login Google." });
  }
});

app.post("/api/presence", (req, res) => {
  const { username, online } = req.body || {};
  if (!username) return res.status(400).json({ error: "Usuário obrigatório." });
  const user = db.setUserPresence(username, online !== false);
  res.json({ user, users: db.data.users.map((u) => db.sanitizeUser(u)) });
});

app.patch("/api/users/:username", (req, res) => {
  const result = db.updateUser(req.params.username, req.body || {});
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

app.post("/api/users/:username/follow", (req, res) => {
  const { follower } = req.body || {};
  if (!follower) return res.status(400).json({ error: "Seguidor obrigatório." });
  const result = db.toggleFollow(req.params.username, follower);
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

app.post("/api/projects", (req, res) => {
  const proj = db.createProject(req.body || {});
  res.json({ project: proj });
});

app.patch("/api/projects/:id", (req, res) => {
  const proj = db.updateProject(req.params.id, req.body || {});
  if (!proj) return res.status(404).json({ error: "Projeto não encontrado." });
  res.json({ project: proj });
});

app.delete("/api/projects/:id", (req, res) => {
  const ok = db.deleteProject(req.params.id);
  if (!ok) return res.status(404).json({ error: "Projeto não encontrado." });
  res.json({ ok: true });
});

app.post("/api/projects/:id/comments", (req, res) => {
  const proj = db.addProjectComment(req.params.id, req.body || {});
  if (!proj) return res.status(404).json({ error: "Projeto não encontrado." });
  res.json({ project: proj, comment: proj.comments[0] });
});

app.post("/api/projects/:id/apply", (req, res) => {
  const application = db.submitApplication({ ...(req.body || {}), projectId: req.params.id });
  res.json({ application });
});

app.patch("/api/applications/:id", (req, res) => {
  const resolved = db.resolveApplication(req.params.id, (req.body || {}).status);
  if (!resolved) return res.status(404).json({ error: "Candidatura não encontrada." });
  res.json({ application: resolved.application, project: resolved.project, projects: db.data.projects });
});

app.post("/api/feed", (req, res) => {
  const post = db.createFeedPost(req.body || {});
  res.json({ post });
});

app.post("/api/feed/:id/like", (req, res) => {
  const post = db.likeFeedPost(req.params.id);
  if (!post) return res.status(404).json({ error: "Post não encontrado." });
  res.json({ post });
});

app.post("/api/feed/:id/comments", (req, res) => {
  const post = db.commentFeedPost(req.params.id, req.body || {});
  if (!post) return res.status(404).json({ error: "Post não encontrado." });
  res.json({ post });
});

app.post("/api/chat/:channelId", (req, res) => {
  const msg = db.addChatMessage(req.params.channelId, req.body || {});
  res.json({ message: msg });
});

app.delete("/api/chat/:channelId/:msgId", (req, res) => {
  db.deleteChatMessage(req.params.channelId, req.params.msgId);
  res.json({ ok: true });
});

app.post("/api/groups", (req, res) => {
  const group = db.createGroup(req.body || {});
  res.json({ group });
});

app.patch("/api/groups/:id", (req, res) => {
  const group = db.updateGroup(req.params.id, req.body || {});
  if (!group) return res.status(404).json({ error: "Grupo não encontrado." });
  res.json({ group });
});

app.post("/api/gamedev-help/chat", (req, res) => {
  const messages = db.addMentorMessage(req.body || {});
  res.json({ messages });
});

app.post("/api/gamedev-help/progress", (req, res) => {
  const { username, moduleId } = req.body || {};
  const completed = db.toggleCourseModule(username, moduleId);
  res.json({ completed });
});

app.post("/api/checkout", (req, res) => {
  const sale = db.recordCheckout(req.body || {});
  res.json({ sale, projects: db.data.projects });
});

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Endpoint não encontrado." });
  }
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`DREAMORE+ server listening on http://${HOST}:${PORT}`);
});
