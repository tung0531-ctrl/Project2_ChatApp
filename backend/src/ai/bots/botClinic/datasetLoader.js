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

const readLocalClincDataset = () => {
  const raw = fs.readFileSync(DATASET_PATH, "utf8");
  return JSON.parse(raw);
};

const toExampleRows = (rows = [], { excludeOos = true } = {}) => {
  return rows
    .filter((row) => Array.isArray(row) && row.length === 2)
    .map(([text, intent]) => ({ text, intent }))
    .filter(
      (row) =>
        row.text && row.intent && (!excludeOos || row.intent !== "oos"),
    );
};

export const readLocalClincExamples = () => {
  const dataset = readLocalClincDataset();
  return toExampleRows([...(dataset.train ?? [])]);
};

export const readLocalClincExamplesBySplit = (
  split = "train",
  options = {},
) => {
  const dataset = readLocalClincDataset();
  return toExampleRows([...(dataset[split] ?? [])], options);
};

export const getAvailableLocalClincSplits = () => {
  const dataset = readLocalClincDataset();

  return [
    {
      id: "val",
      label: "CLINC150 Validation",
      sampleCount: toExampleRows(dataset.val ?? []).length,
    },
    {
      id: "test",
      label: "CLINC150 Test",
      sampleCount: toExampleRows(dataset.test ?? []).length,
    },
    {
      id: "oos_test",
      label: "CLINC150 OOS Test",
      sampleCount: toExampleRows(dataset.oos_test ?? [], { excludeOos: false }).length,
    },
  ];
};

export const getLocalClincDatasetPath = () => DATASET_PATH;