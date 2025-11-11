// src/components/MemberRolesInfo.tsx
// Componente para explicar os papéis de membros do projeto

import { HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export const MemberRolesInfo = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" type="button">
          <HelpCircle className="w-4 h-4 text-blue-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Papéis de Membros do Projeto</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Cada membro pode ter apenas <strong>UM papel por projeto</strong>. 
            Escolha o papel com as permissões mais adequadas para cada pessoa.
          </p>

          <div className="space-y-4">
            {/* Owner */}
            <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50 rounded-r">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">👑</span>
                <h3 className="font-bold text-lg">Owner (Proprietário)</h3>
              </div>
              <p className="text-sm mb-2"><strong>Quem recebe:</strong> Criador do projeto (automático)</p>
              <div className="space-y-1 text-sm">
                <p className="text-green-700">✅ Pode fazer TUDO no projeto</p>
                <p className="text-green-700">✅ Pode deletar o projeto</p>
                <p className="text-green-700">✅ Gerencia todos os membros</p>
                <p className="text-green-700">✅ Edita configurações do projeto</p>
              </div>
            </div>

            {/* Aprovador */}
            <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50 rounded-r">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✅</span>
                <h3 className="font-bold text-lg">Aprovador</h3>
              </div>
              <p className="text-sm mb-2">
                <strong>Quando usar:</strong> Gerentes, coordenadores, pessoas que precisam 
                validar entregas e também colaborar ativamente.
              </p>
              <div className="space-y-1 text-sm">
                <p className="text-green-700">✅ Cria e edita tarefas</p>
                <p className="text-green-700">✅ Aprova conclusões de tarefas</p>
                <p className="text-green-700">✅ Muda status de tarefas</p>
                <p className="text-green-700">✅ Vê todas as tarefas do projeto</p>
                <p className="text-green-700">✅ Comenta e interage</p>
                <p className="text-red-700">❌ Não pode deletar o projeto</p>
                <p className="text-red-700">❌ Não pode remover o owner</p>
              </div>
              <div className="mt-2 p-2 bg-blue-100 rounded text-xs">
                <strong>💡 Dica:</strong> Se alguém precisa colaborar E aprovar, use este papel!
              </div>
            </div>

            {/* Colaborador */}
            <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">👤</span>
                <h3 className="font-bold text-lg">Colaborador</h3>
              </div>
              <p className="text-sm mb-2">
                <strong>Quando usar:</strong> Equipe de execução, desenvolvedores, designers, 
                pessoas que trabalham ativamente mas não precisam aprovar.
              </p>
              <div className="space-y-1 text-sm">
                <p className="text-green-700">✅ Cria e edita tarefas</p>
                <p className="text-green-700">✅ Atualiza status das próprias tarefas</p>
                <p className="text-green-700">✅ Vê todas as tarefas do projeto</p>
                <p className="text-green-700">✅ Comenta e interage</p>
                <p className="text-red-700">❌ Não aprova conclusões formais</p>
                <p className="text-red-700">❌ Não gerencia membros</p>
              </div>
            </div>

            {/* Leitor */}
            <div className="border-l-4 border-gray-500 pl-4 py-2 bg-gray-50 rounded-r">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">👁️</span>
                <h3 className="font-bold text-lg">Leitor</h3>
              </div>
              <p className="text-sm mb-2">
                <strong>Quando usar:</strong> Stakeholders, clientes, observadores que 
                precisam acompanhar o progresso mas não vão trabalhar diretamente.
              </p>
              <div className="space-y-1 text-sm">
                <p className="text-green-700">✅ Visualiza o projeto e tarefas</p>
                <p className="text-green-700">✅ Vê comentários e atualizações</p>
                <p className="text-red-700">❌ Não cria nem edita nada</p>
                <p className="text-red-700">❌ Não pode comentar</p>
                <p className="text-red-700">❌ Apenas observa</p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-bold mb-2">❓ Perguntas Frequentes</h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold">Posso ter múltiplos papéis?</p>
                <p className="text-gray-600">
                  Não. Cada pessoa tem apenas UM papel por projeto. Se precisar de múltiplas 
                  capacidades, escolha o papel mais alto (Aprovador &gt; Colaborador &gt; Leitor).
                </p>
              </div>

              <div>
                <p className="font-semibold">Aprovador pode colaborar?</p>
                <p className="text-gray-600">
                  Sim! Aprovador tem TODAS as permissões de Colaborador, mais a capacidade de aprovar. 
                  É o papel ideal para gerentes que também trabalham nas tarefas.
                </p>
              </div>

              <div>
                <p className="font-semibold">Posso mudar o papel depois?</p>
                <p className="text-gray-600">
                  Sim! O Owner pode editar os papéis dos membros a qualquer momento.
                </p>
              </div>

              <div>
                <p className="font-semibold">Preciso adicionar membros?</p>
                <p className="text-gray-600">
                  Não é obrigatório. O owner é adicionado automaticamente. Adicione membros 
                  apenas se outras pessoas precisarem acessar o projeto.
                </p>
              </div>
            </div>
          </div>

          {/* Recomendações */}
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
            <p className="font-bold mb-2">💡 Recomendações de Uso:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Projetos pequenos:</strong> 1 Owner + Colaboradores</li>
              <li><strong>Projetos médios:</strong> 1 Owner + 1-2 Aprovadores + Colaboradores</li>
              <li><strong>Projetos grandes:</strong> 1 Owner + Aprovadores por área + Colaboradores + Leitores (stakeholders)</li>
              <li><strong>Cliente externo:</strong> Adicione como Leitor para acompanhar progresso</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
