import type { WorkspaceForm } from "@/components/workspace/create-workspace";
import { deleteData, fetchData, postData, updateData } from "@/lib/fetch-util";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCreateWorkspace = () => {
    return useMutation({
        mutationFn: async (data: WorkspaceForm) => postData("/workspaces", data),
    });
};

export const useGetWorkspacesQuery = () => {
    return useQuery({
        queryKey: ["workspaces"],
        queryFn: async () => fetchData("/workspaces"),
    });
};

export const useGetWorkspaceQuery = (workspaceId: string) => {
    return useQuery({
        queryKey: ["workspace", workspaceId],
        queryFn: async () => fetchData(`/workspaces/${workspaceId}/projects`),

    });
};

export const useGetWorkspaceStatsQuery = (workspaceId?: string | null) => {
    const hasWorkspaceId = Boolean(
        workspaceId && workspaceId !== "null" && workspaceId !== "undefined"
    );

    return useQuery ({
        queryKey: ["workspace", workspaceId, "stats"],
        queryFn: async () => {
            if (!hasWorkspaceId) {
                throw new Error("Workspace id is required");
            }

            return fetchData(`/workspaces/${workspaceId}/stats`);
        },
        enabled: hasWorkspaceId,
    });
};

export const useGetWorkspaceDetailsQuery = (workspaceId: string) => {
    return useQuery({
        queryKey: ["workspace", workspaceId, "details"],
        queryFn: async () => fetchData(`/workspaces/${workspaceId}`),
    });
};


export const useGetArchivedItemsQuery = (workspaceId: string | null) => {
  return useQuery({
    queryKey: ["archived-items", workspaceId],
    queryFn: () => fetchData(`/workspaces/${workspaceId}/archived`),
    enabled: !!workspaceId,
  });
};

export const useUpdateWorkspaceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      workspaceId: string;
      data: { name: string; description: string; color: string };
    }) => updateData(`/workspaces/${payload.workspaceId}`, payload.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-details", variables.workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};

export const useTransferWorkspaceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { workspaceId: string; newOwnerId: string }) =>
      updateData(`/workspaces/${payload.workspaceId}/transfer-ownership`, {
        newOwnerId: payload.newOwnerId,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-details", variables.workspaceId],
      });
    },
  });
};

export const useDeleteWorkspaceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => deleteData(`/workspaces/${workspaceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};

export const useInviteMemberMutation = () => {
  return useMutation({
    mutationFn: (data: {
      email: string;
      role: string;
      workspaceId: string;
    }) => postData(`/workspaces/${data.workspaceId}/invite-member`, data),
  });
}; 

export const useAcceptInviteByTokenMutation = () => {
  return useMutation({
    mutationFn: (token: string) =>
      postData(`/workspaces/accept-invite-token`, {
        token,
      }),
  });
};

export const useAcceptGenerateInviteMutation = () => {
  return useMutation ({
    mutationFn: (workspaceId: string) =>
      postData(`/workspaces/${workspaceId}/accept-generate-invite`, {}),
  });
};