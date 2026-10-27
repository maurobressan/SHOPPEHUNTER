# Publicar a extensão na Chrome Web Store

Tudo o que a loja pede já está nesta pasta. Depois de aprovada, o usuário instala com um clique em "Usar no Chrome".

## Arquivos
| Arquivo | Onde usar |
|---|---|
| `shoppe-hunter-chrome-web-store.zip` | Pacote da extensão (aba **Pacote** → Enviar novo pacote) |
| `screenshot-1-busca-1280x800.png` | Capturas de tela |
| `screenshot-2-anuncio-1280x800.png` | Capturas de tela |
| `promo-pequeno-440x280.png` | Bloco promocional pequeno |
| ícone 128x128 | já vem dentro do pacote (`icons/icon128.png`) |

Para gerar o pacote de novo depois de mudar a extensão: `npm run ext:pack`.
As imagens são feitas a partir de `fontes/` (abra o HTML no navegador e tire o print em 1280x800).

## Passo a passo
1. Acesse https://chrome.google.com/webstore/devconsole com o seu Gmail.
2. Aceite o contrato de desenvolvedor e pague a taxa única de **US$ 5**.
3. Em **Conta**, preencha o e-mail de contato e confirme. (Se for vender como empresa, marque "comerciante" e informe os dados.)
4. Clique em **Novo item** e envie `shoppe-hunter-chrome-web-store.zip`.
5. Preencha as abas com os textos abaixo.
6. Em **Distribuição**: visibilidade **Pública**, países: **Brasil** (ou todos).
7. Clique em **Enviar para revisão**. Leva de alguns dias a 2 semanas.
8. Quando aprovar, copie o link da extensão (algo como `https://chromewebstore.google.com/detail/shoppe-hunter/abcdef...`) e mande para o Claude — ou coloque na Vercel em **Settings → Environment Variables** como `NEXT_PUBLIC_EXTENSION_URL` e faça um Redeploy. O site passa a mostrar o botão "Instalar pela Chrome Web Store".

## Aba "Detalhes da página"
**Idioma:** Português (Brasil)

**Categoria:** Ferramentas (ou "Compras")

**Nome:** Shoppe Hunter — vendidos e lucro na Shopee
*(vem do pacote)*

**Resumo (até 132 caracteres):**
Veja os vendidos dos concorrentes, as tarifas e a margem dos anúncios da Shopee que você está vendo e salve no Shoppe Hunter.

**Descrição:**
```
O Shoppe Hunter ajuda quem vende na Shopee a decidir o que vale a pena comprar para revender.

NA BUSCA, CATEGORIA OU LOJA
• Selo em cada anúncio com a quantidade de vendidos
• Resumo da página: anúncios, soma de vendidos, preço mediano, faixa de preço e tarifa da Shopee
• Os 5 mais vendidos da busca
• Um clique para salvar todos os anúncios como concorrentes de um produto

NO ANÚNCIO
• Tarifas da Shopee pela tabela oficial vigente (comissão + tarifa fixa)
• Quanto você recebe e a margem estimada com o seu custo
• Vendas medidas: se você já salvou o anúncio antes, mostra quantas vendas ele fez no período

COMO FUNCIONA O "VENDIDOS"
A Shopee mostra o total vendido desde a criação do anúncio. Salvando em dias diferentes, o Shoppe Hunter calcula as vendas da semana e do mês pela diferença — sem inventar números. Valores arredondados pela Shopee ("1,2mil") ficam marcados como aproximados.

PRIVACIDADE
• Lê apenas o texto visível das páginas da Shopee que você abre
• Não pede sua senha da Shopee, não faz buscas sozinha e não acessa endereços internos da Shopee
• Não lê outros sites nem o seu histórico

Requer uma conta no Shoppe Hunter (https://shoppehunter.vercel.app). Ferramenta independente, sem vínculo com a Shopee.
```

## Aba "Práticas de privacidade"
**Finalidade única:**
Mostrar dados de vendas, tarifas e margem dos anúncios da Shopee que o usuário está vendo e salvar esses anúncios na conta do usuário no Shoppe Hunter.

**Justificativa das permissões:**
- `storage`: guardar o token de acesso à conta do usuário no Shoppe Hunter.
- Acesso a `https://shoppehunter.vercel.app/*`: enviar os anúncios salvos e consultar o histórico na conta do usuário; conectar a extensão à conta com um clique.
- Scripts em `shopee.com.br`: ler o texto visível do anúncio ou da busca (preço, vendidos, avaliações) para mostrar o painel. Não roda no Centro do Vendedor.

**Código remoto:** Não, não uso código remoto. (Todo o JavaScript está no pacote.)

**Uso de dados — marque:**
- [x] Informações de autenticação (o token de acesso ao Shoppe Hunter)
- [x] Conteúdo do site (texto dos anúncios da Shopee: título, preço, vendidos, avaliações)
- Não marque: dados pessoais de identificação, saúde, financeiros, comunicações pessoais, localização, histórico da web, atividade do usuário.

**Certificações — marque as três:**
- Não vendo nem transfiro dados de usuários a terceiros, fora dos casos de uso aprovados
- Não uso nem transfiro dados para fins não relacionados à finalidade única
- Não uso nem transfiro dados para determinar crédito ou para empréstimos

**URL da política de privacidade:** https://shoppehunter.vercel.app/privacidade

## Antes de enviar
- Preencha na Vercel `COMPANY_NAME`, `COMPANY_DOC` e `SUPPORT_EMAIL`: a política de privacidade mostra esses dados, e a revisão do Google confere se a política está completa.
- Se mudar o site para um domínio próprio (ex.: shoppehunter.com.br), troque o endereço em `extensao/manifest.json`, `background.js` e `popup.js`, rode `npm run ext:pack` e envie uma nova versão.
