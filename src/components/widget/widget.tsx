export default function Widget({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {children}
      </div>
    </div>
  );
}