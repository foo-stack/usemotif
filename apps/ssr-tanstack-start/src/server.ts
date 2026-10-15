import { createServerEntry } from '@tanstack/react-start/server-entry';
import { createStartHandler, defineHandlerCallback } from '@tanstack/react-start/server';
import { motifHandler } from './motif-handler';

export default createServerEntry({
  fetch: createStartHandler(defineHandlerCallback(motifHandler)),
});
