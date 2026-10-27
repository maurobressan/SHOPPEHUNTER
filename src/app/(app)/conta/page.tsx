import { prisma } from "@/lib/db";
import { requireCtx } from "@/lib/auth";
import { appUrl } from "@/lib/email";
import { updateProfile, changePassword, inviteMember, revokeInvite, removeMember, createApiToken, revokeApiToken, deleteAccount } from "@/app/actions/account";
import { Card, PageHeader, Field, input, btnPrimary, btnGhost, btnDanger, Table, td, Badge, Notice } from "@/components/ui";
import { Flash, type SP } from "@/components/Flash";
import { date, dateTime, str } from "@/lib/format";

export const metadata = { title: "Minha conta" };

const ROLE: Record<string, string> = { owner: "dono", admin: "administrador", member: "membro" };

export default async function Conta({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireCtx();
  const [members, invites, tokens] = await Promise.all([
    prisma.membership.findMany({ where: { accountId: ctx.accountId }, include: { user: { select: { name: true, email: true, lastLoginAt: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.invite.findMany({ where: { accountId: ctx.accountId, acceptedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.apiToken.findMany({ where: { accountId: ctx.accountId }, orderBy: { createdAt: "desc" } }),
  ]);
  const newToken = str(sp.token);
  const manager = ctx.role !== "member";

  return (
    <>
      <PageHeader title="Minha conta" subtitle={`Conta ${ctx.accountName} · você é ${ROLE[ctx.role]} · plano ${ctx.planName}`} />
      <Flash sp={sp} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Perfil">
          <form action={updateProfile} className="grid gap-3 md:grid-cols-2">
            <Field label="Seu nome"><input name="name" defaultValue={ctx.user.name} className={input} /></Field>
            <Field label="E-mail"><input value={ctx.user.email} disabled className={`${input} opacity-60`} /></Field>
            {manager && <Field label="Nome da conta/empresa"><input name="accountName" defaultValue={ctx.accountName} className={input} /></Field>}
            <div className="flex items-end"><button className={btnPrimary}>Salvar</button></div>
          </form>
        </Card>
        <Card title="Alterar senha">
          <form action={changePassword} className="grid gap-3 md:grid-cols-2">
            <Field label="Senha atual"><input type="password" name="current" required className={input} autoComplete="current-password" /></Field>
            <Field label="Nova senha" hint="mín. 8 caracteres, letras e números"><input type="password" name="password" required className={input} autoComplete="new-password" /></Field>
            <div><button className={btnGhost}>Alterar senha</button></div>
          </form>
        </Card>
      </div>

      <Card title={`Equipe (${members.length} de ${ctx.limits.members < 0 ? "∞" : ctx.limits.members} usuários)`} className="mt-6">
        <Table head={["Nome", "E-mail", "Papel", "Último acesso", ""]}>
          {members.map((m) => (
            <tr key={m.id}>
              <td className={td}>{m.user.name}</td>
              <td className={td}>{m.user.email}</td>
              <td className={td}><Badge tone={m.role === "owner" ? "green" : "default"}>{ROLE[m.role]}</Badge></td>
              <td className={td}>{dateTime(m.user.lastLoginAt)}</td>
              <td className={td}>{manager && m.role !== "owner" && <form action={removeMember}><input type="hidden" name="id" value={m.id} /><button className="text-xs text-mute hover:text-bad">remover</button></form>}</td>
            </tr>
          ))}
          {invites.map((i) => (
            <tr key={i.id} className="opacity-70">
              <td className={td}>convite pendente</td>
              <td className={td}>{i.email}</td>
              <td className={td}><Badge>{ROLE[i.role]}</Badge></td>
              <td className={td}>expira {date(i.expiresAt)}</td>
              <td className={td}>{manager && <form action={revokeInvite}><input type="hidden" name="id" value={i.id} /><button className="text-xs text-mute hover:text-bad">cancelar</button></form>}</td>
            </tr>
          ))}
        </Table>
        {manager && (
          <form action={inviteMember} className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="Convidar por e-mail"><input type="email" name="email" required className={input} /></Field>
            <Field label="Papel"><select name="role" className={input}><option value="member">Membro</option><option value="admin">Administrador</option></select></Field>
            <button className={btnGhost}>Enviar convite</button>
          </form>
        )}
      </Card>

      <Card title="Extensão “Salvar no Hunter”" className="mt-6">
        <div id="extensao" />
        {newToken && (
          <div className="mb-4">
            <Notice tone="green">
              Token criado. Copie agora — por segurança ele não será exibido de novo:
              <code className="mt-2 block break-all rounded bg-bg p-2 text-sm text-ink">{newToken}</code>
            </Notice>
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="text-sm text-mute">
            <div className="mb-4"><Notice tone="blue">O jeito mais fácil é pela página <a href="/extensao" className="font-semibold text-brand-blue underline">Extensão do Chrome</a>: instale e clique em <b>Conectar extensão</b>, sem copiar token. Os passos abaixo são a forma manual.</Notice></div>
            <p>Com a extensão, você entra na Shopee com a sua conta normalmente e o Hunter lê o que está na tela:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><b className="text-ink">Na busca, categoria ou loja:</b> cada anúncio ganha um selo com os vendidos, e um painel mostra os mais vendidos, o preço mediano e a tarifa. Um botão salva todos como concorrentes.</li>
              <li><b className="text-ink">No anúncio:</b> tarifas, margem e, se você já salvou antes, quantas vendas ele fez entre um registro e outro.</li>
            </ul>
            <ol className="mt-4 list-decimal space-y-1.5 pl-5">
              <li><a href="/shoppe-hunter-extensao.zip" download className="font-semibold text-brand-blue hover:underline">Baixe a extensão (.zip)</a> e descompacte numa pasta.</li>
              <li>No Chrome, abra <code>chrome://extensions</code> e ative o <b>Modo do desenvolvedor</b> (canto superior direito).</li>
              <li>Clique em <b>Carregar sem compactação</b> e escolha a pasta descompactada.</li>
              <li>Gere um token aqui ao lado, clique no ícone do Shoppe Hunter no Chrome, cole o token e clique em <b>Salvar e testar</b>. O endereço já vem preenchido: <code>{appUrl()}</code>.</li>
              <li>Entre na shopee.com.br e faça uma busca: os selos aparecem nos anúncios.</li>
            </ol>
            <p className="mt-3 text-xs">“Vendidos” é o total desde a criação do anúncio, como a Shopee mostra. Para saber as vendas da semana ou do mês, salve os anúncios e volte em outros dias: o Hunter calcula pela diferença. A extensão não acessa endereços internos da Shopee nem faz buscas sozinha: lê só a página que você está vendo.</p>
          </div>
          <div>
            <Table head={["Nome", "Início", "Último uso", ""]}>
              {tokens.map((t) => (
                <tr key={t.id}>
                  <td className={td}>{t.name}</td>
                  <td className={`${td} font-mono text-xs`}>{t.prefix}…</td>
                  <td className={td}>{dateTime(t.lastUsedAt)}</td>
                  <td className={td}><form action={revokeApiToken}><input type="hidden" name="id" value={t.id} /><button className="text-xs text-mute hover:text-bad">revogar</button></form></td>
                </tr>
              ))}
            </Table>
            <form action={createApiToken} className="mt-3 flex items-end gap-2">
              <Field label="Nome do token"><input name="name" placeholder="Chrome do escritório" className={input} /></Field>
              <button className={btnPrimary}>Gerar token</button>
            </form>
          </div>
        </div>
      </Card>

      <Card title="Privacidade e dados (LGPD)" className="mt-6">
        <div className="flex flex-wrap items-start gap-6">
          <div className="max-w-md text-sm text-mute">
            <p>Você pode baixar todos os dados desta conta (produtos, anúncios, histórico, fornecedores, vendas importadas e configurações) em formato JSON.</p>
            <a href="/api/conta/exportar" className={`${btnGhost} mt-3`}>Exportar meus dados</a>
          </div>
          {ctx.role === "owner" && (
            <form action={deleteAccount} className="max-w-md space-y-2 text-sm">
              <p className="text-mute">Excluir a conta apaga definitivamente todos os dados e usuários vinculados a ela.</p>
              <Field label={`Digite "${ctx.accountName}" para confirmar`}><input name="confirm" className={input} /></Field>
              <button className={btnDanger}>Excluir conta definitivamente</button>
            </form>
          )}
        </div>
      </Card>
    </>
  );
}
