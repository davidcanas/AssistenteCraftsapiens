import Client from "./Client";

import {
  CreateMessageOptions,
  Guild,
  Member,
  PartialChannel,
  Role,
  Attachment,
  TextableChannel,
  User,
  Message,
  InteractionOptionsWithValue,
  CommandInteraction,
} from "oceanic.js";

export enum Type {
  MESSAGE,
  INTERACTION,
}

type Content = CreateMessageOptions & {
  fetchReply?: boolean;
};
export default class CommandContext {
  private readonly client: Client;
  private readonly interactionOrMessage: Message | CommandInteraction;
  private deferred: boolean;

  public readonly type: Type;
  public readonly args: string[] = [];
  public readonly attachments: Attachment[];
  public declare readonly targetUsers?: User[];
  public declare readonly targetRoles?: Role[];
  public declare readonly targetChannels?: PartialChannel[];

  constructor(
    client: Client,
    interaction: Message | CommandInteraction,
    args: string[] = [],
  ) {
    this.client = client;
    this.interactionOrMessage = interaction;

    if (interaction instanceof Message) {
      this.type = Type.MESSAGE;

      this.args = args;

      this.attachments = [...interaction.attachments.values()];
    } else {
      this.type = Type.INTERACTION;
      this.attachments = [];

      if (interaction.data.type === 1) {
        if (interaction.data.options.raw?.[0]?.type === 1) {
          this.args.push(
            interaction.data.options.raw[0].name.toString().trim(),
          );

          if (interaction.data.options.raw[0].options) {
            for (const val of interaction.data.options.raw[0].options) {
              this.args.push(
                (val as InteractionOptionsWithValue).value.toString().trim(),
              );
            }
          }
        } else {
          if (interaction.data.resolved?.users) {
            this.targetUsers = interaction.data.resolved?.users?.map(
              (user) => user,
            );
          }

          if (interaction.data.resolved?.roles) {
            this.targetRoles = interaction.data.resolved?.roles?.map(
              (role) => role,
            );
          }

          if (interaction.data.resolved?.channels) {
            this.targetChannels = interaction.data.resolved?.channels?.map(
              (channel) => channel,
            );
          }

          const options = interaction.data.options
            .raw as InteractionOptionsWithValue[];

          this.args = options?.map((ops) => ops.value.toString().trim()) ?? [];
        }
      } else if (interaction.data.type === 2) {
        this.targetUsers = interaction.data.resolved?.users?.map(
          (user) => user,
        );
      } else if (interaction.data.type === 3) {
        this.args = interaction.data
          .resolved!.messages!.get(interaction.data.targetID!)!
          .content.split(/ +/);
      }
    }
  }

  get msg(): Message | CommandInteraction {
    return this.interactionOrMessage;
  }
  get author(): User {
    if (this.interactionOrMessage instanceof Message)
      return this.interactionOrMessage.author;
    return this.interactionOrMessage.member!.user;
  }

  get member(): Member | null | undefined {
    return this.interactionOrMessage.member;
  }

  get guild(): Guild {
    return this.client.guilds.get(this.interactionOrMessage.guildID!)!;
  }

  get channel(): TextableChannel {
    return this.interactionOrMessage.channel as TextableChannel;
  }

  async sendMessage(
    content: Content | string,
  ): Promise<Message<TextableChannel> | void> {
    content = this.formatContent(content);

    const fetchReply = !!content.fetchReply;

    delete content.fetchReply;

    if (content.content === undefined) content.content = "";

    if (this.interactionOrMessage instanceof Message) {
      this.channel.createMessage(content);
      return;
    } else {
      if (this.deferred) {
        await this.interactionOrMessage.editOriginal(content);
      } else {
        await this.interactionOrMessage.createMessage(content);
      }

      if (fetchReply) {
        return this.interactionOrMessage.getOriginal() as Promise<
          Message<TextableChannel>
        >;
      }
    }
  }

  private formatContent(content: Content | string): Content {
    if (typeof content === "string") return { content };
    return content;
  }

  errorEmbed(title: string) {
    let embed = new this.client.embed()
      .setTitle("❌ Ocorreu um erro")
      .setDescription(title)
      .setColor("ff0000");
    this.sendMessage({ content: "", embeds: [embed], flags: 1 << 6 });
  }

  async createBin(sourcebin, data, language) {
    const bin = await sourcebin.create(
      [
        {
          content: data,
          language: language,
        },
      ],
      {
        title: "AssistenteCraftsapiens",
        description: "Sourcebin created by AssistenteCraftsapiens",
      },
    );
    return bin;
  }
  MsToDate(time) {
    if (!time) return "No time provided";
    if (isNaN(time)) return "The time provided is not a number ! ";
    time = Math.round(time / 1000);

    const s = time % 60,
      m = ~~((time / 60) % 60),
      h = ~~((time / 60 / 60) % 24),
      d = ~~(time / 60 / 60 / 24);

    return `${d}D:${h}H:${m}M:${s}S`;
  }
  async defer() {
    if (this.interactionOrMessage instanceof CommandInteraction) {
      this.interactionOrMessage.defer();
      this.deferred = true;
    }
  }
}
