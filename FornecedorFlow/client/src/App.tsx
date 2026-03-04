import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import TestLogin from "@/pages/test-login";
import Home from "@/pages/home";
import Validate from "@/pages/validate";
import History from "@/pages/history";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import ValidationDetail from "@/pages/validation-detail";
import AuthDebug from "@/pages/auth-debug";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/test-login" component={TestLogin} />
      <Route path="/auth-debug" component={AuthDebug} />
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/validate" component={Validate} />
          <Route path="/history" component={History} />
          <Route path="/reports" component={Reports} />
          <Route path="/settings" component={Settings} />
          <Route path="/validation/:id" component={ValidationDetail} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
