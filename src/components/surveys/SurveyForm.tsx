import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./StarRating";
import { NPSRating } from "./NPSRating";
import { dateToLocalISO } from "@/lib/dateUtils";
import { useToast } from "@/hooks/use-toast";

interface SurveyQuestion {
  id: string;
  type: "star" | "multiple" | "nps" | "text";
  question: string;
  options?: string[];
  required?: boolean;
}

interface SurveyFormProps {
  surveyType: "contract" | "delivery" | "maintenance" | "return";
  questions: SurveyQuestion[];
  clientName?: string;
  vehiclePlate?: string;
  onSubmit: (data: any) => void;
}

const surveyTitles = {
  contract: "Avaliação Comercial",
  delivery: "Avaliação de Entrega",
  maintenance: "Avaliação de Manutenção", 
  return: "Avaliação de Devolução"
};

export const SurveyForm = ({ 
  surveyType, 
  questions, 
  clientName, 
  vehiclePlate, 
  onSubmit 
}: SurveyFormProps) => {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [customerInfo, setCustomerInfo] = useState({
    name: clientName || "",
    email: "",
    phone: "",
    plate: vehiclePlate || ""
  });
  const { toast } = useToast();

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredQuestions = questions.filter(q => q.required);
    const missingResponses = requiredQuestions.filter(q => !responses[q.id]);
    
    if (missingResponses.length > 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, responda todas as perguntas obrigatórias.",
        variant: "destructive",
      });
      return;
    }

    if (!customerInfo.name || !customerInfo.email) {
      toast({
        title: "Informações incompletas",
        description: "Por favor, preencha nome e email.",
        variant: "destructive",
      });
      return;
    }

    const surveyData = {
      surveyType,
      customerInfo,
      responses,
      timestamp: dateToLocalISO(new Date()),
    };

    onSubmit(surveyData);
    
    toast({
      title: "Avaliação enviada!",
      description: "Muito obrigado pelo seu feedback.",
    });
  };

  const renderQuestion = (question: SurveyQuestion) => {
    switch (question.type) {
      case "star":
        return (
          <StarRating
            value={responses[question.id] || 0}
            onChange={(value) => handleResponseChange(question.id, value)}
          />
        );
        
      case "nps":
        return (
          <NPSRating
            value={responses[question.id] ?? -1}
            onChange={(value) => handleResponseChange(question.id, value)}
          />
        );
        
      case "multiple":
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={responses[question.id] === option}
                  onChange={(e) => handleResponseChange(question.id, e.target.value)}
                  className="w-4 h-4 text-quality-orange"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );
        
      case "text":
        return (
          <Textarea
            value={responses[question.id] || ""}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Compartilhe sua experiência..."
            className="min-h-20"
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-quality-gray-light p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-quality">
          <CardHeader className="text-center bg-gradient-to-r from-quality-purple to-quality-orange text-white rounded-t-lg">
            <div className="flex justify-center mb-4">
              <img 
                src="/lovable-uploads/e2535d3f-7e8b-4f39-ab1e-60273a250f23.png" 
                alt="Quality Logo" 
                className="h-12"
              />
            </div>
            <CardTitle className="text-2xl font-heading">
              {surveyTitles[surveyType]}
            </CardTitle>
            <p className="text-white/90">
              Sua opinião é muito importante para nós!
            </p>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-quality-text">
                  Suas informações
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Titular do Contrato *</Label>
                    <Input
                      id="name"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({
                        ...prev,
                        name: e.target.value
                      }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo(prev => ({
                        ...prev,
                        email: e.target.value
                      }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({
                        ...prev,
                        phone: e.target.value
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="plate">Placa do Veículo</Label>
                    <Input
                      id="plate"
                      value={customerInfo.plate}
                      onChange={(e) => setCustomerInfo(prev => ({
                        ...prev,
                        plate: e.target.value
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Survey Questions */}
              {questions.map((question, index) => (
                <div key={question.id} className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-quality-text">
                      {index + 1}. {question.question}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    {renderQuestion(question)}
                  </div>
                </div>
              ))}

              <Button 
                type="submit" 
                className="w-full bg-quality-orange hover:bg-quality-orange/90 text-white font-semibold py-3 text-lg"
              >
                Enviar Avaliação
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};