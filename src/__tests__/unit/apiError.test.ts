import { ApiError } from "@shared/errors/apiError";

describe("ApiError", () => {
  it("debería crear una instancia con statusCode y code correctos", () => {
    const error = new ApiError("Algo salió mal", 400, "BAD_REQUEST");

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("Algo salió mal");
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("BAD_REQUEST");
    expect(error.name).toBe("ApiError");
    expect(error.stack).toBeDefined();
  });
});
