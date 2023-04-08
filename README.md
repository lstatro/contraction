# Contraction

Creates a subdomain and url nedb for later querying.

## Objective

Craws a domain seed to find linked subdomains and creates an inventory of crawled urls.

# Setup

`npm install`

# Run

You'll need to add a seed URL, but once a seed is established crawlee will expand for all subdomains of that seed.
`npx ts-node src/index.ts
