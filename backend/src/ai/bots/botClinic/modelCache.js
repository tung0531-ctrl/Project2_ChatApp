import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOT_CLINIC_MODEL_CACHE_PATH = path.resolve(__dirname, "modelCache.json");

export const getBotClinicModelCachePath = () => BOT_CLINIC_MODEL_CACHE_PATH;

export const hasBotClinicModelCache = () => fs.existsSync(BOT_CLINIC_MODEL_CACHE_PATH);