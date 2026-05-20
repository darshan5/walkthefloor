import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center p-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-lg text-muted-foreground mt-2">Page not found</p>
      <Link href="/">
        <Button className="mt-4">Go to Dashboard</Button>
      </Link>
    </div>
  );
}
