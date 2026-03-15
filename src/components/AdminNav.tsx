'use client';

interface AdminNavProps {
  adminKey: string;
}

export default function AdminNav({ adminKey }: AdminNavProps) {
  return (
    <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
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
          <span className="text-base sm:text-lg font-semibold text-text-primary tracking-tight">
            MyBuddy
          </span>
          <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
            Admin
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <a
            href={`/api/llm_models`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm text-text-secondary hover:text-primary-600 transition-colors duration-200 cursor-pointer hidden sm:inline"
          >
            LLM API
          </a>
          <a
            href={`/api/stt_models`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm text-text-secondary hover:text-primary-600 transition-colors duration-200 cursor-pointer hidden sm:inline"
          >
            STT API
          </a>
        </div>
      </div>
    </nav>
  );
}
