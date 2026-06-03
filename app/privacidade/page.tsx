import Link from 'next/link';
import { getTheme } from '@/utils/theme';

export default function Privacidade() {
  const theme = getTheme();

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.8', color: '#fff' }}>
      <Link href="/" style={{ color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa', marginBottom: '2rem', display: 'inline-block' }}>← Voltar para a Home</Link>
      
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#fff', fontWeight: '900', textTransform: 'uppercase', textAlign: 'center' }}>
        Termos de Uso e Política de Privacidade (LGPD)
      </h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa', textAlign: 'center' }}>
        {theme.appName}
      </h2>

      <div style={{ backgroundColor: theme.primaryColor, border: `1px solid ${theme.secondaryColor}`, padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.3rem', color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa', marginBottom: '1rem' }}>1. Coleta e Uso de Dados Pessoais</h3>
        <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
          Para a participação no Bolão, coletamos informações essenciais como Nome, E-mail e {theme.documentType}. Estes dados são utilizados exclusivamente para as seguintes finalidades:
        </p>
        <ul style={{ listStylePosition: 'inside', opacity: 0.9, marginBottom: '1rem', paddingLeft: '1rem' }}>
          <li><strong>Prevenção à Fraude:</strong> Garantir a regra de apenas 1 (um) palpite por {theme.documentType} em cada jogo.</li>
          <li><strong>Auditoria de Prêmios:</strong> Validar a identidade do ganhador para a entrega segura das premiações ao final da competição.</li>
          <li><strong>Comunicação:</strong> Entrar em contato com os vencedores e enviar atualizações relevantes sobre o bolão.</li>
          <li><strong>Gestão da Plataforma:</strong> Garantir o funcionamento adequado da competição e do ranking.</li>
        </ul>
        <p style={{ opacity: 0.9 }}>
          O tratamento dos dados é realizado com base na execução das regras da promoção e no legítimo interesse de garantir a segurança, integridade e prevenção a fraudes.
        </p>
      </div>

      <div style={{ backgroundColor: theme.primaryColor, border: `1px solid ${theme.secondaryColor}`, padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.3rem', color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa', marginBottom: '1rem' }}>2. Segurança e Compartilhamento</h3>
        <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
          Os dados armazenados não são comercializados, alugados ou compartilhados com terceiros para fins de marketing. O acesso às informações é restrito aos administradores responsáveis pela gestão do ranking e premiação.
        </p>
        <p style={{ opacity: 0.9 }}>
          Adotamos medidas técnicas e organizacionais de segurança, incluindo controle de acesso (Row Level Security) e políticas de proteção de dados, para reduzir riscos de acesso não autorizado, perda ou uso indevido das informações.
        </p>
      </div>

      <div style={{ backgroundColor: theme.primaryColor, border: `1px solid ${theme.secondaryColor}`, padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.3rem', color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa', marginBottom: '1rem' }}>3. Armazenamento dos Dados</h3>
        <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
          Os dados serão armazenados pelo período necessário para a realização do bolão, auditoria dos resultados, entrega das premiações e cumprimento de eventuais obrigações legais.
        </p>
        <p style={{ opacity: 0.9 }}>
          Após o encerramento dessas finalidades, os dados poderão ser excluídos ou anonimizados de forma segura.
        </p>
      </div>

      <div style={{ backgroundColor: theme.primaryColor, border: `1px solid ${theme.secondaryColor}`, padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.3rem', color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa', marginBottom: '1rem' }}>4. Direitos do Titular dos Dados</h3>
        <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
          Nos termos da Lei Geral de Proteção de Dados (LGPD), o participante poderá solicitar:
        </p>
        <ul style={{ listStylePosition: 'inside', opacity: 0.9, paddingLeft: '1rem' }}>
          <li>Confirmação da existência de tratamento dos seus dados;</li>
          <li>Acesso aos dados armazenados;</li>
          <li>Correção de informações incompletas, inexatas ou desatualizadas;</li>
          <li>Exclusão dos dados pessoais, quando aplicável;</li>
          <li>Esclarecimentos sobre o tratamento realizado.</li>
        </ul>
      </div>

      <div style={{ backgroundColor: theme.primaryColor, border: `1px solid ${theme.secondaryColor}`, padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.3rem', color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa', marginBottom: '1rem' }}>5. Exclusão de Conta (Direito ao Esquecimento)</h3>
        <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
          Você poderá solicitar a exclusão definitiva da sua conta e dos seus dados pessoais a qualquer momento.
        </p>
        <div style={{ backgroundColor: theme.backgroundColor, padding: '1.5rem', borderRadius: '8px', border: `1px dashed ${theme.secondaryColor}` }}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#fff' }}>Como solicitar a exclusão:</p>
          <p style={{ opacity: 0.9 }}>
            Entre em contato com nossa administração através do WhatsApp: <strong><a href={`https://wa.me/${theme.rules?.whatsapp}`} target="_blank" rel="noreferrer" style={{ color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa' }}>+{theme.rules?.whatsapp}</a></strong>
          </p>
          <p style={{ opacity: 0.9, marginTop: '1rem', fontSize: '0.9rem', color: '#ff4444' }}>
            <strong>Importante:</strong> A exclusão da conta é um processo irreversível. Todos os seus palpites, pontos acumulados e eventual elegibilidade para prêmios serão permanentemente apagados. 
          </p>
          <p style={{ opacity: 0.9, marginTop: '0.5rem', fontSize: '0.9rem' }}>
            A solicitação será processada em até <strong>7 dias úteis</strong>, salvo quando houver necessidade de retenção dos dados para cumprimento de obrigação legal ou regulatória.
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: theme.primaryColor, border: `1px solid ${theme.secondaryColor}`, padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.3rem', color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa', marginBottom: '1rem' }}>6. Contato</h3>
        <p style={{ opacity: 0.9 }}>
          Em caso de dúvidas sobre privacidade, tratamento de dados ou exercício dos seus direitos, entre em contato pelo WhatsApp informado acima.
        </p>
      </div>
    </div>
  );
}
