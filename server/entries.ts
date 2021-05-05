import { generateName, randomCharacter } from "./constants";
import { EntryModel } from "./models/Entry";

export const createDummyEntries = async (playersToCreate: number) => {
  const createDummyEntry = () => {
    const entry = new EntryModel();
    const character = randomCharacter();
    entry.name = generateName(character);
    entry.character = character;
    return entry;
  };
  console.log(`About to create ${playersToCreate} dummies.`);
  const toCreate = [...new Array(playersToCreate)].map(createDummyEntry);
  const created = await EntryModel.insertMany(toCreate);
  return created;
};
