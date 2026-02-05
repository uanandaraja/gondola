import { T as TSS_SERVER_FUNCTION, y as createServerFn } from "../server.js";
import { l as listSandboxes, g as getSandbox, c as createSandbox, d as deleteSandbox } from "./sandbox-CYMDEGjb.js";
import "node:async_hooks";
import "node:stream";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "node:stream/web";
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
const createServerRpc = (serverFnMeta, splitImportFn) => {
  const url = "/_serverFn/" + serverFnMeta.id;
  return Object.assign(splitImportFn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const fetchSandboxes_createServerFn_handler = createServerRpc({
  id: "44f1e9ede9f4237ddb921cff66b518d0f98153203c250620b2dcc5419494bf9e",
  name: "fetchSandboxes",
  filename: "src/server/functions.ts"
}, (opts, signal) => fetchSandboxes.__executeServer(opts, signal));
const fetchSandboxes = createServerFn({
  method: "GET"
}).handler(fetchSandboxes_createServerFn_handler, async () => {
  return await listSandboxes();
});
const fetchSandbox_createServerFn_handler = createServerRpc({
  id: "64e90df49532818c01330e65e310ff561cb3ac79e84b65c97f3809050c982c73",
  name: "fetchSandbox",
  filename: "src/server/functions.ts"
}, (opts, signal) => fetchSandbox.__executeServer(opts, signal));
const fetchSandbox = createServerFn({
  method: "GET"
}).inputValidator((id) => id).handler(fetchSandbox_createServerFn_handler, async ({
  data: id
}) => {
  return await getSandbox(id);
});
const createNewSandbox_createServerFn_handler = createServerRpc({
  id: "f610dba9610caa95bf56e369cb923be25a614351d53ee5d89042865973d269af",
  name: "createNewSandbox",
  filename: "src/server/functions.ts"
}, (opts, signal) => createNewSandbox.__executeServer(opts, signal));
const createNewSandbox = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createNewSandbox_createServerFn_handler, async ({
  data
}) => {
  return await createSandbox(data.gitUrl, data.branch);
});
const removeSandbox_createServerFn_handler = createServerRpc({
  id: "b5dc867551f5e2af0a72fdf8e10e19f05951f7ef240cb8deeefeec1136d9a4d9",
  name: "removeSandbox",
  filename: "src/server/functions.ts"
}, (opts, signal) => removeSandbox.__executeServer(opts, signal));
const removeSandbox = createServerFn({
  method: "POST"
}).inputValidator((id) => id).handler(removeSandbox_createServerFn_handler, async ({
  data: id
}) => {
  await deleteSandbox(id);
});
export {
  createNewSandbox_createServerFn_handler,
  fetchSandbox_createServerFn_handler,
  fetchSandboxes_createServerFn_handler,
  removeSandbox_createServerFn_handler
};
