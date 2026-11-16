import { ArrowRight, Workflow, ShieldCheck, Link2 } from "lucide-react";
import { Card, EmptyState, StatusBadge } from "./ui";
export function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
  owner: number;
}) {
  return (
    <>
      <Card className="placeholder-card">
        <div className="section-heading">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <StatusBadge status="NOT_CONNECTED" tone="neutral" />
        </div>
        <EmptyState
          title="This workspace is getting ready"
          description="No business records are connected yet. This page will become available when its workflow is implemented."
        />
        <div className="placeholder-flow">
          <span>
            <Workflow size={19} aria-hidden />
            Connected documents
          </span>
          <ArrowRight size={17} aria-hidden />
          <span>
            <ShieldCheck size={19} aria-hidden />
            Role-based access
          </span>
          <ArrowRight size={17} aria-hidden />
          <span>
            <Link2 size={19} aria-hidden />
            Traceable decisions
          </span>
        </div>
      </Card>
    </>
  );
}
