# Backlog: Hierarquia vs Privacidade (Equipe)

Contexto

Há uma potencial ambiguidade entre a regra de hierarquia (supervisor vê tarefas/projetos dos subordinados) e a privacidade de projeto por `team` (apenas membros da equipe veem). Essa decisão afeta regras de negócio e privacidade.

Opções propostas

1) Hierarquia Prevalece (atual)
- Descrição: Supervisores/gestão podem ver tudo dos subordinados, mesmo que projeto seja privado para outra equipe.
- Prós: Simplicidade operacional, permite supervisão efetiva.
- Contras: Pode violar expectativas de privacidade de equipes e compliance.

2) Privacidade de Equipe Prevalece
- Descrição: Mesmo que supervisor tenha subordinado em uma equipe, se o projeto tiver privacy = 'team' e o supervisor não for membro daquela equipe, ele NÃO verá o projeto/tarefas.
- Prós: Respeita privacidade por departamento; previsível para membros da equipe.
- Contras: Supervisores podem perder visibilidade de trabalho de subordinados, exigindo que supervisores sejam membros das equipes ou exista mecanismo de delegação.

3) Configurável por Projeto
- Descrição: Cada projeto tem uma flag `allow_hierarchy_override` (boolean) que determina se supervisores podem ignorar a privacidade de equipe.
- Prós: Flexibilidade; pode atender diferentes políticas internas.
- Contras: Aumenta complexidade e necessidade de comunicação interna; administração adicional.

Recomendação inicial

- Adotar a Opção 3 (Configuração por projeto) como solução balanceada. Definir default: `false` (privacidade mais segura). Permitir admins criar policy global para migrar comportamentos existentes.

Tarefas necessárias para implementação

- [ ] Adicionar campo `allow_hierarchy_override` (boolean) na tabela `projects` (default: false).
- [ ] Atualizar policies RLS para `tasks` e `projects` para checar essa flag quando aplicável.
- [ ] Atualizar UI de criação/edição de projeto para expor a opção (visível apenas para criadores/admins).
- [ ] Atualizar documentação e comunicar a mudança ao time de produto.
- [ ] Criar script de migração para projetos existentes (opcional: setar true para projetos que atualmente confiam em hierarquia).

Discussão

Por favor avaliem qual opção desejam e se a implementação deve ser gradual (feature flag) ou imediata.
