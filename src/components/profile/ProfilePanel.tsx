import { useUIStore, useFamilyTreeStore } from '../../store';
import { useLocale } from '../../hooks/useLocale';
import { useTranslation } from 'react-i18next';
import { getRelatives } from '../../lib/relationships';
import DateDisplay from '../ui/DateDisplay';

export default function ProfilePanel() {
  const { t } = useTranslation();
  const { t: tl } = useLocale();
  const isOpen = useUIStore((s) => s.isProfileOpen);
  const selectedPersonId = useUIStore((s) => s.selectedPersonId);
  const closeProfile = useUIStore((s) => s.closeProfile);
  const setSelectedPerson = useUIStore((s) => s.setSelectedPerson);
  const data = useFamilyTreeStore((s) => s.data);

  const person = selectedPersonId ? data.persons[selectedPersonId] : null;
  const relatives = person ? getRelatives(person.id, data) : [];

  const relationshipKey: Record<string, string> = {
    father: 'relationship_father',
    mother: 'relationship_mother',
    partner: 'relationship_partner',
    child: 'relationship_child',
    sibling: 'relationship_sibling',
    adopted_child: 'relationship_adopted_child',
    step_child: 'relationship_step_child',
  };

  const photoPath = person?.profilePhotoId
    ? data.media[person.profilePhotoId]?.path
    : null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-20 lg:hidden"
          onClick={closeProfile}
        />
      )}

      {/* Side panel */}
      <div
        className={`
          fixed top-0 right-0 h-full w-80 bg-white dark:bg-slate-900 shadow-xl dark:shadow-slate-800/60 z-30 overflow-y-auto
          transform transition-transform duration-300 ease-in-out border-l border-gray-100 dark:border-slate-700
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {person && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 border border-violet-100 dark:border-violet-800 flex items-center justify-center flex-shrink-0">
                {photoPath ? (
                  <img
                    src={photoPath}
                    alt={`${tl(person.names.given)} ${tl(person.names.surname)}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-violet-600 dark:text-violet-300 text-sm font-bold">
                    {tl(person.names.given).charAt(0)}
                  </span>
                )}
              </div>

              <div className="flex-1">
                <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 leading-tight">
                  {tl(person.names.given)} {tl(person.names.surname)}
                  {person.names.suffix && (
                    <span className="text-gray-500 dark:text-slate-400 text-sm font-normal ml-1">{person.names.suffix}</span>
                  )}
                </h2>
                {person.names.nickname && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">née {tl(person.names.nickname)}</p>
                )}
                {person.living !== false ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    {t('living')}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-slate-500">Deceased</span>
                )}
              </div>

              <button
                onClick={closeProfile}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 text-xl leading-none transition-colors"
                aria-label={t('close')}
              >
                ×
              </button>
            </div>

            {/* Profile photo (full width) */}
            {photoPath && (
              <div className="aspect-[4/3] bg-gray-100 dark:bg-slate-800 overflow-hidden">
                <img
                  src={photoPath}
                  alt={`${tl(person.names.given)} ${tl(person.names.surname)}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex-1 p-4 space-y-4">
              {/* Life events */}
              {(person.birth || person.death) && (
                <div className="space-y-1.5">
                  {person.birth && (
                    <div className="flex gap-2 text-sm">
                      <span className="text-gray-400 dark:text-slate-500 w-12 flex-shrink-0">{t('profile_born')}</span>
                      <span className="text-gray-700 dark:text-slate-300">
                        <DateDisplay date={person.birth.date} />
                        {person.birth.place && (
                          <span className="text-gray-400 dark:text-slate-500"> · {tl(person.birth.place.display)}</span>
                        )}
                      </span>
                    </div>
                  )}
                  {person.death && (
                    <div className="flex gap-2 text-sm">
                      <span className="text-gray-400 dark:text-slate-500 w-12 flex-shrink-0">{t('profile_died')}</span>
                      <span className="text-gray-700 dark:text-slate-300">
                        <DateDisplay date={person.death.date} />
                        {person.death.place && (
                          <span className="text-gray-400 dark:text-slate-500"> · {tl(person.death.place.display)}</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Bio */}
              {person.bio && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    {t('profile_bio')}
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">{tl(person.bio)}</p>
                </div>
              )}

              {/* Relatives */}
              {relatives.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    {t('profile_relatives')}
                  </h3>
                  <div className="space-y-1">
                    {relatives.map((rel) => (
                      <button
                        key={rel.person.id}
                        onClick={() => setSelectedPerson(rel.person.id)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 text-violet-600 dark:text-violet-300 text-sm font-semibold border border-violet-100 dark:border-violet-800/40">
                          {tl(rel.person.names.given).charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                            {tl(rel.person.names.given)} {tl(rel.person.names.surname)}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">
                            {t(relationshipKey[rel.relationship] ?? rel.relationship)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {person.tags && person.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {person.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full border border-violet-100 dark:border-violet-800/40">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Photos */}
              {person.mediaIds.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    {t('profile_photos')}
                  </h3>
                  <div className="grid grid-cols-3 gap-1">
                    {person.mediaIds.map((mid) => {
                      const media = data.media[mid];
                      if (!media || media.type !== 'photo') return null;
                      return (
                        <div key={mid} className="aspect-square rounded overflow-hidden bg-gray-100 dark:bg-slate-800">
                          <img src={media.path} alt={tl(media.title)} className="w-full h-full object-cover" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
