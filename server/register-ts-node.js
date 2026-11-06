// lets `node` run the .ts sources directly in dev (replaces the deprecated
// --loader flag, which printed a warning on every restart)
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("ts-node/esm", pathToFileURL("./"));
