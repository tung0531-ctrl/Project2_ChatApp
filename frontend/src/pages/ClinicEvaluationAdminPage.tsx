import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { chatService } from "@/services/chatService";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import type {
  ClinicEvaluationDatasetOption,
  ClinicManualPrediction,
  ClinicManualPredictionResponse,
  ClinicEvaluationResponse,
  ClinicEvaluationRunDetail,
  ClinicEvaluationSummary,
} from "@/types/chat";

type RowFilter = "all" | "allFailed" | "contradiction" | "nbWrong" | "svmWrong" | "lrWrong";
const RESULTS_PER_PAGE = 200;
const EVALUATION_PROGRESS_POLL_INTERVAL_MS = 500;

const formatDuration = (speedMs: number) => {
  if (speedMs < 1000) {
    return `${speedMs} ms`;
  }

  return `${(speedMs / 1000).toFixed(2)} s`;
};

const SummaryCard = ({ summary }: { summary: ClinicEvaluationSummary }) => {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
            {summary.shortLabel ?? summary.classifierType ?? "MODEL"}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">{summary.displayName}</h3>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
          {summary.status}
        </span>
      </div>

      <div className="mt-5 space-y-2 text-sm text-muted-foreground">
        <p>
          Accuracy: <span className="font-semibold text-foreground">{summary.accuracy.toFixed(2)}%</span>
        </p>
        <p>
          Speed: <span className="font-semibold text-foreground">{formatDuration(summary.speedMs)}</span>
        </p>
        <p>
          Correct: <span className="font-semibold text-foreground">{summary.correct}/{summary.total}</span>
        </p>
        <p>
          Loss: <span className="font-semibold text-foreground">{summary.averageLoss?.toFixed(4) ?? "N/A"}</span>
        </p>
      </div>
    </div>
  );
};

const PredictionCell = ({ prediction }: { prediction?: ClinicManualPrediction }) => {
  if (!prediction) {
    return <span className="text-sm text-muted-foreground">N/A</span>;
  }

  const statusText =
    prediction.correct === null ? "Unknown" : prediction.correct ? "Correct" : "Wrong";
  const statusClassName =
    prediction.correct === null
      ? "bg-slate-200 text-slate-700"
      : prediction.correct
        ? "bg-emerald-500/10 text-emerald-700"
        : "bg-red-500/10 text-red-700";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClassName}`}>
          {statusText}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground break-all">
        Intent: {prediction.predictedIntent ?? "null"}
      </p>
    </div>
  );
};

const RulePathCell = ({ runDetail }: { runDetail?: ClinicEvaluationRunDetail }) => {
  if (!runDetail) {
    return <span className="text-sm text-muted-foreground">N/A</span>;
  }

  if (!runDetail.firedRules.length) {
    return <span className="text-sm text-muted-foreground">No fired rules</span>;
  }

  return (
    <div className="space-y-2 text-sm text-foreground">
      {runDetail.usedFallback ? (
        <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          Fallback
        </span>
      ) : null}
      <p className="break-words">{runDetail.firedRules.join(" -> ")}</p>
    </div>
  );
};

const ResponseCell = ({ runDetail }: { runDetail?: ClinicEvaluationRunDetail }) => {
  if (!runDetail) {
    return <span className="text-sm text-muted-foreground">N/A</span>;
  }

  return (
    <div className="space-y-2 text-sm text-foreground">
      <p className="whitespace-pre-wrap break-words">{runDetail.response || "No response"}</p>
      {runDetail.needsContext ? (
        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Needs context
        </span>
      ) : null}
    </div>
  );
};

const ClinicEvaluationAdminPage = () => {
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<ClinicEvaluationResponse | null>(null);
  const [datasetOptions, setDatasetOptions] = useState<ClinicEvaluationDatasetOption[]>([]);
  const [dataset, setDataset] = useState("test");
  const [rowFilter, setRowFilter] = useState<RowFilter>("all");
  const [detailsTab, setDetailsTab] = useState("intent");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluationProgressPercent, setEvaluationProgressPercent] = useState(0);
  const [evaluationProgressMessage, setEvaluationProgressMessage] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [manualExpectedIntent, setManualExpectedIntent] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualPrediction, setManualPrediction] = useState<ClinicManualPredictionResponse | null>(null);

  const loadEvaluation = async (selectedDataset: string) => {
    try {
      setLoading(true);
      setError(null);
      setEvaluationProgressPercent(0);
      setEvaluationProgressMessage("Preparing evaluation...");

      const { jobId } = await chatService.startClinicEvaluationJob(selectedDataset);

      while (true) {
        const job = await chatService.fetchClinicEvaluationJobStatus(jobId);

        setEvaluationProgressPercent(job.progressPercent);
        setEvaluationProgressMessage(job.message);

        if (job.status === "completed" && job.result) {
          setEvaluation(job.result);
          setDataset(job.result.dataset);
          break;
        }

        if (job.status === "failed") {
          throw new Error(job.error || "Không thể chạy đánh giá offline lúc này.");
        }

        await new Promise((resolve) => {
          window.setTimeout(resolve, EVALUATION_PROGRESS_POLL_INTERVAL_MS);
        });
      }

      setCurrentPage(1);
    } catch (loadError) {
      console.error("Lỗi khi đánh giá clinic bots", loadError);
      setError(loadError instanceof Error ? loadError.message : "Không thể chạy đánh giá offline lúc này.");
    } finally {
      setLoading(false);
      setEvaluationProgressPercent(0);
      setEvaluationProgressMessage("");
    }
  };

  const runManualPrediction = async () => {
    const trimmedInput = manualInput.trim();

    if (!trimmedInput) {
      setManualError("Hãy nhập input để thử dự đoán.");
      return;
    }

    try {
      setManualLoading(true);
      setManualError(null);
      const response = await chatService.predictClinicInput(
        trimmedInput,
        manualExpectedIntent.trim() || undefined,
      );
      setManualPrediction(response);
    } catch (loadError) {
      console.error("Lỗi khi dự đoán input thủ công", loadError);
      setManualError("Không thể chạy dự đoán thủ công lúc này.");
    } finally {
      setManualLoading(false);
    }
  };

  useEffect(() => {
    const loadDatasetOptions = async () => {
      try {
        const response = await chatService.fetchClinicEvaluationDatasets();
        setDatasetOptions(response.availableDatasets);
      } catch (loadError) {
        console.error("Lỗi khi lấy danh sách dataset clinic evaluation", loadError);
      }
    };

    loadDatasetOptions();
  }, []);

  const visibleRows = useMemo(() => {
    if (!evaluation) {
      return [];
    }

    if (rowFilter === "allFailed") {
      return evaluation.rows.filter((row) => row.allModelsFailed);
    }

    if (rowFilter === "contradiction") {
      return evaluation.rows.filter((row) => row.modelContradiction);
    }

    if (rowFilter === "nbWrong") {
      return evaluation.rows.filter((row) => !row.predictions.botClinicV2?.correct);
    }

    if (rowFilter === "svmWrong") {
      return evaluation.rows.filter((row) => !row.predictions.botClinic?.correct);
    }

    if (rowFilter === "lrWrong") {
      return evaluation.rows.filter((row) => !row.predictions.botClinicV3?.correct);
    }

    return evaluation.rows;
  }, [evaluation, rowFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / RESULTS_PER_PAGE));
  const pageStartIndex = visibleRows.length ? (currentPage - 1) * RESULTS_PER_PAGE : 0;
  const pageRows = visibleRows.slice(pageStartIndex, pageStartIndex + RESULTS_PER_PAGE);

  const resolvedDatasetOptions = evaluation?.availableDatasets?.length
    ? evaluation.availableDatasets
    : datasetOptions.length
      ? datasetOptions
      : [
          { id: "val", label: "CLINC150 Validation", sampleCount: 0 },
          { id: "test", label: "CLINC150 Test", sampleCount: 0 },
          { id: "oos_test", label: "CLINC150 OOS Test", sampleCount: 0 },
        ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 md:px-6 md:py-6">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => navigate("/chat")}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="size-4" />
            Quay lại trang chat
          </button>
        </div>

        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">
                  Offline Evaluation
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-foreground">
                  Clinic Intent Accuracy Dashboard
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  So sánh riêng chất lượng gán intent của Naive Bayes, SVM và Logistic Regression
                  trên CLINC150 validation/test set, không bị nhiễu bởi flow hội thoại hay IF-THEN response.
                </p>
                {!evaluation && !loading && !error ? (
                  <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                    Chọn dataset rồi bấm <span className="font-medium text-foreground">Run Evaluation</span> để chạy so sánh 3 mô hình Clinic.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {resolvedDatasetOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setDataset(option.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        dataset === option.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:opacity-90"
                      }`}
                    >
                      {option.label} ({option.sampleCount})
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => loadEvaluation(dataset.trim())}
                  disabled={loading || !dataset.trim()}
                  className="h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Running..." : "Run Evaluation"}
                </button>
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                        style={{ width: `${evaluationProgressPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {evaluationProgressMessage || "Running evaluation..."} ({evaluationProgressPercent}%)
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

        </section>

          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-3">
            {(evaluation?.summaries ?? []).map((summary) => (
              <SummaryCard key={summary.botId} summary={summary} />
            ))}
          </section>

          <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Manual Input Probe</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Nhập một câu bất kỳ để so sánh trực tiếp output của NB, SVM và Logistic Regression. Right intent là tùy chọn.
                </p>
              </div>

              <button
                type="button"
                onClick={runManualPrediction}
                disabled={manualLoading || !manualInput.trim()}
                className="h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {manualLoading ? "Running..." : "Test Manual Input"}
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                Input
                <Textarea
                  value={manualInput}
                  onChange={(event) => setManualInput(event.target.value)}
                  placeholder="Ví dụ: I need to book a doctor appointment for tomorrow morning"
                  className="min-h-28 resize-y border-border/60 bg-background"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                Right Intent (optional)
                <Input
                  value={manualExpectedIntent}
                  onChange={(event) => setManualExpectedIntent(event.target.value)}
                  placeholder="Ví dụ: schedule_appointment"
                  className="h-11 border-border/60 bg-background"
                />
              </label>
            </div>

            {manualError ? (
              <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {manualError}
              </div>
            ) : null}

            {manualPrediction ? (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3 text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      <th className="px-3">Input</th>
                      <th className="px-3">Right Intent</th>
                      <th className="px-3">NB</th>
                      <th className="px-3">SVM</th>
                      <th className="px-3">LR</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="rounded-2xl bg-muted/40 align-top shadow-sm">
                      <td className="max-w-sm rounded-l-2xl px-3 py-4 text-sm text-foreground">
                        {manualPrediction.text}
                      </td>
                      <td className="px-3 py-4 text-sm font-medium text-foreground">
                        {manualPrediction.expectedIntent ?? "Not provided"}
                      </td>
                      <td className="px-3 py-4">
                        <PredictionCell prediction={manualPrediction.predictions.botClinicV2} />
                      </td>
                      <td className="px-3 py-4">
                        <PredictionCell prediction={manualPrediction.predictions.botClinic} />
                      </td>
                      <td className="rounded-r-2xl px-3 py-4">
                        <PredictionCell prediction={manualPrediction.predictions.botClinicV3} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Detailed Analytics</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Total samples: {evaluation?.totalSamples ?? 0}. Hiển thị {pageRows.length} / {visibleRows.length} dòng theo bộ lọc hiện tại. Mỗi trang tối đa {RESULTS_PER_PAGE} dòng.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRowFilter("all");
                    setCurrentPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    rowFilter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:opacity-90"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRowFilter("allFailed");
                    setCurrentPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    rowFilter === "allFailed"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:opacity-90"
                  }`}
                >
                  All Models Failed
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRowFilter("contradiction");
                    setCurrentPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    rowFilter === "contradiction"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:opacity-90"
                  }`}
                >
                  Model Contradiction
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRowFilter("nbWrong");
                    setCurrentPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    rowFilter === "nbWrong"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:opacity-90"
                  }`}
                >
                  NB Wrong
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRowFilter("svmWrong");
                    setCurrentPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    rowFilter === "svmWrong"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:opacity-90"
                  }`}
                >
                  SVM Wrong
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRowFilter("lrWrong");
                    setCurrentPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    rowFilter === "lrWrong"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:opacity-90"
                  }`}
                >
                  LR Wrong
                </button>
              </div>
            </div>

            <Tabs value={detailsTab} onValueChange={setDetailsTab} className="mt-5">
              <TabsList>
                <TabsTrigger value="intent">Tab 1: Intent View</TabsTrigger>
                <TabsTrigger value="rules">Tab 2: Rules + Response</TabsTrigger>
              </TabsList>

              <TabsContent value="intent" className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3 text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      <th className="px-3">Input</th>
                      <th className="px-3">Right Intent</th>
                      <th className="px-3">NB</th>
                      <th className="px-3">SVM</th>
                      <th className="px-3">LR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row) => (
                      <tr key={row.id} className="rounded-2xl bg-muted/40 align-top shadow-sm">
                        <td className="max-w-sm rounded-l-2xl px-3 py-4 text-sm text-foreground">
                          {row.text}
                        </td>
                        <td className="px-3 py-4 text-sm font-medium text-foreground">{row.intent}</td>
                        <td className="px-3 py-4">
                          <PredictionCell prediction={row.predictions.botClinicV2} />
                        </td>
                        <td className="px-3 py-4">
                          <PredictionCell prediction={row.predictions.botClinic} />
                        </td>
                        <td className="rounded-r-2xl px-3 py-4">
                          <PredictionCell prediction={row.predictions.botClinicV3} />
                        </td>
                      </tr>
                    ))}
                    {!pageRows.length ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                          Không có dòng nào phù hợp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </TabsContent>

              <TabsContent value="rules" className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3 text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      <th className="px-3">Input</th>
                      <th className="px-3">Right Intent</th>
                      <th className="px-3">NB IF-THEN</th>
                      <th className="px-3">NB Response</th>
                      <th className="px-3">SVM IF-THEN</th>
                      <th className="px-3">SVM Response</th>
                      <th className="px-3">LR IF-THEN</th>
                      <th className="px-3">LR Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row) => (
                      <tr key={`${row.id}-rules`} className="rounded-2xl bg-muted/40 align-top shadow-sm">
                        <td className="max-w-sm rounded-l-2xl px-3 py-4 text-sm text-foreground">
                          {row.text}
                        </td>
                        <td className="px-3 py-4 text-sm font-medium text-foreground">{row.intent}</td>
                        <td className="min-w-72 px-3 py-4">
                          <RulePathCell runDetail={row.runDetails.botClinicV2} />
                        </td>
                        <td className="min-w-80 px-3 py-4">
                          <ResponseCell runDetail={row.runDetails.botClinicV2} />
                        </td>
                        <td className="min-w-72 px-3 py-4">
                          <RulePathCell runDetail={row.runDetails.botClinic} />
                        </td>
                        <td className="min-w-80 px-3 py-4">
                          <ResponseCell runDetail={row.runDetails.botClinic} />
                        </td>
                        <td className="min-w-72 px-3 py-4">
                          <RulePathCell runDetail={row.runDetails.botClinicV3} />
                        </td>
                        <td className="min-w-80 rounded-r-2xl px-3 py-4">
                          <ResponseCell runDetail={row.runDetails.botClinicV3} />
                        </td>
                      </tr>
                    ))}
                    {!pageRows.length ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                          Không có dòng nào phù hợp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </TabsContent>
            </Tabs>

            {visibleRows.length ? (
              <div className="mt-5 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} / {totalPages}. Rows {pageStartIndex + 1}-{Math.min(pageStartIndex + pageRows.length, visibleRows.length)} of {visibleRows.length}.
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="rounded-xl border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-xl border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
        </section>
      </div>
    </div>
  );
};

export default ClinicEvaluationAdminPage;