---
skill: Documentos Office
nivel: master
modelo_ideal: opus-4-8 / haiku-4-5 (execução)
keywords: pdf, word, docx, excel, xlsx, planilha, powerpoint, pptx, apresentação, slides, documento, relatório, ebook, contrato, proposta, fatura, recibo, currículo
quando_usar: Criar/editar documentos profissionais — PDF, Word, Excel, PowerPoint
---

# Skill — Documentos Office

> Como o Opus 4.8 gera documentos profissionais de verdade, não rascunhos.

## FERRAMENTAS POR FORMATO (Python no JARVIS)
| Formato | Biblioteca | Uso |
|---------|-----------|-----|
| PDF | `reportlab` / `fpdf2` / HTML→PDF via Puppeteer | Relatórios, propostas, ebooks |
| Excel | `openpyxl` | Planilhas com fórmulas, formatação, gráficos |
| Word | `python-docx` | Contratos, relatórios, documentos formais |
| PowerPoint | `python-pptx` | Apresentações |

## REGRAS DE DOCUMENTO PROFISSIONAL

### PDF
- **Margens consistentes** (2-2.5cm), nunca texto colado na borda
- **Hierarquia tipográfica**: título, subtítulo, corpo claramente diferentes
- **Cabeçalho/rodapé** com numeração de página em docs longos
- **Cores da marca** quando houver identidade
- **Para layout rico**: gere HTML estilizado e converta com Puppeteer (controle total de design)

### Excel
- **Cabeçalhos formatados**: negrito, fundo colorido, congelar painel (freeze panes)
- **Fórmulas reais**, não valores chumbados: SUM, AVERAGE, IF, VLOOKUP, etc.
- **Formatação condicional** para destacar (vermelho/verde, escala de cor)
- **Largura de coluna ajustada** ao conteúdo
- **Tipos corretos**: datas como data, moeda como moeda, % como percentual
- **Validação de dados** em células de entrada (dropdowns)

### Word
- **Estilos nativos** (Heading 1, 2, Normal) — não formatação manual solta
- **Sumário automático** em documentos longos
- **Espaçamento entre parágrafos** consistente

### PowerPoint
- **Uma ideia por slide**
- **Regra 6×6**: máximo ~6 bullets, ~6 palavras cada
- **Contraste forte** texto/fundo
- **Visual > texto**: gráfico vale mais que tabela cheia

## REGRA RL — ZERO LOREM IPSUM
Todo documento sai com conteúdo REAL e relevante ao contexto do usuário.
Se faltar dado, pergunte ou use placeholder claramente marcado `[PREENCHER: ...]`.

## ENTREGA
1. Gerar o arquivo em `Documents and Projects/`
2. Confirmar caminho exato do arquivo
3. Resumir o que foi criado em 1-2 frases
