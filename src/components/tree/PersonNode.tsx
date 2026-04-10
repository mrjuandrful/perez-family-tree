import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useFamilyTreeStore } from '../../store';
import { useLocale } from '../../hooks/useLocale';

interface PersonNodeProps {
  data: { personId: string };
  selected?: boolean;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(year?: number, month?: number, day?: number): string {
  if (!year) return '';
  if (month && day) return `${MONTHS[month - 1]} ${day}, ${year}`;
  if (month) return `${MONTHS[month - 1]} ${year}`;
  return `${year}`;
}

function PersonNode({ data, selected }: PersonNodeProps) {
  const person = useFamilyTreeStore((s) => s.data.persons[data.personId]);
  const { t } = useLocale();

  if (!person) return null;

  const fullName = `${t(person.names.given)} ${t(person.names.surname)}`;
  const maidenName = person.names.nickname ? t(person.names.nickname) : null;
  const birthDate = formatDate(
    person.birth?.date?.year,
    person.birth?.date?.month,
    person.birth?.date?.day,
  );
  const deathDate = formatDate(
    person.death?.date?.year,
    person.death?.date?.month,
    person.death?.date?.day,
  );

  const photoPath = person.profilePhotoId
    ? (useFamilyTreeStore.getState().data.media[person.profilePhotoId]?.path ?? null)
    : null;

  // Card height grows with content — remove fixed height so text fits
  return (
    <div
      className={`
        flex items-center gap-2 rounded-xl border bg-white dark:bg-slate-800 px-3 py-2 shadow-sm
        transition-all cursor-pointer select-none
        ${selected
          ? 'border-indigo-500 shadow-indigo-100 dark:shadow-indigo-900 shadow-md ring-2 ring-indigo-200 dark:ring-indigo-700'
          : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 hover:shadow'}
      `}
      style={{ width: 180, minHeight: 96 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-300 dark:!bg-slate-500 !border-gray-400" />
      <Handle type="source" id="right" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" id="left" position={Position.Left} style={{ opacity: 0 }} />

      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
        {photoPath ? (
          <img src={photoPath} alt={fullName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-indigo-400 dark:text-indigo-300 text-lg font-semibold">
            {t(person.names.given).charAt(0)}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 dark:text-slate-100 truncate leading-tight">{fullName}</p>
        {maidenName && (
          <p className="text-xs text-gray-400 dark:text-slate-500 leading-tight truncate">née {maidenName}</p>
        )}
        {birthDate && (
          <p className="text-xs text-gray-400 dark:text-slate-400 leading-tight">
            b. {birthDate}{deathDate ? ` – d. ${deathDate}` : ''}
          </p>
        )}
        {!birthDate && person.living && (
          <span className="text-xs text-green-500 dark:text-green-400">Living</span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
    </div>
  );
}

export default memo(PersonNode);
