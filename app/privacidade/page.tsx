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
          <li><strong>Auditoria de Prêmios:</strong> Validar a identidade do ganhador para a entrega segura das premiações ao final da Copa do Mundo.</li>
          <li><strong>Comunicação:</strong> Entrar em contato com os vencedores e enviar atualizações relevantes sobre o bolão.</li>
        </ul>
      </div>

      <div style={{ backgroundColor: theme.primaryColor, border: `1px solid ${theme.secondaryColor}`, padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.3rem', color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa', marginBottom: '1rem' }}>2. Segurança e Compartilhamento</h3>
        <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
          Os dados armazenados não são comercializados, alugados ou compartilhados com terceiros para fins de marketing. O acesso ao banco de dados é restrito à administração para fins de gestão do ranking e premiação. O sistema implementa políticas de segurança de dados (Row Level Security) para impedir o acesso público a informações sensíveis.
        </p>
      </div>

      <div style={{ backgroundColor: theme.primaryColor, border: `1px solid ${theme.secondaryColor}`, padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.3rem', color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa', marginBottom: '1rem' }}>3. Exclusão de Conta (Direito ao Esquecimento)</h3>
        <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
          Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de solicitar a exclusão definitiva dos seus dados pessoais e de sua conta a qualquer momento.
        </p>
        <div style={{ backgroundColor: theme.backgroundColor, padding: '1.5rem', borderRadius: '8px', border: `1px dashed ${theme.secondaryColor}` }}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#fff' }}>Como solicitar a exclusão:</p>
          <p style={{ opacity: 0.9 }}>
            Entre em contato com nossa administração através do WhatsApp: <strong><a href={`https://wa.me/${theme.rules?.whatsapp}`} target="_blank" rel="noreferrer" style={{ color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa' }}>+{theme.rules?.whatsapp}</a></strong>
          </p>
          <p style={{ opacity: 0.9, marginTop: '1rem', fontSize: '0.9rem', color: '#ff4444' }}>
            <strong>Aviso:</strong> A exclusão da conta é um processo irreversível. Todos os seus palpites, pontos acumulados e chance de receber prêmios serão permanentemente apagados. O prazo máximo para o processamento e exclusão sistêmica dos seus dados após a solicitação via WhatsApp é de <strong>7 dias úteis</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
