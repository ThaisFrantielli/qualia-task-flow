#!/bin/bash
# ============================================================================
# Script de Agendamento ETL para Oracle Cloud Linux
# ============================================================================
# Este script deve ser executado NO SERVIDOR Oracle Cloud
# Configura cron jobs para executar o ETL 3x ao dia
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     AGENDADOR ETL - Oracle Cloud Linux                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Diretório do script ETL (ajuste conforme necessário)
ETL_DIR="/home/opc/qualia-task-flow/scripts/local-etl"
ETL_SCRIPT="$ETL_DIR/run-sync-v3.js"
LOG_DIR="$ETL_DIR/logs"

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado. Instale com: sudo yum install nodejs${NC}"
    exit 1
fi

# Verificar se o script ETL existe
if [ ! -f "$ETL_SCRIPT" ]; then
    echo -e "${RED}❌ Script ETL não encontrado em: $ETL_SCRIPT${NC}"
    echo -e "${YELLOW}   Ajuste a variável ETL_DIR no script${NC}"
    exit 1
fi

# Criar diretório de logs
mkdir -p "$LOG_DIR"

# Função para instalar cron jobs
install_cron() {
    echo -e "${YELLOW}🔧 Instalando cron jobs...${NC}"
    echo ""
    
    # Backup do crontab atual
    crontab -l > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # Remover jobs antigos do ETL (se existirem)
    crontab -l 2>/dev/null | grep -v "BluConecta-ETL" | grep -v "$ETL_SCRIPT" | grep -v "CRON_TZ=America/Sao_Paulo" | crontab - || true
    
    # Adicionar novos jobs
    (crontab -l 2>/dev/null; echo "# BluConecta-ETL - Execução automática 3x ao dia") | crontab -
    (crontab -l 2>/dev/null; echo "CRON_TZ=America/Sao_Paulo") | crontab -
    (crontab -l 2>/dev/null; echo "20 0 * * * cd $ETL_DIR && /usr/bin/node $ETL_SCRIPT >> $LOG_DIR/etl-0020.log 2>&1") | crontab -
    (crontab -l 2>/dev/null; echo "20 10 * * * cd $ETL_DIR && /usr/bin/node $ETL_SCRIPT >> $LOG_DIR/etl-1020.log 2>&1") | crontab -
    (crontab -l 2>/dev/null; echo "20 15 * * * cd $ETL_DIR && /usr/bin/node $ETL_SCRIPT >> $LOG_DIR/etl-1520.log 2>&1") | crontab -
    
    echo -e "${GREEN}✅ Cron jobs instalados com sucesso!${NC}"
    echo ""
    echo -e "${CYAN}📅 Horários de execução:${NC}"
    echo -e "   • 00:20 - Execução noturna"
    echo -e "   • 10:20 - Execução matinal"
    echo -e "   • 15:20 - Execução vespertina"
    echo ""
    echo -e "${CYAN}📁 Logs salvos em: $LOG_DIR${NC}"
}

# Função para desinstalar cron jobs
uninstall_cron() {
    echo -e "${YELLOW}🗑️  Removendo cron jobs...${NC}"
    crontab -l 2>/dev/null | grep -v "BluConecta-ETL" | grep -v "$ETL_SCRIPT" | crontab - || true
    echo -e "${GREEN}✅ Cron jobs removidos${NC}"
}

# Função para verificar status
check_status() {
    echo -e "${CYAN}📊 Status dos Cron Jobs:${NC}"
    echo ""
    
    if crontab -l 2>/dev/null | grep -q "$ETL_SCRIPT"; then
        echo -e "${GREEN}✅ Cron jobs ativos:${NC}"
        crontab -l | grep "$ETL_SCRIPT"
        echo ""
        echo -e "${CYAN}📁 Logs disponíveis:${NC}"
        ls -lh "$LOG_DIR"/*.log 2>/dev/null || echo "   Nenhum log ainda"
    else
        echo -e "${YELLOW}⚠️  Nenhum cron job configurado${NC}"
    fi
}

# Função para testar execução
test_run() {
    echo -e "${YELLOW}🧪 Testando execução do ETL...${NC}"
    echo ""
    cd "$ETL_DIR"
    node "$ETL_SCRIPT"
}

# Menu principal
case "$1" in
    install)
        install_cron
        ;;
    uninstall)
        uninstall_cron
        ;;
    status)
        check_status
        ;;
    test)
        test_run
        ;;
    *)
        echo -e "${YELLOW}Uso:${NC}"
        echo "  ./schedule-etl-linux.sh install     # Instalar cron jobs"
        echo "  ./schedule-etl-linux.sh status      # Ver status"
        echo "  ./schedule-etl-linux.sh test        # Testar execução"
        echo "  ./schedule-etl-linux.sh uninstall   # Remover cron jobs"
        echo ""
        echo -e "${CYAN}💡 Horários de execução:${NC}"
        echo "   • 00:20 - Execução noturna"
        echo "   • 10:20 - Execução matinal"
        echo "   • 15:20 - Execução vespertina"
        ;;
esac
