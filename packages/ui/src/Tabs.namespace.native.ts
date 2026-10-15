import { TabsList, TabsPanel, TabsRoot, TabsTab } from './Tabs.native.js';

/** Native Tabs, with a root that shares the selection so each tab can style itself. */
export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
};
