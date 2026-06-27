// Dinh nghia cac contract TypeScript cho conversation, message, bot va participant trong chat domain.
export interface Participant {
  _id: string;
  username?: string;
  displayName: string;
  avatarUrl?: string | null;
  joinedAt: string;
}

export interface BotConfig {
  botId: string;
  enabled: boolean;
}

export interface PendingJoinRequest {
  userId: string;
  username?: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface BotDefinition {
  botId: string;
  displayName: string;
  trigger: string;
  description: string;
}

export interface ClinicEvaluationDatasetOption {
  id: string;
  label: string;
  sampleCount: number;
}

export interface ClinicEvaluationPrediction {
  predictedIntent: string | null;
  confidence: number;
  correct: boolean;
  keywords: string[];
}

export interface ClinicEvaluationRunDetail {
  matchedIntent: string | null;
  confidence: number;
  firedRules: string[];
  response: string;
  usedFallback: boolean;
  needsContext: boolean;
}

export interface ClinicManualPrediction {
  predictedIntent: string | null;
  confidence: number;
  correct: boolean | null;
  keywords: string[];
}

export interface ClinicVectorFeatureExplanation {
  term: string;
  count: number;
  tf: number;
  idf: number;
  rawWeight: number;
  normalizedWeight: number;
  inVocabulary: boolean;
}

export interface ClinicScoreExplanation {
  intent: string;
  rawScore: number;
  finalConfidence: number;
  similarity?: number;
  prior?: number;
}

export interface ClinicContributionExplanation {
  term: string;
  inputWeight: number;
  modelWeight: number;
  contribution: number;
  conditionalProbability?: number;
}

export interface ClinicWinningIntentExplanation {
  intent: string;
  bias: number;
  rawScore: number;
  finalConfidence: number;
  similarity?: number;
  contributions: ClinicContributionExplanation[];
}

export interface ClinicPredictionExplanation {
  normalizedText: string;
  intent: string | null;
  confidence: number;
  keywords: string[];
  explanation: {
    exactMatch: boolean;
    scoreLabel: string;
    vectorization: {
      tokens: string[];
      terms: string[];
      magnitude: number;
      features: ClinicVectorFeatureExplanation[];
    };
    topScores: ClinicScoreExplanation[];
    winningIntent: ClinicWinningIntentExplanation | null;
  } | null;
}

export interface ClinicEvaluationSummary {
  botId: string;
  displayName: string;
  shortLabel?: string;
  classifierType: string | null;
  accuracy: number;
  total: number;
  correct: number;
  speedMs: number;
  averageLoss: number | null;
  status: string;
}

export interface ClinicEvaluationRow {
  id: string;
  text: string;
  intent: string;
  predictions: Record<string, ClinicEvaluationPrediction>;
  runDetails: Record<string, ClinicEvaluationRunDetail>;
  allModelsFailed: boolean;
  modelContradiction: boolean;
  statusNote: string;
}

export interface ClinicEvaluationResponse {
  dataset: string;
  totalSamples: number;
  availableDatasets: ClinicEvaluationDatasetOption[];
  summaries: ClinicEvaluationSummary[];
  rows: ClinicEvaluationRow[];
}

export interface ClinicEvaluationDatasetsResponse {
  availableDatasets: ClinicEvaluationDatasetOption[];
}

export interface ClinicEvaluationJobStartResponse {
  jobId: string;
}

export interface ClinicEvaluationJobStatusResponse {
  jobId: string;
  dataset: string;
  status: "queued" | "running" | "completed" | "failed";
  progressPercent: number;
  message: string;
  result: ClinicEvaluationResponse | null;
  error?: string | null;
}

export interface ClinicManualPredictionResponse {
  text: string;
  expectedIntent: string | null;
  predictions: Record<string, ClinicManualPrediction>;
  explanations: Record<string, ClinicPredictionExplanation | null>;
}

export interface BotMeta {
  botId: string;
  displayName: string;
  trigger: string;
  avatarUrl?: string | null;
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface MessageReference {
  messageId: string;
  senderId: string;
  content: string | null;
  imgUrl?: string | null;
  mediaType?: string | null;
  fileName?: string | null;
  messageType?: "user" | "bot" | "system";
  botMeta?: BotMeta | null;
  createdAt?: string | null;
  pinnedAt?: string | null;
}

export interface SeenUser {
  _id: string;
  displayName?: string;
  avatarUrl?: string | null;
}

export type SeenUserRef = SeenUser | string;

export interface Group {
  name: string;
  description?: string;
  createdBy: string;
  joinApprovalEnabled?: boolean;
  pendingJoinRequests?: PendingJoinRequest[];
  bots?: BotConfig[];
}

export interface LastMessage {
  _id: string;
  content: string | null;
  createdAt: string;
  imgUrl?: string | null;
  mediaType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  messageType?: "user" | "bot" | "system";
  botMeta?: BotMeta | null;
  sender: {
    _id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

export interface Conversation {
  _id: string;
  type: "direct" | "group";
  group: Group;
  participants: Participant[];
  pinnedMessage?: MessageReference | null;
  lastMessageAt: string;
  seenBy: SeenUserRef[];
  lastMessage: LastMessage | null;
  unreadCounts: Record<string, number>; // key = userId, value = unread count
  createdAt: string;
  updatedAt: string;
}


export interface ConversationResponse {
  conversations: Conversation[];
}

export interface GroupSearchResponse {
  groups: Conversation[];
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  imgUrl?: string | null;
  mediaType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  messageType?: "user" | "bot" | "system";
  botMeta?: BotMeta | null;
  reactions?: MessageReaction[];
  replyTo?: MessageReference | null;
  updatedAt?: string | null;
  createdAt: string;
  isOwn?: boolean;
}
