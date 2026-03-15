export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center px-4 sm:px-6">
      <div className="max-w-lg w-full">
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 sm:p-10 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-5 sm:mb-6">
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-2">
            MyBuddy API
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mb-6 sm:mb-8 leading-relaxed">
            Model metadata API service for LLM and STT configurations.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg border border-border">
              <div className="w-2 h-2 rounded-full bg-success shrink-0" />
              <code className="text-xs sm:text-sm text-text-secondary font-mono flex-1 text-left truncate">
                GET /api/llm_models
              </code>
              <a
                href="/api/llm_models"
                className="text-xs font-medium text-primary-600 hover:text-primary-700 cursor-pointer transition-colors shrink-0"
              >
                Open →
              </a>
            </div>

            <div className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg border border-border">
              <div className="w-2 h-2 rounded-full bg-success shrink-0" />
              <code className="text-xs sm:text-sm text-text-secondary font-mono flex-1 text-left truncate">
                GET /api/stt_models
              </code>
              <a
                href="/api/stt_models"
                className="text-xs font-medium text-primary-600 hover:text-primary-700 cursor-pointer transition-colors shrink-0"
              >
                Open →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
