import {
  db,
  auth,
  googleProvider,
  firebaseConfig,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "./vendor/firebase-sdk.js";
import { clampString, sanitizeKey } from "./logic.js";

export const OperationType = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LIST: "list",
  GET: "get",
  WRITE: "write",
});

export function handleFirestoreError(error, operationType, path) {
  const user = auth?.currentUser || null;
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: user?.uid || null,
      email: user?.email || null,
      emailVerified: user?.emailVerified ?? null,
      isAnonymous: user?.isAnonymous ?? null,
      tenantId: user?.tenantId || null,
      providerInfo: (user?.providerData || []).map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })),
    },
    operationType,
    path: path || null,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function cleanId(raw, fallbackPrefix = "doc") {
  const safe = String(raw || "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 120);
  return safe || `${fallbackPrefix}_${Date.now()}`;
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
    return false;
  }
}

const unsubscribers = [];

function clearListeners() {
  while (unsubscribers.length) {
    const fn = unsubscribers.pop();
    try {
      if (typeof fn === "function") fn();
    } catch (_err) {
      // Ignore cleanup errors
    }
  }
}

function buildPublicUserDoc(uid, u) {
  const username = clampString(u.username || u.name || "Sonhador", 64) || "Sonhador";
  const safeRole = ["Visitante", "Desenvolvedor"].includes(u.role) ? u.role : "Desenvolvedor";
  return {
    uid: cleanId(uid, "usr"),
    username,
    name: clampString(u.name || username, 80) || username,
    role: safeRole,
    bio: clampString(u.bio || "", 600),
    location: clampString(u.location || "", 100),
    site: clampString(u.site || "", 300),
    photo: clampString(u.photo || "", 260000),
    banner: clampString(u.banner || "", 300000),
    socials: typeof u.socials === "object" && u.socials ? u.socials : {},
    resume: clampString(u.resume || "", 2000),
    skills: Array.isArray(u.skills) ? u.skills.slice(0, 30).map((s) => clampString(s, 60)) : [],
    followers: Array.isArray(u.followers) ? u.followers.slice(0, 500).map((f) => clampString(f, 64)) : [],
    online: Boolean(u.online !== false),
    visibility: "public",
    lastSeen: Date.now(),
  };
}

function buildProjectDoc(p, ownerId) {
  const id = cleanId(p.id, "proj");
  const ageRating = ["Livre", "+13", "+16", "+18"].includes(p.ageRating) ? p.ageRating : "Livre";
  return {
    id,
    ownerId: cleanId(p.ownerId || ownerId, "usr"),
    creator: clampString(p.creator || "Desenvolvedor", 80),
    icon: clampString(p.icon || "gamepad", 32),
    title: typeof p.title === "object" && p.title ? p.title : { pt: clampString(p.title || "Projeto", 120) },
    synopsis: typeof p.synopsis === "object" && p.synopsis ? p.synopsis : { pt: clampString(p.synopsis || "", 600) },
    genre: clampString(p.genre || "Aventura", 80),
    year: Number(p.year) || 2028,
    releaseDate: clampString(p.releaseDate || `${Number(p.year) || 2028}-12-01`, 20),
    progress: Math.max(0, Math.min(100, Number(p.progress) || 0)),
    goal: Math.max(100, Number(p.goal) || 5000),
    donated: Math.max(0, Number(p.donated) || 0),
    likes: Math.max(0, Number(p.likes) || 0),
    favorites: Math.max(0, Number(p.favorites) || 0),
    ageRating,
    ageDetails: clampString(p.ageDetails || "", 400),
    colors: Array.isArray(p.colors) ? p.colors.slice(0, 4).map((c) => clampString(c, 24)) : ["#312e81", "#0f766e"],
    cover: clampString(p.cover || "", 300000),
    gallery: Array.isArray(p.gallery) ? p.gallery.slice(0, 12).map((g) => clampString(g, 200000)) : [],
    playableDemo: p.playableDemo && typeof p.playableDemo === "object" ? p.playableDemo : {},
    team: Array.isArray(p.team) ? p.team.slice(0, 40) : [],
    comments: Array.isArray(p.comments) ? p.comments.slice(0, 200) : [],
    visibility: "public",
  };
}

function buildGroupDoc(g, ownerUid) {
  const id = cleanId(g.id, "grp");
  const safeOwnerUid = cleanId(g.ownerUid || ownerUid, "usr");
  const members = Array.isArray(g.members) ? g.members.slice(0, 100).map((m) => clampString(m, 64)).filter(Boolean) : [];
  const moderators = Array.isArray(g.moderators || g.mods)
    ? (g.moderators || g.mods).slice(0, 25).map((m) => clampString(m, 64)).filter(Boolean)
    : [];
  const memberUids = Array.isArray(g.memberUids) && g.memberUids.length
    ? Array.from(new Set([safeOwnerUid, ...g.memberUids.map((u) => cleanId(u, "u"))])).slice(0, 100)
    : [safeOwnerUid];
  const moderatorUids = Array.isArray(g.moderatorUids) && g.moderatorUids.length
    ? Array.from(new Set([safeOwnerUid, ...g.moderatorUids.map((u) => cleanId(u, "u"))])).slice(0, 25)
    : [safeOwnerUid];
  return {
    id,
    name: clampString(g.name || "Grupo", 60),
    desc: clampString(g.desc || "", 300),
    photo: clampString(g.photo || g.img || "", 260000),
    ownerUid: safeOwnerUid,
    owner: clampString(g.owner || "Dev", 64),
    moderatorUids,
    moderators,
    memberUids,
    members,
    visibility: g.visibility === "private" ? "private" : "public",
  };
}

export const DreamoreFirebase = {
  isConfigured() {
    return Boolean(firebaseConfig?.projectId && firebaseConfig?.firestoreDatabaseId);
  },

  getCurrentAuthUser() {
    return auth?.currentUser || null;
  },

  async init() {
    await testConnection();
  },

  onAuthChanged(callback) {
    return onAuthStateChanged(auth, (fbUser) => callback(fbUser));
  },

  async signInWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;
    if (!fbUser) throw new Error("Conta Google não retornou credenciais válidas.");

    const uid = cleanId(fbUser.uid, "usr");
    const baseHandle = (fbUser.displayName || (fbUser.email || "dev").split("@")[0])
      .replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 32) || "Sonhador";

    const privPath = `users/${uid}`;
    const pubPath = `users_public/${uid}`;

    try {
      const privRef = doc(db, "users", uid);
      const pubRef = doc(db, "users_public", uid);
      const [privSnap, pubSnap] = await Promise.all([getDoc(privRef), getDoc(pubRef)]);

      if (!privSnap.exists()) {
        await setDoc(privRef, {
          uid,
          email: clampString(fbUser.email || "", 200),
          username: baseHandle,
          name: clampString(fbUser.displayName || baseHandle, 80),
          role: "Desenvolvedor",
          provider: "google",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(privRef, {
          name: clampString(fbUser.displayName || privSnap.data().name || baseHandle, 80),
          email: clampString(fbUser.email || privSnap.data().email || "", 200),
          updatedAt: serverTimestamp(),
        });
      }

      if (!pubSnap.exists()) {
        const pubPayload = buildPublicUserDoc(uid, {
          username: baseHandle,
          name: fbUser.displayName || baseHandle,
          role: "Desenvolvedor",
          bio: "Conta conectada via Google na DREAMORE+.",
          photo: fbUser.photoURL || "",
          online: true,
        });
        await setDoc(pubRef, {
          ...pubPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const existingPub = pubSnap.data();
        await updateDoc(pubRef, {
          photo: existingPub.photo || clampString(fbUser.photoURL || "", 260000),
          online: true,
          lastSeen: Date.now(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${privPath} | ${pubPath}`);
    }

    return {
      uid,
      email: fbUser.email || "",
      name: fbUser.displayName || baseHandle,
      photo: fbUser.photoURL || "",
      emailVerified: Boolean(fbUser.emailVerified),
    };
  },

  async signOut() {
    clearListeners();
    try {
      if (auth.currentUser) {
        const uid = cleanId(auth.currentUser.uid, "usr");
        await updateDoc(doc(db, "users_public", uid), {
          online: false,
          lastSeen: Date.now(),
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
      await signOut(auth);
    } catch (_err) {
      // Ignore signOut errors
    }
  },

  async syncCurrentUserProfile(user) {
    const fbUser = auth.currentUser;
    if (!fbUser || !user) return;
    const uid = cleanId(fbUser.uid, "usr");
    const pubPath = `users_public/${uid}`;
    try {
      const pubRef = doc(db, "users_public", uid);
      const snap = await getDoc(pubRef);
      const payload = buildPublicUserDoc(uid, { ...user, photo: user.photo || fbUser.photoURL || "" });
      if (!snap.exists()) {
        await setDoc(pubRef, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      } else {
        const updatable = { ...payload };
        delete updatable.uid;
        delete updatable.visibility;
        delete updatable.role;
        await updateDoc(pubRef, { ...updatable, updatedAt: serverTimestamp() });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, pubPath);
    }
  },

  async createOrUpdateGroup(group) {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    const uid = cleanId(fbUser.uid, "usr");
    const id = cleanId(group.id, "grp");
    const path = `groups/${id}`;
    try {
      const ref = doc(db, "groups", id);
      const snap = await getDoc(ref);
      const payload = buildGroupDoc(group, uid);
      if (!snap.exists()) {
        await setDoc(ref, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      } else {
        await updateDoc(ref, {
          name: payload.name,
          desc: payload.desc,
          photo: payload.photo,
          moderatorUids: payload.moderatorUids,
          moderators: payload.moderators,
          memberUids: payload.memberUids,
          members: payload.members,
          visibility: payload.visibility,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveProject(project) {
    const fbUser = auth.currentUser;
    if (!fbUser || !project) return;
    const uid = cleanId(fbUser.uid, "usr");
    const id = cleanId(project.id, "proj");
    const path = `projects/${id}`;
    try {
      const ref = doc(db, "projects", id);
      const snap = await getDoc(ref);
      const payload = buildProjectDoc(project, uid);
      if (!snap.exists()) {
        await setDoc(ref, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      } else {
        const patch = { ...payload };
        delete patch.id;
        delete patch.ownerId;
        delete patch.visibility;
        await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateProjectMetrics(projectId, patch) {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    const id = cleanId(projectId, "proj");
    const path = `projects/${id}`;
    try {
      const ref = doc(db, "projects", id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const safePatch = {};
      if (typeof patch.likes === "number") safePatch.likes = Math.max(0, patch.likes);
      if (typeof patch.favorites === "number") safePatch.favorites = Math.max(0, patch.favorites);
      if (typeof patch.donated === "number") safePatch.donated = Math.max(0, patch.donated);
      if (Array.isArray(patch.comments)) safePatch.comments = patch.comments.slice(0, 200);
      await updateDoc(ref, { ...safePatch, updatedAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteProject(projectId) {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    const id = cleanId(projectId, "proj");
    const path = `projects/${id}`;
    try {
      await deleteDoc(doc(db, "projects", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async saveFeedPost(post) {
    const fbUser = auth.currentUser;
    if (!fbUser || !post) return;
    const uid = cleanId(fbUser.uid, "usr");
    const id = cleanId(post.id, "feed");
    const path = `feed_posts/${id}`;
    try {
      const ref = doc(db, "feed_posts", id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          id,
          authorUid: uid,
          author: clampString(post.author || "Dev", 80),
          username: clampString(post.username || "Dev", 64),
          role: clampString(post.role || "Desenvolvedor", 32),
          projectId: clampString(post.projectId || "", 128),
          projectTitle: clampString(post.projectTitle || "", 140),
          tag: clampString(post.tag || "Progresso", 40),
          milestone: clampString(post.milestone || "", 140),
          content: clampString(post.content || "", 2000) || "Atualização",
          image: clampString(post.image || "", 300000),
          likes: Math.max(0, Number(post.likes) || 0),
          comments: Array.isArray(post.comments) ? post.comments.slice(0, 200) : [],
          visibility: "public",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, {
          likes: Math.max(0, Number(post.likes) || 0),
          comments: Array.isArray(post.comments) ? post.comments.slice(0, 200) : [],
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async sendChatMessage(channelId, msg, group = null) {
    const fbUser = auth.currentUser;
    if (!fbUser || !msg) return;
    const uid = cleanId(fbUser.uid, "usr");
    const msgId = cleanId(msg.id, "msg");
    if (String(channelId).startsWith("grp:")) {
      const groupId = cleanId(String(channelId).slice(4), "grp");
      const path = `groups/${groupId}/messages/${msgId}`;
      try {
        await setDoc(doc(db, "groups", groupId, "messages", msgId), {
          id: msgId,
          authorUid: uid,
          user: clampString(msg.user || "Dev", 80),
          role: clampString(msg.role || "Membro", 32),
          text: clampString(msg.text || "", 1500),
          attachment: msg.attachment && typeof msg.attachment === "object" ? msg.attachment : {},
          visibility: group?.visibility === "private" ? "private" : "public",
          memberUids: Array.isArray(group?.memberUids) && group.memberUids.length ? group.memberUids.slice(0, 100) : [uid],
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
      return;
    }

    const safeCid = cleanId(channelId, "chan");
    const path = `channels/${safeCid}/messages/${msgId}`;
    try {
      await setDoc(doc(db, "channels", safeCid, "messages", msgId), {
        id: msgId,
        channelId: safeCid,
        authorUid: uid,
        user: clampString(msg.user || "Dev", 80),
        role: clampString(msg.role || "Membro", 40),
        text: clampString(msg.text || "", 1500),
        attachment: msg.attachment && typeof msg.attachment === "object" ? msg.attachment : {},
        visibility: "public",
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async seedIfEmpty({ projects = [], groups = [] }) {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    const uid = cleanId(fbUser.uid, "usr");
    try {
      const projSnap = await getDocs(query(collection(db, "projects"), where("visibility", "==", "public")));
      if (projSnap.empty && projects.length) {
        for (const p of projects.slice(0, 12)) {
          const ref = doc(db, "projects", cleanId(p.id, "proj"));
          await setDoc(ref, { ...buildProjectDoc(p, uid), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        }
      }
      const grpSnap = await getDocs(query(collection(db, "groups"), where("visibility", "==", "public")));
      if (grpSnap.empty && groups.length) {
        for (const g of groups.slice(0, 6)) {
          const ref = doc(db, "groups", cleanId(g.id, "grp"));
          await setDoc(ref, { ...buildGroupDoc(g, uid), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        }
      }
    } catch (_err) {
      // Seed skips silently if user lacks write or network is offline; primary mutations still enforce handleFirestoreError
    }
  },

  attachListeners({ onUsers, onProjects, onGroups, onFeedPosts }) {
    clearListeners();
    if (!auth.currentUser) return;

    const usersPath = "users_public";
    unsubscribers.push(
      onSnapshot(
        query(collection(db, usersPath), where("visibility", "==", "public")),
        (snap) => {
          const list = snap.docs.map((d) => d.data());
          if (onUsers) onUsers(list);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, usersPath)
      )
    );

    const projectsPath = "projects";
    unsubscribers.push(
      onSnapshot(
        query(collection(db, projectsPath), where("visibility", "==", "public")),
        (snap) => {
          const list = snap.docs.map((d) => d.data());
          if (onProjects) onProjects(list);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, projectsPath)
      )
    );

    const groupsPath = "groups";
    unsubscribers.push(
      onSnapshot(
        query(collection(db, groupsPath), where("visibility", "==", "public")),
        (snap) => {
          const list = snap.docs.map((d) => d.data());
          if (onGroups) onGroups(list);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, groupsPath)
      )
    );

    const feedPath = "feed_posts";
    unsubscribers.push(
      onSnapshot(
        query(collection(db, feedPath), where("visibility", "==", "public")),
        (snap) => {
          const list = snap.docs.map((d) => d.data());
          if (onFeedPosts) onFeedPosts(list);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, feedPath)
      )
    );
  },

  mergeUsersByUsername(existingUsers, remoteUsers) {
    const map = new Map();
    (existingUsers || []).forEach((u) => map.set(sanitizeKey(u.username), u));
    (remoteUsers || []).forEach((ru) => {
      const k = sanitizeKey(ru.username);
      const prev = map.get(k) || {};
      map.set(k, { ...prev, ...ru });
    });
    return Array.from(map.values());
  },
};
