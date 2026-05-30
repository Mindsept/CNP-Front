import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppLayout } from "@/layouts/app-layout";
import { AuthLayout } from "@/layouts/auth-layout";
import { ProtectedRoute } from "./protected-route";

import { LoginPage } from "@/pages/login";
import { RegisterPage } from "@/pages/register";
import { DashboardPage } from "@/pages/dashboard";
import { ProjectsListPage } from "@/pages/projects/projects-list";
import { ProjectDetailPage } from "@/pages/projects/project-detail";
import { ProjectSettingsPage } from "@/pages/projects/project-settings";
import { GithubConnectPage } from "@/pages/github/github-connect";
import { GithubInstallationsPage } from "@/pages/github/github-installations";
import { GithubCallbackPage } from "@/pages/github/github-callback";
import { RepositoriesListPage } from "@/pages/repositories/repositories-list";
import { RepositoryDetailPage } from "@/pages/repositories/repository-detail";
import { RepositoryAnalysisPage } from "@/pages/repositories/repository-analysis";
import { RepositoryCiPage } from "@/pages/repositories/repository-ci";
import { RepositoryCdPage } from "@/pages/repositories/repository-cd";
import { ProjectSecretsPage } from "@/pages/secrets/project-secrets";
import { PlatformInfrastructurePage } from "@/pages/admin/platform-infrastructure";
import { JobDetailPage } from "@/pages/jobs/job-detail";
import { AuditLogPage } from "@/pages/audit/audit-log";
import { NotFoundPage } from "@/pages/not-found";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <DashboardPage /> },

          { path: "/projects", element: <ProjectsListPage /> },
          { path: "/projects/:projectId", element: <ProjectDetailPage /> },
          {
            path: "/projects/:projectId/settings",
            element: <ProjectSettingsPage />,
          },
          {
            path: "/projects/:projectId/repositories",
            element: <RepositoriesListPage />,
          },
          {
            path: "/projects/:projectId/secrets",
            element: <ProjectSecretsPage />,
          },

          {
            path: "/admin/infrastructure",
            element: <PlatformInfrastructurePage />,
          },
          {
            path: "/admin/cloud-targets",
            element: <Navigate to="/admin/infrastructure" replace />,
          },

          { path: "/github", element: <GithubConnectPage /> },
          {
            path: "/github/installations",
            element: <GithubInstallationsPage />,
          },
          { path: "/github/callback", element: <GithubCallbackPage /> },

          {
            path: "/repositories/:repositoryId",
            element: <RepositoryDetailPage />,
          },
          {
            path: "/repositories/:repositoryId/analysis",
            element: <RepositoryAnalysisPage />,
          },
          {
            path: "/repositories/:repositoryId/ci",
            element: <RepositoryCiPage />,
          },
          {
            path: "/repositories/:repositoryId/cd",
            element: <RepositoryCdPage />,
          },

          { path: "/jobs/:jobId", element: <JobDetailPage /> },
          { path: "/audit", element: <AuditLogPage /> },

          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
