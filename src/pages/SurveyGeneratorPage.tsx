// src/pages/SurveyGeneratorPage.tsx

import React, { useState } from 'react';
import { Plus, Users, BarChart2 } from 'lucide-react';
import SurveyGeneratorForm from '../components/surveys/SurveyGeneratorForm'; // O formulário que já criamos

// No futuro, criaremos estes componentes para as outras abas
// import SurveyResponsesView from '../components/surveys/SurveyResponsesView';
// import SurveyReportsView from '../components/surveys/SurveyReportsView';

const SurveyGeneratorPage = () => {
  const [activeTab, setActiveTab] = useState('generator');
  
  // Esta função será chamada pelo formulário quando um link for criado com sucesso.
  // No futuro, ela pode recarregar a lista de respostas.
  const handleSurveyCreated = () => {
    console.log("Novo link de pesquisa foi gerado! Atualizando a lista...");
    // Aqui poderíamos chamar uma função para recarregar os dados da aba "Respostas".
    setActiveTab('responses'); // Opcional: Mudar para a aba de respostas automaticamente
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      {/* Cabeçalho */}
      <header className="text-center space-y-2">
        {/* Garanta que você tem um logo na pasta /public */}
        <img src="/logo-quality.png" alt="Quality Frotas Logo" className="mx-auto h-16" />
        <h1 className="text-4xl font-bold font-comfortaa text-[#37255d]">
          Sistema de Satisfação Quality Frotas
        </h1>
        <p className="text-lg text-gray-600">
          Gerencie pesquisas de satisfação e colete feedback dos clientes
        </p>
      </header>
      
      {/* Navegação por Abas */}
      <div className="flex justify-center border-b max-w-4xl mx-auto">
        <button
          onClick={() => setActiveTab('generator')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors ${activeTab === 'generator' ? 'border-b-2 border-[#37255d] text-[#37255d]' : 'text-gray-500 hover:text-black'}`}
        >
          <Plus className="h-5 w-5" />
          Gerar Link
        </button>
        <button
          onClick={() => setActiveTab('responses')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors ${activeTab === 'responses' ? 'border-b-2 border-[#37255d] text-[#37255d]' : 'text-gray-500 hover:text-black'}`}
        >
          <Users className="h-5 w-5" />
          Respostas
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors ${activeTab === 'reports' ? 'border-b-2 border-[#37255d] text-[#37255d]' : 'text-gray-500 hover:text-black'}`}
        >
          <BarChart2 className="h-5 w-5" />
          Relatórios
        </button>
      </div>
      
      {/* Conteúdo da Aba Ativa */}
      <main className="max-w-4xl mx-auto">
        {activeTab === 'generator' && <SurveyGeneratorForm onSuccess={handleSurveyCreated} />}
        
        {activeTab === 'responses' && (
          <div className="text-center p-8 bg-white rounded-xl border">
            <h2 className="text-2xl font-semibold">Visualização de Respostas</h2>
            <p className="text-gray-500 mt-2">Em construção. Aqui aparecerá a tabela com os links gerados.</p>
          </div>
        )}
        
        {activeTab === 'reports' && (
          <div className="text-center p-8 bg-white rounded-xl border">
            <h2 className="text-2xl font-semibold">Dashboard de Relatórios</h2>
            <p className="text-gray-500 mt-2">Em construção. Aqui aparecerão os gráficos com os resultados das pesquisas.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default SurveyGeneratorPage;