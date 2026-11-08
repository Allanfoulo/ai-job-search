import { httpRouter } from "convex/server";
import { privateDownload } from "./files";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);
http.route({ pathPrefix: "/private-files/", method: "GET", handler: privateDownload });
http.route({ pathPrefix: "/private-files/", method: "OPTIONS", handler: privateDownload });

export default http;
