# Backlog (quick capture)

Drop rough ideas here without interrupting work to create a fully specified official task. This list is not the official task system; the orchestrator reviews it and can help promote selected items into `TASKS/KANBAN/`. When an item is promoted, check it off and link the official task.

- [ ] Make another endpoint for Zoom meetings where right after the meeting ends then I can just paste in my notes and kind of shape what the agent emphasizes in the meeting notes it creates.
  - [ ] OR Just make it read the meeting notes, and just remember at the end of the meeting to paste in the notes every time.
- [ ] Take a screenshot from the meeting at a time when the other person is talking and post it.
- [ ] Currently callback points to dev-callbacks.arcturus-labs.com on my personal laptop. Make it point to callbacks.arcturus-labs.com on my side server. - John needs to do most of this, but the agent can guide
  - [ ] Need to make Obsidian sync available on bustedscreen
  - [ ] Need to point Cloudflare callbacks.arcturus-labs.com to bustedscreen
  - [ ] Need to update Zoom callback to point to callbacks.arcturus-labs.com/zoom/transcripts
- [ ] Incorporate form callback into This
  - [ ] Incorporate form 
  - [ ] Update project name and structure and skills
  - [ ] Update website to use new endpoint callbacks.arcturus-labs.com/website/contact-form 
  - [ ] Delete form repo.
- [ ] Rename this repo to "mission-control"
  - [ ] Make generic as a livestream.
- [ ] Set up the ability to schedule callbacks (cron plus curl is a fine starting point)
- [ ] Remove the timeout and instead make it so that the agent time is limited. I just want to make sure the agent isn't churning.
- [ ] Clean up the download redundancy: `downloadMeetingAssets` in `zoomDownloads.mjs` is dead for the production path (only `scripts/zoom-download.mjs` still calls it) since the meeting-job archive took over. Decide whether to retire it or rebase the manual script on the archive branch, keeping the shared naming/index helpers.

