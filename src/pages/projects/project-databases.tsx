import { useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AwsEnvironmentPage } from "./aws-environment";
import { AzureEnvironmentPage } from "./azure-environment";

export function ProjectDatabasesPage({ initialCloud = "aws" }: { initialCloud?: "aws" | "azure" }) {
  const { projectId } = useParams<{ projectId: string }>();
  const [cloud, setCloud] = useState(initialCloud);
  return <div className="space-y-6">
    <PageHeader title="Bases PostgreSQL" back={{ to: `/projects/${projectId}`, label: "Projet" }}
      description="Choisissez le fournisseur cloud puis une cible existante. Le cluster n’est pas recréé." />
    <Card className="space-y-3 p-6">
      <Label htmlFor="database-cloud">Fournisseur cloud</Label>
      <select id="database-cloud" value={cloud} onChange={(event) => setCloud(event.target.value as "aws" | "azure")}
        className="flex h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
        <option value="aws">AWS — Amazon RDS PostgreSQL</option>
        <option value="azure">Azure — PostgreSQL Flexible Server</option>
      </select>
      <p className="text-sm text-muted-foreground">Les bases et leur historique sont séparés par fournisseur. Changer ce choix ne crée ni ne supprime de ressource.</p>
    </Card>
    {cloud === "aws" ? <AwsEnvironmentPage embedded /> : <AzureEnvironmentPage embedded />}
  </div>;
}
