import { log, CheerioCrawler, EnqueueStrategy } from 'crawlee';
import Datastore from '@seald-io/nedb';
import path from 'path';
import axios from 'axios';

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
    async requestHandler({ request, enqueueLinks, $ }) {
      log.info(request.url);

      const url = new URL(request.url);

      const urlRegex =
        // eslint-disable-next-line no-useless-escape
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

      const html = $.html();
      const urlsInHtml = html.match(urlRegex) || [];

      const axiosRequest = await axios.get(request.url);

      const raw = axiosRequest.data.match(urlRegex) || [];

      const foundUrls = Array.from(new Set([...urlsInHtml, ...raw]));

      await urlsDb.updateAsync(
        { url: request.url },
        {
          url: request.url,
          observed: foundUrls,
        },
        { upsert: true }
      );

      await domainsDb.updateAsync(
        { hostname: url.hostname },
        { hostname: url.hostname },
        { upsert: true }
      );

      await enqueueLinks({
        strategy: EnqueueStrategy.SameDomain,
      });
    },
  });

  if (seed) {
    seeds.push(seed);
  }

  await crawler.run(seeds);
  await urlsDb.compactDatafileAsync();
  await domainsDb.compactDatafileAsync();
}

handler(process.argv[2], process.argv[3]);
