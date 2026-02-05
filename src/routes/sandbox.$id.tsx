import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchSandbox, removeSandbox } from "../server/functions";

export const Route = createFileRoute("/sandbox/$id")({
  loader: async ({ params }) => {
    const sandbox = await fetchSandbox({ data: params.id });
    if (!sandbox) {
      throw new Error("Sandbox not found");
    }
    return sandbox;
  },
  component: SandboxDetail,
});

function SandboxDetail() {
  const sandbox = Route.useLoaderData();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this sandbox?")) return;
    await removeSandbox({ data: sandbox.id });
    window.location.href = "/";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running": return "bg-green-100 text-green-800";
      case "creating": return "bg-yellow-100 text-yellow-800";
      case "error": return "bg-red-100 text-red-800";
      case "terminated": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sandbox Details</h1>
            <p className="text-gray-600 font-mono text-sm">{sandbox.id}</p>
          </div>
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(sandbox.status)}`}>
            {sandbox.status}
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b border-gray-200">
            <div className="text-sm font-medium text-gray-500">Git URL</div>
            <div className="md:col-span-2 text-sm text-gray-900 font-mono break-all">{sandbox.gitUrl}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b border-gray-200">
            <div className="text-sm font-medium text-gray-500">Branch</div>
            <div className="md:col-span-2 text-sm text-gray-900">{sandbox.branch || "default"}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b border-gray-200">
            <div className="text-sm font-medium text-gray-500">Modal Sandbox ID</div>
            <div className="md:col-span-2 text-sm text-gray-900 font-mono">{sandbox.modalSandboxId}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b border-gray-200">
            <div className="text-sm font-medium text-gray-500">Created At</div>
            <div className="md:col-span-2 text-sm text-gray-900">
              {new Date(sandbox.createdAt).toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <div className="text-sm font-medium text-gray-500">OpenCode URL</div>
            <div className="md:col-span-2">
              <a
                href={sandbox.opencodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm font-mono break-all"
              >
                {sandbox.opencodeUrl} ↗
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <a
            href={sandbox.opencodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Open in OpenCode ↗
          </a>
          <button
            onClick={handleDelete}
            className="px-6 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Delete Sandbox
          </button>
        </div>
      </div>
    </div>
  );
}
