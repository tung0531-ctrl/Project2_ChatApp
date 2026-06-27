import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// File nay doc du lieu CLINC150 local va chuan hoa thanh examples cho train/evaluation.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vi tri dataset local tren workspace, duoc dung chung cho train va offline evaluation.
const DATASET_PATH = path.resolve(
  __dirname,
  "../../../../../../clinc150/clinc150_uci/data_full.json",
);

// Doc file JSON goc cua CLINC150.
const readLocalClincDataset = () => {
  const raw = fs.readFileSync(DATASET_PATH, "utf8");
  return JSON.parse(raw);
};

// Chuan hoa tung row [text, intent] ve object va loc bo OOS neu can.
const toExampleRows = (rows = [], { excludeOos = true } = {}) => {
  return rows
    .filter((row) => Array.isArray(row) && row.length === 2)
    .map(([text, intent]) => ({ text, intent }))
    .filter(
      (row) =>
        row.text && row.intent && (!excludeOos || row.intent !== "oos"),
    );
};

// Lay split train lam bo examples mac dinh cho training.
export const readLocalClincExamples = () => {
  const dataset = readLocalClincDataset();
  return toExampleRows([...(dataset.train ?? [])]);
};

// Lay bat ky split nao theo ten de admin/evaluation dung lai.
export const readLocalClincExamplesBySplit = (
  split = "train",
  options = {},
) => {
  const dataset = readLocalClincDataset();
  return toExampleRows([...(dataset[split] ?? [])], options);
};

// Tra metadata de UI admin co the hien cac split san co va sample count.
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

// Expose duong dan that cua dataset de debug va script co the doi chieu.
export const getLocalClincDatasetPath = () => DATASET_PATH;
