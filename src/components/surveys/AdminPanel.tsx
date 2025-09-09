import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, BarChart, Users } from "lucide-react";

interface LinkGeneratorProps {
  onGenerateLink: (data: {
    surveyType: string;
    clientName: string;
    vehiclePlate: string;
    email: string;
    phone: string;
  }) => Promise<string | null>;
}

export const AdminPanel = ({ onGenerateLink: _ }: LinkGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    // Placeholder implementation
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#37255d]">
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
                <CardTitle>Gerador de Links de Pesquisa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button 
                  onClick={handleGenerateLink}
                  className="w-full bg-[#37255d] hover:bg-[#2a1d4a]"
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Gerando...' : 'Gerar Link Individual'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="responses">
            <Card>
              <CardContent>
                <p>Respostas em construção</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardContent>
                <p>Relatórios em construção</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};