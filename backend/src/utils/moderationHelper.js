// Chua cac quy tac loc tu khoa va gan co moderation cho noi dung tin nhan user.
const BANNED_KEYWORD_RULES = [
  { keyword: "chat cam", label: "chất cấm" },
  { keyword: "ma tuy", label: "ma túy" },
  { keyword: "thuoc lac", label: "thuốc lắc" },
  { keyword: "can sa", label: "cần sa" },
  { keyword: "co my", label: "cỏ Mỹ" },
  { keyword: "ke", label: "ke" },
  { keyword: "ketamin", label: "ketamin" },
  { keyword: "ketamine", label: "ketamine" },
  { keyword: "da", label: "đá" },
  { keyword: "hang da", label: "hàng đá" },
  { keyword: "heroin", label: "heroin" },
  { keyword: "thuoc phien", label: "thuốc phiện" },
  { keyword: "tai phe", label: "tài phê" },
  { keyword: "ship kin", label: "ship kín" },
  { keyword: "giao kin", label: "giao kín" },
];

const stripDiacritics = (text = "") =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

export const normalizeModerationText = (text = "") => {
  return stripDiacritics(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const hasStandaloneKeyword = (normalizedText, keyword) => {
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(^|\\s)${escapedKeyword}(?=\\s|$)`, "i");
  return regex.test(normalizedText);
};

export const detectMessageModeration = (content = "") => {
  const normalizedContent = normalizeModerationText(content);

  if (!normalizedContent) {
    return {
      status: "clean",
      isFlagged: false,
      matchedKeywords: [],
      reasonCodes: [],
      flaggedAt: null,
    };
  }

  const matchedKeywords = BANNED_KEYWORD_RULES.filter((rule) =>
    hasStandaloneKeyword(normalizedContent, rule.keyword),
  ).map((rule) => rule.label);

  const uniqueMatches = [...new Set(matchedKeywords)];
  const isFlagged = uniqueMatches.length > 0;

  return {
    status: isFlagged ? "flagged" : "clean",
    isFlagged,
    matchedKeywords: uniqueMatches,
    reasonCodes: isFlagged ? ["banned_keyword"] : [],
    flaggedAt: isFlagged ? new Date() : null,
  };
};
