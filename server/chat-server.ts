import { CHARACTERS } from "./constants";
import { BetModel } from "./models/Bet";
import { EntryModel } from "./models/Entry";
import { IUserModel, UserModel } from "./models/User";
import { OverlayServer } from "./overlay-server";
import {
  getNextTournament,
  getUpcomingTournamentMatch,
} from "./tournament-commands";

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

const findRegisteredUser = async (
  { client, channel }: { client: typeof tmi.client; channel },
  { userId, userName }: { userId: string; userName: string }
) => {
  const user = await UserModel.findOne({
    twitchId: userId,
  });

  if (!user) {
    client.say(
      channel,
      `${userName} must first register with the "start" command.`
    );
    return null;
  }

  return user;
};

const getNumeric = (
  { client, channel }: { client: typeof tmi.client; channel },
  { userId, userName }: { userId: string; userName: string },
  value: string
): number | null => {
  let parsedBet;
  try {
    parsedBet = Number.parseInt(value);
  } catch {
    parsedBet = NaN;
  }

  if (parsedBet == NaN) {
    client.say(channel, `${userName} entered an invalid number ${value}.`);
    return;
  }

  if (parsedBet <= 0) {
    client.say(channel, `${userName} entered an invalid number ${value}.`);
    return;
  }

  return parsedBet;
};

const pointsString = (points: number) =>
  `${points} point${points > 0 ? "s" : ""}`;

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

    client.say(
      channel,
      `The tournament is here: challonge.com/${tournament.url}`
    );
  },
  points: async ({ userName, userId }, ...args) => {
    const user = await findRegisteredUser(
      { client, channel },
      { userId, userName }
    );

    if (!user) {
      return;
    }

    client.say(channel, `${userName} has ${user.points} points`);
  },
  bet: async ({ userName, userId }, playerNum, amount) => {
    if (playerNum !== "1" && playerNum !== "2") {
      client.say(
        channel,
        `${userName} entered a bet for an invalid player. Valid values are 1 or 2.`
      );
    }

    const bet = getNumeric({ client, channel }, { userId, userName }, amount);

    if (!bet) {
      return;
    }

    const user = await findRegisteredUser(
      { client, channel },
      { userId, userName }
    );

    if (!user) {
      return;
    }

    if (user.points === 0) {
      client.say(channel, `${userName} sadly doesn't have anything left.`);
      return;
    }

    if (user.points < bet) {
      client.say(
        channel,
        `${userName} can only bet ${pointsString(user.points)}`
      );
      return;
    }

    // PREVENT FROM ENTERING MULTIPLE BETS HEEEEEEEEEEEEEEREEEEEEEEEEEEEE

    console.log("Trying to set bet");

    const tournament = await getNextTournament();
    const match = await getUpcomingTournamentMatch(tournament.id);

    const existingBet = await BetModel.find({
      matchId: match.matchId,
      tournamentId: tournament.id,
      userId: userId,
    })
    if (existingBet) {
      client.say(channel, `${userName} has already entered a bet for this match. This is a no-no!`);
      return;
    }

    const betEntry = new BetModel();
    betEntry.userId = userId;
    betEntry.bet = bet;
    betEntry.tournamentId = tournament.id;
    betEntry.matchId = match.matchId;
    betEntry.player = playerNum === "1" ? 1 : 2;

    user.points = user.points - bet;

    await betEntry.save();
    await user.save();

    client.say(channel, `${userName} bet ${bet} points on player ${playerNum}`);
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
  enter: async ({ userName, userId }, character, name) => {
    if (!character) {
      client.say(
        channel,
        `${userName} didn't enter a character name. Ex: !at enter Mario.`
      );
      return;
    }
    /*
    if (!bet) {
      client.say(channel, `${userName} didn't enter a bet. Ex: !at enter Mario.`);
      return;
    }*/

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
    /*
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
    }*/

    const user = await UserModel.findOne({
      twitchId: userId,
    });

    if (user) {
      /*
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
      }*/

      const newEntry = new EntryModel();
      newEntry.userId = userId;
      newEntry.bet = 0;
      newEntry.name = name || `${userName}'s ${foundCharacter}`;
      newEntry.character = foundCharacter;

      // user.points = user.points - parsedBet;

      await newEntry.save();
      await user.save();

      client.say(channel, `${userName} entered ${foundCharacter}.`);
      /*
      client.say(
        channel,
        `${userName} entered ${foundCharacter} with ${pointsString(
          parsedBet
        )}. You ${
          user.points > 0
            ? `have ${pointsString(user.points)}`
            : `sadly have no points left`
        }.`
      );*/
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
