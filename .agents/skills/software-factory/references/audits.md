# Periodic audits

At a cadence agreed during setup (weekly is one possible default), review project guidance and implementation for drift. Keep findings concrete and visible; make or propose focused follow-up tasks rather than silently broadening active work.

- **Product:** Check `PRODUCT/` for contradictory, stale, or aspirational statements presented as fact. Remove references to behavior that no longer exists or create a task to resolve uncertainty.
- **Architecture:** Check that boundaries, responsibilities, interfaces, and layering remain coherent and testable. Identify undocumented major components or obsolete descriptions.
- **Code alignment:** Compare the implementation with the agreed product and architecture. Flag unexplained modules, mismatched responsibilities, obsolete compatibility paths, and duplicated concerns.
- **Task hygiene:** Check stale in-progress/blocked items, orphaned WIP artifacts, completed cards without outcomes, and registry entries that do not match live workers.
- **Process and QA:** Review whether documented commands, scripts, and independent QA affordances still work. Record missing domain or harness guidance explicitly.

Do not delete compatibility behavior without checking whether it is still required by users. Preserve useful history and link audit findings to tasks.
