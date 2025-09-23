import { OportunidadeList } from '@/components/OportunidadeList';

export default function OportunidadesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Oportunidades</h1>
        <p className="mt-2 text-sm text-gray-600">
          Gerencie suas oportunidades de negócio e acompanhe o progresso das conversas.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <OportunidadeList />
        </div>
      </div>
    </div>
  );
}