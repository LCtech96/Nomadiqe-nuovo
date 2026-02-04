export default function SocialLoading() {
  return (
    <div className="min-h-screen p-8">
      <div className="container mx-auto max-w-4xl animate-pulse space-y-6">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-4 w-72 bg-muted rounded" />
        <div className="h-10 w-40 bg-muted rounded" />
        <div className="h-24 bg-muted rounded-lg" />
        <div className="h-24 bg-muted rounded-lg" />
      </div>
    </div>
  )
}
