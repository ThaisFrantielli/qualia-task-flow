import { useState } from 'react';
import { Plus, Search, Car, Filter, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModelosVeiculos } from '@/hooks/useModelosVeiculos';
import { ModeloVeiculoTable } from '@/components/modelos/ModeloVeiculoTable';
import { ModeloVeiculoForm } from '@/components/modelos/ModeloVeiculoForm';
import { ImportModelosDialog } from '@/components/modelos/ImportModelosDialog';
import { CATEGORIAS_VEICULO } from '@/types/modelos';

export default function ModelosVeiculosPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingModeloId, setEditingModeloId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMontadora, setFilterMontadora] = useState<string>('all');
  const [filterCategoria, setFilterCategoria] = useState<string>('all');

  const { modelos, isLoading } = useModelosVeiculos();

  const filteredModelos = modelos.filter((modelo) => {
    const matchesSearch =
      modelo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      modelo.montadora.toLowerCase().includes(searchTerm.toLowerCase()) ||
      modelo.codigo?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMontadora =
      filterMontadora === 'all' || modelo.montadora === filterMontadora;

    const matchesCategoria =
      filterCategoria === 'all' || modelo.categoria === filterCategoria;

    return matchesSearch && matchesMontadora && matchesCategoria;
  });

  const uniqueMontadoras = [...new Set(modelos.map((m) => m.montadora))];

  const handleEdit = (id: string) => {
    setEditingModeloId(id);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingModeloId(null);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Car className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Catálogo de Modelos</h1>
            <p className="text-muted-foreground">
              Gerencie os modelos de veículos disponíveis para locação
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Database className="h-4 w-4 mr-2" />
            Importar do BI
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Modelo
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código ou montadora..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterMontadora} onValueChange={setFilterMontadora}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Montadora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Montadoras</SelectItem>
              {uniqueMontadoras.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              {CATEGORIAS_VEICULO.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total de Modelos</p>
          <p className="text-2xl font-bold">{modelos.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Montadoras</p>
          <p className="text-2xl font-bold">{uniqueMontadoras.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Modelos Ativos</p>
          <p className="text-2xl font-bold">
            {modelos.filter((m) => m.ativo).length}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Resultados</p>
          <p className="text-2xl font-bold">{filteredModelos.length}</p>
        </div>
      </div>

      {/* Table */}
      <ModeloVeiculoTable
        modelos={filteredModelos}
        isLoading={isLoading}
        onEdit={handleEdit}
      />

      {/* Form Dialog */}
      <ModeloVeiculoForm
        open={isFormOpen}
        onClose={handleCloseForm}
        modeloId={editingModeloId}
      />

      {/* Import Dialog */}
      <ImportModelosDialog
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </div>
  );
}
