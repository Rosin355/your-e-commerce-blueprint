import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";

const AdminGuard = lazy(() => import("./admin/AdminGuard"));
const AccountCallback = lazy(() => import("./pages/AccountCallback"));
const Account = lazy(() => import("./pages/Account"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/products/:handle" element={<ProductDetail />} />
          <Route
            path="/account/callback"
            element={
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Caricamento...</div>}>
                <AccountCallback />
              </Suspense>
            }
          />
          <Route
            path="/account"
            element={
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Caricamento...</div>}>
                <Account />
              </Suspense>
            }
          />
          <Route
            path="/admin/import"
            element={
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Caricamento...</div>}>
                <AdminGuard />
              </Suspense>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
