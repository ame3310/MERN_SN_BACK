import { createPost, createUser } from "./_factories";
import {
  connectMongoMemory,
  disconnectMongoMemory,
  dropData,
} from "./_mongoMemory";

import {
  searchAll,
  searchPosts,
  searchUsers,
} from "@read-models/searches/search.read-service";

function extractItems(resp: any, kind: "users" | "posts") {
  if (!resp) return [];
  if (resp[kind]?.data && Array.isArray(resp[kind].data))
    return resp[kind].data;
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp[kind])) return resp[kind];
  if (Array.isArray(resp)) return resp;
  return [];
}

describe("INTEGRATION: read-models/searches → search.read-service", () => {
  beforeAll(async () => {
    jest.setTimeout(60_000);
    await connectMongoMemory();
  });
  afterEach(dropData);
  afterAll(disconnectMongoMemory);

  async function seedBasics() {
    const alice = await createUser({
      username: "alice",
      email: "alice@test.com",
      displayName: "Alice A",
    });
    const bob = await createUser({
      username: "bob",
      email: "bob@test.com",
      displayName: "Bobby B",
    });
    const charlie = await createUser({
      username: "charlie",
      email: "charlie@sample.com",
      displayName: "Charlie C",
    });

    await createPost({
      author: alice._id,
      title: "Node Tips",
      content: "Trucos y consejos",
    });
    await createPost({
      author: bob._id,
      title: "Nest Guide",
      content: "Guía avanzada",
    });
    await createPost({
      author: alice._id,
      title: "Mongo Magic",
      content: "Aggregations y $lookup",
    });

    return { alice, bob, charlie };
  }

  describe("searchAll", () => {
    it("devuelve users (por username/displayName) y posts (por título/contenido) y pagina", async () => {
      await seedBasics();

      // Users
      const rUsers = await searchAll({ q: "Tralarelo", page: 1, limit: 10 });
      const users = extractItems(rUsers, "users");
      const usersStr = users.map((u: any) =>
        `${u.username ?? ""} ${u.displayName ?? ""}`.toLowerCase()
      );
      expect(usersStr.some((s: string) => s.includes("tralarelo"))).toBe(true);

      // Posts
      const rPosts = await searchAll({ q: "guide", page: 1, limit: 10 });
      const posts = extractItems(rPosts, "posts");
      const ok = posts.some((p: any) =>
        `${p.title ?? ""} ${p.content ?? ""}`.toLowerCase().includes("guide")
      );
      expect(ok).toBe(true);

      // Pagination
      const page1 = await searchAll({ q: "guide", page: 1, limit: 1 });
      const postsPage1 = extractItems(page1, "posts");
      expect(postsPage1.length).toBeLessThanOrEqual(1);
    });
  });

  describe("searchUsers", () => {
    it("busca por username/displayName y respeta paginación", async () => {
      await seedBasics();
      await createUser({
        username: "alison",
        displayName: "Ali Son",
        email: "ali@test.com",
      });

      const r1 = await searchUsers({ q: "ali", page: 1, limit: 10 });
      const items1 = extractItems(r1, "users");
      const repr1 = items1.map((u: any) =>
        `${u.username ?? ""} ${u.displayName ?? ""}`.toLowerCase()
      );
      expect(repr1.some((s: string) => s.includes("ali"))).toBe(true);

      const p1 = await searchUsers({ q: "ali", page: 1, limit: 1 });
      const p2 = await searchUsers({ q: "ali", page: 2, limit: 1 });
      expect(extractItems(p1, "users").length).toBeLessThanOrEqual(1);
      expect(extractItems(p2, "users").length).toBeLessThanOrEqual(1);
    });
  });

  describe("searchPosts", () => {
    it("busca por título/contenido y respeta paginación", async () => {
      await seedBasics();

      // "mongo"
      const r1 = await searchPosts({ q: "mongo", page: 1, limit: 10 });
      const items1 = extractItems(r1, "posts");
      const s1 = items1.map((p: any) =>
        `${p.title ?? ""} ${p.content ?? ""}`.toLowerCase()
      );
      expect(s1.some((t: string) => t.includes("mongo"))).toBe(true);

      // guide
      const r2 = await searchPosts({ q: "guide", page: 1, limit: 10 });
      const items2 = extractItems(r2, "posts");
      const s2 = items2.map((p: any) =>
        `${p.title ?? ""} ${p.content ?? ""}`.toLowerCase()
      );
      expect(s2.some((t: string) => t.includes("guide"))).toBe(true);

      // Paginación
      const r3 = await searchPosts({ q: "node", page: 1, limit: 1 });
      const items3 = extractItems(r3, "posts");
      expect(items3.length).toBeLessThanOrEqual(1);
    });
  });
});
