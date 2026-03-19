'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { LlmModel, LlmModelConfig } from '@/types/llm-models';
import { LLM_MODEL_TYPES, FILE_TYPES } from '@/types/llm-models';

interface LlmModelFormModalProps {
  model: LlmModel | null;
  adminKey: string;
  onSave: (model: LlmModel) => void;
  onClose: () => void;
}

const DEFAULT_CONFIG: LlmModelConfig = {
  type: 'general',
  maxTokens: 4096,
  tokenBuffer: 3584,
  randomSeed: 1,
  temperature: 0.8,
  topK: 1,
  topP: null,
  isThinking: false,
  supportsFunctionCalls: true,
  fileType: 'task',
};

const DEFAULT_LLM: LlmModel = {
  id: '',
  fileName: '',
  downloadUrl: '',
  approximateSize: '',
  expectedMinBytes: 0,
  config: { ...DEFAULT_CONFIG },
};

export default function LlmModelFormModal({ model, adminKey, onSave, onClose }: LlmModelFormModalProps) {
  const isEditing = model !== null;
  const [form, setForm] = useState<LlmModel>(model ?? { ...DEFAULT_LLM, config: { ...DEFAULT_CONFIG } });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const initialDownloadUrlRef = useRef((model?.downloadUrl ?? '').trim());
  const skipInitialEditFetchRef = useRef(isEditing);
  const [metadataState, setMetadataState] = useState<{ status: 'idle' | 'loading' | 'error' | 'success'; message: string }>({
    status: 'idle',
    message: '',
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const fetchMetadataForUrl = useCallback(async (url: string) => {
    setMetadataState({ status: 'loading', message: 'Fetching size metadata…' });

    try {
      const response = await fetch('/api/download-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to fetch metadata');
      }

      const metadata = result.metadata as { approximateSize: string; expectedMinBytes: number };
      setForm((prev) => ({
        ...prev,
        approximateSize: prev.downloadUrl.trim() === url ? metadata.approximateSize : prev.approximateSize,
        expectedMinBytes: prev.downloadUrl.trim() === url ? metadata.expectedMinBytes : prev.expectedMinBytes,
      }));
      setMetadataState({ status: 'success', message: `Detected ${metadata.approximateSize}` });
    } catch (error) {
      setMetadataState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch metadata',
      });
    }
  }, [adminKey]);

  useEffect(() => {
    const url = form.downloadUrl.trim();
    if (!url) {
      setMetadataState({ status: 'idle', message: '' });
      return;
    }

    if (skipInitialEditFetchRef.current && url === initialDownloadUrlRef.current) {
      skipInitialEditFetchRef.current = false;
      return;
    }

    skipInitialEditFetchRef.current = false;

    try {
      new URL(url);
    } catch {
      setMetadataState({ status: 'error', message: 'Enter a valid URL to auto-fetch size metadata.' });
      return;
    }

    const timeout = setTimeout(() => {
      void fetchMetadataForUrl(url);
    }, 500);

    return () => clearTimeout(timeout);
  }, [fetchMetadataForUrl, form.downloadUrl, isEditing]);

  const updateField = <K extends keyof LlmModel>(key: K, value: LlmModel[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
  };

  const updateConfig = <K extends keyof LlmModelConfig>(key: K, value: LlmModelConfig[K]) => {
    setForm(prev => ({ ...prev, config: { ...prev.config, [key]: value } }));
    setErrors(prev => { const next = { ...prev }; delete next[`config.${key}`]; return next; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.id.trim()) errs.id = 'ID is required';
    if (!form.fileName.trim()) errs.fileName = 'File name is required';
    if (!form.downloadUrl.trim()) errs.downloadUrl = 'Download URL is required';
    if (form.config.maxTokens <= 0) errs['config.maxTokens'] = 'Must be positive';
    if (form.config.tokenBuffer <= 0) errs['config.tokenBuffer'] = 'Must be positive';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-surface rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-surface z-10 px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between rounded-t-2xl">
          <h2 className="text-base sm:text-lg font-semibold text-text-primary">
            {isEditing ? 'Edit LLM Model' : 'Add LLM Model'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer text-text-muted hover:text-text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="ID" error={errors.id}>
                <input type="text" value={form.id} onChange={e => updateField('id', e.target.value)}
                  className={inputClass(errors.id)} placeholder="model-id" />
              </Field>
              <Field label="File Name" error={errors.fileName}>
                <input type="text" value={form.fileName} onChange={e => updateField('fileName', e.target.value)}
                  className={inputClass(errors.fileName)} placeholder="model.task" />
              </Field>
            </div>
            <Field label="Download URL" error={errors.downloadUrl}>
              <input type="text" value={form.downloadUrl} onChange={e => updateField('downloadUrl', e.target.value)}
                className={inputClass(errors.downloadUrl)} placeholder="https://..." />
            </Field>
            {metadataState.status !== 'idle' && (
              <p className={`text-xs ${metadataState.status === 'error' ? 'text-error' : 'text-text-muted'}`}>
                {metadataState.message}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Approximate Size" error={errors.approximateSize}>
                <input type="text" value={form.approximateSize} onChange={e => updateField('approximateSize', e.target.value)}
                  className={inputClass(errors.approximateSize)} placeholder="Auto-filled when URL changes" />
              </Field>
              <Field label="Expected Min Bytes" error={errors.expectedMinBytes}>
                <input type="number" value={form.expectedMinBytes} onChange={e => updateField('expectedMinBytes', Number(e.target.value))}
                  className={inputClass(errors.expectedMinBytes)} placeholder="Auto-filled when URL changes" />
              </Field>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Type">
                <select value={form.config.type} onChange={e => updateConfig('type', e.target.value as LlmModelConfig['type'])}
                  className={inputClass()}>
                  {LLM_MODEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="File Type">
                <select value={form.config.fileType} onChange={e => updateConfig('fileType', e.target.value as LlmModelConfig['fileType'])}
                  className={inputClass()}>
                  {FILE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Max Tokens" error={errors['config.maxTokens']}>
                <input type="number" value={form.config.maxTokens} onChange={e => updateConfig('maxTokens', Number(e.target.value))}
                  className={inputClass(errors['config.maxTokens'])} />
              </Field>
              <Field label="Token Buffer" error={errors['config.tokenBuffer']}>
                <input type="number" value={form.config.tokenBuffer} onChange={e => updateConfig('tokenBuffer', Number(e.target.value))}
                  className={inputClass(errors['config.tokenBuffer'])} />
              </Field>
              <Field label="Random Seed">
                <input type="number" value={form.config.randomSeed} onChange={e => updateConfig('randomSeed', Number(e.target.value))}
                  className={inputClass()} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Temperature">
                <input type="number" step="0.1" min="0" max="2" value={form.config.temperature}
                  onChange={e => updateConfig('temperature', Number(e.target.value))} className={inputClass()} />
              </Field>
              <Field label="Top K">
                <input type="number" min="0" value={form.config.topK}
                  onChange={e => updateConfig('topK', Number(e.target.value))} className={inputClass()} />
              </Field>
              <Field label="Top P (null if empty)">
                <input type="text" value={form.config.topP === null ? '' : String(form.config.topP)}
                  onChange={e => {
                    const val = e.target.value.trim();
                    updateConfig('topP', val === '' ? null : Number(val));
                  }}
                  className={inputClass()} placeholder="null" />
              </Field>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.config.isThinking}
                  onChange={e => updateConfig('isThinking', e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500 cursor-pointer" />
                <span className="text-sm text-text-primary">Is Thinking</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.config.supportsFunctionCalls}
                  onChange={e => updateConfig('supportsFunctionCalls', e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500 cursor-pointer" />
                <span className="text-sm text-text-primary">Supports Function Calls</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-border">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 sm:py-2 text-sm font-medium text-text-secondary hover:text-text-primary
                         rounded-lg hover:bg-surface-hover transition-colors cursor-pointer text-center">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2.5 sm:py-2 text-sm font-medium text-white bg-primary-600 rounded-lg
                         hover:bg-primary-700 active:bg-primary-800 transition-all shadow-sm
                         hover:shadow-md active:scale-[0.98] cursor-pointer">
              {isEditing ? 'Update Model' : 'Add Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}

function inputClass(error?: string): string {
  return `w-full px-3 py-2 text-sm bg-surface border rounded-lg outline-none transition-all duration-200
    ${error ? 'border-error focus:ring-2 focus:ring-red-100' : 'border-border focus:border-border-focus focus:ring-2 focus:ring-primary-100'}`;
}
