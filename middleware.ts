import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl

  // Se a URL contém ?code= e NÃO está na rota /auth/callback,
  // redireciona para /auth/callback mantendo os parâmetros
  if (searchParams.has('code') && !pathname.startsWith('/auth/callback')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    // Preservar o parâmetro next para saber para onde redirecionar depois
    if (!searchParams.has('next')) {
      // Se veio de reset de senha, mandar para /reset-password
      url.searchParams.set('next', '/reset-password')
    }
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Rodar middleware em todas as rotas exceto arquivos estáticos e API
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
