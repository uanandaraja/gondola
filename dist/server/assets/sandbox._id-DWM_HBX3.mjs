import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { a as Route, r as removeSandbox } from "./router-Dp9uEFXj.mjs";
import "../server.mjs";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core";
import "node:async_hooks";
import "@tanstack/router-core/ssr/server";
import "h3-v2";
import "tiny-invariant";
import "seroval";
import "@tanstack/react-router/ssr/server";
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
  return /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto p-6", children: [
    /* @__PURE__ */ jsx("div", { className: "mb-6", children: /* @__PURE__ */ jsx(Link, { to: "/", className: "text-blue-600 hover:text-blue-800 text-sm", children: "← Back to Dashboard" }) }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-lg shadow-md p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start mb-6", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-gray-900 mb-2", children: "Sandbox Details" }),
          /* @__PURE__ */ jsx("p", { className: "text-gray-600 font-mono text-sm", children: sandbox.id })
        ] }),
        /* @__PURE__ */ jsx("span", { className: `px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(sandbox.status)}`, children: sandbox.status })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b border-gray-200", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-gray-500", children: "Git URL" }),
          /* @__PURE__ */ jsx("div", { className: "md:col-span-2 text-sm text-gray-900 font-mono break-all", children: sandbox.gitUrl })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b border-gray-200", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-gray-500", children: "Branch" }),
          /* @__PURE__ */ jsx("div", { className: "md:col-span-2 text-sm text-gray-900", children: sandbox.branch || "default" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b border-gray-200", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-gray-500", children: "Modal Sandbox ID" }),
          /* @__PURE__ */ jsx("div", { className: "md:col-span-2 text-sm text-gray-900 font-mono", children: sandbox.modalSandboxId })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b border-gray-200", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-gray-500", children: "Created At" }),
          /* @__PURE__ */ jsx("div", { className: "md:col-span-2 text-sm text-gray-900", children: new Date(sandbox.createdAt).toLocaleString() })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 py-4", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-gray-500", children: "OpenCode URL" }),
          /* @__PURE__ */ jsx("div", { className: "md:col-span-2", children: /* @__PURE__ */ jsxs("a", { href: sandbox.opencodeUrl, target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 hover:text-blue-800 text-sm font-mono break-all", children: [
            sandbox.opencodeUrl,
            " ↗"
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-8 flex gap-4", children: [
        /* @__PURE__ */ jsx("a", { href: sandbox.opencodeUrl, target: "_blank", rel: "noopener noreferrer", className: "px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2", children: "Open in OpenCode ↗" }),
        /* @__PURE__ */ jsx("button", { onClick: handleDelete, className: "px-6 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2", children: "Delete Sandbox" })
      ] })
    ] })
  ] });
}
export {
  SandboxDetail as component
};
