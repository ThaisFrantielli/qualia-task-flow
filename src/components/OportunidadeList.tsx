import { useOportunidades } from '@/hooks/useOportunidades';

export function OportunidadeList() {
    const { oportunidades, isLoading, error } = useOportunidades();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-red-600 bg-red-50 rounded-lg">
                <p>Error: {error.message}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {oportunidades.map((oportunidade) => (
                <div
                    key={oportunidade.id}
                    className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {oportunidade.titulo}
                            </h3>
                            <p className="text-sm text-gray-500">
                                Responsável: {oportunidade.user?.full_name || 'N/A'}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className={`px-2 py-1 text-xs rounded-full`}></span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}