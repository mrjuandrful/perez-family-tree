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

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={closeProfile}
        />
      )}

      {/* Panel */}
      <div
        className={`
          fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-30 overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {person && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-start gap-3">
              <div className="flex-1">
                <h2 className="text-base font-bold text-gray-900 leading-tight">
                  {tl(person.names.given)} {tl(person.names.surname)}
                  {person.names.suffix && <span className="text-gray-500 text-sm ml-1">{person.names.suffix}</span>}
                </h2>
                {person.names.nickname && (
                  <p className="text-xs text-gray-400 mt-0.5">"{tl(person.names.nickname)}"</p>
                )}
                {person.living && (
                  <span className="text-xs text-green-600 font-medium">{t('living')}</span>
                )}
              </div>
              <button
                onClick={closeProfile}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-0.5"
                aria-label={t('close')}
              >
                ×
              </button>
            </div>

            {/* Profile photo */}
            {person.profilePhotoId && data.media[person.profilePhotoId] && (
              <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                <img
                  src={data.media[person.profilePhotoId].path}
                  alt={`${tl(person.names.given)} ${tl(person.names.surname)}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex-1 p-4 space-y-4">
              {/* Life events */}
              <div className="space-y-1.5">
                {person.birth && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-gray-400 w-12 flex-shrink-0">{t('profile_born')}</span>
                    <span className="text-gray-700">
                      <DateDisplay date={person.birth.date} />
                      {person.birth.place && (
                        <span className="text-gray-400"> · {tl(person.birth.place.display)}</span>
                      )}
                    </span>
                  </div>
                )}
                {person.death && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-gray-400 w-12 flex-shrink-0">{t('profile_died')}</span>
                    <span className="text-gray-700">
                      <DateDisplay date={person.death.date} />
                      {person.death.place && (
                        <span className="text-gray-400"> · {tl(person.death.place.display)}</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Bio */}
              {person.bio && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {t('profile_bio')}
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{tl(person.bio)}</p>
                </div>
              )}

              {/* Relatives */}
              {relatives.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {t('profile_relatives')}
                  </h3>
                  <div className="space-y-1.5">
                    {relatives.map((rel) => (
                      <button
                        key={rel.person.id}
                        onClick={() => setSelectedPerson(rel.person.id)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-400 text-sm font-semibold">
                          {tl(rel.person.names.given).charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {tl(rel.person.names.given)} {tl(rel.person.names.surname)}
                          </p>
                          <p className="text-xs text-gray-400">{t(relationshipKey[rel.relationship])}</p>
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
                    <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Photos */}
              {person.mediaIds.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {t('profile_photos')}
                  </h3>
                  <div className="grid grid-cols-3 gap-1">
                    {person.mediaIds.map((mid) => {
                      const media = data.media[mid];
                      if (!media || media.type !== 'photo') return null;
                      return (
                        <div key={mid} className="aspect-square rounded overflow-hidden bg-gray-100">
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
