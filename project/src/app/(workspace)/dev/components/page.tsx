import { notFound } from "next/navigation";
import { Showcase } from "@/features/settings/showcase";
export default function ComponentsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Showcase />;
}
