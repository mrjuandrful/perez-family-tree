import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useFamilyTreeStore } from '../../store';
import { useLocale } from '../../hooks/useLocale';

interface PersonNodeProps {
  data: { personId: string };
  selected?: boolean;
}

function PersonNode({ data, selected }: PersonNodeProps) {
  const person = useFamilyTreeStore((s) => s.data.persons[data.personId]);
  const { t } = useLocale();

  if (!person) return null;

  const fullName = `${t(person.names.given)} ${t(person.names.surname)}`;
  const birthYear = person.birth?.date?.year;
  const deathYear = person.death?.date?.year;
  const dateRange = birthYear
    ? `${birthYear}${deathYear ? ` – ${deathYear}` : person.living ? '' : ''}`
    : '';

  const photoPath = person.profilePhotoId
    ? (useFamilyTreeStore.getState().data.media[person.profilePhotoId]?.path ?? null)
    : null;

  return (
    <div
      className={`
        flex items-center gap-2 rounded-xl border bg-white px-3 py-2 shadow-sm
        transition-all cursor-pointer select-none
        ${selected ? 'border-indigo-500 shadow-indigo-100 shadow-md ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300 hover:shadow'}
      `}
      style={{ width: 180, height: 80 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-300 !border-gray-400" />
      <Handle type="source" id="right" position={Position.Right} className="!bg-gray-300 !border-gray-400" />
      <Handle type="target" id="left" position={Position.Left} className="!bg-gray-300 !border-gray-400" />

      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-indigo-50 flex items-center justify-center">
        {photoPath ? (
          <img src={photoPath} alt={fullName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-indigo-400 text-lg font-semibold">
            {t(person.names.given).charAt(0)}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{fullName}</p>
        {dateRange && (
          <p className="text-xs text-gray-400 mt-0.5">{dateRange}</p>
        )}
        {person.living && !birthYear && (
          <span className="text-xs text-green-500">Living</span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-gray-300 !border-gray-400" />
    </div>
  );
}

export default memo(PersonNode);
