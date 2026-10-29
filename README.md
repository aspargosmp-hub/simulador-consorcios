# Central de Consórcios BB — Simulador Master & Flex (c/ Lance Embutido e Sincronização Automática)

Aplicação web moderna reconstruída a partir do sistema legado (`maxconsorcios.com.br/consorcios`) e integrada diretamente ao **Portal Parceiros BB Consórcios (`parceirosbbconsorcios.com.br`)**.

## Principais Funcionalidades

1. **Tabela de Grupos Ativos (1.160 planos nas 12 Modalidades Master & Flex)**
   - Modalidades: `AU3`, `AU4`, `AI3`, `AI4`, `IM3`, `IM4`, `TC3`, `TC4`, `EE3`, `EE4`, `MO3`, `MO4`.
   - Enriquecida com as **216 descrições e regras oficiais de Bens do Portal Parceiros BB** (`TRATOR IMPLEMENTO`, `EQUIPAMENTO IRRIGACAO`, `AGRO REBANHO E GENETICA`, `PESADOS EMBUTIDO`, `LANCE FIXO 20`, `BENS SUSTENTAVEIS`, `LANCE LIVRE S FGTS`, etc.).
   - Filtros inteligentes com 1 clique por regra do grupo (*Lance Embutido, Lance Fixo 20%, Trator/Implemento, Irrigação, Rebanho, Energia Solar, FGTS*).

2. **Simulador Multi-Propostas (até 4 propostas lado a lado + Opção Agrupar Cotas)**
   - **Calculadora de Lance Embutido (%) + Lance Recurso Próprio (%)**:
     - Mostra o **Valor Original da Carta (Crédito Bruto)**, **(-) Lance Embutido**, **(=) Crédito Líquido a Liberar**, **Lance Recurso Próprio (desembolso do bolso)**, **Parcela Após Diluir o Lance** e **Prazo Após Abater o Lance**.
   - **Alternância instantânea entre Plano Flex (`3`) e Plano Master (`4`)** mantendo o mesmo grupo.
   - **Folha de Proposta Oficial para Impressão / PDF** com caixas de seleção para ocultar/exibir qualquer linha e botão **"Copiar para WhatsApp"**.

3. **Histórico de Simulações Salvas (Mini-CRM)**
   - Controle de status (*Aguardando, Retornar, Contratado, Concluído, Cancelado*), observações, botão direto para WhatsApp e reabertura da simulação com 1 clique.

4. **Controle de Vendas e Comissões**
   - Base com os 188 vendedores/parceiros importados, KPIs financeiros e controle de até 13 parcelas de comissão por venda.

5. **Robô de Sincronização Automática (`scripts/sync_bb.py` + GitHub Actions)**
   - Botão **"Sincronizar Agora com o BB"** no topo do sistema (chama `/api/sync` localmente).
   - Workflow `.github/workflows/sync-consorcios.yml` pré-configurado para rodar automaticamente todos os dias às 07:00 BRT no GitHub Actions (custo R$ 0).
