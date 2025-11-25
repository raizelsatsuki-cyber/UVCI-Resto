
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // 1. Initialiser la réponse
  const res = NextResponse.next();

  // 2. Configuration explicite des clés pour éviter l'erreur "Supabase Url is required"
  // si les variables d'environnement ne sont pas chargées par le runtime.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dvifigrhzyzrsxvvnawj.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2aWZpZ3Joenl6cnN4dnZuYXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MTUyNTAsImV4cCI6MjA3OTM5MTI1MH0.aXpczLruzrjpYspqV94xX9Y7agw_6CKzvAaSVaQvMzM";

  // 3. Créer le client middleware avec les options explicites
  const supabase = createMiddlewareClient(
    { req, res },
    { 
      supabaseUrl, 
      supabaseKey 
    }
  );

  // 4. Rafraîchir la session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = req.nextUrl.pathname;

  // Définition des routes protégées
  const protectedPaths = ['/', '/menu', '/admin', '/about'];
  const isProtectedRoute = protectedPaths.some(p => path === p || path.startsWith(p + '/'));
  
  const isAuthPage = path.startsWith('/auth/login');

  // --- LOGIQUE DE SÉCURITÉ ---

  // Cas A : Utilisateur NON connecté sur une route protégée -> Redirection Login
  if (isProtectedRoute && !session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    return NextResponse.redirect(redirectUrl);
  }

  // Cas B : Utilisateur connecté sur la page de Login -> Redirection Accueil
  if (isAuthPage && session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/';
    return NextResponse.redirect(redirectUrl);
  }

  // 5. Retourner la réponse avec les cookies mis à jour
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
