import { useState } from 'react';
import { useSurveyCampaigns } from '@/hooks/useSurveyCampaigns';
import { CampaignEditor } from './CampaignEditor';
import { SurveyCampaign, surveyTypeLabels } from '@/types/surveys';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';

export const SurveyCampaignsConfig = () => {
  const { campaigns, loading, createCampaign, updateCampaign, deleteCampaign } = useSurveyCampaigns();
  const [editingCampaign, setEditingCampaign] = useState<SurveyCampaign | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleSave = async (data: Partial<SurveyCampaign>) => {
    if (editingCampaign) {
      await updateCampaign(editingCampaign.id, data);
      setEditingCampaign(null);
    } else {
      await createCampaign(data);
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteCampaign(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const handleToggleActive = async (campaign: SurveyCampaign) => {
    await updateCampaign(campaign.id, { is_active: !campaign.is_active });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Campanhas de Pesquisa</CardTitle>
            <CardDescription>
              Configure modelos de pesquisa para cada tipo de interação com o cliente.
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Campanha
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>NPS</TableHead>
                <TableHead>Fatores</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma campanha configurada. Crie sua primeira campanha.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">
                      {campaign.name}
                      {campaign.description && (
                        <span className="text-xs text-muted-foreground block">
                          {campaign.description}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {surveyTypeLabels[campaign.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={campaign.is_active ? "default" : "secondary"}
                        className={campaign.is_active ? "bg-green-100 text-green-800" : ""}
                      >
                        {campaign.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {campaign.include_nps ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      {campaign.influencing_factors?.length || 0} fatores
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleToggleActive(campaign)}
                        title={campaign.is_active ? "Desativar" : "Ativar"}
                      >
                        {campaign.is_active ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setEditingCampaign(campaign)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setDeleteConfirm(campaign.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog 
        open={isCreating || !!editingCampaign} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setEditingCampaign(null);
          }
        }}
      >
        <DialogContent className="w-[90vw] md:w-[50vw] max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
            </DialogTitle>
          </DialogHeader>
          <CampaignEditor
            campaign={editingCampaign}
            onSave={handleSave}
            onCancel={() => {
              setIsCreating(false);
              setEditingCampaign(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Campanha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
