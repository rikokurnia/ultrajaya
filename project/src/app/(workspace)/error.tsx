"use client";
import { Button, Card } from "@/components/ui";
export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <Card className="error-state">
      <h1>Could not open this page</h1>
      <p>
        Try again. If the problem continues, contact your workspace
        administrator.
      </p>
      <Button onClick={reset}>Try again</Button>
    </Card>
  );
}
