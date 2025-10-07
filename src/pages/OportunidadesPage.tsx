import { useOportunidades } from '@/hooks/useOportunidades';

export default function OportunidadesPage() {
  const { oportunidades, isLoading, error } = useOportunidades();

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
          {isLoading && (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="p-4 text-red-600 bg-red-50 rounded-lg">
              <p>Error: {error.message}</p>
            </div>
          )}

          {!isLoading && !error && (
            <ul>
              {oportunidades.map((oportunidade) => (
                <li key={oportunidade.id} className="border-b py-2">
                  <p className="text-lg font-medium">{oportunidade.titulo}</p>
                  <p className="text-sm text-gray-600">{oportunidade.descricao}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}