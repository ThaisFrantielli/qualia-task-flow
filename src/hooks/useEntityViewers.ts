import { useEffect } from 'react';
import { usePresenceOptional } from '@/contexts/PresenceContext';

export function useEntityViewers(entityType: string, entityId: string | undefined) {
  const presence = usePresenceOptional();

  // Set current entity when viewing
  useEffect(() => {
    if (!presence || !entityId) return;

    presence.setCurrentEntity({ type: entityType, id: entityId });

    return () => {
      presence.setCurrentEntity(undefined);
    };
  }, [entityType, entityId, presence]);

  if (!presence || !entityId) {
    return {
      viewers: [],
      viewerCount: 0,
      isBeingViewed: false
    };
  }

  const viewers = presence.getUsersViewingEntity(entityType, entityId);

  return {
    viewers,
    viewerCount: viewers.length,
    isBeingViewed: viewers.length > 0
  };
}

export default useEntityViewers;
