'use client';

interface SaveButtonProps {
  onClick: () => void;
  loading: boolean;
  success: boolean;
  error: string | null;
  disabled?: boolean;
}

export default function SaveButton({ onClick, loading, success, error, disabled }: SaveButtonProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        disabled={loading || disabled}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium
                   rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
                   shadow-sm hover:shadow-md active:scale-[0.98]"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Save Changes
          </>
        )}
      </button>

      {success && (
        <span className="text-sm text-success font-medium animate-fade-in flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Saved successfully
        </span>
      )}

      {error && (
        <span className="text-sm text-error font-medium flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </span>
      )}
    </div>
  );
}
