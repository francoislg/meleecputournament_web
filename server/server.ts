import { Socket, Server } from "socket.io";
import {
  TournamentAdapter,
  MatchAdapter,
  MatchInterfaces,
  ParticipantInterfaces,
} from "challonge-ts";

const server = new Server(8080);

const CHALLONGE_API_KEY = "fKymDttRhRq8z8Vek7E3RZFBrkIhTR2gHxmSyWa0";

interface PlayerMessageMeta {
  id: number;
  name: string;
  character: string;
}

interface MatchMessage {
  first: PlayerMessageMeta;
  second: PlayerMessageMeta;
  matchId: number;
}

interface MatchResponseMessage {
  winner: PlayerMessageMeta;
  loser: PlayerMessageMeta;
  isWinnerFirstPlayer: boolean;
  matchId: number;
}

const finishMatch = async (
  tournamentId: string,
  matchId: number,
  { winnerId, isWinnerFirstPlayer }: { winnerId: number, isWinnerFirstPlayer: boolean  }
) => {
  await MatchAdapter.update(CHALLONGE_API_KEY, tournamentId, matchId, {
    match: {
      winner_id: winnerId,
      scores_csv: isWinnerFirstPlayer ? `1-0` : `0-1`,
    },
  });
};

const getNextTournamentMatch = async (
  tournamentId: string
): Promise<MatchMessage> => {
  const tournament = await TournamentAdapter.show(
    CHALLONGE_API_KEY,
    tournamentId,
    {
      include_matches: 1,
      include_participants: 1,
    }
  );
  // Fix for the wrong type in the lib.
  const matches = tournament.tournament.matches.map(
    (match) => (match as any).match as MatchInterfaces.matchResponseObject
  );
  const participants = tournament.tournament.participants.map(
    (p) =>
      (p as any).participant as ParticipantInterfaces.participantResponseObject
  );
  const firstOpenMatch = matches.find((match) => match.state == "open");
  const matchId = firstOpenMatch.id;
  const findParticipant = (id) =>
    participants.find((participant) => participant.id === id);

  console.log(firstOpenMatch);
  console.log(participants.map((p) => p.id));

  // Here we use the participant name as the character, we should consider mapping the player names to characters, either with challonge meta or using a database.
  const firstName = findParticipant(firstOpenMatch.player1_id).name;
  const secondName = findParticipant(firstOpenMatch.player2_id).name;

  return {
    matchId,
    first: {
      id: firstOpenMatch.player1_id,
      character: firstName,
      name: firstName,
    },
    second: {
      id: firstOpenMatch.player2_id,
      character: secondName,
      name: secondName,
    },
  };
};

server.on("connect", (socket: Socket) => {
  console.log(`connect ${socket.id}`);

  socket.on("iamtheserver", () => {
    const tournamentId = "f3btgneb";
    const sendNextMatch = async () => {
      try {
        const match = await getNextTournamentMatch(tournamentId);
        socket.emit("match", match);
      } catch (err) {
        console.error(err);
      }
    };

    socket.on("winner", async ({ matchId, winner, loser, isWinnerFirstPlayer }: MatchResponseMessage) => {
      try {
        await finishMatch(tournamentId, matchId, { winnerId: winner.id, isWinnerFirstPlayer });
        await sendNextMatch();
      } catch (err) {
        console.error(err);
      }
    });

    sendNextMatch();
  });

  socket.on("disconnect", () => {
    console.log(`disconnect ${socket.id}`);
  });
});
