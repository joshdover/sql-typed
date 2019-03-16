import {
  Pool as PGPool,
  PoolClient as PGPoolClient,
  PoolConfig as PGPoolConfig
} from "pg";

import { Pool, Transaction } from './types';

/**
 * Returns a connection pool with a high-level transaction interface.
 * @param config
 */
export const createPool = (config?: PGPoolConfig, { echo } = { echo: false }): Pool => {
  const pool = new PGPool(config);

  const getNested = async (client: PGPoolClient, level = 0): Promise<Transaction> => {
    await client.query(`SAVEPOINT nested_${level}`);

    return {
      async commit() {
        await client.query(`SAVEPOINT nested_${level}`);
      },
      async rollback() {
        await client.query(`ROLLBACK TO SAVEPOINT nested_${level}`);
      },
      query: client.query.bind(client),
      async nested<T>(cb: (transaction: Transaction) => Promise<T>) {
        const transaction = await getNested(client, level + 1);

        try {
          const ret = await cb(transaction);
          await client.query(`SAVEPOINT nested_${level}`);
          return ret;
        } catch (e) {
          await client.query(`ROLLBACK TO SAVEPOINT nested_${level}`);
          throw e;
        }
      }
    };
  };

  const getTransaction = async (client: PGPoolClient): Promise<Transaction> => {
    await client.query("BEGIN");

    return {
      async commit() {
        await client.query("COMMIT");
        await client.query("BEGIN");
      },
      async rollback() {
        await client.query("ROLLBACK");
        await client.query("BEGIN");
      },
      query: client.query.bind(client),
      async nested<T>(cb: (transaction: Transaction) => Promise<T>) {
        await client.query("SAVEPOINT toplevel");
        const transaction = await getNested(client);

        try {
          const ret = await cb(transaction);
          await client.query("SAVEPOINT toplevel");
          return ret;
        } catch (e) {
          await client.query("ROLLBACK TO SAVEPOINT toplevel");
          throw e;
        }
      }
    };
  };

  return {
    connect: pool.connect.bind(pool),
    async transaction<T>(
      cb: (transaction: Transaction) => Promise<T>
    ): Promise<T> {
      const client = await pool.connect();

      // Intercept all queries and log to console
      if (echo) {
        const query_ = client.query.bind(client);
        client.query = (...args: any[]) => {
          console.log(args);
          // @ts-ignore
          return query_(...args);
        }
      }

      const transaction = await getTransaction(client);
      try {
        const ret = await cb(transaction);
        await client.query("COMMIT");
        return ret;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
  };
};
