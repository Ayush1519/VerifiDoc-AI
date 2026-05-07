import { useState } from "react";
import Head from "next/head";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Activity, Layers, ChevronRight, RotateCcw } from "lucide-react";

import FileUpload  from "../components/FileUpload";
import RiskDashboard from "../components/RiskDashboard";
import AnomalyReport from "../components/AnomalyReport";

// ── Loading stages ────────────────────────────────────────────────────────────
const STAGES = [
  { id: "metadata",  label: "Extracting metadata",         pct: 20 },
  { id: "ocr",       label: "Running OCR extraction",      pct: 45 },
  { id: "anomaly",   label: "Pixel-level forgery scan",    pct: 70 },
  { id: "risk",      label: "Calculating risk score",      pct: 90 },
  { id: "done",      label: "Compiling report",            pct: 100 },
];

function LoadingScreen({ stage }) {
  const current = STAGES[stage] || STAGES[STAGES.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="py-12 flex flex-col items-center gap-8"
    >
      {/* Animated rings */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-accent/30"
            style={{ width: 40 + i * 26, height: 40 + i * 26 }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
          />
        ))}
        <Shield className="w-8 h-8 text-accent" />
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs space-y-2">
        <div className="flex justify-between text-xs font-mono text-dim">
          <span className="text-accent">{current.label}</span>
          <span>{current.pct}%</span>
        </div>
        <div className="h-1 rounded-full bg-border overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${current.pct}%` }}
            transition={{ duration: 0.5 }}
            style={{ boxShadow: "0 0 8px rgba(0,229,255,0.6)" }}
          />
        </div>
        <div className="flex gap-1.5 mt-3 justify-center">
          {STAGES.map((s, i) => (
            <div
              key={s.id}
              className="w-1.5 h-1.5 rounded-full transition-all duration-300"
              style={{
                background: i <= stage ? "#00e5ff" : "#1e1e30",
                boxShadow:  i === stage ? "0 0 6px rgba(0,229,255,0.8)" : "none",
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [result,    setResult]    = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadStage, setLoadStage] = useState(0);
  const [apiError,  setApiError]  = useState("");
  const [activeTab, setActiveTab] = useState("report"); // "report" | "fields"

  const handleVerify = async (file) => {
    setIsLoading(true);
    setResult(null);
    setApiError("");
    setLoadStage(0);

    // Simulate pipeline progress
    const stageTimer = setInterval(() => {
      setLoadStage((s) => (s < STAGES.length - 1 ? s + 1 : s));
    }, 700);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post("/api/verify", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      clearInterval(stageTimer);
      setLoadStage(STAGES.length - 1);
      await new Promise((r) => setTimeout(r, 400));
      setResult(res.data);
    } catch (err) {
      clearInterval(stageTimer);
      const detail = err.response?.data?.detail || err.message || "Verification failed.";
      setApiError(detail);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setApiError("");
    setLoadStage(0);
    setActiveTab("report");
  };

  const extractedFieldEntries = result
    ? Object.entries(result.extracted_fields)
    : [];

  return (
    <>
      <Head>
        <title>VerifiDoc AI — Document Fraud Detection</title>
        <meta name="description" content="Real-time document anomaly detection and fraud prevention for underwriting teams." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* ── Background ─────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 bg-void">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100" />
        <div className="absolute inset-0 bg-scanline" />
        {/* Ambient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #00e5ff 0%, transparent 70%)" }}
        />
      </div>

      {/* ── Page shell ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-sm bg-void/60 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[rgba(0,229,255,0.1)] border border-accent/30 flex items-center justify-center">
                <Shield className="w-4 h-4 text-accent" />
              </div>
              <div>
                <span className="font-sans font-bold text-text tracking-wide">VerifiDoc</span>
                <span className="text-accent font-sans font-bold"> AI</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-6 text-xs font-mono text-dim">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse" />
                SYSTEM OPERATIONAL
              </span>
              <span>SuRaksha · Canara Bank</span>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-10 text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono text-accent bg-[rgba(0,229,255,0.06)] border border-accent/20 mb-6">
              <Activity className="w-3 h-3" />
              Real-time Anomaly Detection &amp; Fraud Prevention
            </div>
            <h1 className="font-sans font-extrabold text-4xl sm:text-5xl text-text leading-tight mb-4">
              Document Verification<br />
              <span className="text-accent">Intelligence</span>
            </h1>
            <p className="text-dim font-body text-base max-w-xl mx-auto leading-relaxed">
              Upload a financial document, land record, or legal statement.
              VerifiDoc AI performs pixel-level forensics, metadata analysis, and
              semantic consistency checks in seconds.
            </p>
          </motion.div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: Upload panel */}
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-panel p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Layers className="w-4 h-4 text-accent" />
                  <h2 className="font-sans font-semibold text-sm uppercase tracking-widest text-dim">
                    Document Input
                  </h2>
                </div>
                <FileUpload onSubmit={handleVerify} isLoading={isLoading} />
              </div>

              {/* How it works */}
              <div className="rounded-xl border border-border bg-panel p-6">
                <h3 className="text-dim text-xs font-mono uppercase tracking-widest mb-4">How it works</h3>
                <ol className="space-y-3">
                  {[
                    ["01", "Metadata Forensics",   "Checks creation date, editing software, and modification history."],
                    ["02", "OCR Extraction",        "Extracts all text and structured fields (PAN, Aadhaar, amounts, IFSC)."],
                    ["03", "ELA Pixel Analysis",   "Detects manipulated patches via Error Level Analysis."],
                    ["04", "Semantic Validation",  "Spots contradictory terms, placeholders, and field inconsistencies."],
                    ["05", "Risk Scoring",          "Weighs all signals to produce a 0–100 risk score."],
                  ].map(([num, title, desc]) => (
                    <li key={num} className="flex gap-3 items-start">
                      <span className="font-mono text-xs text-accent/60 mt-0.5 w-5 flex-shrink-0">{num}</span>
                      <div>
                        <p className="text-text text-sm font-body font-medium">{title}</p>
                        <p className="text-dim text-xs font-body mt-0.5">{desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Right: Results panel */}
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {isLoading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-border bg-panel p-6"
                  >
                    <LoadingScreen stage={loadStage} />
                  </motion.div>
                )}

                {apiError && !isLoading && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-danger/30 bg-[rgba(255,59,59,0.06)] p-6 text-center"
                  >
                    <p className="text-danger font-body mb-2">Verification failed</p>
                    <p className="text-dim text-sm font-mono">{apiError}</p>
                    <button
                      onClick={reset}
                      className="mt-4 px-4 py-2 rounded-lg text-sm font-mono text-accent border border-accent/30 hover:bg-accent/10 transition-colors"
                    >
                      Try again
                    </button>
                  </motion.div>
                )}

                {result && !isLoading && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    {/* Actions bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1 p-1 rounded-lg bg-panel border border-border">
                        {["report", "fields"].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all ${
                              activeTab === tab
                                ? "bg-accent text-void font-bold"
                                : "text-dim hover:text-text"
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={reset}
                        className="flex items-center gap-1.5 text-xs font-mono text-dim hover:text-accent transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        New scan
                      </button>
                    </div>

                    <RiskDashboard result={result} />

                    <AnimatePresence mode="wait">
                      {activeTab === "report" && (
                        <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <AnomalyReport result={result} />
                        </motion.div>
                      )}

                      {activeTab === "fields" && (
                        <motion.div key="fields" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="rounded-xl border border-border bg-panel p-5 space-y-3"
                        >
                          <h3 className="text-dim text-xs font-mono uppercase tracking-widest">
                            Extracted Structured Fields
                          </h3>
                          {extractedFieldEntries.length === 0 ? (
                            <p className="text-dim text-sm font-body">No structured fields detected in this document.</p>
                          ) : (
                            extractedFieldEntries.map(([field, values]) => (
                              <div key={field} className="rounded-md bg-surface border border-border p-3">
                                <p className="text-accent text-xs font-mono mb-2 uppercase tracking-wider">
                                  {field.replace(/_/g, " ")}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {values.map((v, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded bg-[rgba(0,229,255,0.06)] text-text text-xs font-mono border border-border">
                                      {v}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {!result && !isLoading && !apiError && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl border border-dashed border-border bg-panel/40 p-10 flex flex-col items-center gap-4 text-center"
                  >
                    <Shield className="w-10 h-10 text-border" />
                    <div>
                      <p className="text-dim font-body text-sm">Verification results will appear here</p>
                      <p className="text-muted font-mono text-xs mt-1">Upload a document to begin analysis</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-mono text-muted/50 mt-2">
                      <ChevronRight className="w-3 h-3" />
                      <span>AES-256 encrypted · Zero data retention</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/40 py-5">
          <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-muted">
            <span>VerifiDoc AI · SuRaksha Initiative · Canara Bank Hackathon 2024</span>
            <span>Theme: Real-time Anomaly Detection &amp; Fraud Prevention in Underwriting</span>
          </div>
        </footer>
      </div>
    </>
  );
}
