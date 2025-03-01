export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">You're Offline</h1>
      <p className="text-center mb-4">
        Don't worry - any workout data will be saved and synced when you're back
        online.
      </p>
    </div>
  );
}
