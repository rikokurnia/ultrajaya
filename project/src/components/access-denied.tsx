import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Card } from "./ui";
export function AccessDenied() {
  return (
    <Card className="access-denied">
      <ShieldAlert size={40} aria-hidden />
      <h1>Access denied</h1>
      <p>
        Your role does not have access to this page. Ask your workspace
        administrator if you need additional access.
      </p>
      <Link href="/dashboard" className="button button-primary">
        Back to dashboard
      </Link>
    </Card>
  );
}
