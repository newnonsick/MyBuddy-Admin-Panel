'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SttModel, SttModelConfig, CoreMLConfig, SttModelDisplay } from '@/types/stt-models';
import { fetchDownloadMetadataForClient } from '@/lib/download-metadata-client';

interface SttModelFormModalProps {
  model: SttModel | null;
  adminKey: string;
  onSave: (model: SttModel) => void;
  onClose: () => void;
}

const DEFAULT_COREML: CoreMLConfig = {
  downloadUrl: '',
  archiveFileName: '',
  extractedFolderName: '',
  approximateSize: '',
  expectedMinBytes: 0,
};

const DEFAULT_CONFIG: SttModelConfig = {
  variant: '',
  quantization: null,
  coreML: { ...DEFAULT_COREML },
};

const DEFAULT_DISPLAY: SttModelDisplay = {
  name: '',
  description: '',
};

const DEFAULT_STT: SttModel = {
  id: '',
  fileName: '',
  downloadUrl: '',
  approximateSize: '',
  expectedMinBytes: 0,
  modelType: 'whisper',
  config: { ...DEFAULT_CONFIG, coreML: { ...DEFAULT_COREML } },
  display: { ...DEFAULT_DISPLAY },
};

const METADATA_DEBOUNCE_MS = 700;

export default function SttModelFormModal({ model, adminKey, onSave, onClose }: SttModelFormModalProps) {
  const isEditing = model !== null;
  const [form, setForm] = useState<SttModel>(
    model ?? { ...DEFAULT_STT, config: { ...DEFAULT_CONFIG, coreML: { ...DEFAULT_COREML } }, display: { ...DEFAULT_DISPLAY } }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const initialMainUrlRef = useRef((model?.downloadUrl ?? '').trim());
  const initialCoreMlUrlRef = useRef((model?.config?.coreML?.downloadUrl ?? '').trim());
  const lastRequestedMainUrlRef = useRef('');
  const lastRequestedCoreMlUrlRef = useRef('');
  const [mainMetadataState, setMainMetadataState] = useState<{ status: 'idle' | 'loading' | 'error' | 'success'; message: string }>({
    status: 'idle',
    message: '',
  });
  const [coreMlMetadataState, setCoreMlMetadataState] = useState<{ status: 'idle' | 'loading' | 'error' | 'success'; message: string }>({
    status: 'idle',
    message: '',
  });
  const currentMainUrl = form.downloadUrl.trim();
  const currentCoreMlUrl = form.config.coreML.downloadUrl.trim();
  const hasInvalidMainUrl = currentMainUrl.length > 0 && !isValidUrl(currentMainUrl);
  const hasInvalidCoreMlUrl = currentCoreMlUrl.length > 0 && !isValidUrl(currentCoreMlUrl);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const fetchMetadataForUrl = useCallback(async (url: string, target: 'main' | 'coreml') => {
    const setState = target === 'main' ? setMainMetadataState : setCoreMlMetadataState;
    setState({ status: 'loading', message: 'Fetching size metadata…' });

    try {
      const metadata = await fetchDownloadMetadataForClient(url, adminKey);

      if (target === 'main') {
        setForm((prev) => ({
          ...prev,
          approximateSize: prev.downloadUrl.trim() === url ? metadata.approximateSize : prev.approximateSize,
          expectedMinBytes: prev.downloadUrl.trim() === url ? metadata.expectedMinBytes : prev.expectedMinBytes,
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          config: {
            ...prev.config,
            coreML: {
              ...prev.config.coreML,
              approximateSize: prev.config.coreML.downloadUrl.trim() === url
                ? metadata.approximateSize
                : prev.config.coreML.approximateSize,
              expectedMinBytes: prev.config.coreML.downloadUrl.trim() === url
                ? metadata.expectedMinBytes
                : prev.config.coreML.expectedMinBytes,
            },
          },
        }));
      }

      setState({ status: 'success', message: `Detected ${metadata.approximateSize}` });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch metadata',
      });
    }
  }, [adminKey]);

  useEffect(() => {
    const url = form.downloadUrl.trim();
    if (!url) {
      lastRequestedMainUrlRef.current = '';
      return;
    }

    if (isEditing && url === initialMainUrlRef.current) {
      return;
    }

    try {
      new URL(url);
    } catch {
      return;
    }

    if (lastRequestedMainUrlRef.current === url) {
      return;
    }

    const timeout = setTimeout(() => {
      lastRequestedMainUrlRef.current = url;
      void fetchMetadataForUrl(url, 'main');
    }, METADATA_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [fetchMetadataForUrl, form.downloadUrl, isEditing]);

  useEffect(() => {
    const coreUrl = form.config.coreML.downloadUrl.trim();
    if (!coreUrl) {
      lastRequestedCoreMlUrlRef.current = '';
      return;
    }

    if (isEditing && coreUrl === initialCoreMlUrlRef.current) {
      return;
    }

    try {
      new URL(coreUrl);
    } catch {
      return;
    }

    if (lastRequestedCoreMlUrlRef.current === coreUrl) {
      return;
    }

    const timeout = setTimeout(() => {
      lastRequestedCoreMlUrlRef.current = coreUrl;
      void fetchMetadataForUrl(coreUrl, 'coreml');
    }, METADATA_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [fetchMetadataForUrl, form.config.coreML.downloadUrl, isEditing]);

  const updateField = <K extends keyof SttModel>(key: K, value: SttModel[K]) => {
    if (key === 'downloadUrl' && typeof value === 'string') {
      lastRequestedMainUrlRef.current = '';
      setMainMetadataState({ status: 'idle', message: '' });
    }

    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
  };

  const updateConfig = <K extends keyof SttModelConfig>(key: K, value: SttModelConfig[K]) => {
    setForm(prev => ({ ...prev, config: { ...prev.config, [key]: value } }));
  };

  const updateCoreML = <K extends keyof CoreMLConfig>(key: K, value: CoreMLConfig[K]) => {
    if (key === 'downloadUrl' && typeof value === 'string') {
      lastRequestedCoreMlUrlRef.current = '';
      setCoreMlMetadataState({ status: 'idle', message: '' });
    }

    setForm(prev => ({ ...prev, config: { ...prev.config, coreML: { ...prev.config.coreML, [key]: value } } }));
  };

  const updateDisplay = <K extends keyof SttModelDisplay>(key: K, value: SttModelDisplay[K]) => {
    setForm(prev => ({ ...prev, display: { ...prev.display, [key]: value } }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.id.trim()) errs.id = 'ID is required';
    if (!form.fileName.trim()) errs.fileName = 'File name is required';
    if (!form.downloadUrl.trim()) errs.downloadUrl = 'Download URL is required';
    if (!form.config.variant.trim()) errs['config.variant'] = 'Variant is required';
    if (!form.display.name.trim()) errs['display.name'] = 'Display name is required';
    if (!form.display.description.trim()) errs['display.description'] = 'Description is required';
    if (!form.config.coreML.downloadUrl.trim()) errs['coreML.downloadUrl'] = 'CoreML download URL required';
    if (!form.config.coreML.archiveFileName.trim()) errs['coreML.archiveFileName'] = 'Archive file name required';
    if (!form.config.coreML.extractedFolderName.trim()) errs['coreML.extractedFolderName'] = 'Extracted folder required';
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
            {isEditing ? 'Edit STT Model' : 'Add STT Model'}
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
                  className={inputClass(errors.id)} placeholder="whisper-tiny" />
              </Field>
              <Field label="File Name" error={errors.fileName}>
                <input type="text" value={form.fileName} onChange={e => updateField('fileName', e.target.value)}
                  className={inputClass(errors.fileName)} placeholder="ggml-tiny.bin" />
              </Field>
            </div>
            <Field label="Download URL" error={errors.downloadUrl}>
              <input type="text" value={form.downloadUrl} onChange={e => updateField('downloadUrl', e.target.value)}
                className={inputClass(errors.downloadUrl)} placeholder="https://..." />
            </Field>
            {hasInvalidMainUrl ? (
              <p className="text-xs text-error">Enter a valid URL to auto-fetch size metadata.</p>
            ) : mainMetadataState.status !== 'idle' && (
              <p className={`text-xs ${mainMetadataState.status === 'error' ? 'text-error' : 'text-text-muted'}`}>
                {mainMetadataState.message}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Approximate Size" error={errors.approximateSize}>
                <input type="text" value={form.approximateSize} onChange={e => updateField('approximateSize', e.target.value)}
                  className={inputClass(errors.approximateSize)} placeholder="Auto-filled when URL changes" />
              </Field>
              <Field label="Expected Min Bytes" error={errors.expectedMinBytes}>
                <input type="number" value={form.expectedMinBytes} onChange={e => updateField('expectedMinBytes', Number(e.target.value))}
                  className={inputClass(errors.expectedMinBytes)} placeholder="Auto-filled when URL changes" />
              </Field>
              <Field label="Model Type">
                <input type="text" value={form.modelType} onChange={e => updateField('modelType', e.target.value)}
                  className={inputClass()} placeholder="whisper" />
              </Field>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Display</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" error={errors['display.name']}>
                <input type="text" value={form.display.name} onChange={e => updateDisplay('name', e.target.value)}
                  className={inputClass(errors['display.name'])} placeholder="Whisper Tiny" />
              </Field>
              <Field label="Description" error={errors['display.description']}>
                <input type="text" value={form.display.description} onChange={e => updateDisplay('description', e.target.value)}
                  className={inputClass(errors['display.description'])} placeholder="A balance between..." />
              </Field>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Variant" error={errors['config.variant']}>
                <input type="text" value={form.config.variant} onChange={e => updateConfig('variant', e.target.value)}
                  className={inputClass(errors['config.variant'])} placeholder="tiny" />
              </Field>
              <Field label="Quantization (empty for null)">
                <input type="text" value={form.config.quantization ?? ''} onChange={e => {
                  const val = e.target.value.trim();
                  updateConfig('quantization', val === '' ? null : val);
                }} className={inputClass()} placeholder="null" />
              </Field>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">CoreML</h3>
            <Field label="Download URL" error={errors['coreML.downloadUrl']}>
              <input type="text" value={form.config.coreML.downloadUrl} onChange={e => updateCoreML('downloadUrl', e.target.value)}
                className={inputClass(errors['coreML.downloadUrl'])} placeholder="https://..." />
            </Field>
            {hasInvalidCoreMlUrl ? (
              <p className="text-xs text-error">Enter a valid URL to auto-fetch CoreML size metadata.</p>
            ) : coreMlMetadataState.status !== 'idle' && (
              <p className={`text-xs ${coreMlMetadataState.status === 'error' ? 'text-error' : 'text-text-muted'}`}>
                {coreMlMetadataState.message}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Archive File Name" error={errors['coreML.archiveFileName']}>
                <input type="text" value={form.config.coreML.archiveFileName} onChange={e => updateCoreML('archiveFileName', e.target.value)}
                  className={inputClass(errors['coreML.archiveFileName'])} placeholder="ggml-tiny-encoder.mlmodelc.zip" />
              </Field>
              <Field label="Extracted Folder Name" error={errors['coreML.extractedFolderName']}>
                <input type="text" value={form.config.coreML.extractedFolderName} onChange={e => updateCoreML('extractedFolderName', e.target.value)}
                  className={inputClass(errors['coreML.extractedFolderName'])} placeholder="ggml-tiny-encoder.mlmodelc" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Approximate Size">
                <input type="text" value={form.config.coreML.approximateSize} onChange={e => updateCoreML('approximateSize', e.target.value)}
                  className={inputClass()} placeholder="Auto-filled when URL changes" />
              </Field>
              <Field label="Expected Min Bytes">
                <input type="number" value={form.config.coreML.expectedMinBytes} onChange={e => updateCoreML('expectedMinBytes', Number(e.target.value))}
                  className={inputClass()} placeholder="Auto-filled when URL changes" />
              </Field>
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

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
