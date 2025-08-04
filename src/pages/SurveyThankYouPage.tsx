// src/pages/SurveyThankYouPage.tsx

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const SurveyThankYouPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-3xl font-bold">Obrigado(a) pela sua Avaliação!</CardTitle>
          <p className="text-muted-foreground mt-2">
            Seu feedback é muito valioso e nos ajuda a melhorar nossos serviços continuamente.
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Você pode fechar esta página agora.
          </p>
          {/* Opcional: Um botão para voltar ao site principal, se o usuário já estiver logado */}
          {/* <Link to="/" className="mt-4 inline-block text-primary hover:underline">
            Voltar ao site
          </Link> */}
        </CardContent>
      </Card>
    </div>
  );
};

export default SurveyThankYouPage;