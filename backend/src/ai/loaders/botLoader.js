import fs from "fs";
import path from "path";

const readJsonFile = (relativePath) => {
  const filePath = path.resolve(process.cwd(), relativePath);
  const fileContent = fs.readFileSync(filePath, "utf8");
  return JSON.parse(fileContent);
};

export const loadBotDefinition = (botFileName) => {
  return readJsonFile(`./src/ai/bots/${botFileName}`);
};