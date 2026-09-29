import { useDailyLogsData } from '../contexts/DailyLogsContext';
import type { Asset } from '../types';

export interface UseAssetsReturn {
  assets: Asset[];
  addAsset: (asset: Omit<Asset, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateAsset: (asset: Asset) => Promise<void>;
  deleteAsset: (id: string) => Promise<boolean>;
}

export const useAssets = (): UseAssetsReturn => {
  const { assets, addAsset, updateAsset, deleteAsset } = useDailyLogsData();
  return { assets, addAsset, updateAsset, deleteAsset };
};

export default useAssets;
