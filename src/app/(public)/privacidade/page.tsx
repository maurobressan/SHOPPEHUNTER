export const metadata = { title: "Política de Privacidade" };

// MODELO baseado na LGPD (Lei 13.709/2018): revise com um advogado antes de vender.
export default function Privacidade() {
  const empresa = process.env.COMPANY_NAME || "[RAZÃO SOCIAL]";
  const email = process.env.SUPPORT_EMAIL || "[E-MAIL DO ENCARREGADO]";
  return (
    <article className="md mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1>Política de Privacidade</h1>
      <p>{empresa} é a controladora dos dados pessoais tratados no Shoppe Hunter.</p>
      <h2>Dados que coletamos</h2>
      <ul>
        <li>Cadastro: nome, e-mail e senha (armazenada apenas como hash).</li>
        <li>Uso: produtos, anúncios observados, cotações, configurações e planilhas de vendas que você importa.</li>
        <li>Pagamento: processado pelo Stripe; não armazenamos dados de cartão.</li>
        <li>Técnicos: data de acesso e navegador da sessão, para segurança.</li>
      </ul>
      <h2>Para que usamos</h2>
      <ul>
        <li>Prestar o serviço contratado (execução de contrato).</li>
        <li>Cobrança e obrigações fiscais (obrigação legal).</li>
        <li>Segurança e prevenção a fraudes (legítimo interesse).</li>
        <li>Comunicações sobre a conta. Marketing somente com o seu consentimento.</li>
      </ul>
      <h2>Compartilhamento</h2>
      <p>Somente com operadores necessários ao serviço: hospedagem, banco de dados, envio de e-mail, pagamentos e, quando você usa a análise com IA, o provedor de IA configurado (recebe apenas os dados do produto analisado).</p>
      <h2>Planilhas de vendas</h2>
      <p>As planilhas podem conter dados de pedidos. Usamos apenas os campos necessários ao relatório (pedido, SKU, valores, datas e status). Não importamos dados de contato dos compradores.</p>
      <h2 id="extensao">Extensão do Chrome</h2>
      <ul>
        <li>A extensão só funciona nas páginas de shopee.com.br que você abre e nas páginas do próprio Shoppe Hunter. Ela não lê outros sites, seu histórico de navegação, senhas ou dados de pagamento.</li>
        <li>Na Shopee, lê o texto visível dos anúncios (título, preço, quantidade vendida, nota e número de avaliações) para mostrar o painel. Envia à sua conta no Shoppe Hunter os números de identificação dos anúncios da página (para mostrar o histórico que você já salvou) e, quando você clica em salvar, os dados lidos do anúncio.</li>
        <li>Guarda no navegador apenas o token de acesso à sua conta e o endereço do Shoppe Hunter. O token pode ser revogado a qualquer momento em Minha conta.</li>
        <li>Os dados não são vendidos nem usados para publicidade, e não são compartilhados com terceiros além dos operadores listados acima.</li>
      </ul>
      <h2>Seus direitos</h2>
      <p>Você pode acessar, corrigir, exportar (em Minha conta → Exportar meus dados) e excluir seus dados (Minha conta → Excluir conta), além de revogar consentimentos. Para outras solicitações: {email}.</p>
      <h2>Retenção</h2>
      <p>Mantemos os dados enquanto a conta estiver ativa. Após a exclusão, os dados são apagados, exceto registros que a lei obriga a guardar.</p>
      <h2>Segurança</h2>
      <p>Senhas com hash, sessões em cookie protegido, isolamento de dados por conta e tokens de API armazenados apenas como hash.</p>
    </article>
  );
}
