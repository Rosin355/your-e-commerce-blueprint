import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";
import { CONTACT_PATH, PRIVACY_POLICY } from "@/config/legal";

const AdminGuard = lazy(() => import("./admin/AdminGuard"));
const AccountCallback = lazy(() => import("./pages/AccountCallback"));
const Account = lazy(() => import("./pages/Account"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AllProducts = lazy(() => import("./pages/AllProducts"));
const CollectionPage = lazy(() => import("./pages/CollectionPage"));
const Contacts = lazy(() => import("./pages/Contacts"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

// Admin v2 (sola lettura, alimentato da product-admin-api)
const AdminV2Guard = lazy(() => import("./adminv2/AdminV2Guard"));
const AdminDashboard = lazy(() => import("./adminv2/pages/DashboardPage"));
const AdminNewProduct = lazy(() => import("./adminv2/pages/NewProductPage"));
const AdminProducts = lazy(() => import("./adminv2/pages/ProductsPage"));
const AdminProductDetail = lazy(() => import("./adminv2/pages/ProductDetailPage"));
const AdminImportsPage = lazy(() =>
  import("./adminv2/pages/PlaceholderPages").then((m) => ({ default: m.ImportsPage })),
);
const AdminCategoriesPage = lazy(() =>
  import("./adminv2/pages/CategoriesPage"),
);
const AdminPublicationsPage = lazy(() =>
  import("./adminv2/pages/PlaceholderPages").then((m) => ({ default: m.PublicationsPage })),
);
const AdminSettingsPage = lazy(() =>
  import("./adminv2/pages/PlaceholderPages").then((m) => ({ default: m.SettingsPage })),
);
const AdminTechnicalPage = lazy(() =>
  import("./adminv2/pages/PlaceholderPages").then((m) => ({ default: m.TechnicalToolsPage })),
);


const queryClient = new QueryClient();

const SuspenseLoader = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Caricamento...</div>}>
    {children}
  </Suspense>
);

// React Router non resetta lo scroll al cambio pagina: senza questo, navigando
// dal mega-menu o dal drawer la nuova pagina appare a metà scroll.
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/collections/all" element={<SuspenseLoader><AllProducts /></SuspenseLoader>} />
            <Route path="/collections/:handle" element={<SuspenseLoader><CollectionPage /></SuspenseLoader>} />
            <Route path="/products" element={<SuspenseLoader><AllProducts /></SuspenseLoader>} />
            <Route path="/products/:handle" element={<ProductDetail />} />
            <Route path={CONTACT_PATH} element={<SuspenseLoader><Contacts /></SuspenseLoader>} />
            <Route path={PRIVACY_POLICY.path} element={<SuspenseLoader><PrivacyPolicy /></SuspenseLoader>} />
            {/* Unavailable policies in config/legal.ts intentionally use the noindex catch-all. */}
            <Route path="/auth" element={<SuspenseLoader><Auth /></SuspenseLoader>} />
            <Route path="/reset-password" element={<SuspenseLoader><ResetPassword /></SuspenseLoader>} />
            <Route path="/account/callback" element={<SuspenseLoader><AccountCallback /></SuspenseLoader>} />
            <Route path="/account" element={<SuspenseLoader><Account /></SuspenseLoader>} />
            
            {/* Strumenti tecnici della versione precedente (accesso diretto) */}
            <Route path="/admin/import" element={<SuspenseLoader><AdminGuard /></SuspenseLoader>} />
            <Route path="/admin/settings-legacy" element={<SuspenseLoader><AdminGuard page="settings" /></SuspenseLoader>} />

            {/* Nuovo Admin Online Garden (sola lettura) */}
            <Route path="/admin" element={<SuspenseLoader><AdminV2Guard /></SuspenseLoader>}>
              <Route index element={<SuspenseLoader><AdminDashboard /></SuspenseLoader>} />
              <Route path="products" element={<SuspenseLoader><AdminProducts /></SuspenseLoader>} />
              <Route path="products/new" element={<SuspenseLoader><AdminNewProduct /></SuspenseLoader>} />
              <Route path="products/:productId" element={<SuspenseLoader><AdminProductDetail /></SuspenseLoader>} />
              <Route path="imports" element={<SuspenseLoader><AdminImportsPage /></SuspenseLoader>} />
              <Route path="categories" element={<SuspenseLoader><AdminCategoriesPage /></SuspenseLoader>} />
              <Route path="publications" element={<SuspenseLoader><AdminPublicationsPage /></SuspenseLoader>} />
              <Route path="settings" element={<SuspenseLoader><AdminSettingsPage /></SuspenseLoader>} />
              <Route path="technical" element={<SuspenseLoader><AdminTechnicalPage /></SuspenseLoader>} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
