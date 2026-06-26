// Doc CLINC150 local trong repo va tra ve examples de botClinic train classifier.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASET_PATH = path.resolve(
  __dirname,
  "../../../../../clinc150/clinc150_uci/data_full.json",
);

export const readLocalClincExamples = () => {
  const raw = fs.readFileSync(DATASET_PATH, "utf8");
  const dataset = JSON.parse(raw);
  const rows = [...(dataset.train ?? [])];

  return rows
    .filter((row) => Array.isArray(row) && row.length === 2)
    .map(([text, intent]) => ({ text, intent }))
    .filter((row) => row.text && row.intent && row.intent !== "oos");
};

export const getLocalClincDatasetPath = () => DATASET_PATH;