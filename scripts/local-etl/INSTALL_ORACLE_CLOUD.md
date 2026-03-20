# Guia de Instalação do ETL no Servidor Oracle Cloud

## 📋 Pré-requisitos no Servidor

1. **Acesso SSH ao servidor Oracle Cloud**
   ```bash
   ssh opc@137.131.163.167
   ```

2. **Node.js instalado no servidor**
   ```bash
   # Verificar se Node.js está instalado
   node --version
   
   # Se não estiver, instalar:
   sudo yum install nodejs npm -y
   ```

3. **Git instalado (para clonar o repositório)**
   ```bash
   sudo yum install git -y
   ```

## 🚀 Passo a Passo - Instalação

### 1. Conectar ao Servidor

```bash
ssh opc@137.131.163.167
```

### 2. Clonar o Repositório (se ainda não estiver no servidor)

```bash
cd ~
git clone https://github.com/seu-usuario/qualia-task-flow.git
# OU copiar via scp/rsync do seu computador local
```

### 3. Instalar Dependências do ETL

```bash
cd ~/qualia-task-flow/scripts/local-etl
npm install
```

### 4. Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env no servidor
nano .env
```

Adicione o conteúdo:
```env
# SQL Server (ORIGEM)
SQL_SERVER=200.219.192.34
SQL_PORT=3494
SQL_USER=qualidade
SQL_PASSWORD=AWJ5A95cD5fW
SQL_DATABASE=blufleet-dw

# PostgreSQL (DESTINO - Localhost na Oracle Cloud)
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=F4tu5xy3
PG_DATABASE=bluconecta_dw

# Supabase
VITE_SUPABASE_URL=https://apqrjkobktjcyrxhqwtm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui
```

**Salvar:** `Ctrl+O`, `Enter`, `Ctrl+X`

### 5. Dar Permissão de Execução ao Script

```bash
chmod +x schedule-etl-linux.sh
```

### 6. Testar Execução Manual

```bash
# Testar se o ETL roda manualmente
./schedule-etl-linux.sh test
```

### 7. Instalar Agendamento Automático

```bash
# Instalar cron jobs para executar 3x ao dia
./schedule-etl-linux.sh install
```

### 8. Verificar Status

```bash
# Ver se os cron jobs foram criados
./schedule-etl-linux.sh status

# Ver crontab diretamente
crontab -l
```

## 📅 Horários de Execução

O ETL será executado automaticamente nos seguintes horários (horário de Brasília):

- 🌙 **00:20** - Execução noturna
- ☀️ **10:20** - Execução matinal
- 🌆 **15:20** - Execução vespertina

## 📊 Monitoramento

### Ver Logs em Tempo Real

```bash
# Log da execução das 00:20
tail -f ~/qualia-task-flow/scripts/local-etl/logs/etl-0020.log

# Log da execução das 10:20
tail -f ~/qualia-task-flow/scripts/local-etl/logs/etl-1020.log

# Log da execução das 15:20
tail -f ~/qualia-task-flow/scripts/local-etl/logs/etl-1520.log
```

### Ver Últimas Linhas dos Logs

```bash
# Ver últimas 50 linhas do log matinal
tail -n 50 ~/qualia-task-flow/scripts/local-etl/logs/etl-1020.log
```

### Listar Todos os Logs

```bash
ls -lh ~/qualia-task-flow/scripts/local-etl/logs/
```

## 🔧 Comandos Úteis

### Editar Horários

```bash
# Editar crontab manualmente
crontab -e
```

### Remover Agendamento

```bash
./schedule-etl-linux.sh uninstall
```

### Reinstalar Agendamento

```bash
./schedule-etl-linux.sh uninstall
./schedule-etl-linux.sh install
```

## 🔍 Troubleshooting

### ETL não está executando automaticamente

1. **Verificar se o cron está rodando:**
   ```bash
   sudo systemctl status crond
   ```

2. **Verificar logs do sistema:**
   ```bash
   sudo tail -f /var/log/cron
   ```

3. **Verificar permissões:**
   ```bash
   ls -la ~/qualia-task-flow/scripts/local-etl/
   ```

### Erro de conexão com PostgreSQL

```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Testar conexão
psql -h localhost -U postgres -d bluconecta_dw
```

### Erro de conexão com SQL Server

```bash
# Verificar conectividade de rede
ping 200.219.192.34

# Testar porta
telnet 200.219.192.34 3494
```

## 📝 Atualizar Código no Servidor

```bash
cd ~/qualia-task-flow
git pull origin main

# Reinstalar dependências se necessário
cd scripts/local-etl
npm install
```

## 🔐 Segurança

### Proteger arquivo .env

```bash
chmod 600 ~/qualia-task-flow/scripts/local-etl/.env
```

### Backup do Crontab

```bash
# Fazer backup
crontab -l > ~/crontab-backup-$(date +%Y%m%d).txt
```

## ✅ Checklist de Instalação

- [ ] Node.js instalado no servidor
- [ ] Repositório clonado/copiado
- [ ] Dependências npm instaladas
- [ ] Arquivo .env configurado
- [ ] Script de agendamento com permissão de execução
- [ ] Teste manual executado com sucesso
- [ ] Cron jobs instalados
- [ ] Status verificado
- [ ] Logs sendo gerados corretamente

## 📞 Suporte

Se encontrar problemas, verificar:
1. Logs do ETL em `~/qualia-task-flow/scripts/local-etl/logs/`
2. Logs do cron em `/var/log/cron`
3. Status do PostgreSQL: `sudo systemctl status postgresql`
4. Conectividade: `ping 200.219.192.34`
