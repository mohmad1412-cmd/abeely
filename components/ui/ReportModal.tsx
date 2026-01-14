import React, { useState } from "react";
import ReactDOM from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import {
  createReport,
  REPORT_REASONS,
  ReportReason,
} from "../../services/reportsService";
import { logger } from "../../utils/logger";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType?: "request" | "offer" | "user"; // Defaults to "request"
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetType = "request",
}) => {
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const handleSubmitReport = async () => {
    if (!reportReason) return;

    setIsSubmittingReport(true);

    try {
      const result = await createReport({
        report_type: targetType,
        target_id: targetId,
        reason: reportReason,
        description: reportDescription || undefined,
      });

      if (result.success) {
        setReportSubmitted(true);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        alert(result.error || "حدث خطأ");
      }
    } catch (error) {
      logger.error("Failed to submit report:", error);
      alert("حدث خطأ في إرسال البلاغ");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state after transition
    setTimeout(() => {
      setReportSubmitted(false);
      setReportReason(null);
      setReportDescription("");
    }, 300);
  };

  return (
    <>
      {isOpen &&
        ReactDOM.createPortal(
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmittingReport && handleClose()}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
            />

            {/* Modal - Bottom Sheet on Mobile, Centered on Desktop */}
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{
                type: "spring",
                damping: 35,
                stiffness: 400,
                mass: 0.8,
              }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.3 }}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                const velocityThreshold = 800;
                const offsetThreshold = 150;
                const shouldClose = info.offset.y > offsetThreshold ||
                  info.velocity.y > velocityThreshold;

                if (shouldClose && !isSubmittingReport) {
                  handleClose();
                }
              }}
              className="fixed inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 max-w-md w-full mx-auto bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl z-[10000] max-h-[90vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
            >
              {/* Drag Handle - أعلى البوتوم شيت - Mobile Only */}
              <div className="sm:hidden flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none shrink-0">
                <div className="w-20 h-1 bg-muted-foreground/40 dark:bg-muted-foreground/50 rounded-full transition-colors duration-200 active:bg-muted-foreground/60" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <button
                  onClick={() => !isSubmittingReport && handleClose()}
                  className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
                <h3 className="font-bold text-lg">الإبلاغ عن المحتوى</h3>
                <div className="w-9" />
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {reportSubmitted
                  ? (
                    /* Success State */
                    <div className="p-8 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                        className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/15 flex items-center justify-center"
                      >
                        <Check size={32} className="text-primary" />
                      </motion.div>
                      <h4 className="font-bold text-lg mb-2">تم إرسال البلاغ</h4>
                      <p className="text-muted-foreground text-sm">
                        شكراً لك، سنراجع البلاغ في أقرب وقت
                      </p>
                    </div>
                  )
                  : (
                    /* Form */
                    <div className="p-4 pb-4">
                      {/* Warning Icon */}
                      <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl mb-4">
                        <AlertTriangle
                          size={20}
                          className="text-red-500 shrink-0"
                        />
                        <p className="text-sm text-red-700 dark:text-red-300">
                          الإبلاغات الكاذبة قد تؤدي إلى تعليق حسابك
                        </p>
                      </div>

                      {/* Reason Selection */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">
                          سبب الإبلاغ <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                          {REPORT_REASONS.map((reason) => (
                            <button
                              key={reason.value}
                              onClick={() => setReportReason(reason.value)}
                              className={`w-full text-right px-4 py-3 rounded-xl border transition-all ${
                                reportReason === reason.value
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "bg-secondary/30 border-border hover:bg-secondary/50"
                              }`}
                            >
                              <span className="text-sm font-medium">
                                {reason.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Description (optional) */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          تفاصيل إضافية{" "}
                          <span className="text-muted-foreground">
                            (اختياري)
                          </span>
                        </label>
                        <textarea
                          value={reportDescription}
                          onChange={(e) => setReportDescription(e.target.value)}
                          placeholder="هل تريد إضافة تفاصيل أكثر عن المشكلة؟"
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background resize-none h-24 text-sm focus:outline-none focus:border-primary  transition-all placeholder:text-muted-foreground/50"
                          maxLength={500}
                        />
                        <p className="text-xs text-muted-foreground mt-1 text-left">
                          {reportDescription.length}/500
                        </p>
                      </div>
                    </div>
                  )}
              </div>

              {/* Fixed Submit Button - Outside Scrollable Area */}
              {!reportSubmitted && (
                <div className="shrink-0 p-4 pt-2 border-t border-border bg-card">
                  <button
                    onClick={handleSubmitReport}
                    disabled={!reportReason || isSubmittingReport}
                    className={`w-full py-3.5 rounded-xl font-bold text-white transition-all ${
                      reportReason && !isSubmittingReport
                        ? "bg-red-500 hover:bg-red-600 active:scale-[0.98]"
                        : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                    }`}
                  >
                    {isSubmittingReport
                      ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 size={18} className="animate-spin" />
                          جاري الإرسال...
                        </span>
                      )
                      : (
                        "إرسال البلاغ"
                      )}
                  </button>
                </div>
              )}
            </motion.div>
          </>,
          document.body,
        )}
    </>
  );
};
