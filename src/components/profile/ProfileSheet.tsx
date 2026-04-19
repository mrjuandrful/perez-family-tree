import { useEffect, useRef } from 'react';
import { useFamilyTreeStore } from '../../store';
import { useLocale } from '../../hooks/useLocale';
import { getRelatives } from '../../lib/relationships';
import DateDisplay from '../ui/DateDisplay';

interface Props {
  personId: string;
  onClose: () => void;
  onNavigate?: (id: string) => void;
}

const REL_LABEL: Record<string, string> = {
  father: 'Father',
  mother: 'Mother',
  partner: 'Spouse / Partner',
  ex_partner: 'Former Spouse',
  child: 'Child',
  sibling: 'Sibling',
  adopted_child: 'Adopted Child',
  step_child: 'Step Child',
};

const REL_EMOJI: Record<string, string> = {
  father: '👨',
  mother: '👩',
  partner: '💍',
  ex_partner: '👥',
  child: '👶',
  sibling: '🤝',
  adopted_child: '👶',
  step_child: '👶',
};

export default function ProfileSheet({ personId, onClose, onNavigate }: Props) {
  const { t: tl } = useLocale();
  const data = useFamilyTreeStore((s) => s.data);
  const person = data.persons[personId];
  const relatives = person ? getRelatives(personId, data) : [];
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click / escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!person) return null;

  const fullName = `${tl(person.names.given)} ${tl(person.names.surname)}`;
  const maiden = person.names.nickname ? tl(person.names.nickname) : null;
  const photoPath = person.profilePhotoId
    ? data.media[person.profilePhotoId]?.path
    : null;
  const initial = tl(person.names.given).charAt(0).toUpperCase();

  function handleRelClick(id: string) {
    if (onNavigate) {
      onNavigate(id);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={fullName}
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-4 px-5 pb-4 pt-2 flex-shrink-0 border-b border-gray-100 dark:border-slate-700">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 border-2 border-violet-200 dark:border-violet-700 flex items-center justify-center flex-shrink-0">
            {photoPath ? (
              <img src={photoPath} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-violet-600 dark:text-violet-300 text-xl font-bold">{initial}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-50 leading-tight">
              {fullName}
              {person.names.suffix && (
                <span className="text-gray-400 text-base font-normal ml-1">{person.names.suffix}</span>
              )}
            </h2>
            {maiden && (
              <p className="text-sm text-gray-400 dark:text-slate-500">née {maiden}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {person.living !== false ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Living
                </span>
              ) : (
                <span className="text-xs text-gray-400 dark:text-slate-500">Deceased</span>
              )}
              {person.tags?.map((tag) => (
                <span key={tag} className="text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded-full">
                  {tag.replace('-line', '')}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-5">

            {/* Life events */}
            {(person.birth || person.death) && (
              <div className="space-y-2">
                {person.birth && (
                  <div className="flex gap-3 items-start">
                    <span className="text-base flex-shrink-0 mt-0.5" aria-hidden="true">🎂</span>
                    <div>
                      <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wide">Born</p>
                      <p className="text-sm text-gray-800 dark:text-slate-200">
                        <DateDisplay date={person.birth.date} />
                        {person.birth.place && (
                          <span className="text-gray-400"> · {tl(person.birth.place.display)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {person.death && (
                  <div className="flex gap-3 items-start">
                    <span className="text-base flex-shrink-0 mt-0.5" aria-hidden="true">🕊️</span>
                    <div>
                      <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wide">Passed</p>
                      <p className="text-sm text-gray-800 dark:text-slate-200">
                        <DateDisplay date={person.death.date} />
                        {person.death.place && (
                          <span className="text-gray-400"> · {tl(person.death.place.display)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bio */}
            {person.bio && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Bio</p>
                <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">{tl(person.bio)}</p>
              </div>
            )}

            {/* Relatives */}
            {relatives.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">Family</p>
                <div className="space-y-1.5">
                  {relatives.map((rel) => {
                    const relName = `${tl(rel.person.names.given)} ${tl(rel.person.names.surname)}`;
                    const relInitial = tl(rel.person.names.given).charAt(0).toUpperCase();
                    const relPhoto = rel.person.profilePhotoId
                      ? data.media[rel.person.profilePhotoId]?.path
                      : null;
                    return (
                      <button
                        key={rel.person.id}
                        onClick={() => handleRelClick(rel.person.id)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 dark:active:bg-slate-700 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 flex items-center justify-center flex-shrink-0 border border-violet-100 dark:border-violet-800/40">
                          {relPhoto ? (
                            <img src={relPhoto} alt={relName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-violet-600 dark:text-violet-300 text-sm font-bold">{relInitial}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{relName}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">
                            {REL_EMOJI[rel.relationship] ?? ''} {REL_LABEL[rel.relationship] ?? rel.relationship}
                          </p>
                        </div>
                        <span className="text-gray-300 dark:text-slate-600 text-sm flex-shrink-0">›</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Photos */}
            {person.mediaIds.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">Photos</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {person.mediaIds.map((mid) => {
                    const media = data.media[mid];
                    if (!media || media.type !== 'photo') return null;
                    return (
                      <div key={mid} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700">
                        <img src={media.path} alt={tl(media.title)} className="w-full h-full object-cover" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom safe area */}
            <div className="h-6" />
          </div>
        </div>
      </div>
    </>
  );
}
