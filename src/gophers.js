import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import ULID from 'ulid';

const ddb = new DynamoDBClient();

const create = async (data) => {
  const id = ULID.ulid();

  const command = new PutItemCommand({
    TableName: process.env.TABLE_NAME,
    Item: marshall({
      ...data,
      pk: id,
      sk: 'gopher'
    })
  });

  await ddb.send(command);

  return id;
};

const load = async (id) => {
  const command = new GetItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: id,
      sk: 'gopher'
    })
  });

  const result = await ddb.send(command);
  if (result?.Item) {
    return unmarshall(Item);
  }
};

export const Gopher = {
  create,
  load
};