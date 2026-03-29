import { apiPrefixAuth, authRoutes, publicRoutes } from '@/lib/route';
import { auth } from './auth';

export default auth((req) => {
  const { nextUrl } = req;
  try {
    const isLogedIn = !!req.auth;
    console.log('middleware.ts => req.auth: ', req.auth);

    const isApiAuthRoute = nextUrl.pathname.startsWith(apiPrefixAuth);
    const isPublic = publicRoutes.some((route) => {
      if (route === '/') return nextUrl.pathname === '/';
      return nextUrl.pathname.startsWith(route);
    });
    const isAuthRoutes = authRoutes.includes(nextUrl.pathname);

    if (isApiAuthRoute) {
      return;
    }

    if (isAuthRoutes) {
      if (isLogedIn) {
        return Response.redirect(new URL('/', nextUrl));
      }
      return;
    }

    if (!isPublic && !isLogedIn) {
      return Response.redirect(new URL('/auth/sign-in', nextUrl));
    }
    return;
  } catch (error) {
    console.error('Middleware error:', error);
    return Response.redirect(new URL('/auth/sign-in', nextUrl));
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
