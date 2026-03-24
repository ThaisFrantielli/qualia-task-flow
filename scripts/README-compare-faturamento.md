Comparador de Faturamento (fevereiro)

Descrição
---------
Script simples para comparar os dados "source" (linha a nível de documento, exportado do banco/ETL) com o CSV do dashboard (exportado do front) para um mês/ano específico. O script aplica a mesma regra de filtragem usada no dashboard para `Locação` (IdSituacaoNota ∈ {1,2} e `FA/ND` = "FA"), porém é permissivo quando os campos estão ausentes (não exclui a linha).

Uso
----
No diretório do projeto execute:

```bash
node scripts/compare-faturamento-feb.js --source path/para/source.csv --dashboard path/para/dashboard.csv --year 2026 --month 2 --expected 7018456.22
```

- `--source`: CSV exportado da tabela `fat_faturamentos` (linhas por nota)
- `--dashboard`: CSV exportado do dashboard (pode ser agregação do front)
- `--year` e `--month`: período que será comparado (mês 2 = fevereiro)
- `--expected` (opcional): valor esperado (ex.: `7018456.22`) para checar contra o total source

Saída
-----
O script imprime um resumo com:

- total calculado a partir do `source`
- total calculado a partir do `dashboard`
- diferença absoluta e percentual
- breakdown por `Tipo`
- top 10 documentos com maior diferença (por valor)

Notas
-----
- O parser CSV é simples e pode não cobrir todas variações complexas (mas funciona para exports típicos separados por vírgula com aspas).
- Se quiser, posso adaptar o script para ler direto do banco (Postgres) usando credenciais de ambiente.
