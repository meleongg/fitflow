export default function Features() {
  return (
    <div className="bg-creamyBeige text-black py-16 px-8">
      <h2 className="text-3xl font-bold text-center mb-8">Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-xl font-bold mb-2">Workout Library</h3>
          <p>
            Access a comprehensive library of workouts tailored to your goals.
          </p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-xl font-bold mb-2">Exercise Library</h3>
          <p>
            Find detailed instructions and videos for a wide range of exercises.
          </p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-xl font-bold mb-2">Session Tracking</h3>
          <p>
            Track your workout sessions and monitor your progress over time.
          </p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-xl font-bold mb-2">Analytics</h3>
          <p>Analyze your performance with detailed statistics and insights.</p>
        </div>
      </div>
    </div>
  );
}
