import { env } from "@config/env";
import mongoose from "mongoose";
import app from "./app";
const PORT = Number(env.PORT);
const MONGO_URI = env.MONGO_URI;

console.log('ENV presence:', {
  MONGO_URI: !!process.env.MONGO_URI,
  ACCESS_TOKEN_SECRET: !!process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: !!process.env.REFRESH_TOKEN_SECRET,
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Conectado a MongoDB");
    app.listen(PORT, () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
  })
  .catch((err: unknown) => {
    console.error("Error al conectar a MongoDB:", err);
  });
