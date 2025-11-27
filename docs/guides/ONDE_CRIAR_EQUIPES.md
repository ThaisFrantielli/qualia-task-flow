# 🏢 Guia: Onde Criar Equipes/Departamentos

## 📍 3 Formas de Criar Equipes

### ✅ Opção 1: Via Interface (RECOMENDADO) 🖱️

**Acabei de criar uma página nova para você!**

1. **Acesse:** http://localhost:8080/configuracoes/departamentos
   
2. **Ou pelo menu lateral:**
   ```
   Configurações → Criar Equipes/Departamentos
   ```

3. **Clique em:** "Nova Equipe"

4. **Preencha:**
   - **Nome:** Marketing, TI, Vendas, Suporte, etc.
   - **Descrição:** (Opcional) Explique o propósito da equipe

5. **Clique em:** "Criar Equipe"

**✨ Pronto! A equipe estará disponível para usar em projetos.**

---

### ✅ Opção 2: Via SQL (Rápido para criar várias) ⚡

1. **Acesse:** Supabase SQL Editor

2. **Copie e cole** o conteúdo do arquivo:
   ```
   SQL_CRIAR_EQUIPES_PADRAO.sql
   ```

3. **Execute**

**Isso criará 5 equipes automaticamente:**
- ✅ Geral
- ✅ Desenvolvimento
- ✅ Marketing
- ✅ Vendas
- ✅ Suporte

---

### ✅ Opção 3: Manualmente via Supabase Table Editor

1. Acesse Supabase → Table Editor
2. Selecione a tabela `teams`
3. Clique em "Insert row"
4. Preencha:
   - `name`: Nome da equipe
   - `description`: Descrição (opcional)
   - `owner_id`: Seu ID de usuário (pegar da tabela profiles)
5. Salve

---

## 🤔 Diferença Entre as Páginas

### 1. **Criar Equipes/Departamentos** (Nova!) 🏢
- **URL:** `/configuracoes/departamentos`
- **O que faz:** Cria as equipes organizacionais (Marketing, TI, Vendas)
- **Quem usa:** Admin
- **Quando usar:** Para definir os departamentos da empresa

### 2. **Gerenciar Hierarquia** (Já existia) 👥
- **URL:** `/configuracoes/equipes`
- **O que faz:** Define quem reporta para quem (supervisor → subordinado)
- **Quem usa:** Admin, Gestão, Supervisão
- **Quando usar:** Para criar a hierarquia de subordinados diretos

---

## 📊 Conceitos Explicados

### 🏢 **Equipes/Departamentos** (teams table)
```
Exemplo:
├─ Marketing
├─ TI
├─ Vendas
└─ Suporte
```
- Unidades organizacionais fixas da empresa
- Usadas para vincular projetos a departamentos
- Afeta privacidade "Equipe" dos projetos

### 👥 **Hierarquia** (user_hierarchy table)
```
Exemplo:
João (Gestor)
 ├─ Maria (Supervisão) - subordinada direta
 │   ├─ Pedro (Usuário) - subordinado de Maria
 │   └─ Ana (Usuário) - subordinada de Maria
 └─ Carlos (Usuário) - subordinado direto de João
```
- Relação supervisor → subordinado
- Define quem vê tarefas de quem
- Usado para controle de acesso hierárquico

### 👤 **Membros do Projeto** (project_members table)
```
Projeto: Desenvolvimento Site 2024
├─ João: Owner (criador)
├─ Maria: Aprovador (valida entregas)
├─ Pedro: Colaborador (executa tarefas)
└─ Ana: Leitor (acompanha progresso)
```
- Papéis específicos de cada projeto
- Define permissões dentro do projeto
- Pode ter pessoas de equipes diferentes

---

## ✨ Fluxo Completo de Uso

### 1️⃣ Criar Equipes (Departamentos)
```
Admin vai em: Configurações → Criar Equipes/Departamentos
Cria: Marketing, TI, Vendas
```

### 2️⃣ Criar Projeto e Vincular à Equipe
```
Qualquer usuário:
- Clica em "Novo Projeto"
- Preenche nome/descrição
- Seleciona Equipe: "Marketing"
- Privacidade: "Equipe" (só Marketing vê)
```

### 3️⃣ Adicionar Membros ao Projeto
```
No mesmo formulário:
- Adiciona Maria como Aprovador
- Adiciona Pedro como Colaborador
- Adiciona Ana como Leitor
```

### 4️⃣ Definir Hierarquia (Opcional)
```
Admin/Gestor vai em: Configurações → Gerenciar Hierarquia
Define que Maria reporta para João
```

---

## 🎯 Quando Usar Cada Um

| Situação | Use | Onde |
|----------|-----|------|
| Criar departamentos da empresa | Equipes/Departamentos | `/configuracoes/departamentos` |
| Definir quem é supervisor de quem | Hierarquia | `/configuracoes/equipes` |
| Dar permissões em projeto específico | Membros do Projeto | Ao criar/editar projeto |
| Projeto só para um departamento | Privacidade "Equipe" + Selecionar equipe | Criar projeto |
| Projeto multidisciplinar | Privacidade "Organização" + Não selecionar equipe | Criar projeto |

---

## 🚀 Exemplo Prático

### Cenário: Empresa com 3 departamentos

**1. Criar Equipes:**
```
Acesse: /configuracoes/departamentos
Crie:
  ✅ Marketing
  ✅ TI
  ✅ Vendas
```

**2. Criar Projeto de Marketing:**
```
Nome: Campanha Black Friday 2024
Equipe: Marketing
Privacidade: Equipe (só Marketing vê)
Membros:
  - João (Marketing): Aprovador
  - Maria (Marketing): Colaborador
  - Pedro (Vendas): Leitor (para acompanhar)
```

**3. Criar Projeto Multidisciplinar:**
```
Nome: Implementação CRM
Equipe: (deixar vazio)
Privacidade: Organização (todos veem)
Membros:
  - Carlos (TI): Aprovador
  - Ana (TI): Colaborador
  - João (Marketing): Colaborador
  - Lucas (Vendas): Leitor
```

---

## 📸 Screenshot da Nova Página

Você verá:
- 🏢 Ícone de prédio (Building2)
- Título: "Gerenciar Equipes/Departamentos"
- Botão azul: "Nova Equipe"
- Lista de equipes cadastradas com:
  - Nome da equipe
  - Descrição
  - Botões: Editar / Deletar

---

## ❓ FAQ

**P: Preciso criar equipes?**
R: Não é obrigatório! O campo "Equipe" nos projetos agora é opcional.

**P: Posso ter projetos sem equipe?**
R: Sim! Use quando o projeto envolver várias áreas.

**P: Se deletar uma equipe, deleto os projetos?**
R: Não! Apenas remove o vínculo. Projetos continuam existindo.

**P: Posso renomear uma equipe depois?**
R: Sim! Use o botão "Editar" na lista.

**P: Quantas equipes posso criar?**
R: Ilimitadas! Crie quantas precisar.

---

## 🎉 Agora é só usar!

**Acesse:** http://localhost:8080/configuracoes/departamentos

Ou pelo menu: **Configurações → Criar Equipes/Departamentos**
