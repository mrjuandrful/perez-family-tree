import { useFamilyTreeStore } from '../store';

export function useFamilyTree() {
  const data = useFamilyTreeStore((s) => s.data);
  const setPerson = useFamilyTreeStore((s) => s.setPerson);
  const deletePerson = useFamilyTreeStore((s) => s.deletePerson);
  const setFamily = useFamilyTreeStore((s) => s.setFamily);
  const deleteFamily = useFamilyTreeStore((s) => s.deleteFamily);
  const setMedia = useFamilyTreeStore((s) => s.setMedia);
  const deleteMedia = useFamilyTreeStore((s) => s.deleteMedia);
  const importData = useFamilyTreeStore((s) => s.importData);

  return {
    data,
    persons: data.persons,
    families: data.families,
    media: data.media,
    meta: data.meta,
    setPerson,
    deletePerson,
    setFamily,
    deleteFamily,
    setMedia,
    deleteMedia,
    importData,
  };
}
