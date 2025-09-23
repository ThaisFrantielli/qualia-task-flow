import { useOportunidades } from '@/contexts/OportunidadeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function OportunidadeList() {
    const { oportunidades, loading, error, pagination, fetchOportunidades } = useOportunidades();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-red-600 bg-red-50 rounded-lg">
                <p>Error: {error}</p>
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
                                Responsável: {oportunidade.user.name}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                                oportunidade.status === 'aberta'
                                    ? 'bg-green-100 text-green-800'
                                    : oportunidade.status === 'fechada'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                {oportunidade.status.charAt(0).toUpperCase() + oportunidade.status.slice(1)}
                            </span>
                            <p className="mt-1 text-sm font-medium text-gray-900">
                                R$ {parseFloat(oportunidade.valor_total).toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2
                                })}
                            </p>
                        </div>
                    </div>

                    {oportunidade.latest_message && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-md">
                            <div className="flex justify-between items-start">
                                <p className="text-sm text-gray-600">
                                    {oportunidade.latest_message.content}
                                </p>
                                <span className="text-xs text-gray-400">
                                    {format(new Date(oportunidade.latest_message.created_at), "d 'de' MMMM", {
                                        locale: ptBR,
                                    })}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                        <div className="flex space-x-4">
                            <span>{oportunidade.messages_count} mensagens</span>
                            <span>{oportunidade.produtos_count} produtos</span>
                        </div>
                        <span>
                            Criada em{' '}
                            {format(new Date(oportunidade.created_at), "d 'de' MMMM 'de' yyyy", {
                                locale: ptBR,
                            })}
                        </span>
                    </div>
                </div>
            ))}

            {pagination && pagination.last_page > 1 && (
                <div className="mt-4 flex justify-center space-x-2">
                    {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map((page) => (
                        <button
                            key={page}
                            onClick={() => fetchOportunidades(page)}
                            className={`px-3 py-1 rounded ${
                                page === pagination.current_page
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {page}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}