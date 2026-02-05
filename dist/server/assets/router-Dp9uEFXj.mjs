import { createRootRoute, HeadContent, Outlet, Scripts, createFileRoute, lazyRouteComponent, createRouter } from "@tanstack/react-router";
import { jsxs, jsx } from "react/jsx-runtime";
import { T as TSS_SERVER_FUNCTION, g as getServerFnById, c as createServerFn } from "../server.mjs";
const Route$2 = createRootRoute({
  head: () => ({
    meta: [
      { title: "Gondola" },
      { name: "description", content: "Cloud dev sandbox manager" }
    ]
  }),
  component: RootComponent
});
function RootComponent() {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { className: "bg-gray-50 min-h-screen", children: [
      /* @__PURE__ */ jsx(Outlet, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const createSsrRpc = (functionId, importer) => {
  const url = "/_serverFn/" + functionId;
  const serverFnMeta = { id: functionId };
  const fn = async (...args) => {
    const serverFn = await getServerFnById(functionId);
    return serverFn(...args);
  };
  return Object.assign(fn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const fetchSandboxes = createServerFn({
  method: "GET"
}).handler(createSsrRpc("44f1e9ede9f4237ddb921cff66b518d0f98153203c250620b2dcc5419494bf9e"));
const fetchSandbox = createServerFn({
  method: "GET"
}).validator((id) => id).handler(createSsrRpc("64e90df49532818c01330e65e310ff561cb3ac79e84b65c97f3809050c982c73"));
const createNewSandbox = createServerFn({
  method: "POST"
}).validator((data) => data).handler(createSsrRpc("f610dba9610caa95bf56e369cb923be25a614351d53ee5d89042865973d269af"));
const removeSandbox = createServerFn({
  method: "POST"
}).validator((id) => id).handler(createSsrRpc("b5dc867551f5e2af0a72fdf8e10e19f05951f7ef240cb8deeefeec1136d9a4d9"));
const $$splitComponentImporter$1 = () => import("./index-BVRqlh4V.mjs");
const Route$1 = createFileRoute("/")({
  loader: async () => {
    return await fetchSandboxes();
  },
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./sandbox._id-DWM_HBX3.mjs");
const Route = createFileRoute("/sandbox/$id")({
  loader: async ({
    params
  }) => {
    const sandbox = await fetchSandbox({
      data: params.id
    });
    if (!sandbox) {
      throw new Error("Sandbox not found");
    }
    return sandbox;
  },
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const IndexRoute = Route$1.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$2
});
const SandboxIdRoute = Route.update({
  id: "/sandbox/$id",
  path: "/sandbox/$id",
  getParentRoute: () => Route$2
});
const rootRouteChildren = {
  IndexRoute,
  SandboxIdRoute
};
const routeTree = Route$2._addFileChildren(rootRouteChildren)._addFileTypes();
const router = createRouter({ routeTree });
function getRouter() {
  return router;
}
const router$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  Route$1 as R,
  Route as a,
  router$1 as b,
  createNewSandbox as c,
  removeSandbox as r
};
