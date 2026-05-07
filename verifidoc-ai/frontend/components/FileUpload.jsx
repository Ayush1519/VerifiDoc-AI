import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Image, AlertCircle, X, Scan } from "lucide-react";

const ACCEPTED = {
  "application/pdf":  [".pdf"],
  "image/jpeg":       [".jpg", ".jpeg"],
  "image/png":        [".png"],
};

export default function FileUpload({ onSubmit, isLoading }) {
  const [file, setFile]     = useState(null);
  const [error, setError]   = useState("");

  const onDrop = useCallback((accepted, rejected) => {
    setError("");
    if (rejected.length > 0) {
      setError("Unsupported file. Please upload a PDF, JPEG, or PNG (max 20 MB).");
      return;
    }
    if (accepted[0].size > 20 * 1024 * 1024) {
      setError("File exceeds the 20 MB size limit.");
      return;
    }
    setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:   ACCEPTED,
    maxFiles: 1,
    disabled: isLoading,
  });

  const handleSubmit = () => {
    if (file && !isLoading) onSubmit(file);
  };

  const FileIcon = file?.type === "application/pdf" ? FileText : Image;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`
          relative rounded-lg p-8 text-center cursor-pointer transition-all duration-300 overflow-hidden
          ${isDragActive
            ? "border-accent bg-[rgba(0,229,255,0.06)] border-glow"
            : "border border-border bg-panel hover:border-accent/40 hover:bg-[rgba(0,229,255,0.03)]"
          }
          ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />

        {/* Grid background */}
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />

        <AnimatePresence mode="wait">
          {isDragActive ? (
            <motion.div
              key="drag"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10"
            >
              <Scan className="w-12 h-12 mx-auto text-accent mb-3 animate-pulse" />
              <p className="font-sans font-700 text-accent text-lg">Release to queue document</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10"
            >
              <Upload className="w-12 h-12 mx-auto text-muted mb-3" />
              <p className="font-sans font-semibold text-text mb-1">
                Drop document here or <span className="text-accent">browse files</span>
              </p>
              <p className="text-dim font-body text-sm">
                Supported: PDF, JPEG, PNG &nbsp;·&nbsp; Max 20 MB
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[rgba(255,59,59,0.08)] border border-danger/30 text-danger text-sm font-body"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected file card */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between px-4 py-3 rounded-lg bg-panel border border-border"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-md bg-[rgba(0,229,255,0.1)] flex items-center justify-center flex-shrink-0">
                <FileIcon className="w-4 h-4 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-text text-sm font-mono truncate">{file.name}</p>
                <p className="text-dim text-xs">
                  {(file.size / 1024).toFixed(1)} KB &nbsp;·&nbsp;{" "}
                  {file.type || "unknown"}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="text-muted hover:text-danger transition-colors ml-3 flex-shrink-0"
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button */}
      <motion.button
        onClick={handleSubmit}
        disabled={!file || isLoading}
        whileHover={!isLoading && file ? { scale: 1.01 } : {}}
        whileTap={!isLoading && file ? { scale: 0.99 } : {}}
        className={`
          w-full py-3.5 rounded-lg font-sans font-semibold text-sm tracking-widest uppercase
          transition-all duration-300 relative overflow-hidden
          ${file && !isLoading
            ? "bg-accent text-void cursor-pointer hover:shadow-[0_0_30px_rgba(0,229,255,0.4)]"
            : "bg-border text-muted cursor-not-allowed"
          }
        `}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-void/40 border-t-void rounded-full animate-spin" />
            Analysing document…
          </span>
        ) : (
          "Run Verification"
        )}
      </motion.button>
    </div>
  );
}
