import { Github } from "lucide-react";

import azureLogo from "@/assets/providers/azure.png";
import awsLogo from "@/assets/providers/aws.png";
import gcpLogo from "@/assets/providers/gcp.png";
import k3sLogo from "@/assets/providers/k3s.png";

interface LogoProps {
  className?: string;
}

/** Microsoft Azure logo. */
export function AzureLogo({ className }: LogoProps) {
  return (
    <img
      src={azureLogo}
      alt="Microsoft Azure"
      className={`object-contain ${className ?? ""}`}
    />
  );
}

/** Amazon Web Services logo. */
export function AwsLogo({ className }: LogoProps) {
  return (
    <img
      src={awsLogo}
      alt="Amazon Web Services"
      className={`object-contain ${className ?? ""}`}
    />
  );
}

/** Google Cloud logo. */
export function GcpLogo({ className }: LogoProps) {
  return (
    <img
      src={gcpLogo}
      alt="Google Cloud"
      className={`object-contain ${className ?? ""}`}
    />
  );
}

/** GHCR uses the GitHub mark. */
export function GhcrLogo({ className }: LogoProps) {
  return <Github className={className} />;
}

export function K3sLogo({ className }: LogoProps) {
  return <img src={k3sLogo} alt="k3s" className={`object-contain ${className ?? ""}`} />;
}
