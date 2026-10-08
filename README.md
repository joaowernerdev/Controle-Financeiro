# Controle Financeiro

Protótipo web responsivo para organizar receitas, despesas, contas, compras parceladas, vencimentos, metas e orçamentos. A interface está em português do Brasil e funciona sem servidor ou processo de compilação. Todos os dados do perfil e do painel ficam somente no armazenamento local do navegador.

> **Importante:** este projeto é uma demonstração front-end, não um serviço financeiro. Não informe senhas reais, dados bancários ou outras informações sensíveis. O cadastro, o login e a recuperação de acesso não oferecem autenticação verdadeira.

## Índice

- [Requisitos](#requisitos)
- [Como executar](#como-executar)
- [Primeiro acesso](#primeiro-acesso)
- [Guia das telas](#guia-das-telas)
- [Regras dos lançamentos e filtros](#regras-dos-lançamentos-e-filtros)
- [Armazenamento e backup](#armazenamento-e-backup)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Verificações](#verificações)
- [Limitações e segurança](#limitações-e-segurança)
- [Próximos passos para produção](#próximos-passos-para-produção)

## Requisitos

- Um navegador moderno com JavaScript habilitado.
- Para abrir diretamente, basta abrir `index.html`.
- Para desenvolvimento, o Visual Studio Code e uma extensão de servidor local, como Live Server, são opcionais.
- Não há dependências npm, instalação de pacotes, etapa de build ou backend.

## Como executar

### Abrindo o arquivo

Abra `index.html` diretamente no navegador. O perfil e os dados do painel são gravados no `localStorage` desse navegador e dessa origem.

### Usando o Visual Studio Code

1. Abra a pasta do projeto no VS Code.
2. Instale ou habilite uma extensão de servidor local, por exemplo Live Server.
3. Abra `index.html` e escolha **Open with Live Server**.

O endereço local usado pelo servidor é importante: o armazenamento do navegador é separado por origem. Abrir o arquivo diretamente, usar Live Server ou mudar a porta pode mostrar um espaço de dados diferente.

## Primeiro acesso

1. Na página inicial, escolha **Criar conta** ou **Começar gratuitamente**.
2. Informe um nome, e-mail e uma senha fictícia de pelo menos oito caracteres e confirme a senha.
3. O painel demonstrativo será aberto. Não use senha que você utiliza em outros serviços: nenhuma senha é validada ou armazenada.
4. Use a navegação lateral para acessar as telas. Em telas estreitas, abra o menu pelo botão ☰.
5. Para sair do painel, escolha **Sair**. O perfil e os dados continuam guardados nesse navegador.

O protótipo mantém um único perfil local por navegador/origem. A tela de entrada verifica se o e-mail corresponde ao perfil salvo; ela não autentica uma pessoa.

## Guia das telas

### Página inicial

Apresenta o projeto e dá acesso aos fluxos de entrada e cadastro. Os números e exemplos visuais da página são ilustrativos, não são dados da conta.

### Visão geral

Mostra receitas, despesas, saldo e quantidade de compromissos em aberto no mês selecionado. Também exibe movimentações recentes e próximos vencimentos.

- Receitas e despesas registradas são somadas a partir das movimentações do mês.
- O total de despesas inclui os pagamentos planejados do mês.
- Contas cadastradas são mostradas como compromissos; não são somadas novamente ao total de despesas registradas.
- Alterar o seletor de mês atualiza o resumo e as telas mensais relacionadas.

### Movimentações

Registra receitas e despesas com descrição, valor, categoria, origem e data.

- **Despesa ou receita simples:** cria um lançamento individual.
- **Repetir todo mês:** cria uma regra mensal. A ocorrência de um mês é materializada quando esse mês é aberto no painel; a mesma regra não gera duas ocorrências para o mesmo mês.
- **Parcelas:** para despesas, informe o valor total e de 1 a 60 parcelas. Os valores são divididos em centavos para que a soma das parcelas corresponda ao total. A primeira parcela vence na data informada; as demais avançam um mês, ajustando o dia ao último dia do mês quando necessário.
- **Editar:** altera apenas a ocorrência selecionada, inclusive se ela fizer parte de uma recorrência ou parcelamento. Os demais meses não são recalculados.
- **Excluir série:** remove a regra mensal e suas ocorrências geradas ou todas as parcelas da compra selecionada. Para um lançamento sem série, **Excluir** remove apenas aquele lançamento.

#### Busca e filtros

A lista de movimentações oferece:

- busca por texto na descrição;
- busca parcial por origem/estabelecimento;
- data inicial e final, inclusive;
- valor mínimo e máximo, inclusive;
- tipo: todos, receitas ou despesas;
- categoria;
- botão **Limpar filtros**.

Por padrão, o intervalo corresponde ao mês selecionado. É possível escolher datas de outros meses para pesquisar todo o período informado. A lista mostra as movimentações existentes dentro desse intervalo e o contador informa quantos resultados foram encontrados. Se a data inicial for posterior à final, ou o valor mínimo superar o máximo, a lista avisa que os filtros precisam ser corrigidos. As opções de categoria são obtidas das movimentações salvas.

### Planejamento

Use esta tela para registrar compromissos futuros que ainda não foram lançados como movimentação:

1. Informe o gasto, valor total, quantidade de parcelas e primeiro vencimento.
2. Informe também a loja/origem e a categoria.
3. Marque cada parcela como paga quando realizar o pagamento; é possível desfazer essa marcação.
4. A lista, os totais e o calendário acompanham o mês selecionado.
5. Excluir um plano remove todas as parcelas dele.

É possível usar uma única parcela para um gasto futuro sem parcelamento. O calendário sinaliza vencimentos pagos, atrasados e compromissos que vencem nos próximos três dias. Os avisos aparecem quando o painel está aberto; não são enviados como notificações do sistema.

### Contas

Registra uma conta com nome, valor, categoria e vencimento. É possível marcar uma conta como paga, desfazer essa marcação ou excluí-la. A lista é filtrada pelo mês selecionado.

### Orçamento

Define um limite mensal para cada categoria disponível. O mesmo limite pode ser atualizado no próprio mês e categoria; limites de meses diferentes são independentes.

- A barra compara o limite com as despesas registradas na categoria e no mês.
- A partir de 80% de uso, o indicador fica em estado de atenção.
- Ao atingir ou passar de 100%, a tela informa o excesso.
- O cálculo inclui parcelas/recorrências registradas como movimentações, mas não inclui contas ou gastos futuros planejados que ainda não foram lançados como movimentação.

### Metas financeiras

Cria uma meta com nome, valor desejado e valor já guardado. **Adicionar valor** aumenta o progresso; o indicador mostra a porcentagem e quanto falta. **Excluir meta** remove a meta do armazenamento local.

### Relatórios

Apresenta receitas, despesas e resultado do mês selecionado, além de distribuições de despesas por categoria e origem. Os relatórios consideram movimentações e pagamentos planejados. Contas cadastradas não são somadas nesses relatórios para evitar misturar compromissos com despesas já registradas.

### Minha conta

- **Dados do perfil:** altera o nome e o e-mail locais.
- **Alterar senha:** demonstra apenas a interface; não verifica nem salva senhas.
- **Backup:** exporta ou importa um arquivo JSON.
- **Apagar dados locais:** remove perfil, movimentações, contas, metas, regras recorrentes, planejamentos e orçamentos deste navegador/origem. A ação pede confirmação.

## Regras dos lançamentos e filtros

- Valores são exibidos em reais (BRL), no formato brasileiro. Parcelas são divididas em centavos e a diferença de arredondamento é distribuída entre as primeiras parcelas.
- O seletor global de mês controla o resumo, planejamento, contas, orçamentos e relatórios.
- Na tela Movimentações, o intervalo de datas pode abranger mais de um mês. Ao trocar o mês global, os filtros de data voltam ao início e ao final daquele mês; os demais filtros de texto, tipo e categoria permanecem até serem limpos.
- Regras recorrentes criam ocorrências ao abrir um mês. Se pesquisar um período que abrange meses futuros ou passados que ainda não foram abertos, a busca mostra as movimentações que já estão materializadas e salvas; ela não gera todas as ocorrências do intervalo de busca.
- Para evitar somar a mesma despesa duas vezes, registre um compromisso como movimentação **ou** como pagamento planejado, conforme o caso. Contas são acompanhadas separadamente.
- Todas as mudanças do painel são locais; não existe sincronização entre navegadores ou dispositivos.

## Armazenamento e backup

O aplicativo persiste um objeto JSON sob a chave local `clareza-demo-v1`. O estado inclui:

| Coleção/campo | Conteúdo |
| --- | --- |
| `profile` | Nome e e-mail do perfil demonstrativo |
| `transactions` | Receitas e despesas, inclusive ocorrências recorrentes e parcelas registradas |
| `recurringRules` | Regras de movimentação mensal |
| `bills` | Contas e indicação de pagamento |
| `plannedPayments` | Parcelas ou gastos planejados e seus estados de pagamento |
| `budgets` | Limites por categoria e mês |
| `goals` | Metas e progresso acumulado |

### Exportar

Em **Minha conta**, escolha **Exportar backup**. O navegador baixa um arquivo JSON versionado com o perfil e os dados financeiros. O backup não inclui senha: nenhuma senha é armazenada pelo aplicativo.

### Importar

Escolha **Importar backup** e selecione um arquivo JSON exportado pelo Controle Financeiro. O aplicativo valida o formato e os dados básicos e limita a importação a 5 MB. É necessária confirmação: a importação substitui o perfil e todo o estado atual deste navegador. Um arquivo inválido é rejeitado sem substituir os dados.

Guarde os backups com cuidado: o arquivo contém dados do perfil e informações financeiras locais. A exportação é uma cópia manual, não uma sincronização ou backup automático.

## Estrutura do projeto

```text
Controle-Financeiro/
├── assets/       # Imagens, ícones e outros recursos visuais
├── css/
│   └── style.css # Estilos, layout responsivo e estados visuais
├── js/
│   └── app.js    # Estado local, regras financeiras, renderização e eventos
├── index.html    # Página inicial e telas do painel
├── README.md     # Esta documentação
└── .gitignore
```

A aplicação usa HTML, CSS e JavaScript sem framework. A fonte DM Sans/Manrope é carregada do Google Fonts quando há conexão; se não estiver disponível, o navegador usa as fontes alternativas definidas pelo CSS.

## Verificações

Não há suíte automatizada configurada no projeto. Para conferir sintaxe JavaScript e espaços do diff após uma alteração, na pasta do projeto:

```powershell
node --check js/app.js
git diff --check
```

Também é recomendável abrir a aplicação no navegador e testar o fluxo alterado em desktop e celular, sem usar dados financeiros reais.

## Limitações e segurança

- Não há servidor, banco de dados remoto, autenticação, autorização ou sincronização.
- Cadastro e entrada não protegem os dados: o perfil é apenas uma informação local. A senha digitada não é salva nem conferida.
- Recuperação e redefinição de senha são simulações; nenhum código é validado e nenhum e-mail é enviado.
- Qualquer pessoa que use o mesmo perfil do navegador pode acessar os dados locais e arquivos de backup.
- `localStorage` pode ser apagado pelo navegador, por limpeza dos dados do site ou por falta de espaço. Se não for possível salvar, o aplicativo apresenta um aviso.
- O protótipo não integra bancos, cartões, pagamentos, e-mail, notificações de fundo ou cotações.
- Valores e relatórios são ferramentas de organização, não aconselhamento financeiro, extrato bancário ou garantia de cálculo contábil.

Use somente dados fictícios. Exclua os dados pelo painel ou nas configurações de armazenamento do navegador quando terminar de testar.

## Próximos passos para produção

Uma versão com contas reais precisaria, no mínimo, de backend e banco de dados, autenticação segura, controle de acesso por usuário, validação de dados no servidor, recuperação por e-mail com tokens seguros, transporte HTTPS, proteção contra abuso, estratégia de backup e restauração, políticas de privacidade e tratamento adequado dos dados pessoais. Dados financeiros não devem depender de um `localStorage` desprotegido como armazenamento de produção.
