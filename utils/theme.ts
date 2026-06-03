export const getTheme = () => {
  const client = process.env.NEXT_PUBLIC_CLIENT || 'entrego';

  if (client === 'barbearia') {
    return {
      id: 'barbearia',
      primaryColor: '#111A35',
      secondaryColor: '#C5A25D',
      backgroundColor: '#111A35',
      highlightColor: '#C5A25D',
      bgLight: '#f8fafc',
      appName: 'Barbearia Capitão',
      labels: {
        entregador: 'Cliente',
        colaborador: 'Parceiro',
        entregadores: 'Clientes',
        colaboradores: 'Parceiros'
      },
      homeTitlePrefix: 'Bolão',
      homeTitleHighlight: 'Capitão da Chácara',
      homeSubtitle: 'Acompanhe os jogos da Copa do Mundo, concorra a prêmios e a cada 2 indicações ganhe um corte grátis!',
      logos: ['/capitao_logo.jpg']
    };
  }

  // Padrão: EntreGô
  return {
    id: 'entrego',
    primaryColor: '#2C67EA',
    secondaryColor: '#eab308',
    backgroundColor: '#0F1849',
    highlightColor: '#2C67EA',
    bgLight: '#eff6ff',
    appName: 'Bolão EntreGô',
    labels: {
      entregador: 'Entregador',
      colaborador: 'Colaborador',
      entregadores: 'Entregadores',
      colaboradores: 'Colaboradores'
    },
    homeTitlePrefix: 'Bolão',
    homeTitleHighlight: 'EntreGô Sumarezinho, Aldeota e Recreio',
    homeSubtitle: 'Participe do nosso bolão exclusivo da Copa do Mundo 2026. Acerte os placares, acumule pontos e ganhe prêmios incríveis!',
    logos: ['/logo-sumarezinho.png', '/logo-aldeota.png', '/logo-recreio.png']
  };
};
