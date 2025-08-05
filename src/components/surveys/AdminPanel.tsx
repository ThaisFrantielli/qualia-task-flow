// src/components/surveys/AdminPanel.tsx

import { useState } from "react";
import { ResponsesViewer } from "./ResponsesViewer"; // Ajustado para caminho relativo
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Plus, BarChart, Users, QrCode, Upload, Check } from "lucide-react"; // Adicionado Check
import { useToast } from "@/hooks/use-toast";
import { QRScanner } from "./QRScanner"; // Ajustado para caminho relativo
import { BulkImport } from "./BulkImport"; // Ajustado para caminho relativo
import { toast as sonnerToast } from "sonner"; // Renomeado para evitar conflito

interface LinkGeneratorProps {
  onGenerateLink: (data: {
    surveyType: string;
    clientName: string;
    vehiclePlate: string;
    email: string;
    phone: string;
  }) => Promise<string | null>; // Prop agora espera uma Promise
}

export const AdminPanel = ({ onGenerateLink }: LinkGeneratorProps) => {
  const [formData, setFormData] = useState({
    surveyType: "contract",
    clientName: "",
    driverName: "",
    driverAddedBy: "client",
    vehiclePlate: "",
    email: "",
    phone: ""
  });
  const [generatedLink, setGeneratedLink] = useState("");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [clients, setClients] = useState<Array<any>>([]);
  const [isGenerating, setIsGenerating] = useState(false); // Estado de loading para o botão
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const surveyTypes = {
    contract: "Pós-Contrato (Avaliação Comercial)",
    delivery: "Entrega do Veículo",
    maintenance: "Manutenção do Veículo", 
    return: "Devolução Definitiva"
  };

  // --- FUNÇÃO ATUALIZADA ---
  const handleGenerateLink = async () => {
    if (!formData.clientName) {
      sonnerToast.error("Nome obrigatório", {
        description: "Por favor, informe o nome do cliente.",
      });
      return;
    }
    setIsGenerating(true);

    // Chama a função async que salva no banco e retorna o link
    const link = await onGenerateLink(formData);

    if (link) { // Se a criação foi bem-sucedida e um link foi retornado
      setGeneratedLink(link);
      sonnerToast.success("Link gerado!", {
        description: "O link da pesquisa foi criado com sucesso.",
      });
    }
    // Se o link for nulo, a função pai (em SurveyAdminPage) já mostrou um toast de erro.
    setIsGenerating(false);
  };

  const copyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setIsCopied(true);
    sonnerToast.success("Link copiado!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const generateWhatsAppMessage = () => {
    // ... sua lógica de mensagem ...
  };

  const handleQRScan = (phoneNumber: string) => {
    // ... sua lógica de QR Scan ...
  };

  const handleBulkImport = (importedClients: Array<any>) => {
    // ... sua lógica de importação ...
  };

  const generateBulkLinks = () => {
    // ... sua lógica de geração em massa ...
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <img 
            src="/logo-quality.png" 
            alt="Quality Logo" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold font-comfortaa text-[#37255d]">
            Sistema de Satisfação Quality Frotas
          </h1>
        </div>

        <Tabs defaultValue="generator" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generator"><Plus className="w-4 h-4 mr-2" />Gerar Link</TabsTrigger>
            <TabsTrigger value="responses"><Users className="w-4 h-4 mr-2" />Respostas</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart className="w-4 h-4 mr-2" />Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="generator">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-comfortaa">Gerador de Links de Pesquisa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ... seus campos de formulário ... */}
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleGenerateLink}
                    className="flex-1 bg-[#37255d] hover:bg-[#2a1d4a]"
                    disabled={isGenerating}
                  >
                    {isGenerating ? 'Gerando...' : 'Gerar Link Individual'}
                  </Button>
                  <Button
                    onClick={() => setShowBulkImport(true)}
                    variant="outline"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Importar em Massa
                  </Button>
                </div>

                {generatedLink && (
                  <div className="space-y-4 p-4 bg-gray-100 rounded-lg border">
                    <Label>Link Gerado:</Label>
                    <div className="p-3 bg-white rounded border font-mono text-sm break-all">{generatedLink}</div>
                    <div className="flex gap-2">
                      <Button onClick={copyToClipboard} variant="outline">
                        {isCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                        {isCopied ? 'Copiado!' : 'Copiar Link'}
                      </Button>
                      <Button
                        onClick={generateWhatsAppMessage}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={!formData.phone}
                      >
                        Enviar por WhatsApp
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="responses">
            {/* <ResponsesViewer /> */}
            <p>Em construção</p>
          </TabsContent>

          <TabsContent value="analytics">
            {/* ... sua aba de analytics ... */}
            <p>Em construção</p>
          </TabsContent>
        </Tabs>

        {/* <QRScanner isOpen={showQRScanner} onScan={handleQRScan} onClose={() => setShowQRScanner(false)} /> */}
        {/* <BulkImport isOpen={showBulkImport} onImport={handleBulkImport} onClose={() => setShowBulkImport(false)} /> */}
      </div>
    </div>
  );
};