// Loader nay doc cac bot definition dang JSON, vi du botGame.json.
// Muc dich la tach viec doc file cau hinh/tri thuc ra khoi registry va runtime engine.
import fs from "fs";
import path from "path";

// Helper doc file JSON chung cho cac bot khai bao bang du lieu tinh.
const readJsonFile = (relativePath) => {
  const filePath = path.resolve(process.cwd(), relativePath);
  const fileContent = fs.readFileSync(filePath, "utf8");
  return JSON.parse(fileContent);
};

// BotGame di vao day de JSON definition duoc nap vao registry.
export const loadBotDefinition = (botFileName) => {
  return readJsonFile(`./src/ai/bots/${botFileName}`);
};