// Dieu phoi nghiep vu conversation, group membership, seen state, pin message va cau hinh bot theo nhom.
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { io } from "../socket/index.js";
import { createNotification } from "../utils/notificationHelper.js";
import {
  getAvailableBotDefinitions,
  getBotEngineById,
} from "../ai/registry/index.js";
import {
  getAvailableLocalClincSplits,
  readLocalClincExamplesBySplit,
} from "../ai/bots/botClinic/datasetLoader.js";

const clinicEvaluationJobs = new Map();
const CLINIC_EVALUATION_JOB_TTL_MS = 15 * 60 * 1000;
const CLINIC_EVALUATION_YIELD_INTERVAL = 25;

const conversationPopulate = [
  {
    path: "participants.userId",
    select: "username displayName avatarUrl",
  },
  {
    path: "group.pendingJoinRequests.userId",
    select: "username displayName avatarUrl",
  },
  {
    path: "lastMessage.senderId",
    select: "displayName avatarUrl",
  },
  {
    path: "seenBy",
    select: "displayName avatarUrl",
  },
];

const formatParticipants = (participants = []) =>
  participants.map((p) => ({
    _id: p.userId?._id ?? p.userId,
    username: p.userId?.username,
    displayName: p.userId?.displayName,
    avatarUrl: p.userId?.avatarUrl ?? null,
    joinedAt: p.joinedAt,
  }));

const formatMessageReference = (reference) => {
  if (!reference) {
    return null;
  }

  return {
    ...reference.toObject?.(),
    messageId: reference.messageId?.toString?.() ?? reference.messageId ?? null,
    senderId: reference.senderId?.toString?.() ?? reference.senderId ?? null,
  };
};

const formatPendingJoinRequests = (pendingJoinRequests = []) =>
  pendingJoinRequests.map((request) => ({
    userId: request.userId?._id ?? request.userId,
    username: request.userId?.username,
    displayName: request.userId?.displayName,
    avatarUrl: request.userId?.avatarUrl ?? null,
    createdAt: request.createdAt,
  }));

const formatConversation = (conversation) => ({
  ...conversation.toObject(),
  group: conversation.group
    ? {
        ...conversation.group.toObject?.(),
        createdBy: conversation.group.createdBy?.toString?.() ?? conversation.group.createdBy,
        pendingJoinRequests: formatPendingJoinRequests(
          conversation.group.pendingJoinRequests || []
        ),
      }
    : conversation.group,
  unreadCounts: conversation.unreadCounts || {},
  pinnedMessage: formatMessageReference(conversation.pinnedMessage),
  participants: formatParticipants(conversation.participants || []),
});

const isConversationParticipant = (conversation, userId) =>
  conversation.participants.some(
    (participant) =>
      participant.userId?._id?.toString() === userId ||
      participant.userId?.toString?.() === userId,
  );

const removeParticipantFromConversation = (conversation, userId) => {
  const participantIndex = conversation.participants.findIndex(
    (participant) =>
      participant.userId?._id?.toString() === userId ||
      participant.userId?.toString?.() === userId,
  );

  if (participantIndex === -1) {
    return false;
  }

  conversation.participants.splice(participantIndex, 1);
  conversation.unreadCounts.delete(userId);
  conversation.seenBy = conversation.seenBy.filter(
    (seenUser) => seenUser._id?.toString() !== userId && seenUser.toString?.() !== userId,
  );

  return true;
};

const hasPendingJoinRequest = (conversation, userId) =>
  conversation.group?.pendingJoinRequests?.some(
    (request) =>
      request.userId?._id?.toString() === userId || request.userId?.toString?.() === userId,
  );

const addParticipantToConversation = (conversation, userId) => {
  if (isConversationParticipant(conversation, userId.toString())) {
    return false;
  }

  conversation.participants.push({
    userId,
    joinedAt: new Date(),
  });
  conversation.unreadCounts.set(userId.toString(), 0);

  return true;
};

const notifyGroupJoined = async ({ recipient, actor, groupName, conversationId, title, message }) =>
  createNotification({
    recipient,
    type: "group_joined",
    title,
    message,
    actor,
    groupName,
    conversationId,
  });

const clinicEvaluationModels = [
  {
    botId: "botClinicV2",
    label: "Naive Bayes",
    shortLabel: "NB",
  },
  {
    botId: "botClinic",
    label: "SVM",
    shortLabel: "SVM",
  },
  {
    botId: "botClinicV3",
    label: "Logistic Regression",
    shortLabel: "LR",
  },
];

const buildEvaluationStatusNote = (predictions = {}) => {
  const modelEntries = Object.values(predictions);

  if (!modelEntries.length) {
    return "No predictions";
  }

  if (modelEntries.every((entry) => !entry.correct)) {
    return "All models failed";
  }

  if (predictions.botClinic?.correct && !predictions.botClinicV3?.correct) {
    return "SVM correct, Logistic wrong";
  }

  if (modelEntries.every((entry) => entry.correct)) {
    return "All models correct";
  }

  return "Mixed results";
};

const createClinicEvaluationJobId = () =>
  `clinic-eval-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const scheduleClinicEvaluationJobCleanup = (jobId) => {
  const timeout = setTimeout(() => {
    clinicEvaluationJobs.delete(jobId);
  }, CLINIC_EVALUATION_JOB_TTL_MS);

  timeout.unref?.();
};

const updateClinicEvaluationJob = (jobId, updates) => {
  const job = clinicEvaluationJobs.get(jobId);

  if (!job) {
    return;
  }

  Object.assign(job, updates, { updatedAt: Date.now() });
};

const yieldClinicEvaluationLoop = () =>
  new Promise((resolve) => setImmediate(resolve));

const buildClinicEvaluationRows = (
  datasetId,
  samples,
  predictionMatrix,
  runMatrix,
  startIndex = 0,
) =>
  samples.map((sample, index) => {
    const sampleIndex = startIndex + index;
    const predictions = Object.fromEntries(
      clinicEvaluationModels.map((model) => {
        const prediction = predictionMatrix.get(model.botId)?.[sampleIndex] ?? null;

        return [
          model.botId,
          prediction
            ? {
                predictedIntent: prediction.intent,
                confidence: prediction.confidence,
                correct: prediction.intent === sample.intent,
                keywords: prediction.keywords,
              }
            : {
                predictedIntent: null,
                confidence: 0,
                correct: false,
                keywords: [],
              },
        ];
      }),
    );

    const runDetails = Object.fromEntries(
      clinicEvaluationModels.map((model) => {
        const runResult = runMatrix.get(model.botId)?.[sampleIndex] ?? null;

        return [
          model.botId,
          {
            matchedIntent: runResult?.matchedIntent ?? null,
            confidence: runResult?.confidence ?? 0,
            firedRules: runResult?.firedRules ?? [],
            response: runResult?.content ?? "",
            usedFallback: runResult?.usedFallback ?? false,
            needsContext: runResult?.needsContext ?? false,
          },
        ];
      }),
    );

    return {
      id: `${datasetId}-${index + 1}`,
      text: sample.text,
      intent: sample.intent,
      predictions,
      runDetails,
      allModelsFailed: clinicEvaluationModels.every(
        (model) => !predictions[model.botId]?.correct,
      ),
      modelContradiction:
        Boolean(predictions.botClinic?.correct) &&
        !Boolean(predictions.botClinicV3?.correct),
      statusNote: buildEvaluationStatusNote(predictions),
    };
  });

const buildClinicEvaluationResult = async (
  datasetId,
  { onProgress } = {},
) => {
  const includeOos = datasetId === "oos_test";
  const samples = readLocalClincExamplesBySplit(datasetId, {
    excludeOos: !includeOos,
  });

  if (!samples.length) {
    const notFoundError = new Error("Không tìm thấy dữ liệu test cho dataset đã chọn");
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  const predictionMatrix = new Map();
  const runMatrix = new Map();
  const summaries = [];
  const totalSteps = Math.max(1, samples.length * (clinicEvaluationModels.length * 2 + 1));
  let processedSteps = 0;

  const reportProgress = (message) => {
    onProgress?.({
      progressPercent: Math.min(99, Math.round((processedSteps / totalSteps) * 100)),
      message,
    });
  };

  for (const model of clinicEvaluationModels) {
    const engine = getBotEngineById(model.botId);

    if (!engine) {
      processedSteps += samples.length * 2;
      reportProgress(`Skipping ${model.label}`);
      summaries.push({
        botId: model.botId,
        displayName: model.label,
        shortLabel: model.shortLabel,
        classifierType: null,
        accuracy: 0,
        total: samples.length,
        correct: 0,
        speedMs: 0,
        averageLoss: null,
        status: "Unavailable",
      });
      await yieldClinicEvaluationLoop();
      continue;
    }

    const startedAt = Date.now();
    const predictions = [];
    const runResults = [];

    for (let index = 0; index < samples.length; index += 1) {
      predictions.push(engine.predictIntent(samples[index].text));
      processedSteps += 1;

      if (
        index === 0 ||
        (index + 1) % CLINIC_EVALUATION_YIELD_INTERVAL === 0 ||
        index === samples.length - 1
      ) {
        reportProgress(
          `${model.label}: ${Math.min(index + 1, samples.length)}/${samples.length}`,
        );
      }

      if ((index + 1) % CLINIC_EVALUATION_YIELD_INTERVAL === 0) {
        await yieldClinicEvaluationLoop();
      }

      runResults.push(engine.run(samples[index].text));
      processedSteps += 1;

      if ((index + 1) % CLINIC_EVALUATION_YIELD_INTERVAL === 0) {
        await yieldClinicEvaluationLoop();
      }
    }

    const elapsedMs = Date.now() - startedAt;
    const correct = predictions.reduce((count, prediction, index) => {
      return count + (prediction.intent === samples[index].intent ? 1 : 0);
    }, 0);

    predictionMatrix.set(model.botId, predictions);
    runMatrix.set(model.botId, runResults);
    summaries.push({
      botId: model.botId,
      displayName: model.label,
      shortLabel: model.shortLabel,
      classifierType: engine.classifierType,
      accuracy: Number(((correct / samples.length) * 100).toFixed(2)),
      total: samples.length,
      correct,
      speedMs: elapsedMs,
      averageLoss: engine.evaluateAverageLoss(samples),
      status: "Ready",
    });

    await yieldClinicEvaluationLoop();
  }

  const rows = [];
  for (let index = 0; index < samples.length; index += 1) {
    rows.push(
      buildClinicEvaluationRows(
        datasetId,
        [samples[index]],
        predictionMatrix,
        runMatrix,
        index,
      )[0],
    );
    processedSteps += 1;

    if (
      index === 0 ||
      (index + 1) % CLINIC_EVALUATION_YIELD_INTERVAL === 0 ||
      index === samples.length - 1
    ) {
      reportProgress(`Building table: ${Math.min(index + 1, samples.length)}/${samples.length}`);
    }

    if ((index + 1) % CLINIC_EVALUATION_YIELD_INTERVAL === 0) {
      await yieldClinicEvaluationLoop();
    }
  }

  return {
    dataset: datasetId,
    totalSamples: samples.length,
    availableDatasets: getAvailableLocalClincSplits(),
    summaries,
    rows,
  };
};

const runClinicEvaluationJob = async (jobId, datasetId) => {
  try {
    updateClinicEvaluationJob(jobId, {
      status: "running",
      progressPercent: 1,
      message: "Preparing evaluation...",
      dataset: datasetId,
      error: null,
    });

    const result = await buildClinicEvaluationResult(datasetId, {
      onProgress: ({ progressPercent, message }) => {
        updateClinicEvaluationJob(jobId, {
          status: "running",
          progressPercent,
          message,
        });
      },
    });

    updateClinicEvaluationJob(jobId, {
      status: "completed",
      progressPercent: 100,
      message: "Completed",
      result,
    });
  } catch (error) {
    updateClinicEvaluationJob(jobId, {
      status: "failed",
      progressPercent: 100,
      message: "Failed",
      error: error.message || "Lỗi hệ thống",
    });
  }
};

const buildClinicPredictionPayload = (text, expectedIntent = null) => {
  return Object.fromEntries(
    clinicEvaluationModels.map((model) => {
      const engine = getBotEngineById(model.botId);

      if (!engine) {
        return [
          model.botId,
          {
            predictedIntent: null,
            confidence: 0,
            correct: expectedIntent ? false : null,
            keywords: [],
          },
        ];
      }

      const prediction = engine.predictIntent(text);

      return [
        model.botId,
        {
          predictedIntent: prediction.intent,
          confidence: prediction.confidence,
          correct: expectedIntent ? prediction.intent === expectedIntent : null,
          keywords: prediction.keywords,
        },
      ];
    }),
  );
};

export const getClinicEvaluationDatasets = async (req, res) => {
  try {
    return res.status(200).json({
      availableDatasets: getAvailableLocalClincSplits(),
    });
  } catch (error) {
    console.error("Lỗi khi lấy metadata dataset clinic evaluation", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const startClinicEvaluationJob = async (req, res) => {
  try {
    const datasetId = typeof req.body?.dataset === "string" ? req.body.dataset : "test";
    const jobId = createClinicEvaluationJobId();

    clinicEvaluationJobs.set(jobId, {
      jobId,
      dataset: datasetId,
      status: "queued",
      progressPercent: 0,
      message: "Queued",
      result: null,
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    scheduleClinicEvaluationJobCleanup(jobId);
    void runClinicEvaluationJob(jobId, datasetId);

    return res.status(202).json({ jobId });
  } catch (error) {
    console.error("Lỗi khi khởi tạo clinic evaluation job", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getClinicEvaluationJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = clinicEvaluationJobs.get(jobId);

    if (!job) {
      return res.status(404).json({ message: "Không tìm thấy evaluation job" });
    }

    return res.status(200).json({
      jobId: job.jobId,
      dataset: job.dataset,
      status: job.status,
      progressPercent: job.progressPercent,
      message: job.message,
      result: job.status === "completed" ? job.result : null,
      error: job.error,
    });
  } catch (error) {
    console.error("Lỗi khi lấy clinic evaluation job status", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const createConversation = async (req, res) => {
  try {
    const { type, name, memberIds } = req.body;
    const userId = req.user._id;

    if (
      !type ||
      (type === "group" && !name) ||
      !memberIds ||
      !Array.isArray(memberIds) ||
      memberIds.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Tên nhóm và danh sách thành viên là bắt buộc" });
    }

    let conversation;

    if (type === "direct") {
      const participantId = memberIds[0];

      conversation = await Conversation.findOne({
        type: "direct",
        "participants.userId": { $all: [userId, participantId] },
      });

      if (!conversation) {
        conversation = new Conversation({
          type: "direct",
          participants: [{ userId }, { userId: participantId }],
          lastMessageAt: new Date(),
        });

        await conversation.save();
      }
    }

    if (type === "group") {
      conversation = new Conversation({
        type: "group",
        participants: [{ userId }, ...memberIds.map((id) => ({ userId: id }))],
        group: {
          name,
          createdBy: userId,
        },
        lastMessageAt: new Date(),
      });

      await conversation.save();
    }

    if (!conversation) {
      return res.status(400).json({ message: "Conversation type không hợp lệ" });
    }

    await conversation.populate(conversationPopulate);

    const formatted = formatConversation(conversation);

    if (type === "group") {
      memberIds.forEach((userId) => {
        io.to(userId).emit("new-group", formatted);
      });

      await Promise.all(
        memberIds.map((memberId) =>
          createNotification({
            recipient: memberId,
            type: "group_joined",
            title: "Bạn đã được thêm vào nhóm chat",
            message: `Bạn đã được thêm vào nhóm chat ${formatted.group?.name ?? "mới"}.`,
            actor: {
              _id: req.user._id,
              username: req.user.username,
              displayName: req.user.displayName,
              avatarUrl: req.user.avatarUrl ?? null,
            },
            groupName: formatted.group?.name ?? "",
            conversationId: conversation._id,
          }),
        ),
      );
    }

    if (type === "direct") {
      io.to(userId).emit("new-group", formatted);
      io.to(memberIds[0]).emit("new-group", formatted);
    }

    return res.status(201).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi tạo conversation", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({
      "participants.userId": userId,
    })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate(conversationPopulate);

    const formatted = conversations.map((convo) => {
      return formatConversation(convo);
    });

    return res.status(200).json({ conversations: formatted });
  } catch (error) {
    console.error("Lỗi xảy ra khi lấy conversations", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, cursor } = req.query;

    const query = { conversationId };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    let messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit) + 1);

    let nextCursor = null;

    if (messages.length > Number(limit)) {
      const nextMessage = messages[messages.length - 1];
      nextCursor = nextMessage.createdAt.toISOString();
      messages.pop();
    }

    messages = messages.reverse();

    return res.status(200).json({
      messages,
      nextCursor,
    });
  } catch (error) {
    console.error("Lỗi xảy ra khi lấy messages", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getUserConversationsForSocketIO = async (userId) => {
  try {
    const conversations = await Conversation.find(
      { "participants.userId": userId },
      { _id: 1 },
    );

    return conversations.map((c) => c._id.toString());
  } catch (error) {
    console.error("Lỗi khi fetch conversations: ", error);
    return [];
  }
};

export const searchJoinableGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const keyword = req.query?.name?.trim() ?? "";

    if (!keyword) {
      return res.status(200).json({ groups: [] });
    }

    const groups = await Conversation.find({
      type: "group",
      "group.name": { $regex: keyword, $options: "i" },
      participants: {
        $not: {
          $elemMatch: {
            userId,
          },
        },
      },
      "group.pendingJoinRequests": {
        $not: {
          $elemMatch: {
            userId,
          },
        },
      },
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate(conversationPopulate);

    return res.status(200).json({
      groups: groups.map((group) => formatConversation(group)),
    });
  } catch (error) {
    console.error("Lỗi khi tìm nhóm chat", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getAvailableBots = async (_req, res) => {
  try {
    return res.status(200).json({ bots: getAvailableBotDefinitions() });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bot khả dụng", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const evaluateClinicBots = async (req, res) => {
  try {
    const datasetId = typeof req.query.dataset === "string" ? req.query.dataset : "test";
    const result = await buildClinicEvaluationResult(datasetId);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi khi đánh giá offline clinic bots", error);
    return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi hệ thống" });
  }
};

export const predictClinicBotsForInput = async (req, res) => {
  try {
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const expectedIntentRaw =
      typeof req.body?.expectedIntent === "string" ? req.body.expectedIntent.trim() : "";
    const expectedIntent = expectedIntentRaw || null;

    if (!text) {
      return res.status(400).json({ message: "Input text is required" });
    }

    return res.status(200).json({
      text,
      expectedIntent,
      predictions: buildClinicPredictionPayload(text, expectedIntent),
    });
  } catch (error) {
    console.error("Lỗi khi dự đoán thủ công cho clinic bots", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const joinGroup = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId).populate(conversationPopulate);

    if (!conversation) {
      return res.status(404).json({ message: "Không tìm thấy nhóm chat" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Chỉ có thể tham gia nhóm chat" });
    }

    const alreadyJoined = conversation.participants.some(
      (participant) =>
        participant.userId?._id?.toString() === userId.toString() ||
        participant.userId?.toString?.() === userId.toString(),
    );

    if (alreadyJoined) {
      return res.status(409).json({ message: "Bạn đã ở trong nhóm chat này rồi" });
    }

    if (conversation.group?.joinApprovalEnabled) {
      if (hasPendingJoinRequest(conversation, userId.toString())) {
        return res.status(409).json({ message: "Bạn đã gửi yêu cầu tham gia nhóm này rồi" });
      }

      conversation.group.pendingJoinRequests.push({
        userId,
        createdAt: new Date(),
      });

      await conversation.save();
      await conversation.populate(conversationPopulate);

      const formattedPendingConversation = formatConversation(conversation);
      io.to(conversationId).emit("conversation-updated", formattedPendingConversation);

      return res.status(202).json({
        status: "requested",
        message: "Yêu cầu tham gia nhóm đã được gửi tới trưởng nhóm.",
      });
    }

    addParticipantToConversation(conversation, userId);

    await conversation.save();
    await conversation.populate(conversationPopulate);

    const formatted = formatConversation(conversation);

    io.to(userId.toString()).emit("new-group", formatted);
    io.to(conversationId).emit("conversation-updated", formatted);

    await notifyGroupJoined({
      recipient: userId,
      title: "Tham gia nhóm chat thành công",
      message: `Bạn đã tham gia nhóm chat ${formatted.group?.name ?? ""}.`,
      actor: {
        _id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        avatarUrl: req.user.avatarUrl ?? null,
      },
      groupName: formatted.group?.name ?? "",
      conversationId: conversation._id,
    });

    return res.status(200).json({ status: "joined", conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi tham gia nhóm chat", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();

    const conversation = await Conversation.findById(conversationId).populate(conversationPopulate);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Chỉ có thể rời khỏi nhóm chat" });
    }

    const removed = removeParticipantFromConversation(conversation, userId);

    if (!removed) {
      return res.status(403).json({ message: "Bạn không ở trong nhóm này" });
    }

    await conversation.save();
    await conversation.populate(conversationPopulate);

    const formatted = formatConversation(conversation);

    io.to(conversationId).emit("conversation-updated", formatted);

    return res.status(200).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi rời nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const kickGroupMember = async (req, res) => {
  try {
    const { conversationId, memberId } = req.params;
    const userId = req.user._id.toString();

    const conversation = await Conversation.findById(conversationId).populate(conversationPopulate);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Chỉ có thể kick thành viên khỏi nhóm chat" });
    }

    if (!isConversationParticipant(conversation, userId)) {
      return res.status(403).json({ message: "Bạn không ở trong nhóm này" });
    }

    if (conversation.group?.createdBy?.toString() !== userId) {
      return res.status(403).json({ message: "Chỉ trưởng nhóm mới được kick thành viên" });
    }

    if (conversation.group?.createdBy?.toString() === memberId) {
      return res.status(400).json({ message: "Không thể kick trưởng nhóm" });
    }

    const removed = removeParticipantFromConversation(conversation, memberId);

    if (!removed) {
      return res.status(404).json({ message: "Thành viên không còn trong nhóm" });
    }

    await conversation.save();
    await conversation.populate(conversationPopulate);

    const formatted = formatConversation(conversation);

    io.to(conversationId).emit("conversation-updated", formatted);
    io.to(memberId).emit("conversation-updated", formatted);

    await createNotification({
      recipient: memberId,
      type: "group_kicked",
      title: "Bạn đã bị xóa khỏi nhóm chat",
      message: `Bạn đã bị xóa khỏi nhóm chat ${formatted.group?.name ?? ""}.`,
      actor: {
        _id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        avatarUrl: req.user.avatarUrl ?? null,
      },
      groupName: formatted.group?.name ?? "",
      conversationId: conversation._id,
    });

    return res.status(200).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi kick thành viên khỏi nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const updateGroupDescription = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();
    const description = req.body?.description?.trim() ?? "";

    const conversation = await Conversation.findById(conversationId).populate(conversationPopulate);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Chỉ nhóm chat mới có mô tả" });
    }

    const isParticipant = isConversationParticipant(conversation, userId);

    if (!isParticipant) {
      return res.status(403).json({ message: "Bạn không ở trong nhóm này" });
    }

    if (conversation.group?.createdBy?.toString() !== userId) {
      return res.status(403).json({ message: "Chỉ trưởng nhóm mới được sửa mô tả" });
    }

    conversation.group.description = description;
    await conversation.save();

    const formatted = formatConversation(conversation);
    io.to(conversationId).emit("conversation-updated", formatted);

    return res.status(200).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi cập nhật mô tả nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const updateGroupBots = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();
    const requestedBotIds = Array.isArray(req.body?.botIds) ? req.body.botIds : [];

    const conversation = await Conversation.findById(conversationId).populate(conversationPopulate);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Chỉ nhóm chat mới có thể quản lý bot" });
    }

    if (!isConversationParticipant(conversation, userId)) {
      return res.status(403).json({ message: "Bạn không ở trong nhóm này" });
    }

    if (conversation.group?.createdBy?.toString() !== userId) {
      return res.status(403).json({ message: "Chỉ trưởng nhóm mới được cập nhật bot" });
    }

    const availableBotIds = new Set(getAvailableBotDefinitions().map((bot) => bot.botId));
    const sanitizedBotIds = [...new Set(requestedBotIds)]
      .filter((botId) => typeof botId === "string")
      .filter((botId) => availableBotIds.has(botId));

    conversation.group.bots = sanitizedBotIds.map((botId) => ({
      botId,
      enabled: true,
    }));

    await conversation.save();

    const formatted = formatConversation(conversation);
    io.to(conversationId).emit("conversation-updated", formatted);

    return res.status(200).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi cập nhật bot nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const updateGroupJoinApproval = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();
    const enabled = Boolean(req.body?.enabled);

    const conversation = await Conversation.findById(conversationId).populate(conversationPopulate);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Chỉ nhóm chat mới có cài đặt kiểm duyệt tham gia" });
    }

    if (!isConversationParticipant(conversation, userId)) {
      return res.status(403).json({ message: "Bạn không ở trong nhóm này" });
    }

    if (conversation.group?.createdBy?.toString() !== userId) {
      return res.status(403).json({ message: "Chỉ trưởng nhóm mới được cập nhật cài đặt kiểm duyệt" });
    }

    conversation.group.joinApprovalEnabled = enabled;

    const autoApprovedUserIds = [];

    if (!enabled) {
      const pendingRequests = conversation.group?.pendingJoinRequests ?? [];

      pendingRequests.forEach((request) => {
        const requestUserId = request.userId?._id ?? request.userId;

        if (requestUserId && addParticipantToConversation(conversation, requestUserId)) {
          autoApprovedUserIds.push(requestUserId.toString());
        }
      });

      conversation.group.pendingJoinRequests = [];
    }

    await conversation.save();
    await conversation.populate(conversationPopulate);

    const formatted = formatConversation(conversation);

    io.to(conversationId).emit("conversation-updated", formatted);

    await Promise.all(
      autoApprovedUserIds.map(async (approvedUserId) => {
        io.to(approvedUserId).emit("new-group", formatted);

        await notifyGroupJoined({
          recipient: approvedUserId,
          title: "Yêu cầu tham gia nhóm đã được chấp nhận",
          message: `Bạn đã được thêm vào nhóm chat ${formatted.group?.name ?? ""}.`,
          actor: {
            _id: req.user._id,
            username: req.user.username,
            displayName: req.user.displayName,
            avatarUrl: req.user.avatarUrl ?? null,
          },
          groupName: formatted.group?.name ?? "",
          conversationId: conversation._id,
        });
      })
    );

    return res.status(200).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi cập nhật cài đặt kiểm duyệt tham gia nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const handleGroupJoinRequest = async (req, res) => {
  try {
    const { conversationId, requestUserId } = req.params;
    const userId = req.user._id.toString();
    const action = req.body?.action;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Hành động xử lý yêu cầu tham gia không hợp lệ" });
    }

    const conversation = await Conversation.findById(conversationId).populate(conversationPopulate);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Chỉ nhóm chat mới có yêu cầu tham gia" });
    }

    if (!isConversationParticipant(conversation, userId)) {
      return res.status(403).json({ message: "Bạn không ở trong nhóm này" });
    }

    if (conversation.group?.createdBy?.toString() !== userId) {
      return res.status(403).json({ message: "Chỉ trưởng nhóm mới được xử lý yêu cầu tham gia" });
    }

    const pendingRequestIndex = (conversation.group?.pendingJoinRequests ?? []).findIndex(
      (request) => (request.userId?._id ?? request.userId)?.toString() === requestUserId
    );

    if (pendingRequestIndex === -1) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu tham gia nhóm" });
    }

    conversation.group.pendingJoinRequests.splice(pendingRequestIndex, 1);

    if (action === "approve") {
      addParticipantToConversation(conversation, requestUserId);
    }

    await conversation.save();
    await conversation.populate(conversationPopulate);

    const formatted = formatConversation(conversation);

    io.to(conversationId).emit("conversation-updated", formatted);

    if (action === "approve") {
      io.to(requestUserId).emit("new-group", formatted);

      await notifyGroupJoined({
        recipient: requestUserId,
        title: "Yêu cầu tham gia nhóm đã được chấp nhận",
        message: `Bạn đã được thêm vào nhóm chat ${formatted.group?.name ?? ""}.`,
        actor: {
          _id: req.user._id,
          username: req.user.username,
          displayName: req.user.displayName,
          avatarUrl: req.user.avatarUrl ?? null,
        },
        groupName: formatted.group?.name ?? "",
        conversationId: conversation._id,
      });
    }

    return res.status(200).json({
      conversation: formatted,
      status: action,
    });
  } catch (error) {
    console.error("Lỗi khi xử lý yêu cầu tham gia nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const markAsSeen = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();

    const conversation = await Conversation.findById(conversationId).lean();

    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    const last = conversation.lastMessage;

    if (!last) {
      return res.status(200).json({ message: "Không có tin nhắn để mark as seen" });
    }

    if (last.senderId.toString() === userId) {
      return res.status(200).json({ message: "Sender không cần mark as seen" });
    }

    const updated = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $addToSet: { seenBy: userId },
        $set: { [`unreadCounts.${userId}`]: 0 },
      },
      {
        new: true,
      },
    );

    await updated.populate({
      path: "seenBy",
      select: "displayName avatarUrl",
    });

    io.to(conversationId).emit("read-message", {
      conversation: {
        _id: updated?._id,
        lastMessageAt: updated?.lastMessageAt,
        unreadCounts: updated?.unreadCounts,
        seenBy: updated?.seenBy ?? [],
      },
    });

    return res.status(200).json({
      message: "Marked as seen",
      seenBy: updated?.seenBy || [],
      myUnreadCount: updated?.unreadCounts[userId] || 0,
    });
  } catch (error) {
    console.error("Lỗi khi mark as seen", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
