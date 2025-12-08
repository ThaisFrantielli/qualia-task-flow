import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

// Exemplo de páginas disponíveis (ideal: buscar dinamicamente)
const availablePages = [
  { key: 'dashboard', name: 'Dashboard', route: '/dashboard' },
  { key: 'tasks', name: 'Tarefas', route: '/tasks' },
  { key: 'crm', name: 'CRM', route: '/crm' },
  { key: 'analytics', name: 'Analytics', route: '/analytics' },
  { key: 'team', name: 'Equipe', route: '/equipe' },
  { key: 'settings', name: 'Configurações', route: '/settings' },
  // Adicione outras páginas conforme necessário
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    key: string;
    description: string;
    icon: string;
    display_order: number;
    route: string;
    pages: string[]; // keys das páginas selecionadas
  }) => void;
}

const ModuleCreateDialog: React.FC<Props> = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Box');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [route, setRoute] = useState('');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);

  const handleTogglePage = (pageKey: string) => {
    setSelectedPages(prev =>
      prev.includes(pageKey)
        ? prev.filter(k => k !== pageKey)
        : [...prev, pageKey]
    );
  };

  const handleSubmit = () => {
    onCreate({
      name,
      key,
      description,
      icon,
      display_order: displayOrder,
      route,
      pages: selectedPages,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Módulo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input
            className="input"
            placeholder="Nome do Módulo"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Chave Única"
            value={key}
            onChange={e => setKey(e.target.value)}
          />
          <input
            className="input"
            placeholder="Ícone (Lucide)"
            value={icon}
            onChange={e => setIcon(e.target.value)}
          />
          <input
            className="input"
            placeholder="Rota principal"
            value={route}
            onChange={e => setRoute(e.target.value)}
          />
          <textarea
            className="input"
            placeholder="Descrição"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <input
            className="input"
            type="number"
            placeholder="Ordem de Exibição"
            value={displayOrder}
            onChange={e => setDisplayOrder(Number(e.target.value))}
          />

          <div>
            <div className="font-semibold mb-2">Páginas disponíveis</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availablePages.map(page => (
                <label key={page.key} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedPages.includes(page.key)}
                    onCheckedChange={() => handleTogglePage(page.key)}
                  />
                  <span>{page.name} <span className="text-xs text-muted-foreground">{page.route}</span></span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Criar Módulo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModuleCreateDialog;
