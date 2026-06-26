import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getClinicModelCachePath = (fileName = "modelCache.json") => {
	return path.resolve(__dirname, fileName);
};

export const hasClinicModelCache = (fileName = "modelCache.json") => {
	return fs.existsSync(getClinicModelCachePath(fileName));
};

export const getBotClinicModelCachePath = () => getClinicModelCachePath("modelCache.json");

export const hasBotClinicModelCache = () => hasClinicModelCache("modelCache.json");