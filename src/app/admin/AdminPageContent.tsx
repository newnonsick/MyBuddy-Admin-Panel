'use client';

import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import AdminNav from '@/components/AdminNav';
import ModelTable from '@/components/ModelTable';
import JsonEditor from '@/components/JsonEditor';
import LlmModelFormModal from '@/components/LlmModelFormModal';
import SttModelFormModal from '@/components/SttModelFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { LlmModel } from '@/types/llm-models';
import type { SttModel } from '@/types/stt-models';

type Tab = 'llm' | 'stt';
type ViewMode = 'table' | 'json';

type ModalState =
  | { type: 'closed' }
  | { type: 'add-llm' }
  | { type: 'edit-llm'; index: number; model: LlmModel }
  | { type: 'add-stt' }
  | { type: 'edit-stt'; index: number; model: SttModel };

type DeleteConfirm =
  | { type: 'closed' }
  | { type: 'pending'; index: number; name: string };

const LLM_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'fileName', label: 'File Name' },
  { key: 'approximateSize', label: 'Size' },
  {
    key: 'config.type', label: 'Type', render: (v: unknown) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
        {String(v)}
      </span>
    )
  },
  { key: 'config.fileType', label: 'File Type' },
  { key: 'config.supportsFunctionCalls', label: 'Functions' },
];

const STT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'display.name', label: 'Name' },
  { key: 'fileName', label: 'File Name' },
  { key: 'approximateSize', label: 'Size' },
  { key: 'modelType', label: 'Model Type' },
  { key: 'config.variant', label: 'Variant' },
  { key: 'config.quantization', label: 'Quantization' },
];



export default function AdminPageContent() {
  const searchParams = useSearchParams();
  const adminKey = searchParams.get('key') ?? '';

  const [activeTab, setActiveTab] = useState<Tab>('llm');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [modal, setModal] = useState<ModalState>({ type: 'closed' });
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm>({ type: 'closed' });
  const [importConfirm, setImportConfirm] = useState<{ type: 'closed' } | { type: 'pending'; data: LlmModel[] | SttModel[]; tab: Tab }>({ type: 'closed' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [llmData, setLlmData] = useState<LlmModel[]>([]);
  const [sttData, setSttData] = useState<SttModel[]>([]);
  const [llmJson, setLlmJson] = useState('');
  const [sttJson, setSttJson] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const persistData = useCallback(async (tab: Tab, data: LlmModel[] | SttModel[]) => {
    setSaving(true);
    try {
      const endpoint = tab === 'llm' ? '/api/admin/update-llm-models' : '/api/admin/update-stt-models';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.details || result.error || 'Save failed');
        return false;
      }
      toast.success('Saved successfully');
      return true;
    } catch {
      toast.error('Network error');
      return false;
    } finally {
      setSaving(false);
    }
  }, [adminKey]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [llmRes, sttRes] = await Promise.all([
        fetch(`/api/llm_models?ts=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/stt_models?ts=${Date.now()}`, { cache: 'no-store' }),
      ]);
      const llm = await llmRes.json();
      const stt = await sttRes.json();
      setLlmData(llm);
      setSttData(stt);
      setLlmJson(JSON.stringify(llm, null, 2));
      setSttJson(JSON.stringify(stt, null, 2));
    } catch {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeleteRequest = (index: number) => {
    const name = activeTab === 'llm'
      ? llmData[index]?.id ?? `Model #${index + 1}`
      : (sttData[index]?.display?.name || sttData[index]?.id) ?? `Model #${index + 1}`;
    setDeleteConfirm({ type: 'pending', index, name });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.type !== 'pending') return;
    const { index } = deleteConfirm;
    setDeleteConfirm({ type: 'closed' });

    if (activeTab === 'llm') {
      const updated = llmData.filter((_, i) => i !== index);
      setLlmData(updated);
      setLlmJson(JSON.stringify(updated, null, 2));
      await persistData('llm', updated);
    } else {
      const updated = sttData.filter((_, i) => i !== index);
      setSttData(updated);
      setSttJson(JSON.stringify(updated, null, 2));
      await persistData('stt', updated);
    }
  };

  const handleEdit = (index: number) => {
    if (activeTab === 'llm') {
      setModal({ type: 'edit-llm', index, model: { ...llmData[index], config: { ...llmData[index].config } } });
    } else {
      const m = sttData[index];
      setModal({
        type: 'edit-stt', index,
        model: { ...m, config: { ...m.config, coreML: { ...m.config.coreML } }, display: { ...m.display } },
      });
    }
  };

  const handleAdd = () => {
    if (activeTab === 'llm') setModal({ type: 'add-llm' });
    else setModal({ type: 'add-stt' });
  };

  const handleLlmSave = async (model: LlmModel) => {
    let updated: LlmModel[];
    if (modal.type === 'edit-llm') {
      updated = [...llmData];
      updated[modal.index] = model;
    } else {
      updated = [...llmData, model];
    }
    setModal({ type: 'closed' });
    setLlmData(updated);
    setLlmJson(JSON.stringify(updated, null, 2));
    await persistData('llm', updated);
  };

  const handleSttSave = async (model: SttModel) => {
    let updated: SttModel[];
    if (modal.type === 'edit-stt') {
      updated = [...sttData];
      updated[modal.index] = model;
    } else {
      updated = [...sttData, model];
    }
    setModal({ type: 'closed' });
    setSttData(updated);
    setSttJson(JSON.stringify(updated, null, 2));
    await persistData('stt', updated);
  };

  const handleJsonSave = async () => {
    const jsonStr = activeTab === 'llm' ? llmJson : sttJson;
    let payload;
    try { payload = JSON.parse(jsonStr); } catch {
      toast.error('Invalid JSON syntax');
      return;
    }
    if (activeTab === 'llm') setLlmData(payload);
    else setSttData(payload);
    await persistData(activeTab, payload);
  };

  const handleJsonChange = (value: string) => {
    if (activeTab === 'llm') {
      setLlmJson(value);
      try { setLlmData(JSON.parse(value)); } catch { /* shown in editor */ }
    } else {
      setSttJson(value);
      try { setSttData(JSON.parse(value)); } catch { /* shown in editor */ }
    }
  };

  const handleExport = () => {
    const data = activeTab === 'llm' ? llmData : sttData;
    const fileName = activeTab === 'llm' ? 'llm_models.json' : 'stt_models.json';
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${fileName}`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        toast.error('Invalid JSON file');
        return;
      }

      if (!Array.isArray(parsed)) {
        toast.error('JSON must be an array of models');
        return;
      }

      setImportConfirm({ type: 'pending', data: parsed, tab: activeTab });
    } catch {
      toast.error('Failed to read file');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportConfirm = async () => {
    if (importConfirm.type !== 'pending') return;
    const { data, tab } = importConfirm;
    setImportConfirm({ type: 'closed' });

    const ok = await persistData(tab, data);
    if (ok) {
      if (tab === 'llm') {
        setLlmData(data as LlmModel[]);
        setLlmJson(JSON.stringify(data, null, 2));
      } else {
        setSttData(data as SttModel[]);
        setSttJson(JSON.stringify(data, null, 2));
      }
    }
  };

  const currentData = activeTab === 'llm' ? llmData : sttData;
  const currentJson = activeTab === 'llm' ? llmJson : sttJson;
  const currentColumns = activeTab === 'llm' ? LLM_COLUMNS : STT_COLUMNS;

  return (
    <div className="min-h-screen bg-surface-secondary">
      <AdminNav adminKey={adminKey} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">Model Management</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Manage LLM and STT model configurations for external applications.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
          <div className="flex items-center gap-1 bg-surface rounded-lg border border-border p-1">
            <button
              onClick={() => setActiveTab('llm')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${activeTab === 'llm'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
            >
              LLM Models
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'llm' ? 'bg-primary-500 text-white' : 'bg-surface-secondary text-text-muted'
                }`}>
                {llmData.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('stt')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${activeTab === 'stt'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
            >
              STT Models
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'stt' ? 'bg-primary-500 text-white' : 'bg-surface-secondary text-text-muted'
                }`}>
                {sttData.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={handleImportClick}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm font-medium text-text-secondary
                           bg-surface rounded-lg hover:bg-surface-hover transition-colors cursor-pointer border border-border"
                title="Import JSON"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="hidden sm:inline">Import</span>
              </button>

              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm font-medium text-text-secondary
                           bg-surface rounded-lg hover:bg-surface-hover transition-colors cursor-pointer border border-border"
                title="Export JSON"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Export</span>
              </button>

              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 text-sm font-medium text-primary-600
                           bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors cursor-pointer border border-primary-200"
                title="Add Model"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Add Model</span>
              </button>
            </div>

            <div className="flex items-center gap-1 bg-surface rounded-lg border border-border p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer ${viewMode === 'table'
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-text-muted hover:text-text-secondary'
                  }`}
                title="Table view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer ${viewMode === 'json'
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-text-muted hover:text-text-secondary'
                  }`}
                title="JSON editor"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <svg className="w-8 h-8 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-text-muted">Loading models…</p>
              </div>
            </div>
          ) : viewMode === 'table' ? (
            <div className="p-1">
              <ModelTable
                data={currentData as unknown as Record<string, unknown>[]}
                columns={currentColumns}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <JsonEditor
                value={currentJson}
                onChange={handleJsonChange}
                error={null}
              />
              <div className="flex justify-end">
                <button
                  onClick={handleJsonSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium
                             rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-all duration-200
                             disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
                             shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  {saving ? (
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
                      Save JSON
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0 text-xs text-text-muted">
          <div className="flex items-center gap-4">
            <span>{currentData.length} model{currentData.length !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{activeTab === 'llm' ? 'LLM' : 'STT'} Configuration</span>
          </div>
          <span className="hidden sm:inline">Data stored in /data/{activeTab === 'llm' ? 'llm_models' : 'stt_models'}.json</span>
        </div>
      </main>



      {(modal.type === 'add-llm' || modal.type === 'edit-llm') && (
        <LlmModelFormModal
          model={modal.type === 'edit-llm' ? modal.model : null}
          onSave={handleLlmSave}
          onClose={() => setModal({ type: 'closed' })}
        />
      )}
      {(modal.type === 'add-stt' || modal.type === 'edit-stt') && (
        <SttModelFormModal
          model={modal.type === 'edit-stt' ? modal.model : null}
          onSave={handleSttSave}
          onClose={() => setModal({ type: 'closed' })}
        />
      )}

      {deleteConfirm.type === 'pending' && (
        <ConfirmDialog
          title="Delete Model"
          message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm({ type: 'closed' })}
        />
      )}

      {importConfirm.type === 'pending' && (
        <ConfirmDialog
          title="Import Models"
          message={`This will replace all ${importConfirm.tab === 'llm' ? 'LLM' : 'STT'} models with ${importConfirm.data.length} model(s) from the imported file. Continue?`}
          confirmLabel="Import"
          variant="danger"
          onConfirm={handleImportConfirm}
          onCancel={() => setImportConfirm({ type: 'closed' })}
        />
      )}
    </div>
  );
}
