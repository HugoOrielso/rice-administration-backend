import "dotenv/config";
import app from "./server";
import { runSeed } from "./database/seed";

const PORT = parseInt(process.env.PORT || "4000", 10);

async function bootstrap() {
  try {
    await runSeed();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`📍 API listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting API:", error);
    process.exit(1);
  }
}

bootstrap();