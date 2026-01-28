import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import useBIData from '@/hooks/useBIData';

type AnyObject = { [k: string]: any };

interface UniqueModel {
  montadora: string;
  modelo: string;
  anoModelo: number;
  anoFabricacao?: number;
  categoria?: string;
  combustivel?: string;
  motor?: string;
  potencia?: string;
  transmissao?: string;
  quantidade: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export function useImportModelosFromBI() {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Carregar dados do BI
  const { data: frotaData, loading: isLoadingFrota } = useBIData<AnyObject[]>('dim_frota');
  
  // Extrair modelos únicos da frota
  const uniqueModels: UniqueModel[] = (() => {
    if (!Array.isArray(frotaData) || frotaData.length === 0) return [];
    
    const map = new Map<string, UniqueModel>();
    
    frotaData.forEach(v => {
      const montadora = String(v.Montadora ?? v.Marca ?? v.NomeMontadora ?? '').trim() || 'Não Informado';
      const modelo = String(v.Modelo ?? v.NomeModelo ?? v.DescricaoModelo ?? '').trim();
      const anoModelo = parseInt(String(v.AnoModelo ?? v.Ano ?? new Date().getFullYear()), 10);
      const anoFabricacao = parseInt(String(v.AnoFabricacao ?? v.AnoFab ?? ''), 10) || undefined;
      const categoria = String(v.Categoria ?? v.GrupoVeiculo ?? v.Tipo ?? v.TipoVeiculo ?? v.ClassificacaoVeiculo ?? '').trim() || undefined;
      const combustivel = String(v.Combustivel ?? v.TipoCombustivel ?? '').trim() || undefined;
      const motor = String(v.Motor ?? v.Motorizacao ?? v.DescricaoMotor ?? '').trim() || undefined;
      const potencia = String(v.Potencia ?? v.PotenciaCv ?? v.Cv ?? '').trim() || undefined;
      const transmissao = String(v.Transmissao ?? v.Cambio ?? v.TipoCambio ?? '').trim() || undefined;
      
      if (!modelo) return;
      
      const key = `${montadora.toLowerCase()}-${modelo.toLowerCase()}-${anoModelo}`;
      
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.quantidade++;
        // Preencher campos vazios com dados de outro veículo do mesmo modelo
        if (!existing.motor && motor) existing.motor = motor;
        if (!existing.potencia && potencia) existing.potencia = potencia;
        if (!existing.transmissao && transmissao) existing.transmissao = transmissao;
        if (!existing.anoFabricacao && anoFabricacao) existing.anoFabricacao = anoFabricacao;
      } else {
        map.set(key, {
          montadora: normalizeMontadora(montadora),
          modelo: normalizeModelo(modelo),
          anoModelo,
          anoFabricacao,
          categoria: normalizeCategoria(categoria),
          combustivel: normalizeCombustivel(combustivel),
          motor,
          potencia,
          transmissao: normalizeTransmissao(transmissao),
          quantidade: 1
        });
      }
    });
    
    // Filtrar apenas modelos de 2024 em diante
    return Array.from(map.values())
      .filter(m => m.anoModelo >= 2024)
      .sort((a, b) => {
        const montCmp = a.montadora.localeCompare(b.montadora);
        if (montCmp !== 0) return montCmp;
        const modCmp = a.modelo.localeCompare(b.modelo);
        if (modCmp !== 0) return modCmp;
        return b.anoModelo - a.anoModelo;
      });
  })();
  
  // Função para normalizar nome de montadora
  function normalizeMontadora(montadora: string): string {
    const normalize: Record<string, string> = {
      'VW': 'Volkswagen',
      'VOLKSWAGEN': 'Volkswagen',
      'GM': 'Chevrolet',
      'CHEVROLET': 'Chevrolet',
      'FIAT': 'Fiat',
      'FORD': 'Ford',
      'RENAULT': 'Renault',
      'TOYOTA': 'Toyota',
      'HYUNDAI': 'Hyundai',
      'HONDA': 'Honda',
      'NISSAN': 'Nissan',
      'JEEP': 'Jeep',
      'CITROEN': 'Citroën',
      'CITROËN': 'Citroën',
      'PEUGEOT': 'Peugeot',
      'MERCEDES': 'Mercedes-Benz',
      'MERCEDES-BENZ': 'Mercedes-Benz',
      'BMW': 'BMW',
      'AUDI': 'Audi',
      'MITSUBISHI': 'Mitsubishi',
      'KIA': 'Kia',
      'VOLVO': 'Volvo',
      'JAC': 'JAC',
      'CAOA': 'CAOA Chery',
      'CHERY': 'CAOA Chery',
      'BYD': 'BYD',
      'RAM': 'RAM',
      'LAND ROVER': 'Land Rover',
      'PORSCHE': 'Porsche',
      'SUZUKI': 'Suzuki',
      'SUBARU': 'Subaru',
      'IVECO': 'Iveco',
      'SCANIA': 'Scania',
      'MAN': 'MAN',
    };
    
    const upper = montadora.toUpperCase().trim();
    return normalize[upper] || montadora.trim();
  }
  
  // Função para normalizar modelo
  function normalizeModelo(modelo: string): string {
    // Capitaliza primeira letra de cada palavra
    return modelo
      .split(' ')
      .map(word => {
        if (word.length <= 2) return word.toUpperCase(); // Siglas como "1.0", "AT"
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ')
      .trim();
  }
  
  // Função para normalizar categoria
  function normalizeCategoria(categoria?: string): string | undefined {
    if (!categoria) return undefined;
    
    const cat = categoria.toLowerCase();
    
    if (cat.includes('pickup') || cat.includes('pick-up') || cat.includes('pick up')) return 'Pickup';
    if (cat.includes('suv')) return 'SUV';
    if (cat.includes('van') || cat.includes('furgao') || cat.includes('furgão')) return 'Van/Furgão';
    if (cat.includes('utilitário') || cat.includes('utilitario')) return 'Utilitário';
    if (cat.includes('sedan') || cat.includes('sedã')) return 'Sedan';
    if (cat.includes('hatch')) return 'Hatch';
    if (cat.includes('executivo')) return 'Executivo';
    if (cat.includes('compacto')) return 'Compacto';
    if (cat.includes('caminhão') || cat.includes('caminhao')) return 'Caminhão';
    if (cat.includes('moto')) return 'Motocicleta';
    
    return categoria;
  }
  
  // Função para normalizar combustível
  function normalizeCombustivel(combustivel?: string): string | undefined {
    if (!combustivel) return undefined;
    
    const comb = combustivel.toLowerCase();
    
    if (comb.includes('flex')) return 'Flex';
    if (comb.includes('gasolina')) return 'Gasolina';
    if (comb.includes('diesel')) return 'Diesel';
    if (comb.includes('etanol') || comb.includes('alcool') || comb.includes('álcool')) return 'Etanol';
    if (comb.includes('eletrico') || comb.includes('elétrico')) return 'Elétrico';
    if (comb.includes('hibrido') || comb.includes('híbrido')) return 'Híbrido';
    if (comb.includes('gnv') || comb.includes('gás')) return 'GNV';
    
    return combustivel;
  }
  
  // Função para normalizar transmissão
  function normalizeTransmissao(transmissao?: string): string | undefined {
    if (!transmissao) return undefined;
    
    const trans = transmissao.toLowerCase();
    
    if (trans.includes('manual') || trans.includes('mec')) return 'Manual';
    if (trans.includes('automat') || trans.includes('at') || trans.includes('cvt')) return 'Automático';
    if (trans.includes('automatizado') || trans.includes('i-motion') || trans.includes('dualogic')) return 'Automatizado';
    
    return transmissao;
  }
  
  // Mutation para importar modelos
  const importMutation = useMutation({
    mutationFn: async (models: UniqueModel[]): Promise<ImportResult> => {
      setIsProcessing(true);
      
      // Buscar modelos já existentes
      const { data: existingModels } = await supabase
        .from('modelos_veiculos')
        .select('montadora, nome, ano_modelo');
      
      const existingKeys = new Set(
        (existingModels || []).map(m => 
          `${m.montadora.toLowerCase()}-${m.nome.toLowerCase()}-${m.ano_modelo}`
        )
      );
      
      const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
      const toInsert: any[] = [];
      
      for (const model of models) {
        const key = `${model.montadora.toLowerCase()}-${model.modelo.toLowerCase()}-${model.anoModelo}`;
        
        if (existingKeys.has(key)) {
          result.skipped++;
          continue;
        }
        
        toInsert.push({
          montadora: model.montadora,
          nome: model.modelo,
          ano_modelo: model.anoModelo,
          ano_fabricacao: model.anoFabricacao || model.anoModelo,
          categoria: model.categoria,
          combustivel: model.combustivel,
          motor: model.motor,
          potencia: model.potencia,
          transmissao: model.transmissao,
          preco_publico: 0,
          percentual_desconto: 0,
          valor_final: 0,
          ativo: true
        });
      }
      
      if (toInsert.length > 0) {
        // Inserir em lotes de 50
        const batchSize = 50;
        for (let i = 0; i < toInsert.length; i += batchSize) {
          const batch = toInsert.slice(i, i + batchSize);
          const { error } = await supabase
            .from('modelos_veiculos')
            .insert(batch);
          
          if (error) {
            result.errors.push(`Erro no lote ${Math.floor(i/batchSize) + 1}: ${error.message}`);
          } else {
            result.imported += batch.length;
          }
        }
      }
      
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['modelos_veiculos'] });
      setIsProcessing(false);
      
      if (result.errors.length > 0) {
        toast.warning(`Importação parcial: ${result.imported} importados, ${result.skipped} já existiam`, {
          description: result.errors.join('; ')
        });
      } else if (result.imported === 0) {
        toast.info('Nenhum modelo novo para importar', {
          description: `${result.skipped} modelos já existem no catálogo`
        });
      } else {
        toast.success(`${result.imported} modelos importados com sucesso!`, {
          description: `${result.skipped} modelos já existiam e foram ignorados`
        });
      }
    },
    onError: (err: Error) => {
      setIsProcessing(false);
      toast.error('Erro ao importar modelos', { description: err.message });
    }
  });
  
  return {
    uniqueModels,
    totalUniqueModels: uniqueModels.length,
    totalVehicles: Array.isArray(frotaData) ? frotaData.length : 0,
    isLoading: isLoadingFrota,
    isProcessing,
    importModels: (models: UniqueModel[]) => importMutation.mutateAsync(models),
    importAllModels: () => importMutation.mutateAsync(uniqueModels)
  };
}
