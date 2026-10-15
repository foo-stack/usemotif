import { Box, Text, VStack } from '@usemotif/react';
import {
  Accordion,
  AlertDialog,
  Checkbox,
  Collapsible,
  Combobox,
  ContextMenu,
  Dialog,
  Drawer,
  HoverCard,
  Menu,
  MultiSelect,
  Popover,
  Search,
  Select,
  Sheet,
  Switch,
  Tabs,
  Tooltip,
} from '@usemotif/headless';
import {
  AlertDialog as KitAlertDialog,
  Badge,
  Card,
  Drawer as KitDrawer,
  HoverCard as KitHoverCard,
  Accordion as KitAccordion,
  Breadcrumb as KitBreadcrumb,
  Collapsible as KitCollapsible,
  ContextMenu as KitContextMenu,
  Menu as KitMenu,
  Modal,
  NavigationMenu as KitNavigationMenu,
  Tabs as KitTabs,
  Popover as KitPopover,
  Sheet as KitSheet,
  Tooltip as KitTooltip,
} from '@usemotif/ui';

/**
 * Regression guard for the client boundary, not a feature demo.
 *
 * This file is deliberately a Server Component: no `'use client'`, so Next
 * compiles it into the RSC graph. `@usemotif/headless` and `@usemotif/ui` are
 * client-only, and importing them from here only works because each package
 * ships a directive-free entry over a client chunk that carries the directive.
 * Break that arrangement and `next build` fails here rather than in a
 * consumer's app.
 *
 * Every compound component is rendered, because the object namespace is the
 * shape that used to be impossible. A client reference is a proxy exposing
 * named exports and nothing else, so `Dialog.Root` on an object exported from
 * the client module resolved to `undefined` and the render died on an invalid
 * element type. Both packages now assemble their namespaces in their own
 * server-safe barrel out of parts the client chunk exports flat, so every
 * property is itself a client reference.
 *
 * What this page proves and what it does not: rendering exercises each
 * namespace's `Root`, and its `Trigger` where it has one, on the server side of
 * the boundary. Parts that only render once opened, such as `Content`, appear
 * in the flight payload as client references rather than in the HTML. Per-part
 * identity across every namespace is covered by `index.test.ts` inside
 * `@usemotif/headless`, which is the check to change if a part is rewired.
 *
 * Two things are absent for a reason that has nothing to do with namespaces.
 * `CommandPalette` requires a `commands` array whose entries carry `onSelect`,
 * and `MultiSelect.Chips` requires a `renderChip` callback. Functions cannot be
 * passed from a Server Component to a client one, so neither can be rendered
 * here whatever shape its exports take. Their namespaces are converted like the
 * rest and are covered by the package's own identity test.
 *
 * Render the components, do not merely import them. An unused import can be
 * elided, which would quietly stop testing anything.
 */

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
];

export default function RscBoundaryPage() {
  return (
    <Box bg="$colors.surface.base" minH="100vh" color="$colors.text.default" p="$8">
      <VStack gap="$4" maxW={720} mx="auto">
        <Text as="h1" fontSize="$2xl" fontWeight="$bold" mt={0} mb={0}>
          Client boundary from a Server Component
        </Text>

        <Card>
          <VStack gap="$3">
            <Badge>@usemotif/ui</Badge>
            <Text fontSize="$sm">A themed kit component rendered inside the server graph.</Text>
          </VStack>
        </Card>

        <VStack gap="$2">
          <Text fontSize="$sm">Plain function exports across the boundary:</Text>
          <Switch defaultChecked aria-label="Switch across the boundary" />
          <Checkbox defaultChecked aria-label="Checkbox across the boundary" />
        </VStack>

        <Text as="h2" fontSize="$lg" mb={0}>
          Headless namespaces
        </Text>

        <Dialog.Root>
          <Dialog.Trigger>
            <button type="button">Dialog</button>
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Title>Dialog title</Dialog.Title>
            <Dialog.Description>Across the boundary.</Dialog.Description>
            <Dialog.Close>
              <button type="button">Close</button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Root>

        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <button type="button">AlertDialog</button>
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Title>Alert title</AlertDialog.Title>
          </AlertDialog.Content>
        </AlertDialog.Root>

        <Drawer.Root>
          <Drawer.Trigger>
            <button type="button">Drawer</button>
          </Drawer.Trigger>
          <Drawer.Content>
            <Drawer.Title>Drawer title</Drawer.Title>
          </Drawer.Content>
        </Drawer.Root>

        <Sheet.Root>
          <Sheet.Trigger>
            <button type="button">Sheet</button>
          </Sheet.Trigger>
          <Sheet.Content>
            <Sheet.Title>Sheet title</Sheet.Title>
          </Sheet.Content>
        </Sheet.Root>

        <Popover.Root>
          <Popover.Trigger>
            <button type="button">Popover</button>
          </Popover.Trigger>
          <Popover.Content>
            <Popover.Close>
              <button type="button">Close</button>
            </Popover.Close>
          </Popover.Content>
        </Popover.Root>

        <Tooltip.Root>
          <Tooltip.Trigger>
            <button type="button">Tooltip</button>
          </Tooltip.Trigger>
          <Tooltip.Content>Tip</Tooltip.Content>
        </Tooltip.Root>

        <HoverCard.Root>
          <HoverCard.Trigger>
            <button type="button">HoverCard</button>
          </HoverCard.Trigger>
          <HoverCard.Content>Card</HoverCard.Content>
        </HoverCard.Root>

        <Menu.Root>
          <Menu.Trigger>
            <button type="button">Menu</button>
          </Menu.Trigger>
          <Menu.Content>
            <Menu.Item>Item</Menu.Item>
            <Menu.Separator />
          </Menu.Content>
        </Menu.Root>

        <ContextMenu.Root>
          <ContextMenu.Trigger>
            <button type="button">ContextMenu</button>
          </ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Item>Item</ContextMenu.Item>
            <ContextMenu.Separator />
          </ContextMenu.Content>
        </ContextMenu.Root>

        <Collapsible.Root>
          <Collapsible.Trigger>
            <button type="button">Collapsible</button>
          </Collapsible.Trigger>
          <Collapsible.Content>Panel</Collapsible.Content>
        </Collapsible.Root>

        <Accordion.Root>
          <Accordion.Item value="one">
            <Accordion.Trigger>
              <button type="button">Accordion</button>
            </Accordion.Trigger>
            <Accordion.Content>Panel</Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>

        <Tabs.Root defaultValue="one">
          <Tabs.List>
            <Tabs.Tab value="one">Tabs</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="one">Panel</Tabs.Panel>
        </Tabs.Root>

        <Combobox.Root options={OPTIONS}>
          <Combobox.Input aria-label="Combobox" />
          <Combobox.List />
        </Combobox.Root>

        <Select.Root options={OPTIONS}>
          <Select.Trigger>
            <button type="button">Select</button>
          </Select.Trigger>
          <Select.List />
        </Select.Root>

        <Search.Root options={OPTIONS}>
          <Search.Input aria-label="Search" />
          <Search.List />
        </Search.Root>

        <MultiSelect.Root options={OPTIONS} enableSelectAll>
          <MultiSelect.Input aria-label="MultiSelect" />
          <MultiSelect.SelectAll>
            <button type="button">Select all</button>
          </MultiSelect.SelectAll>
          <MultiSelect.List />
        </MultiSelect.Root>

        <Text as="h2" fontSize="$lg" mb={0}>
          Kit namespaces
        </Text>

        <Modal.Root>
          <Modal.Trigger>
            <button type="button">Modal</button>
          </Modal.Trigger>
          <Modal.Content>
            <Modal.Title>Modal title</Modal.Title>
          </Modal.Content>
        </Modal.Root>

        <KitAlertDialog.Root>
          <KitAlertDialog.Trigger>
            <button type="button">Kit AlertDialog</button>
          </KitAlertDialog.Trigger>
          <KitAlertDialog.Content>
            <KitAlertDialog.Title>Kit alert title</KitAlertDialog.Title>
          </KitAlertDialog.Content>
        </KitAlertDialog.Root>

        <KitDrawer.Root>
          <KitDrawer.Trigger>
            <button type="button">Kit Drawer</button>
          </KitDrawer.Trigger>
          <KitDrawer.Content>
            <KitDrawer.Title>Kit drawer title</KitDrawer.Title>
          </KitDrawer.Content>
        </KitDrawer.Root>

        <KitSheet.Root>
          <KitSheet.Trigger>
            <button type="button">Kit Sheet</button>
          </KitSheet.Trigger>
          <KitSheet.Content>
            <KitSheet.Title>Kit sheet title</KitSheet.Title>
          </KitSheet.Content>
        </KitSheet.Root>

        <KitPopover.Root>
          <KitPopover.Trigger>
            <button type="button">Kit Popover</button>
          </KitPopover.Trigger>
          <KitPopover.Content>Content</KitPopover.Content>
        </KitPopover.Root>

        <KitHoverCard.Root>
          <KitHoverCard.Trigger>
            <button type="button">Kit HoverCard</button>
          </KitHoverCard.Trigger>
          <KitHoverCard.Content>Content</KitHoverCard.Content>
        </KitHoverCard.Root>

        <KitMenu.Root>
          <KitMenu.Trigger>
            <button type="button">Kit Menu</button>
          </KitMenu.Trigger>
          <KitMenu.Content>
            <KitMenu.Item>Item</KitMenu.Item>
            <KitMenu.Separator />
          </KitMenu.Content>
        </KitMenu.Root>

        <KitContextMenu.Root>
          <KitContextMenu.Trigger>
            <button type="button">Kit ContextMenu</button>
          </KitContextMenu.Trigger>
          <KitContextMenu.Content>
            <KitContextMenu.Item>Item</KitContextMenu.Item>
          </KitContextMenu.Content>
        </KitContextMenu.Root>

        <KitCollapsible.Root>
          <KitCollapsible.Trigger>
            <button type="button">Kit Collapsible</button>
          </KitCollapsible.Trigger>
          <KitCollapsible.Content>Panel</KitCollapsible.Content>
        </KitCollapsible.Root>

        <KitAccordion.Root>
          <KitAccordion.Item value="one">
            <KitAccordion.Trigger>
              <button type="button">Kit Accordion</button>
            </KitAccordion.Trigger>
            <KitAccordion.Content>Panel</KitAccordion.Content>
          </KitAccordion.Item>
        </KitAccordion.Root>

        <KitTabs.Root defaultValue="one">
          <KitTabs.List>
            <KitTabs.Tab value="one">Kit Tabs</KitTabs.Tab>
          </KitTabs.List>
          <KitTabs.Panel value="one">Panel</KitTabs.Panel>
        </KitTabs.Root>

        <KitBreadcrumb>
          <KitBreadcrumb.Item href="/">Kit Breadcrumb</KitBreadcrumb.Item>
        </KitBreadcrumb>

        <Card padding="none">
          <Card.Header>Kit Card.Header</Card.Header>
          <Card.Body>Kit Card.Body</Card.Body>
          <Card.Footer>Kit Card.Footer</Card.Footer>
        </Card>

        <KitNavigationMenu>
          <KitNavigationMenu.Item id="home" href="/">
            Kit NavigationMenu
          </KitNavigationMenu.Item>
        </KitNavigationMenu>

        <KitTooltip.Root>
          <KitTooltip.Trigger>
            <button type="button">Kit Tooltip</button>
          </KitTooltip.Trigger>
          <KitTooltip.Content>Tip</KitTooltip.Content>
        </KitTooltip.Root>
      </VStack>
    </Box>
  );
}
