import { CHARACTERS } from "./constants";
import { EntryModel } from "./models/Entry";
import { UserModel } from "./models/User";
import { OverlayServer } from "./overlay-server";
import { getNextTournament } from "./tournament-commands";

// tmi.js doc: https://github.com/tmijs/docs/blob/gh-pages/_posts
const tmi = require("tmi.js");

const BOT_USERNAME = "autotournaments";
const CHANNEL_NAME = "autotournaments";
const OAUTH_TOKEN = process.env.AT_TWITCH_OAUTH_TOKEN;

if (!OAUTH_TOKEN) {
  throw new Error("Twitch token not provided.");
}

const POINTS_TO_START_WITH = 100;
const MAX_NAME_LENGTH = 20;

interface CommandContext {
  userName: string;
  userId: string;
}

type Command = (
  context: CommandContext,
  ...args: string[]
) => Promise<any> | void;

const createCommands = ({
  client,
  channel,
  overlay,
}: {
  client: typeof tmi.client;
  channel: string;
  overlay: OverlayServer;
}): Record<string, Command> => ({
  url: async () => {
    const tournament = await getNextTournament();

    client.say(channel, `The tournament is here: challonge.com/${tournament.url}`);
  },
  points: async ({ userName, userId }, ...args) => {
    const user = await UserModel.findOne({
      twitchId: userId,
    });

    client.say(channel, `${userName} has ${user.points} points`);
  },
  start: async ({ userName, userId }) => {
    const user = await UserModel.findOne({
      twitchId: userId,
    });

    if (user) {
      client.say(channel, `${userName} was already registered.`);
      return;
    } else {
      const newUser = new UserModel();
      newUser.twitchId = userId;
      newUser.twitchUsername = userName;
      newUser.points = POINTS_TO_START_WITH;
      newUser.save();

      client.say(
        channel,
        `${userName} was given ${POINTS_TO_START_WITH} points to start.`
      );
    }
  },
  enter: async ({ userName, userId }, character, bet, name) => {
    if (!character) {
      client.say(
        channel,
        `${userName} didn't enter a character name. Ex: !at enter Mario 5.`
      );
      return;
    }

    if (!bet) {
      client.say(channel, `${userName} didn't enter a bet. Ex: !at enter Mario 5.`);
      return;
    }

    if (name) {
      if (name.length > MAX_NAME_LENGTH) {
        client.say(
          channel,
          `${userName} entered a custom name a bit too long. The maximum is 20 characters.`
        );
        return;
      }
    }

    const foundCharacter = CHARACTERS.find(
      (c) => c.toLowerCase() === character.toLowerCase()
    );

    if (!foundCharacter) {
      client.say(
        channel,
        `${userName} didn't enter a real character name. See the list of valid characters in the channel description.`
      );
      return;
    }

    let parsedBet;
    try {
      parsedBet = Number.parseInt(bet);
    } catch {
      parsedBet = NaN;
    }

    if (parsedBet == NaN) {
      client.say(channel, `${userName} bet an invalid number ${bet}.`);
      return;
    }

    if (parsedBet <= 0) {
      client.say(channel, `${userName} bet an invalid number ${bet}.`);
      return;
    }

    const user = await UserModel.findOne({
      twitchId: userId,
    });

    const pointsString = (points: number) =>
      `${points} point${points > 0 ? "s" : ""}`;

    if (user) {
      if (user.points === 0) {
        client.say(channel, `${userName} sadly doesn't have anything left.`);
        return;
      }

      if (user.points < parsedBet) {
        client.say(
          channel,
          `${userName} can only bet ${pointsString(user.points)}`
        );
        return;
      }

      const newEntry = new EntryModel();
      newEntry.userId = userId;
      newEntry.bet = parsedBet;
      newEntry.name = name || `${userName}'s ${foundCharacter}`;
      newEntry.character = foundCharacter;

      user.points = user.points - parsedBet;

      await newEntry.save();
      await user.save();

      client.say(
        channel,
        `${userName} entered ${foundCharacter} with ${pointsString(
          parsedBet
        )}. You ${
          user.points > 0
            ? `have ${pointsString(user.points)}`
            : `sadly have no points left`
        }.`
      );
    } else {
      client.say(
        channel,
        `${userName} must first register with the "start" command.`
      );
      return;
    }
  },
});

export class ChatServer {
  constructor(overlay: OverlayServer) {
    const channel = CHANNEL_NAME;
    const client = new tmi.client({
      connection: {
        reconnect: true,
      },
      identity: {
        username: BOT_USERNAME,
        password: OAUTH_TOKEN,
      },
      channels: [channel],
    });

    const commands = createCommands({
      client,
      channel,
      overlay,
    });

    client.on("message", (target, context, msg, self) => {
      if (self) {
        return;
      } // Ignore messages from the bot

      const { username: userName, "user-id": userId } = context;
      const goodContext = { userName, userId };

      const message: string = msg.trim();
      if (message.toLowerCase().startsWith("!at")) {
        const [rawCommand, ...terms] = message.substring(3).trim().split(" ");
        const command = rawCommand.toLowerCase();
        console.log(
          `Command received from ${userName}: ${command} ${terms.join(" ")}`
        );
        if (command.length > 0) {
          if (command in commands) {
            try {
              commands[command](goodContext, ...terms);
            } catch {
              client.say(
                "Something went wrong with your comment, the best you can do is contact the administrator."
              );
            }
          } else {
            client.say(
              channel,
              `Unrecognized command. Here are the possible commands: ${Object.keys(
                commands
              ).join(", ")}`
            );
          }
        } else {
          client.say(
            channel,
            `Here are the possible commands: ${Object.keys(commands).join(
              ", "
            )}`
          );
        }
      }
    });
    client.on("connected", (addr, port) => {
      console.log(`* Connected to ${addr}:${port}`);
    });

    client.connect();
  }
}
