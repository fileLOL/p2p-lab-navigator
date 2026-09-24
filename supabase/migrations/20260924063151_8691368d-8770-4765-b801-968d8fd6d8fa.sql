update public.opportunities
set source_url = regexp_replace(source_url, '^https://www\.okx\.com/p2p-markets/([a-z]+)-([a-z]+)$', 'https://www.okx.com/p2p-markets/\2/' || case when side::text = 'sell' then 'sell' else 'buy' end || '-\1')
where source_url ~ '^https://www\.okx\.com/p2p-markets/[a-z]+-[a-z]+$';