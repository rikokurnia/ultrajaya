import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content" className="access-denied">
      <h1>Page not found</h1>
      <p>Check the address or return to your workspace.</p>
      <Link href="/dashboard" className="button button-primary">
        Go to dashboard
      </Link>
    </main>
  );
}
