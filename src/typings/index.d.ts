/* eslint-disable @typescript-eslint/no-explicit-any */
import { AutocompleteInteraction } from 'oceanic.js';

interface Player {
  world?: string;
  armor?: number;
  online?: boolean;
  name?: string;
  x?: number;
  y?: number;
  z?: number;
  health?: number;
  sort?: number;
  type?: string;
  account?: string;
}

interface CommandSettings {
  name: string;
  description: string;
  aliases?: Array<string>;
  usage?: string;
  category: 'Info' | 'DG' | 'Util' | 'Music';
  default_member_permissions?: number;
  autocomplete?: boolean;
  options: Array<object>;
}

interface CityInfo {
  name: string;
  mayor: string;
  nation: string;
  members: string[];
  coords: {
  x?: number;
  y?: number;
  z?: number;
  };
  ruined?: boolean;
}

interface Command extends CommandSettings {
  execute: (ctx) => void;
  runAutoComplete?: (interaction: AutocompleteInteraction, value: string, options?: any) => void;
}

interface Utils {
  levDistance: (src: string, target: string) => number;
  dynmap: {
    findPlayerCity: (serverData: ServerData, playerName: string) => CityInfo | undefined;
    findCityInfo: (serverData: ServerData, cityName: string) => CityInfo | undefined;
    getAllRegisteredCities: (serverData: ServerData) => string[];
    getAllRegisteredPlayers: (serverData: ServerData) => string[];
    getDynmapPlayers: () => Promise<string[]>;
    //getDynmapPlayersVanilla: () => Promise<object[] | string[]>;
    getOnlinePlayerInfo: (serverData: ServerData, playerName: string) => Player | undefined;
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

declare module 'vulkava' {
  export interface Player {
    olderMessageID?: string;
    speedup?: boolean;
  }
}


