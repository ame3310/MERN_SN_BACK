import {
  updateMeSchema,
  usernameSchema,
} from "@modules/users/user.validations";
import { z } from "zod";

describe("users/user.validations", () => {
  it("usernameSchema: acepta válidos", () => {
    const ok = ["Tito", "tuntun", "User123", "tralalero"];
    for (const u of ok) {
      expect(() => usernameSchema.parse(u)).not.toThrow();
    }
  });

  it("usernameSchema: rechaza inválidos", () => {
    const bad = [
      "ab",
      "con espacios",
      "con- guion",
      "demasiado_largo_1234567890",
      "",
      "áéí",
    ];
    for (const u of bad) {
      expect(() => usernameSchema.parse(u)).toThrow(z.ZodError);
    }
  });

  it("updateMeSchema: permite cambios parciales", () => {
    const d1 = updateMeSchema.parse({ displayName: "Tito", bio: "Hola" });
    expect(d1.displayName).toBe("Tito");
    expect(d1.bio).toBe("Hola");

    const d2 = updateMeSchema.parse({ username: "tito_dev" });
    expect(d2.username).toBe("tito_dev");
  });

  it("updateMeSchema: avatarUrl inválida falla", () => {
    expect(() => updateMeSchema.parse({ avatarUrl: "not-url" })).toThrow(
      z.ZodError
    );
  });
});
