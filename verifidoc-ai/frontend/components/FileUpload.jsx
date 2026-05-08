import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Image, AlertCircle, X, Scan, Zap } from "lucide-react";

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
    if (accepted[0]?.size > 20 * 1024 * 1024) {
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
          relative rounded-xl p-12 text-center cursor-pointer transition-all duration-300 overflow-hidden
          border-2 backdrop-blur-sm
          ${isDragActive
            ? "border-accent bg-[rgba(0,229,255,0.1)] shadow-[0_0_30px_rgba(0,229,255,0.2)]"
            : "border-border/50 bg-gradient-to-b from-panel to-surface hover:border-accent/60 hover:shadow-[0_0_20px_rgba(0,229,255,0.1)]"
          }
          ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />

        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-accent/5 to-transparent pointer-events-none" />

        <AnimatePresence mode="wait">
          {isDragActive ? (
            <motion.div
              key="drag"
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative z-10"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-block"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent/40 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(0,229,255,0.4)]">
                  <Zap className="w-8 h-8 text-void" />
                </div>
              </motion.div>
              <p className="font-sans font-700 text-accent text-lg">Release to scan document</p>
              <p className="text-sm text-accent/70 mt-2">Lightning-fast verification will begin</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative z-10"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-block p-4 rounded-full bg-accent/10 mb-4"
              >
                <Upload className="w-10 h-10 text-accent" />
              </motion.div>
              <p className="font-sans font-bold text-text text-xl mb-2">
                Upload your document
              </p>
              <p className="text-sm text-accent mb-1">
                Drop here or <span className="font-bold text-accent hover:text-white transition-colors">browse files</span>
              </p>
              <p className="text-xs text-dim">
                PDF, JPEG, PNG &nbsp;•&nbsp; Up to 20 MB
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex items-center gap-3 px-5 py-4 rounded-lg bg-[rgba(255,59,59,0.12)] border border-danger/40 text-danger text-sm font-body backdrop-blur-sm shadow-lg"
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
