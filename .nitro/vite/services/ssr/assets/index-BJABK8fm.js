import { c as reactExports, p as jsxRuntimeExports } from "../server.js";
import { R as Route, L as Link, c as createNewSandbox, r as removeSandbox } from "./router-BPDJsAnB.js";
import "node:async_hooks";
import "node:stream";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "node:stream/web";
import "./sandbox-CYMDEGjb.js";
import "process";
import "tls";
import "fs";
import "os";
import "net";
import "events";
import "path";
import "zlib";
import "http2";
import "http";
import "url";
import "dns";
import "node:crypto";
import "module";
import "node:fs";
import "node:os";
import "node:path";
import "perf_hooks";
function Dashboard() {
  const sandboxes = Route.useLoaderData();
  const [gitUrl, setGitUrl] = reactExports.useState("");
  const [branch, setBranch] = reactExports.useState("");
  const [isCreating, setIsCreating] = reactExports.useState(false);
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!gitUrl.trim()) return;
    setIsCreating(true);
    try {
      await createNewSandbox({
        data: {
          gitUrl,
          branch: branch || void 0
        }
      });
      window.location.reload();
    } catch (error) {
      alert("Failed to create sandbox");
    } finally {
      setIsCreating(false);
    }
  };
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this sandbox?")) return;
    await removeSandbox({
      data: id
    });
    window.location.reload();
  };
  const getStatusColor = (status) => {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-800";
      case "creating":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "terminated":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-6xl mx-auto p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-bold text-gray-900 mb-2", children: "Gondola" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600", children: "Cloud development sandbox manager" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg shadow-md p-6 mb-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-gray-800 mb-4", children: "Create New Sandbox" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleCreate, className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: [
              "Git URL ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-red-500", children: "*" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "url", value: gitUrl, onChange: (e) => setGitUrl(e.target.value), placeholder: "https://github.com/user/repo.git", className: "w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500", required: true })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Branch (optional)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: branch, onChange: (e) => setBranch(e.target.value), placeholder: "main", className: "w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: isCreating, className: "w-full md:w-auto px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed", children: isCreating ? "Creating..." : "Create Sandbox" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg shadow-md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-6 py-4 border-b border-gray-200", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-gray-800", children: "Sandboxes" }) }),
      sandboxes.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-6 py-8 text-center text-gray-500", children: "No sandboxes yet. Create one above to get started." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-gray-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "ID" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Repository" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Created" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Actions" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-gray-200", children: sandboxes.map((sandbox) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "hover:bg-gray-50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/sandbox/$id", params: {
            id: sandbox.id
          }, className: "text-blue-600 hover:text-blue-800", children: [
            sandbox.id.slice(0, 8),
            "..."
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4 text-sm text-gray-900", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: sandbox.gitUrl.replace(/^https?:\/\//, "").replace(/\.git$/, "") }),
            sandbox.branch && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-gray-500 text-xs mt-1", children: [
              "Branch: ",
              sandbox.branch
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(sandbox.status)}`, children: sandbox.status }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: new Date(sandbox.createdAt).toLocaleDateString() }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleDelete(sandbox.id), className: "text-red-600 hover:text-red-900", children: "Delete" }) })
        ] }, sandbox.id)) })
      ] }) })
    ] })
  ] });
}
export {
  Dashboard as component
};
