import { useTranslation } from 'react-i18next';
import { useFamilyTreeStore } from '../../store';
import { exportGedcom } from '../../lib/gedcom/exporter';

export default function GedcomExporter() {
  const { t } = useTranslation();
  const data = useFamilyTreeStore((s) => s.data);

  function handleExport() {
    const gedcom = exportGedcom(data);
    const blob = new Blob([gedcom], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'perez-family.ged';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="px-4 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
    >
      {t('export_gedcom')}
    </button>
  );
}
