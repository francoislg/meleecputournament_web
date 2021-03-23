import type { Socket } from "socket.io";

import {
  TournamentAdapter,
  MatchAdapter,
  MatchInterfaces,
  ParticipantInterfaces,
  ParticipantAdapter,
} from "challonge-ts";
import { TournamentModel } from "./models/Tournament";
import { EntryModel } from "./models/Entry";
import { randomCharacter } from "./constants";

const CHALLONGE_API_KEY = process.env.AT_CHALLONGE_KEY;
const MINIMUM_NUMBER_OF_PARTICIPANTS = 4;
const MAXIMUM_NUMBER_OF_PARTICIPANTS = 24;

if (!CHALLONGE_API_KEY) {
  throw new Error("Challonge API Key not provided.");
}

const getEvenNumber = (n: number) => Math.floor(n / 2) * 2;

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
  {
    winnerId,
    isWinnerFirstPlayer,
  }: { winnerId: number; isWinnerFirstPlayer: boolean }
) => {
  await MatchAdapter.update(CHALLONGE_API_KEY, tournamentId, matchId, {
    match: {
      winner_id: winnerId,
      scores_csv: isWinnerFirstPlayer ? `1-0` : `0-1`,
    },
  });
};

const getNextTournament = async () => {
  const tournament = await TournamentModel.findOne({
    inProgress: true,
  });
  if (!tournament) {
    return null;
  }
  const found = await TournamentAdapter.show(
    CHALLONGE_API_KEY,
    tournament.tournamentId
  );
  return {
    id: found.tournament.id.toString(),
    state: found.tournament.state,
  };
};

const getNextTournamentMatch = async (
  tournamentId: string
): Promise<MatchMessage | null> => {
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

  if (!firstOpenMatch) {
    return null;
  }

  const matchId = firstOpenMatch.id;
  const findParticipant = async (id) => {
    const participant = participants.find(
      (participant) => participant.id === id
    );
    return await EntryModel.findById(participant.misc);
  };

  const firstParticipant = await findParticipant(firstOpenMatch.player1_id);
  const secondParticipant = await findParticipant(firstOpenMatch.player2_id);

  await MatchAdapter.update(CHALLONGE_API_KEY, tournamentId, matchId, {
    match: {
      scores_csv: '0-0'
    }
  })

  return {
    matchId,
    first: {
      id: firstOpenMatch.player1_id,
      character: firstParticipant.character,
      name: firstParticipant.name,
    },
    second: {
      id: firstOpenMatch.player2_id,
      character: secondParticipant.character,
      name: secondParticipant.name,
    },
  };
};

const createNewTournament = async () => {
  const count = await TournamentModel.countDocuments();
  const created = await TournamentAdapter.create(CHALLONGE_API_KEY, {
    tournament: {
      name: `Melee CPU Tournament #${count}`,
      description:
        "An automated tournament, see https://www.twitch.tv/autotournaments",
      url: `meleecputournament_test${count}`,
    },
  });
  const tournamentId = created.tournament.id.toString();

  const newOne = new TournamentModel();
  newOne.tournamentId = tournamentId;
  newOne.inProgress = true;
  await newOne.save();
  return tournamentId;
};

const addParticipants = async (tournamentId: string) => {
  const currentParticipants = await TournamentAdapter.show(
    CHALLONGE_API_KEY,
    tournamentId
  );
  const currentNumberOfParticipants =
    currentParticipants.tournament.participants_count;
  const numberOfEmptySpots = getEvenNumber(MAXIMUM_NUMBER_OF_PARTICIPANTS - currentNumberOfParticipants);

  const playersToAdd = await EntryModel.find({
    tournamentId: null,
  }).limit(numberOfEmptySpots);

  const numberExistingPlusNewParticipants = playersToAdd.length + currentNumberOfParticipants;

  let playersToCreate = 0;
  if (
    numberExistingPlusNewParticipants <
    MINIMUM_NUMBER_OF_PARTICIPANTS
  ) {
    playersToCreate = MINIMUM_NUMBER_OF_PARTICIPANTS - playersToAdd.length;
  } else if (numberExistingPlusNewParticipants % 2) {
    playersToCreate = 1;
  }

  if (playersToCreate > 0) {
    const createDummyEntry = () => {
      const entry = new EntryModel();
      const character = randomCharacter();
      entry.name = `No one's ${character}`;
      entry.character = character;
      return entry;
    };
    console.log(`About to create ${playersToCreate} dummies.`);
    const toCreate = [...new Array(playersToCreate)].map(createDummyEntry);
    const created = await EntryModel.insertMany(toCreate);
    playersToAdd.push(...created);
  }

  await ParticipantAdapter.bulkAdd(CHALLONGE_API_KEY, tournamentId, {
    participants: playersToAdd.map((p) => ({
      name: `${p.name}${p.bet ? ` (${p.bet} points)` : ''} - ${p.id}`,
      misc: p.id,
    })),
  });

  await EntryModel.updateMany(
    {
      _id: {
        $in: playersToAdd.map((p) => p.id),
      },
    },
    {
      tournamentId,
    }
  );
};

const startTournament = async (tournamentId: string) => {
  await ParticipantAdapter.randomize(CHALLONGE_API_KEY, tournamentId);
  await TournamentAdapter.start(CHALLONGE_API_KEY, tournamentId);
};

const finishTournament = async (tournamentId: string) => {
  await TournamentAdapter.finalize(CHALLONGE_API_KEY, tournamentId);
  await TournamentModel.updateOne(
    {
      tournamentId,
    },
    {
      inProgress: false,
    }
  );
};

export class PCServer {
  constructor(socket: Socket, {reconnecting}: {reconnecting: boolean}) {
    const fillAndStartTournament = async (tournamentId: string) => {
      await addParticipants(tournamentId);
      await startTournament(tournamentId);
      await sendNextMatch();
    };

    const sendNextMatch = async () => {
      try {
        const tournament = await getNextTournament();

        if (tournament) {
          if (tournament.state === 'pending') {
            await fillAndStartTournament(tournament.id);
          } else {
            const match = await getNextTournamentMatch(tournament.id);
            if (match) {
              socket.emit("match", match);
            } else {
              await finishTournament(tournament.id);
              const newTournamentId = await createNewTournament();
              await fillAndStartTournament(newTournamentId);
            }
          }
        } else {
          const newTournamentId = await createNewTournament();
          await fillAndStartTournament(newTournamentId);
        }
      } catch (err) {
        console.error(err);
      }
    };

    socket.on(
      "winner",
      async ({
        matchId,
        winner,
        loser,
        isWinnerFirstPlayer,
      }: MatchResponseMessage) => {
        try {
          const tournament = await getNextTournament();
          await finishMatch(tournament.id, matchId, {
            winnerId: winner.id,
            isWinnerFirstPlayer,
          });
          await sendNextMatch();
        } catch (err) {
          console.error(err);
        }
      }
    );

    if (!reconnecting) {
      sendNextMatch();
    }
  }
}
