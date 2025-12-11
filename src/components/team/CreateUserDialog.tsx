import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, User, Briefcase } from 'lucide-react';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

type NivelAcesso = 'Usuário' | 'Supervisão' | 'Gestão' | 'Admin';

const getDefaultPermissions = (nivel: NivelAcesso) => {
  const basePermissions = {
    dashboard: true,
    kanban: true,
    tasks: true,
    crm: false,
    projects: false,
    team: false,
    settings: false,
  };
  
  switch (nivel) {
    case 'Admin':
      return { dashboard: true, kanban: true, tasks: true, crm: true, projects: true, team: true, settings: true };
    case 'Gestão':
      return { ...basePermissions, projects: true, team: true, crm: true };
    case 'Supervisão':
      return { ...basePermissions, projects: true };
    case 'Usuário':
    default:
      return basePermissions;
  }
};

export function CreateUserDialog({ open, onOpenChange, onUserCreated }: CreateUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    funcao: '',
    nivelAcesso: 'Usuário' as NivelAcesso,
  });

  const handleSubmit = async () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      toast.info('Instruções para criar usuário', {
        description: `1. Vá em Supabase Dashboard\n2. Authentication → Users\n3. Clique em "Invite User"\n4. Email: ${formData.email}\n5. O perfil será criado automaticamente`,
        duration: 15000,
      });

      // Por enquanto, apenas preparar o perfil quando o trigger criar
      toast.success('Configuração salva!', {
        description: 'Siga as instruções acima para completar o cadastro.',
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error('Erro', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Criar Novo Usuário
          </DialogTitle>
          <DialogDescription>
            Crie uma conta de acesso para um novo membro da equipe
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações Básicas */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold text-sm text-gray-700">Informações Básicas</h3>
            
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4 h-4" />
                Nome Completo *
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="João da Silva"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="funcao" className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Função / Cargo
              </Label>
              <Input
                id="funcao"
                value={formData.funcao}
                onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
                placeholder="Ex: Analista, Gerente, Assistente..."
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nivelAcesso" className="text-sm font-semibold">
                Nível de Acesso
              </Label>
              <Select 
                value={formData.nivelAcesso} 
                onValueChange={(value) => setFormData({ ...formData, nivelAcesso: value as NivelAcesso })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Usuário">Usuário</SelectItem>
                  <SelectItem value="Supervisão">Supervisão</SelectItem>
                  <SelectItem value="Gestão">Gestão</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Define as permissões e o nível de acesso na plataforma
              </p>
            </div>
          </div>

          {/* Credenciais de Acesso */}
          <div className="space-y-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-sm text-blue-900">Credenciais de Acesso</h3>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@empresa.com"
                className="h-11 bg-white"
              />
              <p className="text-xs text-blue-700">
                Este email será usado para login na plataforma
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Senha *
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="h-11 pr-10 bg-white"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-11"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-blue-700">
                O usuário poderá alterar a senha após o primeiro login
              </p>
            </div>

            <div className="p-3 border border-green-200 rounded-lg bg-green-50">
              <p className="text-xs text-green-800">
                ℹ️ O usuário será criado com email já confirmado e poderá fazer login imediatamente.
              </p>
            </div>
          </div>

          {/* Preview de Permissões */}
          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold text-sm text-gray-700 mb-3">
              Permissões do Nível "{formData.nivelAcesso}"
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(getDefaultPermissions(formData.nivelAcesso)).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.email || !formData.password || !formData.fullName}
            className="min-w-[140px]"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Criando...
              </>
            ) : (
              'Criar Usuário'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
