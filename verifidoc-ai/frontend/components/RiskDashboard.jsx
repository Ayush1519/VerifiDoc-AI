import { motion } from "framer-motion";
import { Shield, ShieldAlert, ShieldCheck, ShieldX, Clock, FileText, Cpu, AlertTriangle, CheckCircle, AlertCircle, XCircle } from "lucide-react";

const LEVEL_CONFIG = {
  LOW:      { color: "#00e676", label: "LOW RISK",      icon: ShieldCheck,  glow: "rgba(0,230,118,0.3)",  bg: "rgba(0,230,118,0.06)"  },
  MODERATE: { color: "#ffb300", label: "MODERATE RISK", icon: ShieldAlert,  glow: "rgba(255,179,0,0.3)",  bg: "rgba(255,179,0,0.06)"  },
  HIGH:     { color: "#ff7043", label: "HIGH RISK",     icon: ShieldAlert,  glow: "rgba(255,112,67,0.3)", bg: "rgba(255,112,67,0.06)" },
  CRITICAL: { color: "#ff3b3b", label: "CRITICAL RISK", icon: ShieldX,      glow: "rgba(255,59,59,0.4)",  bg: "rgba(255,59,59,0.08)"  },
};

const SEVERITY_COLORS = {
  CRITICAL: "#ff3b3b",
  HIGH:     "#ff7043",
  MEDIUM:   "#ffb300",
  LOW:      "#00e676",
};

const SEVERITY_ICONS = {
  CRITICAL: XCircle,
  HIGH:     AlertTriangle,
  MEDIUM:   AlertCircle,
  LOW:      CheckCircle,
};

function RiskGauge({ score, color }) {
  const radius    = 70;
  const stroke    = 8;
  const norm_r    = radius - stroke / 2;
  const circumference = 2 * Math.PI * norm_r;
  const dashOffset    = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        {/* Track */}
        <circle
          cx="90" cy="90" r={norm_r}
          fill="none" stroke="#1e1e30" strokeWidth={stroke}
        />
        {/* Progress */}
        <motion.circle
          cx="90" cy="90" r={norm_r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
          transform="rotate(-90 90 90)"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      {/* Score text */}
      <div className="absolute text-center">
        <motion.p
          className="font-sans font-extrabold leading-none"
          style={{ fontSize: 42, color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6, ease: "backOut" }}
        >
          {score}
        </motion.p>
        <p className="text-dim text-xs font-mono uppercase tracking-widest mt-1">/ 100</p>
      </div>
    </div>
  );
}

function StatBadge({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface border border-border hover:border-accent/50 transition-colors">
      <Icon className="w-3.5 h-3.5 text-muted flex-shrink-0" />
      <span className="text-dim text-xs font-body">{label}</span>
      <span className="text-text text-xs font-mono ml-auto font-bold">{value}</span>
    </div>
  );
}

function AnomalyCard({ anomaly, index }) {
  const SevIcon = SEVERITY_ICONS[anomaly.severity] || AlertCircle;
  const sevColor = SEVERITY_COLORS[anomaly.severity];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-3 rounded-lg border"
      style={{
        background: `rgba(255,255,255,0.02)`,
        borderColor: `${sevColor}33`,
        borderLeft: `3px solid ${sevColor}`,
      }}
    >
      <div className="flex gap-2">
        <SevIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: sevColor }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: `${sevColor}22`, color: sevColor }}
            >
              {anomaly.severity}
            </span>
            <span className="text-xs text-dim font-mono truncate">{anomaly.type}</span>
          </div>
          <p className="text-xs text-text leading-relaxed">{anomaly.description}</p>
          {anomaly.confidence && (
            <div className="mt-2 flex items-center gap-1">
              <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${anomaly.confidence * 100}%`,
                    background: sevColor,
                  }}
                />
              </div>
              <span className="text-xs text-dim font-mono">{(anomaly.confidence * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function RiskDashboard({ result }) {
  const anomaliesArray = Array.isArray(result.anomalies) ? result.anomalies : [];
  const cfg   = LEVEL_CONFIG[result.risk_level] || LEVEL_CONFIG.LOW;
  const RiskIcon = cfg.icon;
  const criticalAnomalies = anomaliesArray.filter(a => a.severity === "CRITICAL");
  const highAnomalies = anomaliesArray.filter(a => a.severity === "HIGH");
  const mediumAnomalies = anomaliesArray.filter(a => a.severity === "MEDIUM");
  const lowAnomalies = anomaliesArray.filter(a => a.severity === "LOW");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl overflow-hidden space-y-4"
    >
      {/* Main Risk Card */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background:    cfg.bg,
          border:        `1px solid ${cfg.color}44`,
          boxShadow:     `0 0 40px ${cfg.glow}, 0 0 80px ${cfg.glow.replace("0.3", "0.08")}`,
        }}
      >
        <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3">
          <RiskIcon className="w-5 h-5" style={{ color: cfg.color }} />
          <span className="font-sans font-bold text-sm tracking-widest uppercase" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
          <span className="ml-auto text-dim text-xs font-mono">
            #{result.document_id.slice(0, 8)}
          </span>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            {/* Gauge */}
            <div className="flex-shrink-0">
              <RiskGauge score={result.risk_score} color={cfg.color} />
              <p className="text-center text-dim text-xs font-mono mt-2">RISK ASSESSMENT</p>
            </div>

            {/* Stats Grid */}
            <div className="flex-1 w-full space-y-2">
              <StatBadge
                icon={FileText}
                label="File"
                value={result.filename.length > 22 ? result.filename.slice(0, 22) + "…" : result.filename}
              />
              <StatBadge
                icon={Cpu}
                label="OCR Confidence"
                value={`${(result.ocr_confidence * 100).toFixed(1)}%`}
              />
              <StatBadge
                icon={Clock}
                label="Processing Time"
                value={`${result.processing_time_ms} ms`}
              />
              <div className="pt-2 grid grid-cols-2 gap-2">
                <StatBadge
                  icon={ShieldX}
                  label="Critical Issues"
                  value={criticalAnomalies.length}
                />
                <StatBadge
                  icon={AlertTriangle}
                  label="High Priority"
                  value={highAnomalies.length}
                />
              </div>

              {/* Detected Fields */}
              {Object.keys(result.extracted_fields).length > 0 && (
                <div className="pt-3">
                  <p className="text-dim text-xs font-mono mb-2 uppercase tracking-wider">Detected Fields</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(result.extracted_fields).map((field) => (
                      <span
                        key={field}
                        className="px-2 py-0.5 rounded text-xs font-mono bg-[rgba(0,229,255,0.08)] text-accent border border-accent/20"
                      >
                        {field.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Anomalies Section */}
      {(result.anomalies && result.anomalies.length > 0) && (
        <div className="rounded-xl overflow-hidden bg-surface border border-border p-6">
          <h3 className="text-sm font-bold text-text mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-accent" />
            Detected Issues ({result.anomalies.length})
          </h3>

          <div className="space-y-3">
            {/* Critical Anomalies */}
            {criticalAnomalies.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-dim font-mono uppercase tracking-wider">🔴 CRITICAL ({criticalAnomalies.length})</p>
                <div className="space-y-2">
                  {criticalAnomalies.map((anom, idx) => (
                    <AnomalyCard key={idx} anomaly={anom} index={idx} />
                  ))}
                </div>
              </div>
            )}

            {/* High Anomalies */}
            {highAnomalies.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-dim font-mono uppercase tracking-wider">🟠 HIGH ({highAnomalies.length})</p>
                <div className="space-y-2">
                  {highAnomalies.map((anom, idx) => (
                    <AnomalyCard key={idx} anomaly={anom} index={criticalAnomalies.length + idx} />
                  ))}
                </div>
              </div>
            )}

            {/* Medium Anomalies */}
            {mediumAnomalies.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-dim font-mono uppercase tracking-wider">🟡 MEDIUM ({mediumAnomalies.length})</p>
                <div className="space-y-2">
                  {mediumAnomalies.slice(0, 2).map((anom, idx) => (
                    <AnomalyCard key={idx} anomaly={anom} index={criticalAnomalies.length + highAnomalies.length + idx} />
                  ))}
                  {mediumAnomalies.length > 2 && (
                    <p className="text-xs text-dim px-3 py-2">+ {mediumAnomalies.length - 2} more medium issues</p>
                  )}
                </div>
              </div>
            )}

            {/* Low Anomalies - collapsed */}
            {lowAnomalies.length > 0 && (
              <p className="text-xs text-dim px-3 py-2">+ {lowAnomalies.length} low severity issue(s)</p>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {(result.recommendations && result.recommendations.length > 0) && (
        <div className="rounded-xl overflow-hidden bg-surface border border-border p-6">
          <h3 className="text-sm font-bold text-text mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-accent" />
            Recommendations
          </h3>

          <ul className="space-y-2">
            {result.recommendations.map((rec, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex gap-3 text-xs text-dim leading-relaxed"
              >
                <span className="text-accent font-bold flex-shrink-0 mt-0.5">→</span>
                <span>{rec}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
