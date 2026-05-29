# workers/ingestors — Data Source Collectors
#
# Each module in this package pulls raw data from external sources
# and writes it into Supabase staging tables (raw_feeds, cves).
# None of these modules perform AI analysis — that is the job of
# the agent pipeline in workers/agents/ orchestrated by omni_crew.py.
