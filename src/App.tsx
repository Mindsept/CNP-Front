import { useState } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { router } from "@/routes/router";
import { TooltipProvider } from "@/components/ui/tooltip";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error: unknown) => {
          const status = (error as { status?: number })?.status;
          if (status === 401 || status === 403 || status === 404) return false;
          return failureCount < 1;
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export default function App() {
  const [client] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={150}>
        <RouterProvider router={router} />
        <Toaster
          position="bottom-right"
          theme="dark"
          richColors
          toastOptions={{
            classNames: {
              toast:
                "!bg-surface-elevated !border !border-border !text-foreground",
              description: "!text-muted-foreground",
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
