import { CHARACTERS } from "./constants";
import { BetModel } from "./models/Bet";
import { EntryModel } from "./models/Entry";
import { IUserModel, UserModel } from "./models/User";
import { OverlayServer } from "./overlay-server";
import {
  FAKE_TOURNAMENT_ID,
  getNextSingleMatch,
  getUpcomingSingleMatch,
} from "./singlematches-commands";
import {
  getNextTournament,
  getNextTournamentMatch,
  getUpcomingTournamentMatch,
} from "./tournament-commands";
import * as ONLINEBOTS from "./onlinebots.json";
import * as TOPBOTS from "./top100bots.json";

const knownBots = [];
const JOIN_BLACKLIST = [...ONLINEBOTS, ...TOPBOTS, ...knownBots];

// tmi.js doc: https://github.com/tmijs/docs/blob/gh-pages/_posts
const tmi = require("tmi.js");

const BOT_USERNAME = "autotournaments";
const CHANNEL_NAME = "autotournaments";
const OAUTH_TOKEN = process.env.AT_TWITCH_OAUTH_TOKEN;

const JOIN_MESSAGE_ENABLED = true;
const JOIN_TIME_BUFFER_SEC = 20;

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

    if (tournament) {
      client.say(
        channel,
        `The tournament is here: challonge.com/${tournament.url}`
      );
    } else {
      client.say(
        channel,
        `The stream is running in single matches mode. Enter more characters to create a tournament!`
      );
    }
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

    console.log("Trying to set bet");

    let tournament = await getNextTournament();
    let match;
    if (tournament) {
      match = await getUpcomingTournamentMatch(tournament.id);
    } else {
      tournament = {
        id: FAKE_TOURNAMENT_ID,
        url: "none",
        isPending: false,
      };
      match = await getUpcomingSingleMatch();
    }

    if (!match) {
      client.say(
        channel,
        `There are no matches to bet on, wait a bit for the next tournament!`
      );
      return;
    }

    const existingBet = await BetModel.findOne({
      matchId: match.matchId,
      tournamentId: tournament.id,
      userId: userId,
    });
    if (existingBet) {
      client.say(
        channel,
        `${userName} has already entered a bet for this match (${
          existingBet.bet
        } on "${
          existingBet.player === 1 ? match.first.name : match.second.name
        }"). This is a no-no!`
      );
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

    client.say(
      channel,
      `${userName} bet ${bet} points on "${
        playerNum === "1" ? match.first.name : match.second.name
      }" and now has ${user.points} points.`
    );
  },
  currentbet: async ({ userName, userId }) => {
    let tournament = await getNextTournament();
    let match;
    if (tournament) {
      match = await getNextTournamentMatch(tournament.id);
    } else {
      tournament = {
        id: FAKE_TOURNAMENT_ID,
        url: "none",
        isPending: false,
      };
      match = await getNextSingleMatch();
    }

    const existingBet = await BetModel.findOne({
      matchId: match.matchId,
      tournamentId: tournament.id,
      userId: userId,
    });
    if (existingBet) {
      client.say(
        channel,
        `${userName} has a ${existingBet.bet} points bet on "${
          existingBet.player === 1 ? match.first.name : match.second.name
        }" for the current match.`
      );
      return;
    } else {
      client.say(channel, `${userName} has no bet for the match.`);
      return;
    }
  },
  upcomingbet: async ({ userName, userId }) => {
    let tournament = await getNextTournament();
    let match;
    if (tournament) {
      match = await getUpcomingTournamentMatch(tournament.id);
    } else {
      tournament = {
        id: FAKE_TOURNAMENT_ID,
        url: "none",
        isPending: false,
      };
      match = await getUpcomingSingleMatch();
    }
    const existingBet = await BetModel.findOne({
      matchId: match.matchId,
      tournamentId: tournament.id,
      userId: userId,
    });
    if (existingBet) {
      client.say(
        channel,
        `${userName} has a ${existingBet.bet} points bet on "${
          existingBet.player === 1 ? match.first.name : match.second.name
        }" for the next match.`
      );
      return;
    } else {
      client.say(channel, `${userName} has no bet for the upcoming match.`);
      return;
    }
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
        `${userName} was given ${POINTS_TO_START_WITH} points to start.\nYou can now enter a character with \`!at enter [character] [name]\`, such as \`!at enter Kirby FluffBall\``
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

    const user = await UserModel.findOne({
      twitchId: userId,
    });

    if (user) {
      const newEntry = new EntryModel();
      newEntry.userId = userId;
      newEntry.name = name || `${userName}'s ${foundCharacter}`;
      newEntry.character = foundCharacter;

      await newEntry.save();
      await user.save();

      client.say(channel, `${userName} entered ${foundCharacter}.`);
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
  client: any;
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
    this.client = client;

    const commands = createCommands({
      client,
      channel,
      overlay,
    });

    if (JOIN_MESSAGE_ENABLED) {
      let peopleToGreet: string[] = [];
      let isFirstJoinSkipped = false;
      let timeout: NodeJS.Timeout;

      client.on("part", async (channel: string, userName: string, self: boolean) => {
        peopleToGreet = peopleToGreet.filter((p) => p !== userName);
        console.log("Filtered out", userName, peopleToGreet);
      });

      client.on("join", async (channel: string, userName: string, self: boolean) => {
        if (self) {
          return;
        }

        if (JOIN_BLACKLIST.indexOf(userName.toLowerCase()) !== -1) {
          return;
        }

        peopleToGreet.push(userName);

        clearTimeout(timeout);
        timeout = setTimeout(async () => {
          if (isFirstJoinSkipped) {
            console.log("To greet", peopleToGreet);
            const users = await UserModel.find({
              twitchUsername: {
                $in: peopleToGreet,
              },
            });

            let returning = peopleToGreet
              .map((p) => users.find((user) => user.twitchUsername === p))
              .filter((p) => !!p);
            let newUsers = peopleToGreet.filter(
              (p) => !users.find((user) => user.twitchUsername === p)
            );
            console.log("Greeting", returning, newUsers);

            const messages = [
              returning.length > 0 &&
                `Welcome back to: ${returning
                  .map((r) => `${r.twitchUsername} (${r.points} points)`)
                  .join(", ")}!`,
              newUsers.length > 0 &&
                `Welcome to our unregistered users: ${newUsers.join(
                  ", "
                )}! Enter \`!at start\` to register!`,
            ].filter((m) => !!m);

            if (messages.length > 0) {
              client.say(channel, messages.join("\n"));
            }
          } else {
            console.log("Skipping the greet", peopleToGreet);
            isFirstJoinSkipped = true;
          }
          peopleToGreet = [];
        }, JOIN_TIME_BUFFER_SEC * 1000);
      });
    }

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

  async sendMessage(message: string) {
    this.client.say(CHANNEL_NAME, message);
  }
}
