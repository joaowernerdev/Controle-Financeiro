# Clareza — controle financeiro

Protótipo responsivo de organização financeira com página de apresentação, fluxo de cadastro, entrada e recuperação de acesso, além de um painel local para movimentações, contas, metas e relatórios.

## Executar

Abra `index.html` no navegador ou sirva a pasta com uma extensão como Live Server. O projeto não precisa de dependências ou processo de compilação.

## Telas e recursos

- Página inicial com apresentação dos recursos e atalhos para cadastro e entrada.
- Cadastro de perfil local, entrada no perfil deste navegador e saída.
- Fluxo demonstrativo de recuperação e redefinição de senha.
- Painel com resumo, receitas, despesas e contas em aberto.
- Inclusão e remoção de movimentações; cadastro e marcação de contas pagas; criação de metas e acompanhamento de progresso.
- Relatório de despesas por categoria e edição do nome/e-mail do perfil.
- Layout adaptável para celular, mensagens de estado vazio e opção para apagar os dados locais.

## Limites importantes

Esta é uma demonstração de front-end, não um serviço financeiro pronto para produção. O perfil, as movimentações, as contas e as metas ficam no `localStorage` do navegador e não são enviados a um servidor. A senha digitada nunca é salva nem validada: cadastro, entrada, recuperação e alteração de senha simulam somente a interface; nenhum e-mail ou link de recuperação é enviado. Use apenas dados fictícios e não informe senhas reais ou dados bancários.

Para oferecer contas reais, autenticação, redefinição por e-mail e sincronização entre dispositivos, será necessário implementar um backend com armazenamento apropriado, validação, autorização, envio seguro de e-mail e políticas de privacidade.

Os dados locais podem ser removidos pelo botão **Apagar dados locais** na tela **Minha conta**, ou pelas configurações de armazenamento do navegador.
