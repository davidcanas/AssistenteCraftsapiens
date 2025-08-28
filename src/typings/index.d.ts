 import { AutocompleteInteraction } from "oceanic.js";

interface CommandSettings {
  name: string;
  description: string;
  aliases?: Array<string>;
  usage?: string;
  category: "Info" | "DG" | "Util" | "Music" | "Mod";
  default_member_permissions?: number;
  autocomplete?: boolean;
  options: Array<object>;
}

interface Command extends CommandSettings {
  execute: (ctx) => void;
  runAutoComplete?: (interaction: AutocompleteInteraction, value: string, options?: any) => void;
}

interface Utils {
  levDistance: (src: string, target: string) => number;
}

interface Api {
  getTownInfo: (cityName: string) => Promise<any>;
  getTownList: () => Promise<Array<any>>;
  getPlayerInfo: (playerName: string) => Promise<any>;
  getPlayerList: () => Promise<Array<any>>;
  getServerInfo: () => Promise<any>;
}
interface InteractionOptions {
  name: string;
  value: string;
  type: number;
  options?: InteractionOptions[];
}

interface InteractionResolved {
  messages: Record<
    string,
    {
      content: string;
    }
  >;
}

interface InteractionData {
  id: string;
  name: string;
  type: number;
  options?: InteractionOptions[];
  resolved?: InteractionResolved;
  target_id?: string;
}

interface InteractionPacket {
  application_id: string;
  channel_id: string;
  id: string;
  guild_id: string;

  data: InteractionData;

  member: {
    user: {
      id: string;
    };
  };

  token: string;
  type: number;
  version: number;
}

interface InteractionApplicationCommandCallbackData {
  tts?: boolean;
  content?: string;
  embeds?: EmbedOptions[];
  allowed_mentions?: AllowedMentions;
  flags?: number;
}

interface IEditInteractionData {
  [key: string]: string;
  content?: string;
  embeds?: EmbedOptions[];
  file?: MessageFile;
}

declare module "vulkava" {
  export interface Player {
    olderMessageID?: string;
    speedup?: boolean;
  }
}


