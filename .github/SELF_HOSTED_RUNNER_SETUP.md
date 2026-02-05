# Configuração do Self-Hosted Runner

Este guia explica como configurar um runner do GitHub Actions na mesma máquina/rede onde o SQL Server está acessível.

## 📋 Pré-requisitos

- Windows, Linux ou macOS
- Conexão com o SQL Server (mesma rede/VPN)
- Node.js 18+ instalado
- Git instalado
- Acesso administrativo ao repositório no GitHub

## 🚀 Instalação no Windows

### 1. Acessar as configurações do repositório

1. Vá para o repositório no GitHub: `https://github.com/ThaisFrantielli/qualia-task-flow`
2. Clique em **Settings** → **Actions** → **Runners**
3. Clique em **New self-hosted runner**
4. Selecione **Windows** como sistema operacional

### 2. Baixar e configurar o runner

Abra o PowerShell como **Administrador** e execute:

```powershell
# Criar pasta para o runner
mkdir C:\actions-runner ; cd C:\actions-runner

# Baixar o runner (copie o link exato da página do GitHub)
Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/v2.XXX.X/actions-runner-win-x64-2.XXX.X.zip -OutFile actions-runner-win-x64-2.XXX.X.zip

# Extrair
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD\actions-runner-win-x64-2.XXX.X.zip", "$PWD")
```

### 3. Configurar o runner

```powershell
# Configure (cole o comando exato fornecido pelo GitHub)
.\config.cmd --url https://github.com/ThaisFrantielli/qualia-task-flow --token SEU_TOKEN_AQUI

# Quando perguntado:
# - Enter the name of the runner group: [pressione Enter para usar o padrão]
# - Enter the name of runner: [pressione Enter ou dê um nome, ex: "runner-bluconecta"]
# - Enter any additional labels: [pressione Enter]
# - Enter name of work folder: [pressione Enter]
```

### 4. Instalar como serviço (recomendado)

```powershell
# Instalar como serviço do Windows (executa automaticamente)
.\svc.sh install

# Iniciar o serviço
.\svc.sh start

# Verificar status
.\svc.sh status
```

**OU** executar interativamente (para testes):

```powershell
.\run.cmd
```

## 🐧 Instalação no Linux/Ubuntu

### 1. Baixar e configurar

```bash
# Criar pasta para o runner
mkdir ~/actions-runner && cd ~/actions-runner

# Baixar (copie o link exato da página do GitHub)
curl -o actions-runner-linux-x64-2.XXX.X.tar.gz -L https://github.com/actions/runner/releases/download/v2.XXX.X/actions-runner-linux-x64-2.XXX.X.tar.gz

# Extrair
tar xzf ./actions-runner-linux-x64-2.XXX.X.tar.gz

# Configurar (cole o comando exato fornecido pelo GitHub)
./config.sh --url https://github.com/ThaisFrantielli/qualia-task-flow --token SEU_TOKEN_AQUI
```

### 2. Instalar como serviço

```bash
# Instalar como serviço systemd
sudo ./svc.sh install

# Iniciar o serviço
sudo ./svc.sh start

# Verificar status
sudo ./svc.sh status
```

## ✅ Verificação

1. Volte para **Settings** → **Actions** → **Runners** no GitHub
2. Você deve ver o runner com status **Idle** (verde)
3. Teste executando manualmente o workflow: **Actions** → **Sincronizar Dados** → **Run workflow**

## 🔧 Requisitos do Ambiente

O runner precisa ter instalado:

- **Node.js 18+**: `node --version`
- **npm**: `npm --version`
- **Git**: `git --version`

### Instalar Node.js no runner (se necessário)

#### Windows
Baixe e instale de https://nodejs.org (versão LTS)

#### Linux
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 🔐 Configuração das Secrets

Verifique se as secrets estão configuradas em **Settings** → **Secrets and variables** → **Actions**:

- `SQL_SERVER` - Endereço do SQL Server (ex: `192.168.1.100`)
- `SQL_USER` - Usuário do SQL Server
- `SQL_PASSWORD` - Senha do SQL Server
- `SQL_DATABASE` - Nome do banco de dados

## 🛑 Desinstalar o Runner

### Windows
```powershell
cd C:\actions-runner
.\svc.sh stop
.\svc.sh uninstall
.\config.cmd remove --token SEU_TOKEN_AQUI
```

### Linux
```bash
cd ~/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh uninstall
./config.sh remove --token SEU_TOKEN_AQUI
```

## 🐛 Troubleshooting

### Runner não aparece como "Idle"
- Verifique os logs: `C:\actions-runner\_diag\` (Windows) ou `~/actions-runner/_diag/` (Linux)
- Certifique-se de que o serviço está rodando
- Verifique conexão com a internet

### Workflow falha com "No runner matching the specified labels"
- Certifique-se de que o runner está online (status "Idle")
- Verifique se o workflow usa `runs-on: self-hosted`

### Erro de conexão com SQL Server no workflow
- Teste a conexão SQL manualmente no runner:
  ```bash
  node -e "require('mssql').connect('Server=${SQL_SERVER};Database=${SQL_DATABASE};User Id=${SQL_USER};Password=${SQL_PASSWORD};TrustServerCertificate=true').then(() => console.log('OK'))"
  ```

### Memória insuficiente
- Monitore uso de memória durante execução
- Ajuste `NODE_OPTIONS: "--max-old-space-size=XXXX"` no workflow

## 📊 Monitoramento

Para ver logs em tempo real:

### Windows
```powershell
Get-Content C:\actions-runner\_diag\Runner_*.log -Wait
```

### Linux
```bash
tail -f ~/actions-runner/_diag/Runner_*.log
```

## 🔄 Atualização do Runner

O runner se auto-atualiza automaticamente, mas você pode forçar:

```bash
# Parar o serviço
./svc.sh stop

# Remover e reconfigurar
./config.sh remove --token TOKEN
./config.sh --url URL --token NOVO_TOKEN

# Reiniciar serviço
./svc.sh start
```

---

**Dúvidas?** Consulte a documentação oficial: https://docs.github.com/en/actions/hosting-your-own-runners
