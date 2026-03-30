import { adminRoutes, apiPrefixAuth, authRoutes, publicRoutes } from '@/lib/route';
import { auth } from './auth';

export default auth((req) => {
  const { nextUrl } = req;

  try {
    const isLoggedIn = Boolean(req.auth);
    const userRole = req.auth?.user?.role;
    const userStatus = req.auth?.user?.status;
    const isDashboardRoute = nextUrl.pathname.startsWith('/dashboard');
    const isAdminRoute = adminRoutes.some((route) => nextUrl.pathname.startsWith(route));

    const isApiAuthRoute = nextUrl.pathname.startsWith(apiPrefixAuth);
    const isPublic = publicRoutes.some((route) => {
      if (route === '/') return nextUrl.pathname === '/';
      return nextUrl.pathname.startsWith(route);
    });
    const isAuthRoutes = authRoutes.includes(nextUrl.pathname);

    if (isApiAuthRoute) {
      return;
    }

    if (isLoggedIn && (userStatus === 'RESTRICTED' || userStatus === 'BLOCKED')) {
      if (isDashboardRoute || isAdminRoute) {
        const suspendedUrl = new URL('/account/suspended', nextUrl);
        suspendedUrl.searchParams.set('reason', userStatus.toLowerCase());
        return Response.redirect(suspendedUrl);
      }
    }

    if (isAuthRoutes) {
      if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      return;
    }

    if (!isLoggedIn && (isDashboardRoute || isAdminRoute)) {
      return Response.redirect(new URL('/sign-in', nextUrl));
    }

    if (isAdminRoute && userRole !== 'ADMIN') {
      return Response.redirect(new URL('/dashboard', nextUrl));
    }

    if (!isPublic && !isLoggedIn) {
      return Response.redirect(new URL('/sign-in', nextUrl));
    }

    return;
  } catch (error) {
    console.error('Middleware error:', error);
    return Response.redirect(new URL('/sign-in', nextUrl));
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*[.](?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
