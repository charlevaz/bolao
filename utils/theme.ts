export const getTheme = () => {
  const client = process.env.NEXT_PUBLIC_CLIENT || 'entrego';

  if (client === 'barbearia') {
    return {
      id: 'barbearia',
      primaryColor: '#111A35',
      secondaryColor: '#C5A25D',
      backgroundColor: '#111A35',
      highlightColor: '#C5A25D',
      buttonColor: '#C5A25D',
      bgLight: '#f8fafc',
      appName: 'Barbearia Capitão',
      groups: [
        { dbValue: 'barbearia', label: 'Cliente', plural: 'Clientes' }
      ],
      hasTwoPools: false,
      documentType: 'Celular',
      documentLength: 11,
      homeTitlePrefix: 'Bolão',
      homeTitleHighlight: 'Capitão da Chácara',
      homeSubtitle: 'Aqui o seu palpite vale prêmios de verdade! Participe do nosso bolão exclusivo, viva a emoção da Copa do Mundo e descubra que ser cliente da Barbearia Capitão sempre traz as melhores vantagens.',
      logos: ['/capitao_logo.png'],
      rules: {
        description: 'Os 5 clientes/parceiros com mais pontos ao final da Copa ganham PRÊMIOS EXCLUSIVOS',
        prizes: [
          { position: '1º', description: 'R$ 100', color: '#4ade80' },
          { position: '2º', description: '2 Cortes de Cabelo', color: '#4ade80' },
          { position: '3º', description: '1 Corte de Cabelo', color: '#60a5fa' },
          { position: '4º', description: '1 Corte de Cabelo', color: '#60a5fa' },
          { position: '5º', description: '1 Corte de Cabelo', color: '#60a5fa' }
        ],
        generalRules: [
          'É obrigatório ser cliente ou parceiro da barbearia para participar e concorrer aos prêmios;',
          'Será permitido apenas 1 palpite por jogo por Celular;',
          'Os palpites devem ser enviados antes do início da partida;',
          'Não será permitido alterar palpites após o fechamento;',
          'Válido durante a Copa do Mundo.'
        ],
        footer: 'Ao final da Copa, os 5 clientes com maior pontuação no ranking geral serão premiados.',
        whatsapp: '5511971911519'
      }
    };
  }

  // Padrão: EntreGô
  return {
    id: 'entrego',
    primaryColor: '#2C67EA',
    secondaryColor: '#eab308',
    backgroundColor: '#0F1849',
    highlightColor: '#2C67EA',
    buttonColor: '#2C67EA',
    bgLight: '#eff6ff',
    appName: 'Bolão EntreGô',
    groups: [
      { dbValue: 'entregador', label: 'Entregador', plural: 'Entregadores' },
      { dbValue: 'colaborador', label: 'Colaborador', plural: 'Colaboradores' }
    ],
    hasTwoPools: true,
    documentType: 'CPF',
    documentLength: 14,
    homeTitlePrefix: 'Bolão',
    homeTitleHighlight: 'EntreGô Sumarezinho, Aldeota e Recreio',
    homeSubtitle: 'Participe do nosso bolão exclusivo da Copa do Mundo 2026. Acerte os placares, acumule pontos e ganhe prêmios incríveis!',
    logos: ['/logo-sumarezinho.png', '/logo-aldeota.png', '/logo-recreio.png'],
    rules: {
      description: 'Os 50 entregadores com mais pontos ao final da Copa ganham PRÊMIOS EXCLUSIVOS',
      prizes: [
        { position: '1º', description: 'R$ 1.000,00', color: '#4ade80' },
        { position: '2º', description: 'R$ 500,00', color: '#4ade80' },
        { position: '3º', description: 'R$ 300,00', color: '#4ade80' },
        { position: '4º ao 10º', description: 'Jaqueta Reforçada', color: '#60a5fa' },
        { position: '11º ao 20º', description: 'Jaqueta Corta Vento', color: '#60a5fa' },
        { position: '21º ao 30º', description: 'Capa de Chuva Oficial', color: '#60a5fa' },
        { position: '31º ao 40º', description: 'Camiseta', color: '#60a5fa' },
        { position: '41º ao 50º', description: 'Bag', color: '#60a5fa' }
      ],
      generalRules: [
        'Para ser elegível ao prêmio, o entregador precisa ter feito pelo menos 10 rotas completas por semana durante a promoção. Para entregadores novos, a contagem inicia a partir da segunda semana que o cadastro foi ativado. No período de apuração final da Copa, é obrigatório estar ativo em uma das 3 franquias (Sumarezinho, Aldeota ou Recreio);',
        'Será permitido apenas 1 palpite por jogo por CPF;',
        'Os palpites devem ser enviados antes do início da partida;',
        'Não será permitido alterar palpites após o fechamento;',
        'Válido durante a copa (11 de Junho a 19 de Julho).'
      ],
      footer: 'Ao final da Copa, os 50 entregadores com maior pontuação no ranking geral serão premiados.',
      whatsapp: '5511917050962'
    }
  };
};
