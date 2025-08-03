import { httpRouter, PublicHttpAction } from "convex/server";
import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";

// Import AI enhancement endpoints
import { auth } from "./auth";


// define the http router
const http = httpRouter();

// Add auth routes
auth.addHttpRoutes(http);



export default http;