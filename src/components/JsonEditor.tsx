'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}

const VISIBLE_LINES = 60;
const LINE_HEIGHT = 20;

export default function JsonEditor({ value, onChange, error }: JsonEditorProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);

  const lineCount = value.split('\n').length;

  const handleChange = (newValue: string) => {
    onChange(newValue);
    try {
      JSON.parse(newValue);
      setLocalError(null);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
      setLocalError(null);
    } catch {
      setLocalError('Cannot format: invalid JSON');
    }
  };

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumberRef.current) {
      lineNumberRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  useEffect(() => {
    handleScroll();
  }, [value, handleScroll]);

  const displayError = error || localError;
  const editorHeight = VISIBLE_LINES * LINE_HEIGHT;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-secondary">Raw JSON Editor</label>
        <button
          onClick={handleFormat}
          className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors
                     duration-200 cursor-pointer px-2.5 py-1 rounded-md hover:bg-primary-50"
        >
          Format JSON
        </button>
      </div>

      <div className="relative rounded-lg border border-border overflow-hidden
                      focus-within:border-border-focus focus-within:ring-2 focus-within:ring-primary-100
                      transition-all duration-200">
        <div className="flex">
          <div
            ref={lineNumberRef}
            className="py-3 px-3 bg-surface-secondary text-right select-none border-r border-border overflow-hidden shrink-0"
            style={{ height: editorHeight }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i}
                className="text-xs text-text-muted font-mono"
                style={{ height: LINE_HEIGHT, lineHeight: `${LINE_HEIGHT}px` }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onScroll={handleScroll}
            spellCheck={false}
            className="flex-1 py-3 px-3 bg-surface text-sm font-mono text-text-primary
                       resize-none outline-none w-full"
            style={{
              height: editorHeight,
              lineHeight: `${LINE_HEIGHT}px`,
            }}
          />
        </div>
      </div>

      {displayError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <svg className="w-4 h-4 text-error mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-error">{displayError}</p>
        </div>
      )}
    </div>
  );
}
