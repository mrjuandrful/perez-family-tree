import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFamilyTreeStore, useUIStore } from '../store';
import TreePage from './TreePage';

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const persons = useFamilyTreeStore((s) => s.data.persons);
  const setSelectedPerson = useUIStore((s) => s.setSelectedPerson);
  const setFocusPerson = useUIStore((s) => s.setFocusPerson);

  useEffect(() => {
    if (!id || !persons[id]) {
      navigate('/', { replace: true });
      return;
    }
    setSelectedPerson(id);
    setFocusPerson(id);
  }, [id, persons, setSelectedPerson, setFocusPerson, navigate]);

  return <TreePage />;
}
