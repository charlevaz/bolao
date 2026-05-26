import { NextResponse } from 'next/server';

export async function GET() {
  const API_KEY = process.env.API_FOOTBALL_KEY;
  if (!API_KEY) {
    return NextResponse.json({ error: 'Chave da API não configurada' }, { status: 500 });
  }

  try {
    // Usando season 2022 pois a 2026 ainda não está liberada na versão gratuita
    const response = await fetch('https://v3.football.api-sports.io/fixtures?league=1&season=2022', {
      headers: {
        'x-apisports-key': API_KEY
      }
    });
    
    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
       return NextResponse.json({ error: Object.values(data.errors)[0] }, { status: 400 });
    }

    if (!data.response || data.response.length === 0) {
      return NextResponse.json({ error: 'Nenhum jogo encontrado na API.' }, { status: 404 });
    }

    // Mapear os 64 jogos para o formato do nosso banco de dados
    const matches = data.response.map((item: any) => ({
      team_a: item.teams.home.name,
      team_b: item.teams.away.name,
      flag_a: item.teams.home.logo,
      flag_b: item.teams.away.logo,
      match_date: item.fixture.date,
      status: 'pending' // Mantemos como pending para que o admin possa testar e encerrar
    }));

    return NextResponse.json({ matches });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
