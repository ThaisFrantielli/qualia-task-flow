import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import comercial from './comercial';

const ALL_MODULES = [comercial];

export type AppModule = typeof comercial;

async function fetchActiveModuleKeys(): Promise<string[] | null> {
  try {
    const { data, error } = await supabase.from('modules').select('key,is_active');
    if (error || !data) return null;
    return data.filter((r: any) => r.is_active).map((r: any) => r.key);
  } catch {
    return null;
  }
}

export function useEnabledModules() {
  const [enabled, setEnabled] = useState(AppModule[] | null>(null as any);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const activeKeys = await fetchActiveModuleKeys();
      let enabledList = ALL_MODULES.filter((m: any) => m.defaultEnabled);
      if (activeKeys && Array.isArray(activeKeys)) {
        enabledList = ALL_MODULES.filter((m: any) => activeKeys.includes(m.key));
      }
      if (mounted) setEnabled(enabledList);
    })();

    return () => { mounted = false; };
  }, []);

  return enabled;
}

export { ALL_MODULES };
