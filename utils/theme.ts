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
      homeSubtitle: 'Acompanhe os jogos da Copa do Mundo, concorra a prêmios e a cada 2 indicações ganhe um corte grátis!',
      logos: ['/capitao_logo.png']
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
    logos: ['/logo-sumarezinho.png', '/logo-aldeota.png', '/logo-recreio.png']
  };
};
