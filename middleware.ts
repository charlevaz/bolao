import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl

  // Se a URL contém ?code= e está na raiz (/), redireciona para /reset-password
  // Isso permite que o SDK do cliente (supabase-js) processe o PKCE corretamente e dispare o evento PASSWORD_RECOVERY
  if (searchParams.has('code') && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/reset-password'
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
