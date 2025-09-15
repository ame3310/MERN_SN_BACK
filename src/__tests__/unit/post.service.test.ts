// src/__tests__/unit/post.service.test.ts
import { Post } from "@modules/posts/post.model";
import {
  createPost,
  deletePost,
  getPostById,
  updatePost,
} from "@modules/posts/post.service";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import { Types } from "mongoose";

jest.mock("@modules/posts/post.model");

type Doc = {
  _id: string;
  author: string;
  title?: string;
  content?: string;
  images: string[];
  createdAt?: Date;
  updatedAt?: Date;
  save?: jest.Mock;
};

const oid = () => new Types.ObjectId().toHexString();

describe("post.service", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("createPost", () => {
    it("crea un nuevo post y devuelve el post público", async () => {
      const authorId = oid();
      const doc: Doc = {
        _id: oid(),
        author: authorId,
        title: "Test Title",
        content: "Test content",
        images: ["https://img/a.jpg"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (Post.create as jest.Mock).mockResolvedValueOnce(doc);

      const out = await createPost(authorId, {
        title: "Test Title",
        content: "Test content",
        images: ["https://img/a.jpg"],
      });

      expect(Post.create).toHaveBeenCalledWith({
        author: authorId,
        title: "Test Title",
        content: "Test content",
        images: ["https://img/a.jpg"],
      });

      expect(out).toMatchObject({
        id: doc._id,
        authorId,
        title: "Test Title",
        content: "Test content",
        images: ["https://img/a.jpg"],
      });
    });

    it("lanza BAD_REQUEST si el authorId es inválido", async () => {
      await expect(
        createPost("not-an-oid", { images: ["x"] })
      ).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe("getPostById", () => {
    it("lanza BAD_REQUEST si el ID no es válido", async () => {
      await expect(getPostById("invalid")).rejects.toBeInstanceOf(ApiError);
    });

    it("lanza NOT_FOUND si no existe", async () => {
      (Post.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(getPostById(oid())).rejects.toMatchObject({
        code: ERR.POST.NOT_FOUND,
      });
    });

    it("devuelve el post si existe", async () => {
      const doc: Doc = {
        _id: oid(),
        author: oid(),
        title: "Test Title",
        content: "Test content",
        images: ["a"],
        createdAt: new Date(),
      };
      (Post.findById as jest.Mock).mockResolvedValueOnce(doc);

      const out = await getPostById(doc._id);

      expect(Post.findById).toHaveBeenCalledWith(doc._id);
      expect(out).toMatchObject({
        id: doc._id,
        authorId: doc.author,
        title: "Test Title",
      });
    });
  });

  describe("updatePost", () => {
    const actor = (id = oid(), role: "user" | "admin" = "user") =>
      ({ id, role } as const);

    it("lanza BAD_REQUEST si postId inválido", async () => {
      await expect(
        updatePost(actor(), "bad", { title: "x" })
      ).rejects.toBeInstanceOf(ApiError);
    });

    it("lanza NOT_FOUND si no existe", async () => {
      (Post.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        updatePost(actor(), oid(), { title: "Updated" })
      ).rejects.toMatchObject({ code: ERR.POST.NOT_FOUND });
    });

    it("lanza FORBIDDEN si no es owner ni admin", async () => {
      const ownerId = oid();
      const notOwner = actor(oid(), "user");

      const doc: Doc = {
        _id: oid(),
        author: ownerId,
        title: "t",
        content: "c",
        images: ["a"],
      };
      (Post.findById as jest.Mock).mockResolvedValueOnce(doc);

      await expect(
        updatePost(notOwner, doc._id, { title: "Updated" })
      ).rejects.toMatchObject({ code: ERR.COMMON.FORBIDDEN });
    });

    it("actualiza si es owner", async () => {
      const ownerId = oid();
      const act = actor(ownerId, "user");
      const doc: Doc = {
        _id: oid(),
        author: ownerId,
        title: "t",
        content: "c",
        images: ["a"],
        save: jest.fn().mockResolvedValue(true),
      };
      (Post.findById as jest.Mock).mockResolvedValueOnce(doc);

      const out = await updatePost(act, doc._id, {
        title: "New",
        content: "NC",
        images: ["b"],
      });

      expect(doc.save).toHaveBeenCalled();
      expect(out).toMatchObject({
        id: doc._id,
        title: "New",
        content: "NC",
        images: ["b"],
      });
    });

    it("actualiza si es admin aunque no sea owner", async () => {
      const admin = actor(oid(), "admin");
      const doc: Doc = {
        _id: oid(),
        author: oid(),
        title: "t",
        content: "c",
        images: ["a"],
        save: jest.fn().mockResolvedValue(true),
      };
      (Post.findById as jest.Mock).mockResolvedValueOnce(doc);

      await updatePost(admin, doc._id, { title: "AdminEdit" });

      expect(doc.save).toHaveBeenCalled();
    });
  });

  describe("deletePost", () => {
    const actor = (id = oid(), role: "user" | "admin" = "user") =>
      ({ id, role } as const);

    it("lanza BAD_REQUEST si postId inválido", async () => {
      await expect(deletePost(actor(), "bad")).rejects.toBeInstanceOf(ApiError);
    });

    it("lanza NOT_FOUND si no existe", async () => {
      (Post.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(deletePost(actor(), oid())).rejects.toMatchObject({
        code: ERR.POST.NOT_FOUND,
      });
    });

    it("lanza FORBIDDEN si no es owner ni admin", async () => {
      const doc: Doc = {
        _id: oid(),
        author: oid(), // distinto al actor
        images: ["a"],
      };
      (Post.findById as jest.Mock).mockResolvedValueOnce(doc);

      await expect(deletePost(actor(), doc._id)).rejects.toMatchObject({
        code: ERR.COMMON.FORBIDDEN,
      });
      expect(Post.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it("borra si es owner", async () => {
      const ownerId = oid();
      const act = actor(ownerId, "user");
      const doc: Doc = { _id: oid(), author: ownerId, images: ["a"] };

      (Post.findById as jest.Mock).mockResolvedValueOnce(doc);
      (Post.findByIdAndDelete as jest.Mock).mockResolvedValueOnce({ acknowledged: true });

      await deletePost(act, doc._id);

      expect(Post.findByIdAndDelete).toHaveBeenCalledWith(doc._id);
    });

    it("borra si es admin aunque no sea owner", async () => {
      const admin = actor(oid(), "admin");
      const doc: Doc = { _id: oid(), author: oid(), images: ["a"] };

      (Post.findById as jest.Mock).mockResolvedValueOnce(doc);
      (Post.findByIdAndDelete as jest.Mock).mockResolvedValueOnce({ acknowledged: true });

      await deletePost(admin, doc._id);

      expect(Post.findByIdAndDelete).toHaveBeenCalledWith(doc._id);
    });
  });
});
