import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BroadcastList } from '@/components/broadcasts/BroadcastList';
import { BroadcastForm } from '@/components/broadcasts/BroadcastForm';
import { BroadcastProgress } from '@/components/broadcasts/BroadcastProgress';
import { useBroadcasts, Broadcast } from '@/hooks/useBroadcasts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function Broadcasts() {
  const { broadcasts, loading, fetchBroadcasts, createBroadcast, startBroadcast, pauseBroadcast, resumeBroadcast, cancelBroadcast, deleteBroadcast } = useBroadcasts();
  const [showForm, setShowForm] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);

  const handleCreateSuccess = async () => {
    setShowForm(false);
    await fetchBroadcasts();
  };

  const handleAction = async (action: string, broadcast: Broadcast) => {
    switch (action) {
      case 'start':
        await startBroadcast(broadcast.id);
        break;
      case 'pause':
        await pauseBroadcast(broadcast.id);
        break;
      case 'resume':
        await resumeBroadcast(broadcast.id);
        break;
      case 'cancel':
        await cancelBroadcast(broadcast.id);
        break;
      case 'delete':
        await deleteBroadcast(broadcast.id);
        break;
      case 'view':
        setSelectedBroadcast(broadcast);
        break;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lista de Transmissão</h1>
          <p className="text-muted-foreground">
            Envie mensagens em massa pelo WhatsApp com proteção anti-banimento
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Campanha
        </Button>
      </div>

      <BroadcastList
        broadcasts={broadcasts}
        loading={loading}
        onAction={handleAction}
      />

      {/* Modal de criação */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Campanha de Transmissão</DialogTitle>
          </DialogHeader>
          <BroadcastForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowForm(false)}
            createBroadcast={createBroadcast}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de progresso */}
      <Dialog open={!!selectedBroadcast} onOpenChange={(open) => !open && setSelectedBroadcast(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBroadcast?.name}</DialogTitle>
          </DialogHeader>
          {selectedBroadcast && (
            <BroadcastProgress
              broadcast={selectedBroadcast}
              onAction={handleAction}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
