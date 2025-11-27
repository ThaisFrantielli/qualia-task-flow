import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BulkImportProps {
  onImport: (clients: Array<{
    name: string;
    phone: string;
    email?: string;
    plate?: string;
  }>) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const BulkImport = ({ onImport, onClose, isOpen }: BulkImportProps) => {
  const [csvData, setCsvData] = useState('');
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvData(content);
      };
      reader.readAsText(file);
    }
  };

  const downloadTemplate = () => {
    const template = 'Nome,WhatsApp,Email,Placa\n"João Silva","(11) 99999-9999","joao@email.com","ABC-1234"\n"Maria Santos","(11) 88888-8888","maria@email.com","XYZ-5678"';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_clientes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = () => {
    if (!csvData.trim()) {
      toast({
        title: "Dados inválidos",
        description: "Por favor, adicione os dados CSV.",
        variant: "destructive",
      });
      return;
    }

    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      
      const clients = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim());
        const client: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index];
          if (header.includes('nome')) client.name = value;
          if (header.includes('whatsapp') || header.includes('telefone')) client.phone = value;
          if (header.includes('email')) client.email = value;
          if (header.includes('placa')) client.plate = value;
        });
        
        return client;
      }).filter(client => client.name && client.phone);

      if (clients.length === 0) {
        toast({
          title: "Nenhum cliente válido",
          description: "Verifique se os dados possuem Nome e WhatsApp preenchidos.",
          variant: "destructive",
        });
        return;
      }

      onImport(clients);
      toast({
        title: "Importação concluída",
        description: `${clients.length} clientes importados com sucesso.`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Erro na importação",
        description: "Verifique o formato dos dados e tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importação em Massa
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Baixar Template
              </Button>
              <div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <Label htmlFor="csv-upload">
                  <Button variant="outline" className="cursor-pointer">
                    Carregar CSV
                  </Button>
                </Label>
              </div>
            </div>
            
            <div>
              <Label htmlFor="csv-data">Dados CSV (Nome,WhatsApp,Email,Placa)</Label>
              <Textarea
                id="csv-data"
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder={`Nome,WhatsApp,Email,Placa\n"João Silva","(11) 99999-9999","joao@email.com","ABC-1234"\n"Maria Santos","(11) 88888-8888","maria@email.com","XYZ-5678"`}
                className="min-h-32 font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={parseCSV} className="bg-quality-purple hover:bg-quality-purple/90">
              Importar Clientes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};