import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet
} from '@react-pdf/renderer';
import { PropostaTemplateWithDetails } from '@/types/proposta-template';
import { Proposta, PropostaVeiculoWithItems, PropostaCenario } from '@/types/proposta';

// =========================================
// Tipos
// =========================================
interface PropostaPDFProps {
  proposta: Proposta;
  veiculos: PropostaVeiculoWithItems[];
  cenarios: PropostaCenario[];
  template: PropostaTemplateWithDetails;
  vendedorNome?: string;
}

// =========================================
// Estilos
// =========================================
const createStyles = (template: PropostaTemplateWithDetails) => StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: template.cor_texto || '#1f2937',
  },
  // Capa
  coverPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: template.cor_primaria || '#1e40af',
  },
  coverLogo: {
    width: 180,
    marginBottom: 40,
  },
  coverTitle: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  coverSlogan: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
  },
  coverClient: {
    marginTop: 60,
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: template.cor_primaria || '#1e40af',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: template.cor_primaria || '#1e40af',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#6b7280',
  },
  proposalNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: template.cor_primaria || '#1e40af',
  },
  proposalDate: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 3,
  },
  // Seções
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: template.cor_primaria || '#1e40af',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  // Cards de veículos
  vehicleCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: template.cor_primaria || '#1e40af',
    marginBottom: 8,
  },
  vehiclePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: template.cor_secundaria || '#3b82f6',
    marginBottom: 5,
  },
  vehiclePriceLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  vehicleDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  vehicleDetail: {
    width: '50%',
    marginBottom: 5,
  },
  vehicleDetailLabel: {
    fontSize: 8,
    color: '#6b7280',
  },
  vehicleDetailValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Tabela de cenários
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: template.cor_primaria || '#1e40af',
    padding: 8,
  },
  tableHeaderCell: {
    flex: 1,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 8,
  },
  tableRowAlternate: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    textAlign: 'center',
  },
  // Benefícios
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  benefitItem: {
    width: '50%',
    padding: 10,
    marginBottom: 10,
  },
  benefitTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: template.cor_primaria || '#1e40af',
    marginBottom: 3,
  },
  benefitDescription: {
    fontSize: 9,
    color: '#6b7280',
  },
  // FAQ
  faqItem: {
    marginBottom: 15,
  },
  faqQuestion: {
    fontSize: 11,
    fontWeight: 'bold',
    color: template.cor_primaria || '#1e40af',
    marginBottom: 5,
  },
  faqAnswer: {
    fontSize: 10,
    color: '#4b5563',
    lineHeight: 1.4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
  pageNumber: {
    fontSize: 8,
    color: '#9ca3af',
  },
  // Cliente info
  clientInfo: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  clientName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  clientDetail: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  // Badge melhor escolha
  bestChoiceBadge: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    padding: 4,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 'bold',
    position: 'absolute',
    top: 10,
    right: 10,
  },
});

// =========================================
// Componente Principal
// =========================================
export const PropostaPDFDocument: React.FC<PropostaPDFProps> = ({
  proposta,
  veiculos,
  cenarios,
  template,
  vendedorNome
}) => {
  const styles = createStyles(template);
  const config = template.secoes_config;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Encontrar cenário selecionado
  const cenarioSelecionado = cenarios.find(c => c.is_selecionado);

  return (
    <Document>
      {/* Página 1 - Capa */}
      {config.capa?.visivel && (
        <Page size="A4" style={[styles.page, styles.coverPage]}>
          {template.logo_url && (
            <Image src={template.logo_url} style={styles.coverLogo} />
          )}
          <Text style={styles.coverTitle}>PROPOSTA COMERCIAL</Text>
          <Text style={styles.coverSlogan}>{template.slogan}</Text>
          <Text style={styles.coverClient}>
            Preparado para: {proposta.cliente_nome}
          </Text>
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Proposta #{proposta.numero_proposta}
            </Text>
            <Text style={styles.footerText}>
              {formatDate(proposta.data_criacao)}
            </Text>
          </View>
        </Page>
      )}

      {/* Página 2 - Proposta Principal */}
      {config.proposta?.visivel && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Proposta Comercial</Text>
              <Text style={styles.headerSubtitle}>{template.slogan}</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.proposalNumber}>
                #{String(proposta.numero_proposta).padStart(6, '0')}
              </Text>
              <Text style={styles.proposalDate}>
                Emissão: {formatDate(proposta.data_criacao)}
              </Text>
              {proposta.data_validade && (
                <Text style={styles.proposalDate}>
                  Validade: {formatDate(proposta.data_validade)}
                </Text>
              )}
            </View>
          </View>

          {/* Dados do cliente */}
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{proposta.cliente_nome}</Text>
            {proposta.cliente_cnpj && (
              <Text style={styles.clientDetail}>CNPJ: {proposta.cliente_cnpj}</Text>
            )}
            {proposta.cliente_email && (
              <Text style={styles.clientDetail}>Email: {proposta.cliente_email}</Text>
            )}
            {proposta.cliente_telefone && (
              <Text style={styles.clientDetail}>Telefone: {proposta.cliente_telefone}</Text>
            )}
            {vendedorNome && (
              <Text style={styles.clientDetail}>Consultor: {vendedorNome}</Text>
            )}
          </View>

          {/* Cards de veículos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Veículos</Text>
            {veiculos.map((veiculo, index) => (
              <View key={veiculo.id} style={styles.vehicleCard}>
                {index === 0 && veiculos.length > 1 && (
                  <Text style={styles.bestChoiceBadge}>MELHOR ESCOLHA</Text>
                )}
                <Text style={styles.vehicleName}>
                  {veiculo.montadora} {veiculo.modelo_nome}
                </Text>
                <Text style={styles.vehiclePrice}>
                  {formatCurrency(veiculo.aluguel_unitario)}
                </Text>
                <Text style={styles.vehiclePriceLabel}>por mês/veículo</Text>
                
                <View style={styles.vehicleDetails}>
                  <View style={styles.vehicleDetail}>
                    <Text style={styles.vehicleDetailLabel}>Franquia KM</Text>
                    <Text style={styles.vehicleDetailValue}>
                      {veiculo.franquia_km.toLocaleString('pt-BR')} km/mês
                    </Text>
                  </View>
                  <View style={styles.vehicleDetail}>
                    <Text style={styles.vehicleDetailLabel}>KM Excedente</Text>
                    <Text style={styles.vehicleDetailValue}>
                      {formatCurrency(veiculo.valor_km_excedente)}/km
                    </Text>
                  </View>
                  <View style={styles.vehicleDetail}>
                    <Text style={styles.vehicleDetailLabel}>Quantidade</Text>
                    <Text style={styles.vehicleDetailValue}>
                      {veiculo.quantidade} veículo(s)
                    </Text>
                  </View>
                  <View style={styles.vehicleDetail}>
                    <Text style={styles.vehicleDetailLabel}>Prazo</Text>
                    <Text style={styles.vehicleDetailValue}>
                      {proposta.prazo_contrato_meses} meses
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Resumo financeiro */}
          {cenarioSelecionado && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resumo Financeiro</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Prazo</Text>
                  <Text style={styles.tableHeaderCell}>Mensal/Veículo</Text>
                  <Text style={styles.tableHeaderCell}>Mensal Total</Text>
                  <Text style={styles.tableHeaderCell}>Anual</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>
                    {cenarioSelecionado.prazo_meses} meses
                  </Text>
                  <Text style={styles.tableCell}>
                    {formatCurrency(cenarioSelecionado.valor_mensal_por_veiculo || 0)}
                  </Text>
                  <Text style={styles.tableCell}>
                    {formatCurrency(cenarioSelecionado.valor_mensal_total || 0)}
                  </Text>
                  <Text style={styles.tableCell}>
                    {formatCurrency(cenarioSelecionado.valor_anual || 0)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>{template.slogan}</Text>
            <Text style={styles.pageNumber}>Página 2</Text>
          </View>
        </Page>
      )}

      {/* Página 3 - Benefícios */}
      {config.beneficios?.visivel && template.beneficios.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Benefícios Inclusos</Text>
              <Text style={styles.headerSubtitle}>
                Tudo o que você precisa em um único contrato
              </Text>
            </View>
          </View>

          <View style={styles.benefitsGrid}>
            {template.beneficios.map((beneficio) => (
              <View key={beneficio.id} style={styles.benefitItem}>
                <Text style={styles.benefitTitle}>✓ {beneficio.titulo}</Text>
                {beneficio.descricao && (
                  <Text style={styles.benefitDescription}>
                    {beneficio.descricao}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Proteções da proposta */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Proteções Veiculares</Text>
            <View style={styles.benefitsGrid}>
              {proposta.protecao_roubo && (
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitTitle}>✓ Proteção contra Roubo</Text>
                </View>
              )}
              {proposta.protecao_furto && (
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitTitle}>✓ Proteção contra Furto</Text>
                </View>
              )}
              {proposta.protecao_colisao && (
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitTitle}>✓ Proteção contra Colisão</Text>
                </View>
              )}
              {proposta.protecao_incendio && (
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitTitle}>✓ Proteção contra Incêndio</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{template.slogan}</Text>
            <Text style={styles.pageNumber}>Página 3</Text>
          </View>
        </Page>
      )}

      {/* Página 4 - FAQ */}
      {config.faq?.visivel && template.faqs.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Perguntas Frequentes</Text>
              <Text style={styles.headerSubtitle}>
                Tire suas dúvidas sobre nossos serviços
              </Text>
            </View>
          </View>

          {template.faqs.map((faq) => (
            <View key={faq.id} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{faq.pergunta}</Text>
              <Text style={styles.faqAnswer}>{faq.resposta}</Text>
            </View>
          ))}

          <View style={styles.footer}>
            <Text style={styles.footerText}>{template.slogan}</Text>
            <Text style={styles.pageNumber}>Página 4</Text>
          </View>
        </Page>
      )}

      {/* Página 5 - Condições Contratuais */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Condições Contratuais</Text>
            <Text style={styles.headerSubtitle}>
              Termos e condições do contrato
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Condições Gerais</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'left' }]}>
                Prazo do Contrato
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {proposta.prazo_contrato_meses} meses
              </Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowAlternate]}>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'left' }]}>
                Vencimento da Mensalidade
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                Dia {proposta.vencimento_mensalidade}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'left' }]}>
                Índice de Reajuste
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {proposta.indice_reajuste}
              </Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowAlternate]}>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'left' }]}>
                Veículos Substitutos
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {proposta.veiculos_provisorios} unidade(s)
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Limites de Cobertura</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'left' }]}>
                Danos Materiais
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {formatCurrency(proposta.limite_danos_materiais)}
              </Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowAlternate]}>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'left' }]}>
                Danos Corporais
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {formatCurrency(proposta.limite_danos_pessoais)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'left' }]}>
                Danos Morais
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {formatCurrency(proposta.limite_danos_morais)}
              </Text>
            </View>
          </View>
        </View>

        {proposta.observacoes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <Text style={styles.faqAnswer}>{proposta.observacoes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{template.slogan}</Text>
          <Text style={styles.pageNumber}>Página 5</Text>
        </View>
      </Page>
    </Document>
  );
};

export default PropostaPDFDocument;
