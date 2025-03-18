import Home from "../pages/Home";
import Search from "../pages/Search";
import Register from "../pages/Register";
import Login from "../pages/Login";
const publicRoutes = [
  {
    path: "/",
    component: Home,
  },
  { path: "/search", component: Search },
  { path: "/register", component: Register, layout: null },
  { path: "/login", component: Login, layout: null },
];
const privateRoutes = [];

export { publicRoutes, privateRoutes };
