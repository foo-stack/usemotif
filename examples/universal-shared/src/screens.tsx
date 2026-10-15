'use client';

import { Toggle } from '@usemotif/headless';
import { Badge, Button, Card, Tabs } from '@usemotif/ui';
import { useState } from 'react';
import { HStack, Text, VStack } from 'usemotif';
import { ScreenLink } from './nav';

const PLANS = [
  { id: 'starter', name: 'Starter', price: '$0', note: 'For trying things out.' },
  { id: 'team', name: 'Team', price: '$12', note: 'Per seat, billed monthly.' },
];

/** The home screen: a plan picker. The same tree renders under Next.js and Expo Router. */
export function HomeScreen() {
  const [chosen, setChosen] = useState('team');
  return (
    <VStack gap="$4" p="$5">
      <Text fontSize="$2xl" fontWeight="$bold">
        Choose a plan
      </Text>
      {PLANS.map((plan) => (
        <Card key={plan.id}>
          <Card.Header>
            <HStack gap="$2" alignItems="center">
              <Text fontWeight="$semibold">{plan.name}</Text>
              {plan.id === chosen ? <Badge intent="primary">Selected</Badge> : null}
            </HStack>
          </Card.Header>
          <Card.Body>
            <Text fontSize="$xl">{plan.price}</Text>
            <Text color="$colors.text.muted">{plan.note}</Text>
          </Card.Body>
          <Card.Footer>
            <Button
              intent={plan.id === chosen ? 'primary' : 'neutral'}
              onPress={() => setChosen(plan.id)}
            >
              {plan.id === chosen ? 'Current choice' : `Pick ${plan.name}`}
            </Button>
          </Card.Footer>
        </Card>
      ))}
      <ScreenLink href="/settings">
        <Text color="$colors.action.primary.bg">Settings</Text>
      </ScreenLink>
    </VStack>
  );
}

/** The settings screen: kit tabs and a headless toggle. */
export function SettingsScreen() {
  const [emails, setEmails] = useState(true);
  return (
    <VStack gap="$4" p="$5">
      <Text fontSize="$2xl" fontWeight="$bold">
        Settings
      </Text>
      <Tabs.Root defaultValue="notifications">
        <Tabs.List>
          <Tabs.Tab value="notifications">Notifications</Tabs.Tab>
          <Tabs.Tab value="account">Account</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="notifications">
          <HStack gap="$3" alignItems="center" py="$3">
            <Toggle pressed={emails} onPressedChange={setEmails}>
              <Text>{emails ? 'Emails on' : 'Emails off'}</Text>
            </Toggle>
          </HStack>
        </Tabs.Panel>
        <Tabs.Panel value="account">
          <Text py="$3">Signed in as ada@example.com</Text>
        </Tabs.Panel>
      </Tabs.Root>
      <ScreenLink href="/">
        <Text color="$colors.action.primary.bg">Back to plans</Text>
      </ScreenLink>
    </VStack>
  );
}
