import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";

const AdminGuard = lazy(() => import("./admin/AdminGuard"));
const AccountCallback = lazy(() => import("./pages/AccountCallback"));
const Account = lazy(() => import("./pages/Account"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ShopifyCallback = lazy(() => import("./pages/ShopifyCallback"));

const queryClient = new QueryClient();

const SuspenseLoader = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Caricamento...</div>}>
    {children}
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/products/:handle" element={<ProductDetail />} />
            <Route path="/auth" element={<SuspenseLoader><Auth /></SuspenseLoader>} />
            <Route path="/reset-password" element={<SuspenseLoader><ResetPassword /></SuspenseLoader>} />
            <Route path="/account/callback" element={<SuspenseLoader><AccountCallback /></SuspenseLoader>} />
            <Route path="/account" element={<SuspenseLoader><Account /></SuspenseLoader>} />
            <Route path="/api/shopify/callback" element={<SuspenseLoader><ShopifyCallback /></SuspenseLoader>} />
            <Route path="/admin/import" element={<SuspenseLoader><AdminGuard /></SuspenseLoader>} />
            <Route path="/admin/settings" element={<SuspenseLoader><AdminGuard page="settings" /></SuspenseLoader>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
