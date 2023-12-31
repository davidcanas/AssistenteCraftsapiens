import { Message } from "oceanic.js";

interface CommandSettings {
  name: string;
  description: string;
  aliases?: Array<string>;
  usage?: string;
  category: "Info" | "DG" | "Util" | "Music";
  default_member_permissions?: number;
  options: Array<Object>;
}

interface Command extends CommandSettings {
  execute: (ctx) => void;
}

interface Utils {
  levDistance: (src: string, target: string) => number;
  dynmap: {
   players: () => Promise<Array<string>>;
   playersVanilla: () => Promise<Array<string>>;
  }
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
  }; //dont need more stuff (for now)

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
    speedup?: Boolean;
  }
}
