export const metadata = { title: "Termos de Uso" };

// MODELO: revise com um advogado antes de vender. Dados da empresa vêm do .env (COMPANY_NAME, COMPANY_DOC, SUPPORT_EMAIL).
export default function Termos() {
  const empresa = process.env.COMPANY_NAME || "[RAZÃO SOCIAL]";
  const doc = process.env.COMPANY_DOC || "[CNPJ]";
  const email = process.env.SUPPORT_EMAIL || "[E-MAIL DE SUPORTE]";
  return (
    <article className="md mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1>Termos de Uso</h1>
      <p>Estes termos regem o uso do Shopee Hunter Pro, oferecido por {empresa}, inscrita sob {doc}. Ao criar uma conta, você concorda com eles.</p>
      <h2>1. O serviço</h2>
      <p>Ferramenta de apoio à decisão para vendedores de marketplaces: cálculo de tarifas e margens, histórico de preços e vendas acumuladas, análise de concorrência, registro de fornecedores e importação de planilhas do próprio usuário.</p>
      <p>O Shopee Hunter Pro é independente e não tem vínculo com a Shopee. Nomes e marcas citados pertencem aos seus titulares.</p>
      <h2>2. Natureza das informações</h2>
      <p>Indicadores, recomendações e projeções são estimativas baseadas nos dados disponíveis e nas premissas informadas pelo usuário. Não constituem garantia de vendas, lucro ou resultado. As taxas da plataforma podem mudar; verifique sempre a documentação oficial antes de decisões relevantes.</p>
      <h2>3. Conta e uso aceitável</h2>
      <ul>
        <li>Você é responsável pela veracidade dos dados cadastrados e pela guarda da sua senha e tokens de acesso.</li>
        <li>É proibido usar o serviço para coletar dados de forma automatizada que viole termos de terceiros, burlar mecanismos de segurança ou revender o acesso.</li>
        <li>Podemos suspender contas que violem estes termos.</li>
      </ul>
      <h2>4. Planos, pagamento e cancelamento</h2>
      <p>Planos pagos são cobrados mensalmente de forma recorrente. O cancelamento pode ser feito a qualquer momento na área de Assinatura e vale ao fim do período já pago. Em contratações online, o consumidor pode desistir em até 7 dias (art. 49 do CDC), com reembolso integral.</p>
      <h2>5. Dados</h2>
      <p>Os dados que você cadastra pertencem a você. Você pode exportá-los ou excluir a conta a qualquer momento. O tratamento de dados pessoais segue a nossa Política de Privacidade.</p>
      <h2>6. Disponibilidade e responsabilidade</h2>
      <p>Empregamos esforços razoáveis para manter o serviço disponível, sem garantia de funcionamento ininterrupto. Nossa responsabilidade limita-se ao valor pago nos últimos 12 meses, salvo disposição legal em contrário.</p>
      <h2>7. Contato</h2>
      <p>{email}</p>
    </article>
  );
}
