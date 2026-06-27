import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Helper nho de xac dinh vi tri va tinh ton tai cua pretrained model snapshots.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Moi variant chi khac ten file cache, con quy uoc luu file la nhu nhau.
export const getClinicModelCachePath = (fileName = "modelCache.json") => {
  return path.resolve(__dirname, "..", fileName);
};

// Kiem tra nhanh xem variant da co pretrained snapshot de runtime co the load ngay hay chua.
export const hasClinicModelCache = (fileName = "modelCache.json") => {
  return fs.existsSync(getClinicModelCachePath(fileName));
};
