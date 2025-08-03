// Generouted, changes to this file will be overridden
import { Fragment } from "react";
import {
  Outlet,
  RouterProvider,
  createLazyRoute,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import App from "./pages/_app";
import NoMatch from "./pages/404";

const root = createRootRoute({ component: App || Outlet });
const _404 = createRoute({
  getParentRoute: () => root,
  path: "*",
  component: NoMatch || Fragment,
});
const auth = createRoute({ getParentRoute: () => root, id: "auth" }).lazy(() =>
  import("./pages/(auth)/_layout").then((m) =>
    createLazyRoute("/auth")({ component: m.default }),
  ),
);
const authsettings = createRoute({
  getParentRoute: () => auth,
  path: "settings",
}).lazy(() =>
  import("./pages/(auth)/settings").then((m) =>
    createLazyRoute("/auth/settings")({ component: m.default }),
  ),
);
const authregister = createRoute({
  getParentRoute: () => auth,
  path: "register",
}).lazy(() =>
  import("./pages/(auth)/register").then((m) =>
    createLazyRoute("/auth/register")({ component: m.default }),
  ),
);
const about = createRoute({ getParentRoute: () => root, path: "about" }).lazy(
  () =>
    import("./pages/about").then((m) =>
      createLazyRoute("/about")({ component: m.default }),
    ),
);
const collageid = createRoute({
  getParentRoute: () => root,
  path: "collage/$id",
}).lazy(() =>
  import("./pages/collage.[id]").then((m) =>
    createLazyRoute("/collage/$id")({ component: m.default }),
  ),
);
const collages = createRoute({
  getParentRoute: () => root,
  path: "collages",
}).lazy(() =>
  import("./pages/collages").then((m) =>
    createLazyRoute("/collages")({ component: m.default }),
  ),
);
const index = createRoute({ getParentRoute: () => root, path: "/" }).lazy(() =>
  import("./pages/index").then((m) =>
    createLazyRoute("/")({ component: m.default }),
  ),
);
const login = createRoute({ getParentRoute: () => root, path: "login" }).lazy(
  () =>
    import("./pages/login").then((m) =>
      createLazyRoute("/login")({ component: m.default }),
    ),
);
const sharedshareId = createRoute({
  getParentRoute: () => root,
  path: "shared/$shareId",
}).lazy(() =>
  import("./pages/shared.[shareId]").then((m) =>
    createLazyRoute("/shared/$shareId")({ component: m.default }),
  ),
);
const shares = createRoute({ getParentRoute: () => root, path: "shares" }).lazy(
  () =>
    import("./pages/shares").then((m) =>
      createLazyRoute("/shares")({ component: m.default }),
    ),
);

const config = root.addChildren([
  auth.addChildren([authsettings, authregister]),
  about,
  collageid,
  collages,
  index,
  login,
  sharedshareId,
  shares,
  _404,
]);

const router = createRouter({ routeTree: config });
export const routes = config;
export const Routes = () => <RouterProvider router={router} />;

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
