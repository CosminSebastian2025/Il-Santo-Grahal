// Indice generato da scripts/generate-catalog.mjs.
import type { Topic } from "../types";
import { linguaggi } from "./01-linguaggi";
import { fondamenti } from "./02-fondamenti";
import { webFrontend } from "./03-web-frontend";
import { backend } from "./04-backend";
import { mobile } from "./05-mobile";
import { desktop } from "./06-desktop";
import { database } from "./07-database";
import { api } from "./08-api";
import { sistemiOperativi } from "./09-sistemi-operativi";
import { networking } from "./10-networking";
import { cybersecurity } from "./11-cybersecurity";
import { devops } from "./12-devops";
import { serverProxy } from "./13-server-proxy";
import { cloud } from "./14-cloud";
import { aiData } from "./15-ai-data";
import { gameGrafica } from "./16-game-grafica";
import { automazione } from "./17-automazione";
import { formati } from "./18-formati";

export const topics: Topic[] = [
  ...linguaggi,
  ...fondamenti,
  ...webFrontend,
  ...backend,
  ...mobile,
  ...desktop,
  ...database,
  ...api,
  ...sistemiOperativi,
  ...networking,
  ...cybersecurity,
  ...devops,
  ...serverProxy,
  ...cloud,
  ...aiData,
  ...gameGrafica,
  ...automazione,
  ...formati,
];
