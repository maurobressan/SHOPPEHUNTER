# Shoppe Hunter — Progresso

## Como usar (no seu computador)
- **Abrir:** dois cliques em `iniciar.bat`. Deixe a janela preta aberta e use o navegador (http://localhost:3000).
- **Primeiro acesso:** clique em *Começar grátis* e crie sua conta. **O primeiro usuário vira administrador da plataforma.**
- **Ver com dados fictícios:** Configurações → *Ativar DEMO*.
- **Extensão do Chrome:** Minha conta → Extensão (passo a passo e token). Pasta `extensao`.
- **Colocar à venda na internet:** veja `DEPLOY.md`.
- Testes: `npm test` (53 testes).

## Versão 2 — SaaS (26/10/2026)
- **Contas e acesso:** cadastro, login, sessões seguras (cookie httpOnly, senha com scrypt), recuperação de senha, limite de tentativas, troca de conta, equipe com convites e papéis (dono/administrador/membro).
- **Multi-cliente:** todos os dados têm `accountId`; cada página e ação verifica a sessão e filtra pela conta (testado: um cliente recebe 404 nos produtos de outro).
- **Planos e limites:** Grátis / Pro / Business editáveis no Admin (preço, limites, recursos). Teste grátis de 7 dias do Pro. Limites aplicados em produtos, relatórios/mês, importações/mês, usuários, coleta automática, extensão, alertas e IA.
- **Cobrança:** Stripe Checkout + Portal do cliente + webhook que sincroniza a assinatura. Sem Stripe configurado, o admin altera planos manualmente.
- **Administração:** clientes, plano efetivo, MRR, pagantes, testes, edição de planos/preços, tabelas de comissão globais versionadas, status das integrações.
- **Site público:** página de vendas, preços, perguntas frequentes, Termos de Uso e Política de Privacidade (modelos LGPD — revisar com advogado).
- **LGPD:** exportação de todos os dados (JSON) e exclusão da conta.
- **Extensão “Salvar no Hunter” (Chrome):** lê o anúncio aberto na Shopee (só a página visível), mostra tarifas e margem na hora, campos editáveis, salva no produto com 1 clique (1 registro por anúncio por dia).
- **Novos recursos:** simulador de compra de lote com fluxo de caixa (prazo de repasse da Shopee, dia de retorno do dinheiro, ROI mensalizado); alertas automáticos (queda de preço de concorrente, novo concorrente, margem baixa); comparação lado a lado de até 4 produtos; relatório do produto para imprimir/PDF; checklist de primeiros passos.
- **Coleta:** por conta, apenas para planos com coleta; cron do servidor em `/api/cron/coletar`.

## Versão 1 — base analítica
Calculadora com tarifas oficiais (out/2026), cálculo reverso, kits, cenários; importação de planilhas do Centro do Vendedor; tendências por snapshots; concorrência; fornecedores e cotações; Hunter Score; relatório por regras + IA opcional. Detalhes da pesquisa de taxas e APIs: [política oficial](https://seller.shopee.com.br/edu/article/26839).

## Limitações e pendências
- API de Afiliados implementada conforme documentação pública, **ainda não testada com credenciais reais**. Confirmar com a Shopee se o uso num serviço pago é permitido (ver DEPLOY.md).
- A extensão lê o texto da página; se a Shopee mudar o layout, os campos podem vir vazios (o usuário corrige à mão antes de salvar). Não foi testada numa página real da Shopee nesta sessão.
- Pagamento testado apenas na lógica (sem chaves Stripe reais).
- Preços dos planos (R$ 49,90 e R$ 99,90) são provisórios — ajuste em Administração → Planos.
- Termos e Privacidade são modelos: revisão jurídica obrigatória antes de vender.
- Limitador de tentativas de login fica na memória do servidor (trocar por Redis se usar várias instâncias).

## 26/10/2026 — Identidade visual Shoppe Hunter
- Logo aplicada (menu, cabeçalho, login, favicon, ícone da extensão). Arquivos gerados por `scripts/brand-assets.mjs` a partir de `brand-src/logo-original.webp`.
- Tema claro como padrão, tema escuro opcional (botão da lua na barra superior). Cores da logo como variáveis em `globals.css`.
- Menu lateral agrupado (Descobrir, Analisar, Minha loja, Conta), barra superior com busca, alertas e menu do usuário; atalhos rápidos e progresso dos primeiros passos no painel.
- Página inicial, preços e login redesenhados; calculadora com o lucro por venda em destaque.

- Página inicial com fundo colorido (azul-marinho e tons de azul), fotos de pessoas (Unsplash, licença gratuita) e ilustrações das telas marcadas como dados de exemplo. Fundo da área logada levemente azulado.
- Importação da planilha mais fácil de achar: botão 'Importar planilha' na barra superior, item 'Vendas e planilha' no menu e passo a passo de como exportar no Centro do Vendedor.

- Extensão 1.1: nas buscas, categorias e lojas da Shopee cada anúncio ganha um selo com os vendidos (e as vendas medidas, se já acompanhado); painel com mais vendidos, preço mediano e tarifa; botão para salvar todos os anúncios da página como concorrentes. Vendas 'por mês' não são tratadas como total. Rota /api/ext/lookup. Endereço padrão = site publicado. Download em /shoppe-hunter-extensao.zip (gerar de novo com Compress-Archive quando a extensão mudar).

- Extensão 1.2: página /extensao no site com detecção da extensão e botão 'Conectar extensão' (sem copiar token; o site entrega o token por window.postMessage a um script da extensão que só roda no domínio do Hunter). Login volta para a página pedida (?next=). Pasta loja-chrome/ com pacote, imagens e textos para a Chrome Web Store; 'npm run ext:pack' gera os dois .zip. Depois de aprovada, definir NEXT_PUBLIC_EXTENSION_URL na Vercel.

- Novos recursos (27/10/2026): 'Vale a pena?' (/vale-a-pena, veredito em semáforo baseado no Hunter Score, com a regra de cada item e próximos passos; aceita link do anúncio); Shopee Ads na calculadora (ROAS mínimo e alvo, ACOS, CPC máximo, resultado da campanha — src/lib/ads.ts); Estoque e reposição (/estoque, modelo SkuStock + migração 20261027000000_sku_stock, ritmo dos 30 dias até o último pedido importado, pedir até = acaba − prazo − 7 dias; aviso no painel). Testes em tests/features.test.ts.

- Segurança (27/10/2026): limite de tentativas de login/cadastro/recuperação agora no banco (modelo RateLimit, chave em hash, migração 20261027010000_rate_limit), com limite também por IP no login; token da extensão não passa mais pelo endereço da página (aparece só na tela, com botão Copiar).

