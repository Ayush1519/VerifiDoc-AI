import { motion } from "framer-motion";
import {
  AlertTriangle, AlertOctagon, Info, Zap,
  CheckCircle2, ChevronDown, ChevronUp, Flag
} from "lucide-react";
import { useState } from "react";

const SEVERITY_CONFIG = {
  CRITICAL: { color: "#ff3b3b", bg: "rgba(255,59,59,0.06)",  border: "rgba(255,59,59,0.25)",  icon: AlertOctagon,  label: "CRITICAL" },
  HIGH:     { color: "#ff7043", bg: "rgba(255,112,67,0.06)", border: "rgba(255,112,67,0.25)", icon: AlertTriangle, label: "HIGH"     },
  MEDIUM:   { color: "#ffb300", bg: "rgba(255,179,0,0.06)",  border: "rgba(255,179,0,0.25)",  icon: Zap,           label: "MEDIUM"   },
  LOW:      { color: "#aaaacc", bg: "rgba(170,170,204,0.04)", border: "rgba(170,170,204,0.15)", icon: Info,         label: "LOW"      },
};

function AnomalyCard({ anomaly, index }) {
  const cfg = SEVERITY_CONFIG[anomaly.severity] || SEVERITY_CONFIG.LOW;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      className="rounded-lg p-4"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${cfg.color}18` }}
        >
          <Icon className="w-4 h-4" style={{ color: cfg.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="text-xs font-mono font-bold tracking-wider px-2 py-0.5 rounded"
              style={{ color: cfg.color, background: `${cfg.color}18` }}
            >
              {cfg.label}
            </span>
            <span className="text-dim text-xs font-mono">{anomaly.type}</span>
          </div>

          <p className="text-text text-sm font-body leading-relaxed">
            {anomaly.description}
          </p>

          <div className="flex items-center gap-4 mt-2">
            {anomaly.location && (
              <span className="text-dim text-xs font-mono flex items-center gap-1">
                <Flag className="w-3 h-3" />
                {anomaly.location}
              </span>
            )}
            <span className="text-dim text-xs font-mono">
              confidence: {(anomaly.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function RecommendationItem({ text, index }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-2.5 text-sm font-body text-text"
    >
      <span className="text-accent font-mono mt-0.5 flex-shrink-0">→</span>
      {text}
    </motion.li>
  );
}

export default function AnomalyReport({ result }) {
  const [showMeta, setShowMeta] = useState(false);

  const criticalCount = result.anomalies.filter((a) => a.severity === "CRITICAL").length;
  const highCount     = result.anomalies.filter((a) => a.severity === "HIGH").length;
  const medCount      = result.anomalies.filter((a) => a.severity === "MEDIUM").length;
  const lowCount      = result.anomalies.filter((a) => a.severity === "LOW").length;

  // Sort: CRITICAL first
  const sortedAnomalies = [...result.anomalies].sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
  });

  return (
    <div className="space-y-6">
      {/* Summary chips */}
      {result.anomalies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {criticalCount > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[rgba(255,59,59,0.1)] text-[#ff3b3b] border border-[rgba(255,59,59,0.3)]">
              {criticalCount} CRITICAL
            </span>
          )}
          {highCount > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[rgba(255,112,67,0.1)] text-[#ff7043] border border-[rgba(255,112,67,0.3)]">
              {highCount} HIGH
            </span>
          )}
          {medCount > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[rgba(255,179,0,0.1)] text-warn border border-[rgba(255,179,0,0.3)]">
              {medCount} MEDIUM
            </span>
          )}
          {lowCount > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[rgba(170,170,204,0.08)] text-muted border border-border">
              {lowCount} LOW
            </span>
          )}
        </div>
      )}

      {/* Anomaly cards */}
      {sortedAnomalies.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 px-5 py-4 rounded-lg bg-[rgba(0,230,118,0.06)] border border-[rgba(0,230,118,0.2)]"
        >
          <CheckCircle2 className="w-5 h-5 text-safe flex-shrink-0" />
          <p className="text-safe font-body text-sm">
            No anomalies detected. Document passes all automated verification checks.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {sortedAnomalies.map((anomaly, i) => (
            <AnomalyCard key={i} anomaly={anomaly} index={i} />
          ))}
        </div>
      )}

      {/* Metadata flags */}
      {result.metadata_flags.length > 0 && (
        <div className="rounded-lg border border-border bg-panel overflow-hidden">
          <button
            onClick={() => setShowMeta(!showMeta)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface transition-colors"
          >
            <span className="text-dim text-sm font-mono uppercase tracking-wider">
              Metadata flags ({result.metadata_flags.length})
            </span>
            {showMeta ? (
              <ChevronUp className="w-4 h-4 text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted" />
            )}
          </button>
          {showMeta && (
            <div className="px-4 pb-4 space-y-1.5">
              {result.metadata_flags.map((flag, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-mono text-warn">
                  <span className="text-warn/50">▸</span>
                  {flag}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="rounded-lg border border-border bg-panel p-5">
          <h3 className="text-dim text-xs font-mono uppercase tracking-widest mb-4">
            Underwriter Recommendations
          </h3>
          <ul className="space-y-3">
            {result.recommendations.map((rec, i) => (
              <RecommendationItem key={i} text={rec} index={i} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
