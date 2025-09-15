import { listByPostWithMeta } from "@read-models/comments/comment.read-service";
import { seedBasicComments } from "./_factories";
import {
  connectMongoMemory,
  disconnectMongoMemory,
  dropData,
} from "./_mongoMemory";

describe("INTEGRATION: read-models/comments → listByPostWithMeta", () => {
  beforeAll(async () => {
    jest.setTimeout(60_000);
    await connectMongoMemory();
  });
  afterEach(dropData);
  afterAll(disconnectMongoMemory);

  it("likeCount + likedByMe + orden + paginación", async () => {
    const { u1, post, c1, c2 } = await seedBasicComments();

    const out = await listByPostWithMeta(
      u1._id.toString(),
      post._id.toString(),
      { page: 1, limit: 10 }
    );

    expect(out.map((r) => r.content)).toEqual(["segundo", "primero"]);

    const byId = new Map(out.map((r) => [r.id, r]));
    expect(byId.get(c2._id.toString())!.likeCount).toBe(1);
    expect(byId.get(c1._id.toString())!.likeCount).toBe(2);

    expect(byId.get(c2._id.toString())!.likedByMe).toBe(true);
    expect(byId.get(c1._id.toString())!.likedByMe).toBe(true);

    const page2 = await listByPostWithMeta(
      u1._id.toString(),
      post._id.toString(),
      { page: 2, limit: 1 }
    );
    expect(page2).toHaveLength(1);
    expect(page2[0].id).toBe(c1._id.toString());
  });

  it("viewer null ⇒ likedByMe=false", async () => {
    const { post } = await seedBasicComments();
    const out = await listByPostWithMeta(null, post._id.toString(), {
      page: 1,
      limit: 10,
    });
    out.forEach((r) => expect(r.likedByMe).toBe(false));
  });
});
