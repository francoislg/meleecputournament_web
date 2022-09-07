import { CHARACTERS, getMiiConfiguration, randomCharacter } from "./constants";
import { BetModel, IBetModel } from "./models/Bet";
import { EntryModel } from "./models/Entry";
import { UserModel } from "./models/User";
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
  MatchMessage,
} from "./tournament-commands";
import * as ONLINEBOTS from "./onlinebots.json";
import * as TOPBOTS from "./top100bots.json";
import { updateBots } from "./updatebots";
import { reportLog } from "./log";
import { Document } from "mongoose";

const knownBots = [
  "shadowy_stix",
  "underworldnaiad",
  "streamers_on_discord",
  "streamersdiscordcommunity",
  "comettunes",
  "brokemystreamdeck",
  "twitchgrowthdiscord",
  "yosef_the_spammer",
  "2020",
  "jdlb",
  "icantcontrolit",
  "d4rk_5ky",
  "pawlina93",
  "stormmunity",
  "social_twitch_discord",
  "frw33d",
  "notyosefsa7",
  "peculiarasmr",
  "pro_gamer_network",
  "sad_grl",
  "servres",
];
let JOIN_BLACKLIST = [...ONLINEBOTS, ...TOPBOTS, ...knownBots];
setInterval(async () => {
  const newOnlineBots = await updateBots();
  JOIN_BLACKLIST = [...newOnlineBots, ...TOPBOTS, ...knownBots];
}, 1000 * 60 * 60);

// tmi.js doc: https://github.com/tmijs/docs/blob/gh-pages/_posts
const tmi = require("tmi.js");

const BOT_USERNAME = "supersmashbotsshowdown";
const CHANNEL_NAME = "supersmashbotsshowdown";
const OAUTH_TOKEN = process.env.AT_TWITCH_OAUTH_TOKEN;

const JOIN_MESSAGE_ENABLED = true;
const JOIN_TIME_BUFFER_SEC = 20;
const EXPIRATION_OF_RECENT_LOGIN = 60 * 60 * 1000;

let recentLogins: Array<{ expiring: Date; name: string }> = [];

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
    return;
  }

  if (parsedBet < 0) {
    return;
  }

  return parsedBet;
};

const pointsString = (points: number) =>
  `${points} point${points > 0 ? "s" : ""}`;

const getMatchAndBet = async (
  userId: string
): Promise<
  [
    MatchMessage,
    Awaited<ReturnType<typeof getNextTournament>>,
    IBetModel & Document<any, {}>
  ]
> => {
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

  return [match, tournament, existingBet];
};

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

    client.say(
      channel,
      `${userName} has ${user.points} points. ${
        user.points === 0
          ? "(You have access to a pity bet of 1 at 0 points)"
          : ""
      }`
    );
  },
  colors: async ({}, character) => {
    client.say(
      channel,
      `Enter your color after a character pick (for instance, \`!enter Mario 4\`). The number should be between 1-8, in order visible here: https://www.ssbwiki.com/Alternate_costume_(SSBU)#${
        character || ""
      }`
    );
  },
  report: async ({ userName }, ...args) => {
    reportLog(`${userName}: ${args.join(" ")}`);
    client.say(
      channel,
      `${userName}'s report has been logged, it will be read by the admin.`
    );
  },
  bet: async ({ userName, userId }, playerNum, amount, replace) => {
    if (playerNum !== "1" && playerNum !== "2") {
      client.say(
        channel,
        `${userName} entered a bet for an invalid player. Valid values are 1 or 2.`
      );
      return;
    }

    const bet = getNumeric({ client, channel }, { userId, userName }, amount);

    if (!bet) {
      client.say(
        channel,
        `${userName} entered a bet without a valid amount to bet! For instance, you can bet 5 points on #1 with !bet 1 5.`
      );
      return;
    }

    const user = await findRegisteredUser(
      { client, channel },
      { userId, userName }
    );

    if (!user) {
      return;
    }

    const isPityBet = user.points === 0 && bet === 1;
    const isReplacingBet = replace === "replace";

    if (isReplacingBet) {
      const [match, tournament, existingBet] = await getMatchAndBet(userId);
      if (existingBet) {
        user.points = user.points + existingBet.bet;
      }
    }

    if (!isPityBet) {
      if (user.points === 0) {
        client.say(
          channel,
          `${userName} sadly doesn't have anything left. But you can have a pity bet of 1!`
        );
        return;
      }

      if (user.points < bet) {
        client.say(
          channel,
          `${userName} can only bet ${pointsString(user.points)}`
        );
        return;
      }
    }

    const [match, tournament, existingBet] = await getMatchAndBet(userId);
    const playerToBet = playerNum === "1" ? 1 : 2;

    if (existingBet) {
      if (isReplacingBet) {
        existingBet.bet = bet;
        existingBet.player = playerToBet;
        await existingBet.save();
      } else {
        client.say(
          channel,
          `${userName} has already entered a bet for this match (${
            existingBet.bet
          } on "${
            existingBet.player === 1 ? match.first.name : match.second.name
          }"). If you want to replace your bet, add "replace" at the end as such: !bet 1 5 replace`
        );
        return;
      }
    } else {
      const betEntry = new BetModel();
      betEntry.userId = userId;
      betEntry.bet = bet;
      betEntry.tournamentId = tournament.id;
      betEntry.matchId = match.matchId;
      betEntry.player = playerToBet;
      await betEntry.save();
    }

    user.points = Math.max(user.points - bet, 0);
    await user.save();

    overlay.updateMatchesData();
    overlay.updateEntries();
    if (isPityBet) {
      client.say(
        channel,
        `${userName} bet a pity bet (1 point) "${
          playerNum === "1" ? match.first.name : match.second.name
        }".`
      );
    } else {
      client.say(
        channel,
        `${userName} ${
          isReplacingBet ? "is replacing his bet," : "bet"
        } ${bet} points on "${
          playerNum === "1" ? match.first.name : match.second.name
        }" and now has ${user.points} points.`
      );
    }
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
      // Make this match the `enter` if not registered, I'm too lazy
      const newUser = new UserModel();
      newUser.twitchId = userId;
      newUser.twitchUsername = userName;
      newUser.points = POINTS_TO_START_WITH;
      newUser.save();

      client.say(
        channel,
        `${userName} was given ${POINTS_TO_START_WITH} points to start.\nYou can now enter a character with \`!enter CHARACTER NAME\`, such as \`!enter Kirby FluffBall\``
      );
    }
  },
  enter: async ({ userName, userId }, character, ...nameParts) => {
    if (!character) {
      client.say(
        channel,
        `${userName} didn't enter a character name. Ex: !enter Mario.`
      );
      return;
    }

    function isColorNumber(color: string) {
      try {
        const c = parseInt(color);
        return c >= 1 && c <= 8;
      } catch (error) {
        return false;
      }
    }

    let color = null;
    if (isColorNumber(nameParts[nameParts.length - 1])) {
      color = parseInt(nameParts.pop());
    }

    const name = nameParts.join(" ");

    if (name) {
      if (name.length > MAX_NAME_LENGTH) {
        client.say(
          channel,
          `${userName} entered a custom name a bit too long. The maximum is 20 characters.`
        );
        return;
      }
    }

    const foundCharacter =
      character.toLowerCase() === "random"
        ? randomCharacter()
        : CHARACTERS.find((c) => c.toLowerCase() === character.toLowerCase());

    if (!foundCharacter) {
      client.say(
        channel,
        `The character \"${character}\" from ${userName} was not properly detected. See the list of valid characters in the channel description.`
      );
      return;
    }

    const user = await UserModel.findOne({
      twitchId: userId,
    });

    if (!user) {
      // Please make this match the `start` command, I'm too lazy
      const newUser = new UserModel();
      newUser.twitchId = userId;
      newUser.twitchUsername = userName;
      newUser.points = POINTS_TO_START_WITH;
      await newUser.save();

      client.say(
        channel,
        `${userName} was given ${POINTS_TO_START_WITH} points to start.`
      );
    }

    const newEntry = new EntryModel();
    newEntry.userId = userId;
    newEntry.name = name || `${userName}'s ${foundCharacter}`;
    newEntry.character = foundCharacter;
    newEntry.miiConfiguration = getMiiConfiguration(foundCharacter);
    newEntry.color = color;

    await newEntry.save();

    overlay.updateMatchesData();
    client.say(
      channel,
      `${userName} entered ${foundCharacter}${name ? ` as "${name}"` : ""}${
        color ? ` with color #${color}` : ""
      }.`
    );
  },
});

export class ChatServer {
  client: any;
  constructor(overlay: OverlayServer) {
    console.log("Starting chat server");
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

      client.on(
        "part",
        async (channel: string, userName: string, self: boolean) => {
          peopleToGreet = peopleToGreet.filter((p) => p !== userName);
          console.log("Filtered out", userName, peopleToGreet);
        }
      );

      client.on(
        "join",
        async (channel: string, userName: string, self: boolean) => {
          if (self) {
            return;
          }

          if (JOIN_BLACKLIST.indexOf(userName.toLowerCase()) !== -1) {
            return;
          }

          recentLogins = recentLogins.filter(
            (login) => login.expiring < new Date()
          );
          if (
            recentLogins.filter((login) => login.name === userName).length > 0
          ) {
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

              recentLogins.push(
                ...peopleToGreet.map((p) => ({
                  name: p,
                  expiring: new Date(
                    new Date().valueOf() + EXPIRATION_OF_RECENT_LOGIN
                  ),
                }))
              );

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
                  )}! Enter \`!start\` to register!`,
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
        }
      );
    }

    client.on("message", (target, context, msg, self) => {
      if (self) {
        return;
      } // Ignore messages from the bot

      const { username: userName, "user-id": userId } = context;
      const goodContext = { userName, userId };

      const message: string = msg.trim();
      if (message.toLowerCase().startsWith("!")) {
        const [rawCommand, ...terms] = message
          .substring(message.toLowerCase().startsWith("!at") ? 3 : 1)
          .trim()
          .split(" ");
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
      } else if (
        message.toLowerCase().startsWith("hello") ||
        message.toLowerCase().startsWith("hi")
      ) {
        client.say(
          channel,
          `Hello ${userName}! Use \`!start\` to register yourself in the game or \`!enter CHARACTER\` to enter a character for the next match!`
        );
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
