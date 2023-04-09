import { CheerioCrawler, EnqueueStrategy, log } from 'crawlee';
import Datastore from '@seald-io/nedb';
import path from 'path';

async function handler(dbFolder?: string, seed?: string) {
  const basePath = dbFolder || './';
  const urlsDbPath = path.resolve(basePath, 'urls.db');
  const domainsDbPath = path.resolve(basePath, 'domains.db');
  const urlsDb = new Datastore({ filename: urlsDbPath, autoload: true });
  const domainsDb = new Datastore({ filename: domainsDbPath, autoload: true });

  const seedLookup = await domainsDb.findAsync<{ domain: string }>({});
  const seeds = seedLookup.map(seed => {
    return `https://${seed.domain}`;
  });

  const crawler = new CheerioCrawler({
    async requestHandler({ request, enqueueLinks }) {
      log.info(request.url);

      const domain = new URL(request.url).hostname;

      const urls = await urlsDb.findAsync({ url: request.url });
      const domains = await domainsDb.findAsync({ domain });

      if (urls.length === 0) {
        await urlsDb.insertAsync({ url: request.url });
      }

      if (domains.length === 0) {
        await domainsDb.insertAsync({ domain });
      }

      await enqueueLinks({
        strategy: EnqueueStrategy.SameDomain,
      });
    },
  });

  if (seed) {
    seeds.push(seed);
  }

  await crawler.run(seeds);
}

handler(process.argv[2], process.argv[3]);
