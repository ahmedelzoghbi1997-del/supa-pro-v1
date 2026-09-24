import { useData } from '../contexts/DataContext';
import type { Advance, Person, VirtualMember } from '../types';

export interface UseAdvancesReturn {
  advances: Advance[];
  hydratedAdvances: Advance[];
  lastAdvanceAddedId: string | null;
  setLastAdvanceAddedId: (id: string | null) => void;
  addAdvance: (data: Omit<Advance, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateAdvance: (data: Advance) => Promise<void>;
  deleteAdvance: (id: string) => Promise<void>;
  persons: Person[];
  activePersons: Person[];
  virtualMembers: VirtualMember[];
  addPerson: (name: string, virtual_id?: string | null, percentage?: number) => Promise<Person | null>;
  updatePerson: (id: string, name: string, virtual_id?: string | null, percentage?: number) => Promise<boolean>;
  deletePerson: (id: string) => Promise<boolean>;
}

export const useAdvances = (): UseAdvancesReturn => {
  const {
    advances,
    hydratedAdvances,
    lastAdvanceAddedId,
    setLastAdvanceAddedId,
    addAdvance,
    updateAdvance,
    deleteAdvance,
    persons,
    activePersons,
    virtualMembers,
    addPerson,
    updatePerson,
    deletePerson,
  } = useData();

  return {
    advances,
    hydratedAdvances,
    lastAdvanceAddedId,
    setLastAdvanceAddedId,
    addAdvance,
    updateAdvance,
    deleteAdvance,
    persons,
    activePersons,
    virtualMembers,
    addPerson,
    updatePerson,
    deletePerson,
  };
};

export default useAdvances;
