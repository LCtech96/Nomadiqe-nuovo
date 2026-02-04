export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
        <div className="h-8 w-24 bg-muted rounded" />
        <div className="h-10 w-full bg-muted rounded" />
        <div className="h-12 w-full bg-muted rounded" />
        <div className="h-64 bg-muted rounded-xl" />
        <div className="h-4 w-full bg-muted rounded" />
      </div>
    </div>
  )
}
