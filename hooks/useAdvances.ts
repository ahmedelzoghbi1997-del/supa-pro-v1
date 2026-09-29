import { usePersonsData } from '../contexts/PersonsContext';
import type { Advance, Person } from '../types';

export interface UseAdvancesReturn {
  advances: Advance[];
  persons: Person[];
  activePersons: Person[];
  lastAdvanceAddedId: string | null;
  setLastAdvanceAddedId: (id: string | null) => void;
  addAdvance: (data: Omit<Advance, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateAdvance: (data: Advance) => Promise<void>;
  deleteAdvance: (id: string) => Promise<void>;
}

export const useAdvances = (): UseAdvancesReturn => {
  const {
    advances,
    persons,
    activePersons,
    lastAdvanceAddedId,
    setLastAdvanceAddedId,
    addAdvance,
    updateAdvance,
    deleteAdvance,
  } = usePersonsData();

  return {
    advances,
    persons,
    activePersons,
    lastAdvanceAddedId,
    setLastAdvanceAddedId,
    addAdvance,
    updateAdvance,
    deleteAdvance,
  };
};

export default useAdvances;
