import type { Socket } from "socket.io";
import { EntryModel } from "./models/Entry";
import { UserModel } from "./models/User";
import {
  getBetsForSingleMatch,
  getNextSingleMatch,
  getUpcomingSingleMatch,
  hasSingleMatchInProgress,
} from "./singlematches-commands";
import {
  getBetsForMatch,
  getNextTournament,
  getNextTournamentMatch,
  getUpcomingTournamentMatch,
} from "./tournament-commands";
import { MatchMessage } from "./types";

export interface InitialOverlayData {
  leaderboard: ILeaderboard;
  matches: MatchesInfo;
  entries: EntriesInfo;
}

export interface ILeaderboard {
  players: IPlayerInLeaderboard[];
}

export interface IPlayerInLeaderboard {
  name: string;
  points: number;
}

export interface MatchesInfo {
  tournamentUrl?: string;
  current?: {
    match: MatchMessage;
    bets: {
      player1: number;
      player2: number;
    };
  };
  upcoming?: {
    match: MatchMessage;
    bets: {
      player1: number;
      player2: number;
    };
  };
}

export interface EntryInfo {
  name: string;
  character: string;
  userName: string;
  color: number;
}

export interface EntriesInfo {
  entries: EntryInfo[];
}

export interface IWinnerInfo {
  isWinnerFirstPlayer: boolean;
}

const getLeaderboard = async (): Promise<ILeaderboard> => {
  const users = await UserModel.find().limit(5).sort({
    points: -1,
  });
  return {
    players: users.map(({ twitchUsername, points }) => ({
      name: twitchUsername,
      points: points,
    })),
  };
};

const getMatches = async (): Promise<MatchesInfo> => {
  const tournament = await getNextTournament();

  if (tournament) {
    const match = await getNextTournamentMatch(tournament.id);
    const upcoming = await getUpcomingTournamentMatch(tournament.id);

    return {
      tournamentUrl: tournament.url,
      ...(match
        ? {
            current: {
              match,
              bets: await getBetsForMatch(tournament.id, match.matchId),
            },
          }
        : {}),
      ...(upcoming
        ? {
            upcoming: {
              match: upcoming,
              bets: await getBetsForMatch(tournament.id, upcoming.matchId),
            },
          }
        : {}),
    };
  } else if (await hasSingleMatchInProgress()) {
    const match = await getNextSingleMatch();
    const upcoming = await getUpcomingSingleMatch();

    return {
      ...(match
        ? {
            current: {
              match,
              bets: await getBetsForSingleMatch(match.matchId),
            },
          }
        : {}),
      ...(upcoming
        ? {
            upcoming: {
              match: upcoming,
              bets: await getBetsForSingleMatch(upcoming.matchId),
            },
          }
        : {}),
    };
  } else {
    return {};
  }
};

const getLatestEntries = async (): Promise<EntriesInfo> => {
  const entries = await EntryModel.find({
    tournamentId: null,
    userId: {$exists: true},
  })
    .sort({
      createdAt: 1,
    })
    .limit(5);
  const relatedUsers = await UserModel.find({
    twitchId: {
      $in: entries.map((entry) => entry.userId),
    },
  });

  return {
    entries: entries.map(({ name, character, userId, color }) => ({
      name,
      character,
      userName: relatedUsers.find((u) => u.twitchId === userId)?.twitchUsername,
      color,
    })),
  };
};

export class OverlayServer {
  private openSockets: Socket[] = [];
  public connect(socket: Socket) {
    const sendInitialData = async () => {
      const init: InitialOverlayData = {
        leaderboard: await getLeaderboard(),
        matches: await getMatches(),
        entries: await getLatestEntries(),
      };
      socket.emit("init", init);
    };

    const updateLeaderboard = setInterval(sendInitialData, 30000);

    this.openSockets.push(socket);
    socket.on("disconnect", () => {
      clearInterval(updateLeaderboard);
      this.openSockets = this.openSockets.filter((s) => s === socket);
    });

    setTimeout(sendInitialData, 1000);
  }

  async updateMatchesData() {
    this.emitAll("matches", await getMatches());
  }

  async updateLeaderboard() {
    this.emitAll("leaderboard", await getLeaderboard());
  }

  async updateEntries() {
    this.emitAll("entries", await getLatestEntries());
  }

  async nextMatchIn(timeInSeconds: number) {
    this.emitAll("nextmatchin", timeInSeconds);
  }

  async startMatch() {
    this.emitAll("startmatch");
  }

  async sendWinner({ isWinnerFirstPlayer }) {
    this.emitAll("winner", {
      isWinnerFirstPlayer,
    });
  }

  emitAll: Socket["emit"] = (ev, ...args): boolean => {
    return this.openSockets.every((socket) => socket.emit(ev, ...args));
  };
}
