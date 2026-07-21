import Workspace from "../models/workspace.js";
import Project from "../models/project.js";
import mongoose from "mongoose";
import Task from "../models/task.js";
import User from "../models/user.js";
import WorkspaceInvite from "../models/workspace-invite.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "..//libs/send-email.js"
import { recordActivity } from "../libs/index.js";


 
const createWorkspace = async (req, res) => {
    try {
        const { name, description, color } = req.body;
        const workspace = await Workspace.create({
            name,
            description,
            color,
            owner: req.user._id,
            members: [
                {
                    user: req.user._id,
                    role: "owner",
                    joinedAt: new Date(),
                },
            ],
        });

        res.status(201).json(workspace);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal server error",
        });
    }
};

const getWorkspaces = async (req, res) => {
    try {
        const workspaces = await Workspace.find({
            "members.user": req.user._id,
             }).sort({ createdAt: -1 });

             res.status(200).json(workspaces);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal server error",
        });
    }
};

const getWorkspaceDetails = async (req, res) => {
    try {
        const { workspaceId } = req.params;

        const workspace = await Workspace.findById({_id: workspaceId,
            "members.user": req.user._id,
        }).populate(
            "members.user",
            "name email profilePicture"
        );

        if (!workspace) {
            return res.status(404).json({
                message: "Workspace not found",
            });
        }

        res.status(200).json(workspace);

    } catch (error) {}
};

const getWorkspaceProjects = async (req, res) => {
    try {
      const { workspaceId } = req.params;
  
      const workspace = await Workspace.findOne({
        _id: workspaceId,
        "members.user": req.user._id,
      }).populate("members.user", "name email profilePicture");
  
      if (!workspace) {
        return res.status(404).json({
          message: "Workspace not found",
        });
      }
  
      const projects = await Project.find({
        workspace: workspaceId,
        isArchived: false,
       // members: { $in: { user: req.user._id } },
      })
       // .populate("tasks", "status")
        .sort({ createdAt: -1 });
  
      res.status(200).json({ projects, workspace });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  };

const getWorkspaceStats = async (req, res) => {
    try {
        const { workspaceId } = req.params;

        if (!workspaceId || !mongoose.Types.ObjectId.isValid(workspaceId)) {
            return res.status(400).json({
                message: "Valid workspace id is required",
            });
        }

        const workspace = await Workspace.findOne({
            _id: workspaceId,
            "members.user": req.user._id,
        });

        if (!workspace) {
            return res.status(404).json({
                message: "Workspace not found",
            });
        }

       const [totalProjects, projects] = await Promise.all([
        Project.countDocuments({ workspace: workspaceId, isArchived: false }),
        Project.find({ workspace: workspaceId, isArchived: false }).populate({
            path: "tasks",
            select: "title status dueDate project updatedAt isArchived priority",
            match: { isArchived: false },
        })
        .sort({ createdAt: -1 }),
         ]);
     
       const tasks = projects.flatMap((project) => project.tasks || []);
       const totalTasks = tasks.length;
       const totalProjectInProgress = projects.filter((project) => project.status === "In Progress").length;
       const totalProjectCompleted = projects.filter((project) => project.status === "Completed").length;
       const totalTaskCompleted = tasks.filter((task) => task.status === "Done").length;
       const totalTaskToDo = tasks.filter((task) => task.status === "To Do").length;
       const totalTaskInProgress = tasks.filter((task) => task.status === "In Progress").length;

       // get upcoming task in the next 7 days
       const today = new Date();
       const sevenDaysFromNow = new Date(today);
       sevenDaysFromNow.setDate(today.getDate() + 7);

       const upcomingTasks = tasks.filter((task) => {
        if (!task.dueDate) return false;

        const taskDate = new Date(task.dueDate);
        return taskDate > today && taskDate <= sevenDaysFromNow;
       });

       // get last 7 days tasks date

       const last7Days = Array.from({length: 7}, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - i));
        date.setHours(0, 0, 0, 0);
        return date;
       });

       const taskTrendsData = last7Days.map((date) => ({
        name: date.toLocaleDateString("en-US", { weekday: "short" }),
        completed: 0,
        inProgress: 0,
        todo: 0,
       }));

       //populate

       for (const task of tasks) {
            const taskDate = new Date(task.updatedAt);
            taskDate.setHours(0, 0, 0, 0);

            const dayInDate = last7Days.findIndex(
              (date) => 
                 date.getTime() === taskDate.getTime()
            );
            if (dayInDate !== -1) {
                const dayData = taskTrendsData[dayInDate];

                if (dayData) {
                    switch (task.status) {
                        case "Done":
                            dayData.completed++;
                            break;
                        case "In Progress":
                            dayData.inProgress++;
                            break;
                        case "To Do":
                            dayData.todo++;
                            break;    
                    }
                }
            }
        }

    // get project status distribution
    const projectStatusData = [
        { name: "Completed", value: 0, color: "#10b981" },
        { name: "In Progress", value: 0, color: "#3b82f6" },
        { name: "Planning", value: 0, color: "#f59e0b" },
    ];

    for (const project of projects) {
        switch (project.status) {
            case "Completed":
                projectStatusData[0].value++;                
                break;
            case "In Progress":
                projectStatusData[1].value++;
                break;
            case "Planning":
                projectStatusData[2].value++;
                 break;
        }
    }

    
    // Task priority distribution
    const taskPriorityData = [
        { name: "High", value: 0, color: "#ef4444" },
        { name: "Medium", value: 0, color: "#f59e0b" },
        { name: "Low", value: 0, color: "#6b7280" },
      ];
  
      for (const task of tasks) {
        switch (task.priority) {
          case "High":
            taskPriorityData[0].value++;
            break;
          case "Medium":
            taskPriorityData[1].value++;
            break;
          case "Low":
            taskPriorityData[2].value++;
            break;
        }
      }
  
      const workspaceProductivityData = [];
  
      for (const project of projects) {
        const projectTask = tasks.filter(
          (task) => task.project.toString() === project._id.toString()
        );
  
        const completedTask = projectTask.filter(
          (task) => task.status === "Done" && task.isArchived === false
        );
  
        workspaceProductivityData.push({
          name: project.title,
          completed: completedTask.length,
          total: projectTask.length,
        });
      }

      const stats = {
        totalProjects,
        totalTasks,
        totalProjectInProgress,
        totalProjectCompleted,
        totalTaskCompleted,
        totalTaskToDo,
        totalTaskInProgress,
      };
  
      res.status(200).json({
        stats,
        taskTrendsData,
        projectStatusData,
        taskPriorityData,
        workspaceProductivityData,
        upcomingTasks,
        recentProjects: projects.slice(0, 5),
      });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal server error"
        })
    }
  };

  // workspace.controller.ts
 const getArchivedItems = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const [projects, tasks] = await Promise.all([
      Project.find({ workspace: workspaceId, isArchived: true }),
      Task.find({ isArchived: true })
        .populate({
          path: "project",
          match: { workspace: workspaceId },
          select: "title workspace",
        }),
    ]);

    // filter out tasks whose populated project didn't match the workspace
    const filteredTasks = tasks.filter((t) => t.project);

    res.status(200).json({ projects, tasks: filteredTasks });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, description, color } = req.body;

    const workspace = await Workspace.findByIdAndUpdate(
      workspaceId,
      { name, description, color },
      { new: true }
    );

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    res.status(200).json(workspace);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const transferWorkspaceOwnership = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { newOwnerId } = req.body;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const currentOwnerId = workspace.owner.toString();

    workspace.members = workspace.members.map((member) => {
      if (member.user.toString() === newOwnerId) {
        member.role = "owner";
      } else if (member.user.toString() === currentOwnerId) {
        member.role = "admin";
      }
      return member;
    });

    workspace.owner = newOwnerId;
    await workspace.save();

    res.status(200).json(workspace);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const projects = await Project.find({ workspace: workspaceId }).select("_id");
    const projectIds = projects.map((p) => p._id);

    await Task.deleteMany({ project: { $in: projectIds } });
    await Project.deleteMany({ workspace: workspaceId });
    await Workspace.findByIdAndDelete(workspaceId);

    res.status(200).json({ message: "Workspace deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const inviteUserToWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { email, role } = req.body;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const userMemberInfo = workspace.members.find(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (!userMemberInfo || !["admin", "owner"].includes(userMemberInfo.role)) {
      return res.status(403).json({
        message: "You are not authorized to invite members to this workspace",
      });
    }

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const isMember = workspace.members.some(
      (member) => member.user.toString() === existingUser._id.toString()
    );

    if (isMember) {
      return res.status(400).json({
        message: "User already a member of this workspace",
      });
    }

    const isInvited = await WorkspaceInvite.findOne({
      user: existingUser._id,
      workspaceId: workspaceId,
    });

    if (isInvited && isInvited.expiresAt > new Date()) {
      return res.status(400).json({
        message: "User already invited to this workspace",
      });
    }

    if (isInvited && isInvited.expiresAt < new Date()) {
      await WorkspaceInvite.deleteOne({ _id: isInvited._id });
    }

    const inviteToken = jwt.sign(
      {
        user: existingUser._id,
        workspaceId: workspaceId,
        role: role || "member",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await WorkspaceInvite.create({
      user: existingUser._id,
      workspaceId: workspaceId,
      token: inviteToken,
      role: role || "member",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const invitationLink = `${process.env.FRONTEND_URL}/workspace-invite/${workspace._id}?tk=${inviteToken}`;

    const emailContent = `
      <p>You have been invited to join ${workspace.name} workspace</p>
      <p>Click here to join: <a href="${invitationLink}">${invitationLink}</a></p>
    `;

    await sendEmail(
      email,
      "You have been invited to join a workspace",
      emailContent
    );

    res.status(200).json({
      message: "Invitation sent successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const acceptGenerateInvite = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const isMember = workspace.members.some(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (isMember) {
      return res.status(400).json({
        message: "You are already a member of this workspace",
      });
    }

    workspace.members.push({
      user: req.user._id,
      role: "member",
      joinedAt: new Date(),
    });

    await workspace.save();

    await recordActivity(
      req.user._id,
      "joined_workspace",
      "Workspace",
      workspaceId,
      {
        description: `Joined ${workspace.name} workspace`,
      }
    );

    res.status(200).json({
      message: "Invitation accepted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const acceptInviteByToken = async (req, res) => {
  try {
    const { token } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { user, workspaceId, role } = decoded;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const isMember = workspace.members.some(
      (member) => member.user.toString() === user.toString()
    );

    if (isMember) {
      return res.status(400).json({
        message: "User already a member of this workspace",
      });
    }

    const inviteInfo = await WorkspaceInvite.findOne({
      user: user,
      workspaceId: workspaceId,
    });

    if (!inviteInfo) {
      return res.status(404).json({
        message: "Invitation not found",
      });
    }

    if (inviteInfo.expiresAt < new Date()) {
      return res.status(400).json({
        message: "Invitation has expired",
      });
    }

    workspace.members.push({
      user: user,
      role: role || "member",
      joinedAt: new Date(),
    });

    await workspace.save();

    await Promise.all([
      WorkspaceInvite.deleteOne({ _id: inviteInfo._id }),
      recordActivity(user, "joined_workspace", "Workspace", workspaceId, {
        description: `Joined ${workspace.name} workspace`,
      }),
    ]);

    res.status(200).json({
      message: "Invitation accepted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
export { createWorkspace,
   getWorkspaces,
    getWorkspaceDetails,
     getWorkspaceProjects, 
     getWorkspaceStats, 
     getArchivedItems,
     updateWorkspace,
    transferWorkspaceOwnership,
     deleteWorkspace,
     inviteUserToWorkspace,
     acceptGenerateInvite,
     acceptInviteByToken
      };
