import { p as jsxRuntimeExports } from "../server.js";
import { a as Route, L as Link, r as removeSandbox } from "./router-BPDJsAnB.js";
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
function SandboxDetail() {
  const sandbox = Route.useLoaderData();
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this sandbox?")) return;
    await removeSandbox({
      data: sandbox.id
    });
    window.location.href = "/";
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-4xl mx-auto p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/", className: "text-blue-600 hover:text-blue-800 text-sm", children: "← Back to Dashboard" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg shadow-md p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-start mb-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold text-gray-900 mb-2", children: "Sandbox Details" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 font-mono text-sm", children: sandbox.id })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(sandbox.status)}`, children: sandbox.status })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b border-gray-200", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium text-gray-500", children: "Git URL" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "md:col-span-2 text-sm text-gray-900 font-mono break-all", children: sandbox.gitUrl })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b border-gray-200", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium text-gray-500", children: "Branch" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "md:col-span-2 text-sm text-gray-900", children: sandbox.branch || "default" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b border-gray-200", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium text-gray-500", children: "Modal Sandbox ID" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "md:col-span-2 text-sm text-gray-900 font-mono", children: sandbox.modalSandboxId })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b border-gray-200", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium text-gray-500", children: "Created At" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "md:col-span-2 text-sm text-gray-900", children: new Date(sandbox.createdAt).toLocaleString() })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 py-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium text-gray-500", children: "OpenCode URL" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "md:col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: sandbox.opencodeUrl, target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 hover:text-blue-800 text-sm font-mono break-all", children: [
            sandbox.opencodeUrl,
            " ↗"
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 flex gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: sandbox.opencodeUrl, target: "_blank", rel: "noopener noreferrer", className: "px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2", children: "Open in OpenCode ↗" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleDelete, className: "px-6 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2", children: "Delete Sandbox" })
      ] })
    ] })
  ] });
}
export {
  SandboxDetail as component
};
