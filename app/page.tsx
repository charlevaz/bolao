import React from 'react';

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      
      {/* Espaço para a Logo */}
      <div style={{ width: '150px', height: '150px', backgroundColor: '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', color: '#0F1849', fontWeight: 'bold', textAlign: 'center' }}>
        [Sua Logo Aqui]
      </div>

      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>
        Bolão <span style={{ color: '#2C67EA' }}>Entrego Sumarezinho</span>
      </h1>
      
      <p style={{ fontSize: '1.2rem', marginBottom: '3rem', textAlign: 'center', maxWidth: '600px', opacity: 0.9 }}>
        Participe do nosso bolão exclusivo da Copa do Mundo 2026. Acerte os placares, acumule pontos e ganhe prêmios incríveis!
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', width: '100%', maxWidth: '300px' }}>
        <button style={{ 
          backgroundColor: '#2C67EA', 
          color: '#FFFFFF', 
          border: 'none', 
          padding: '1rem', 
          borderRadius: '8px', 
          fontSize: '1.1rem', 
          fontWeight: 'bold', 
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          Entrar / Cadastrar
        </button>
        <button style={{ 
          backgroundColor: 'transparent', 
          color: '#FFFFFF', 
          border: '2px solid #2C67EA', 
          padding: '1rem', 
          borderRadius: '8px', 
          fontSize: '1.1rem', 
          fontWeight: 'bold', 
          cursor: 'pointer'
        }}>
          Ver Regras e Prêmios
        </button>
      </div>

    </div>
  );
}
