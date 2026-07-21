import { Loader } from "@/components/loader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetArchivedItemsQuery } from "@/hooks/use-workspace";
import type { Project, Task } from "@/types";
import { format } from "date-fns";
import { Link, useSearchParams } from "react-router";

const Achieved = () => {
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const hasWorkspaceId = Boolean(
    workspaceId && workspaceId !== "null" && workspaceId !== "undefined"
  );

  const { data, isLoading } = useGetArchivedItemsQuery(workspaceId) as {
    data: {
      projects: Project[];
      tasks: Task[];
    };
    isLoading: boolean;
  };

  if (!hasWorkspaceId) {
    return (
      <div className="space-y-8 2xl:space-y-12">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Archived</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Select a workspace to view archived items.
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

  const archivedProjects = data?.projects || [];
  const archivedTasks = data?.tasks || [];

  return (
    <div className="space-y-8">
      {/* ARCHIVED PROJECTS */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Archived Projects</h1>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Updated At</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {archivedProjects.map((project) => (
                <TableRow key={project._id}>
                  <TableCell>
                    <Link
                      to={`/workspaces/${project.workspace}/projects/${project._id}`}
                      className="font-medium hover:text-primary hover:underline transition-colors"
                    >
                      {project.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">Project</p>
                  </TableCell>
                  <TableCell>{project.status}</TableCell>
                  <TableCell>{project.progress}%</TableCell>
                  <TableCell>{format(project.updatedAt, "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}

              {archivedProjects.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No archived projects found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ARCHIVED TASKS */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Archived Tasks</h1>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Updated At</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {archivedTasks.map((task) => (
                <TableRow key={task._id}>
                  <TableCell>
                    <Link
                      to={`/workspaces/${task.project.workspace}/projects/${task.project._id}/tasks/${task._id}`}
                      className="font-medium hover:text-primary hover:underline transition-colors"
                    >
                      {task.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">Task</p>
                  </TableCell>
                  <TableCell>{task.status}</TableCell>
                  <TableCell>{task.priority}</TableCell>
                  <TableCell>{task.project.title}</TableCell>
                  <TableCell>{format(task.updatedAt, "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}

              {archivedTasks.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No archived tasks found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Achieved;
