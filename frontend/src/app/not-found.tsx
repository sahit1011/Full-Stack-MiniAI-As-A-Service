import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HomeIcon } from "@heroicons/react/24/outline"

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="font-mono text-6xl font-bold text-primary">404</div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Page not found</h1>
        <p className="mt-2 text-muted-foreground">
          The page you’re looking for doesn’t exist or may have moved.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/">
              <HomeIcon className="mr-2 h-4 w-4" />
              Go home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/upload">Upload a dataset</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
