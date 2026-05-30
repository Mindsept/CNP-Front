import { api } from "@/lib/api";
import type {
  ContainerRegistryListResponse,
  CreateContainerRegistryInput,
  CreateContainerRegistryResponse,
} from "@/types/container-registry";

export const containerRegistryService = {
  // Available to CI/CD pages to know if a default registry exists.
  list(): Promise<ContainerRegistryListResponse> {
    return api.get<ContainerRegistryListResponse>("/container-registries");
  },

  // Admin-only: register/update the shared registry.
  create(
    input: CreateContainerRegistryInput,
  ): Promise<CreateContainerRegistryResponse> {
    return api.post<CreateContainerRegistryResponse>(
      "/admin/container-registries",
      input,
    );
  },
};
