import { cac } from "cac";

import { check } from "./commands/check";
import { VERSION } from "./constants";

const cli = cac("vensor");

check.register(cli);

cli.help();
cli.version(VERSION);

cli.parse();

if (!cli.matchedCommand) {
	cli.outputHelp();
}