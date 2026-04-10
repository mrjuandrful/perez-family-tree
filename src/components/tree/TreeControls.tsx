import { useReactFlow } from '@xyflow/react';
import { useTranslation } from 'react-i18next';

export default function TreeControls() {
  const { t } = useTranslation();
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
      <button
        onClick={() => zoomIn()}
        className="w-8 h-8 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-600 text-lg"
        title={t('zoom_in')}
      >
        +
      </button>
      <button
        onClick={() => zoomOut()}
        className="w-8 h-8 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-600 text-lg"
        title={t('zoom_out')}
      >
        −
      </button>
      <button
        onClick={() => fitView({ padding: 0.1 })}
        className="w-8 h-8 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-600 text-xs font-bold"
        title={t('fit_view')}
      >
        ⊡
      </button>
    </div>
  );
}
