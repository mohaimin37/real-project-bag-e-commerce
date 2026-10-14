import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setSiteAppearance } from '../../store';
import { useConfig } from '../../hooks/useStore';

/** Keeps the store's appearance defaults (Admin → Settings → Appearance) in sync. Mount once per layout. */
export function useSiteAppearanceSync() {
  const dispatch = useDispatch();
  const { data: config } = useConfig();
  const appearance = config?.appearance;
  useEffect(() => {
    if (appearance) dispatch(setSiteAppearance(appearance));
  }, [appearance, dispatch]);
}
