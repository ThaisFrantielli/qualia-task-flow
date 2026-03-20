# CRM 360 - Matriz RACI Formal

Status: aprovado para uso interno
Ultima atualizacao: 20/03/2026

## Papeis
- Sponsor Executivo
- Product Owner CRM
- Tech Lead
- Engenheiro Frontend
- Engenheiro Backend
- DBA/Analytics Engineer
- QA
- Operacoes Atendimento
- Comercial
- Pos-venda/CS

## Legenda
- R = Responsible (executa)
- A = Accountable (responde pelo resultado)
- C = Consulted (consulta obrigatoria)
- I = Informed (comunicado)

## Matriz por macro-entrega
| Macro-entrega | Sponsor Executivo | Product Owner CRM | Tech Lead | Eng Frontend | Eng Backend | DBA/Analytics | QA | Operacoes Atendimento | Comercial | Pos-venda/CS |
|---|---|---|---|---|---|---|---|---|---|---|
| Baseline, backlog e governanca | I | A | C | I | I | C | I | C | C | C |
| Estabilizacao WhatsApp e atendimento | I | A | R | C | R | C | C | C | I | I |
| Catalogos dinamicos de ticket | I | A | C | R | R | C | C | C | C | C |
| Campos customizados e auditoria | I | A | C | R | R | C | C | C | I | C |
| Hub de clientes e deduplicacao | I | A | C | R | R | R | C | C | C | C |
| Pipeline comercial e forecast | I | A | C | R | R | R | C | I | C | I |
| SLA, CSAT/NPS/CES pos-venda | I | A | C | R | R | C | C | C | I | C |
| Convergencia de regras API/UI | I | A | A | R | R | C | C | I | I | I |
| Rollout, treinamento e adocao | A | R | C | I | I | I | C | C | C | C |

## Regras de governanca
- Toda entrega com impacto em negocio deve ter Product Owner CRM como A.
- Toda mudanca que altera modelo de dados deve incluir DBA/Analytics como C.
- Toda entrega com alteracao de fluxo de usuario deve incluir QA como C antes de deploy.
- Todo rollout em producao deve ter Sponsor Executivo como I e aprovacao formal do Product Owner CRM.

## Cadencia de revisao
- Revisao quinzenal da matriz com Product Owner CRM e Tech Lead.
- Ajustes de papel devem ser registrados neste arquivo e refletidos no checklist executivo.
