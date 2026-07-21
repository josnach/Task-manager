import { Loader } from "@/components/loader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteWorkspaceMutation,
  useGetWorkspaceDetailsQuery,
  useTransferWorkspaceMutation,
  useUpdateWorkspaceMutation,
} from "@/hooks/use-workspace";
import type { Workspace } from "@/types";
import { SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

const WORKSPACE_COLORS = [
  "#EF4444",
  "#3B82F6",
  "#22C55E",
  "#EAB308",
  "#A855F7",
  "#F97316",
  "#14B8A6",
  "#1E293B",
];

const Settings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");

  const { data, isLoading } = useGetWorkspaceDetailsQuery(workspaceId!) as {
    data: Workspace;
    isLoading: boolean;
  };

  const { mutate: updateWorkspace, isPending: isUpdating } =
    useUpdateWorkspaceMutation();
  const { mutate: transferWorkspace, isPending: isTransferring } =
    useTransferWorkspaceMutation();
  const { mutate: deleteWorkspace, isPending: isDeleting } =
    useDeleteWorkspaceMutation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(WORKSPACE_COLORS[0]);
  const [transferMemberId, setTransferMemberId] = useState<string>("");

  useEffect(() => {
    if (data) {
      setName(data.name || "");
      setDescription(data.description || "");
      setColor(data.color || WORKSPACE_COLORS[0]);
    }
  }, [data]);

  if (!workspaceId) {
    return (
      <div className="space-y-8 2xl:space-y-12">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Select a workspace to manage its settings.
        </p>
      </div>
    );
  }

  if (isLoading)
    return (
      <div>
        <Loader />
      </div>
    );

  const handleSaveChanges = () => {
    updateWorkspace(
      { workspaceId, data: { name, description, color } },
      {
        onSuccess: () => {
          toast.success("Workspace updated successfully");
        },
        onError: (error: any) => {
          toast.error(
            error?.response?.data?.message || "Failed to update workspace"
          );
        },
      }
    );
  };

  const handleTransferWorkspace = () => {
    if (!transferMemberId) return;

    transferWorkspace(
      { workspaceId, newOwnerId: transferMemberId },
      {
        onSuccess: () => {
          toast.success("Workspace transferred successfully");
        },
        onError: (error: any) => {
          toast.error(
            error?.response?.data?.message || "Failed to transfer workspace"
          );
        },
      }
    );
  };

  const handleDeleteWorkspace = () => {
    deleteWorkspace(workspaceId, {
      onSuccess: () => {
        toast.success("Workspace deleted successfully");
        navigate("/workspaces");
      },
      onError: (error: any) => {
        toast.error(
          error?.response?.data?.message || "Failed to delete workspace"
        );
      },
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* WORKSPACE SETTINGS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SettingsIcon className="size-5" />
            Workspace Settings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage your workspace settings and preferences
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Workspace"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-description">Description</Label>
            <Textarea
              id="workspace-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="My Personal workspace"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Workspace Color</Label>
            <div className="flex items-center gap-2">
              {WORKSPACE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`size-8 rounded-full transition-all ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-primary"
                      : "hover:opacity-80"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveChanges} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* TRANSFER WORKSPACE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transfer Workspace</CardTitle>
          <p className="text-sm text-muted-foreground">
            Transfer ownership of this workspace to another member
          </p>
        </CardHeader>

        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary">Transfer Workspace</Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Transfer Workspace</AlertDialogTitle>
                <AlertDialogDescription>
                  Select a member to transfer ownership of this workspace to.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="py-2">
                <Select
                  value={transferMemberId}
                  onValueChange={setTransferMemberId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {data?.members
                      ?.filter((member) => member.role !== "owner")
                      .map((member) => (
                        <SelectItem
                          key={member.user._id}
                          value={member.user._id}
                        >
                          {member.user.name} ({member.user.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleTransferWorkspace}
                  disabled={!transferMemberId || isTransferring}
                >
                  {isTransferring ? "Transferring..." : "Transfer"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* DANGER ZONE */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">
            Danger Zone
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Irreversible actions for your workspace
          </p>
        </CardHeader>

        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Workspace</Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{data?.name}" and all of its
                  projects, tasks, and data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteWorkspace}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Deleting..." : "Delete Workspace"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
