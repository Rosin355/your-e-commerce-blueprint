import { useStorefrontSeo } from "@/hooks/useStorefrontSeo";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useStorefrontSeo({
    title: 'Pagina non trovata | Online Garden',
    description: 'La pagina richiesta non è disponibile. Torna alla homepage di Online Garden.',
    path: location.pathname,
    noindex: true,
  });

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Pagina non trovata</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Torna alla homepage
        </a>
      </div>
    </div>
  );
};

export default NotFound;
