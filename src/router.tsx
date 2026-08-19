import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { makeQueryClient } from "@/lib/query";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const queryClient = makeQueryClient();
  const router = createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    context: { queryClient },
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
  return router;
}
