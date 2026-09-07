import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "./lib/auth";
import Layout from "@/components/layout";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Inventory from "@/pages/inventory";
import Categories from "@/pages/categories";
import Suppliers from "@/pages/suppliers";
import Purchases from "@/pages/purchases";
import Sales from "@/pages/sales";
import Customers from "@/pages/customers";
import Employees from "@/pages/employees";
import Attendance from "@/pages/attendance";
import Leaves from "@/pages/leaves";
import Payroll from "@/pages/payroll";
import Expenses from "@/pages/expenses";
import Notifications from "@/pages/notifications";
import AiInsights from "@/pages/ai-insights";
import AiAssistant from "@/pages/ai-assistant";
import POS from "@/pages/pos";
import AuditLogs from "@/pages/audit-logs";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute({
  component: Component,
  permission,
}: {
  component: React.ComponentType;
  permission?: string;
}) {
  const { isAuthenticated, isLoading, can } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  if (permission && !can(permission)) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
          <div className="text-6xl">🔒</div>
          <h2 className="text-xl font-semibold text-foreground">
            Access Denied
          </h2>
          <p className="text-sm">
            You don't have permission to view this page.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route
        path="/"
        component={() => (
          <ProtectedRoute component={Dashboard} permission="dashboard" />
        )}
      />
      <Route
        path="/pos"
        component={() => <ProtectedRoute component={POS} permission="pos" />}
      />
      <Route
        path="/audit-logs"
        component={() => (
          <ProtectedRoute component={AuditLogs} permission="audit-logs" />
        )}
      />
      <Route
        path="/products"
        component={() => (
          <ProtectedRoute component={Products} permission="products" />
        )}
      />
      <Route
        path="/inventory"
        component={() => (
          <ProtectedRoute component={Inventory} permission="inventory" />
        )}
      />
      <Route
        path="/categories"
        component={() => (
          <ProtectedRoute component={Categories} permission="categories" />
        )}
      />
      <Route
        path="/suppliers"
        component={() => (
          <ProtectedRoute component={Suppliers} permission="suppliers" />
        )}
      />
      <Route
        path="/purchases"
        component={() => (
          <ProtectedRoute component={Purchases} permission="purchases" />
        )}
      />
      <Route
        path="/sales"
        component={() => (
          <ProtectedRoute component={Sales} permission="sales" />
        )}
      />
      <Route
        path="/customers"
        component={() => (
          <ProtectedRoute component={Customers} permission="customers" />
        )}
      />
      <Route
        path="/employees"
        component={() => (
          <ProtectedRoute component={Employees} permission="employees" />
        )}
      />
      <Route
        path="/attendance"
        component={() => (
          <ProtectedRoute component={Attendance} permission="attendance" />
        )}
      />
      <Route
        path="/leaves"
        component={() => (
          <ProtectedRoute component={Leaves} permission="leaves" />
        )}
      />
      <Route
        path="/payroll"
        component={() => (
          <ProtectedRoute component={Payroll} permission="payroll" />
        )}
      />
      <Route
        path="/expenses"
        component={() => (
          <ProtectedRoute component={Expenses} permission="expenses" />
        )}
      />
      <Route
        path="/notifications"
        component={() => (
          <ProtectedRoute
            component={Notifications}
            permission="notifications"
          />
        )}
      />
      <Route
        path="/ai-insights"
        component={() => (
          <ProtectedRoute component={AiInsights} permission="ai-insights" />
        )}
      />
      <Route
        path="/ai-assistant"
        component={() => (
          <ProtectedRoute component={AiAssistant} permission="ai-assistant" />
        )}
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
