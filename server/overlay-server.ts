import type { Socket } from "socket.io";
import { EntryModel } from "./models/Entry";
import { UserModel } from "./models/User";
import {
  getNextTournament,
  getNextTournamentMatch,
  getUpcomingTournamentMatch,
  MatchMessage,
} from "./tournament-commands";

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
  current?: MatchMessage;
  upcoming?: MatchMessage;
}

export interface EntryInfo {
  name: string;
  character: string;
  bet: number;
  userName: string
}

export interface EntriesInfo {
  entries: EntryInfo[]
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
      current: match,
      upcoming: upcoming,
    };
  } else {
    return {
      current: null,
      upcoming: null,
    };
  }
};

const getLatestEntries = async (): Promise<EntriesInfo> => {
  const entries = await EntryModel.find({
    tournamentId: null
  }).sort({
    createdAt: -1
  }).limit(5);
  const relatedUsers = await UserModel.find({
    twitchId: {
      $in: entries.map(entry => entry.userId),
    }
  });

  return {
    entries: entries.map(({name, character, bet, userId}) => ({
      name,
      character,
      bet,
      userName: relatedUsers.find(u => u.twitchId === userId)?.twitchUsername
    }))
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

    sendInitialData();
  }

  async updateMatchesData() {
    this.emitAll("matches", await getMatches());
  }

  async nextMatchIn(timeInSeconds: number) {
    this.emitAll("nextmatchin", timeInSeconds);
  }

  async sendWinner({isWinnerFirstPlayer}) {
    this.emitAll("winner", {
      isWinnerFirstPlayer,
    })
  }

  emitAll: Socket["emit"] = (ev, ...args): boolean => {
    return this.openSockets.every((socket) => socket.emit(ev, ...args));
  };
}
