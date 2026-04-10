import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { importGedcom } from '../../lib/gedcom/importer';
import { useFamilyTreeStore } from '../../store';
import type { FamilyTreeData } from '../../types';

export default function GedcomImporter() {
  const { t } = useTranslation();
  const importData = useFamilyTreeStore((s) => s.importData);
  const [preview, setPreview] = useState<{ data: FamilyTreeData; personCount: number; familyCount: number; errors: string[] } | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { data, errors } = importGedcom(text);
      setPreview({
        data,
        personCount: Object.keys(data.persons).length,
        familyCount: Object.keys(data.families).length,
        errors,
      });
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/x-gedcom': ['.ged', '.gedcom'], 'text/plain': ['.ged', '.gedcom'] },
    multiple: false,
  });

  function handleImport() {
    if (!preview) return;
    importData(preview.data, mode);
    setPreview(null);
  }

  return (
    <div className="space-y-4">
      {!preview ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="text-gray-400 text-sm">
            {isDragActive ? 'Drop the GEDCOM file here...' : 'Drop a .ged file here, or click to select'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-indigo-50 rounded-lg p-3 text-sm text-indigo-800">
            Found <strong>{preview.personCount}</strong> people and <strong>{preview.familyCount}</strong> families
          </div>

          {preview.errors.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-3 text-sm text-yellow-800 space-y-1">
              {preview.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}

          <div className="flex gap-2">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" value="merge" checked={mode === 'merge'} onChange={() => setMode('merge')} />
              {t('import_mode_merge')}
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" value="replace" checked={mode === 'replace'} onChange={() => setMode('replace')} />
              {t('import_mode_replace')}
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleImport}
              className="px-4 py-1.5 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 transition-colors"
            >
              {t('import_confirm')}
            </button>
            <button
              onClick={() => setPreview(null)}
              className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t('import_cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
