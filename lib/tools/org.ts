import { z } from 'zod';
import { defineTool } from './defineTool';

export const listFundingAccounts = defineTool({
  name: 'list_funding_accounts',
  label: 'List funding accounts',
  domain: 'org',
  description: 'List connected bank funding accounts in the BILL workspace.',
  schema: z.object({}),
});

export const getFundingAccount = defineTool({
  name: 'get_funding_account',
  label: 'Get funding account',
  domain: 'org',
  description: 'Fetch detail for a single funding account by id.',
  schema: z.object({ accountId: z.string() }),
});

export const listUsers = defineTool({
  name: 'list_users',
  label: 'List users',
  domain: 'org',
  description: 'List users in the BILL organization. Optionally filter by role or status.',
  schema: z.object({
    role: z.string().optional(),
    status: z.enum(['active', 'inactive', 'all']).optional(),
  }),
});

export const getUser = defineTool({
  name: 'get_user',
  label: 'Get user',
  domain: 'org',
  description: 'Fetch profile and permissions for a single BILL user.',
  schema: z.object({ userId: z.string() }),
});

export const listRoles = defineTool({
  name: 'list_roles',
  label: 'List roles',
  domain: 'org',
  description: 'List available user roles and their permission sets.',
  schema: z.object({}),
});

export const listChartOfAccounts = defineTool({
  name: 'list_chart_of_accounts',
  label: 'List chart of accounts',
  domain: 'org',
  description: 'List general-ledger accounts in the chart of accounts. Optionally filter by type or active status.',
  schema: z.object({
    type: z.enum(['asset', 'liability', 'equity', 'income', 'expense', 'all']).optional(),
    active: z.boolean().optional(),
  }),
});

export const listWebhookSubscriptions = defineTool({
  name: 'list_webhook_subscriptions',
  label: 'List webhook subscriptions',
  domain: 'org',
  description: 'List active webhook subscriptions configured in the BILL workspace.',
  schema: z.object({}),
});

export const listEventCatalog = defineTool({
  name: 'list_event_catalog',
  label: 'List event catalog',
  domain: 'org',
  description: 'List all event types available for webhook subscriptions.',
  schema: z.object({}),
});

export const createChartOfAccount = defineTool({
  name: 'create_chart_of_account',
  label: 'Create chart of account',
  domain: 'org',
  description: 'Create a new general-ledger account in the chart of accounts.',
  schema: z.object({
    name: z.string().min(1),
    number: z.string().min(1),
    type: z.enum(['asset', 'liability', 'equity', 'income', 'expense']),
    category: z.string().optional(),
  }),
});

export const createWebhookSubscription = defineTool({
  name: 'create_webhook_subscription',
  label: 'Create webhook subscription',
  domain: 'org',
  description: 'Register a new webhook endpoint to receive BILL event notifications.',
  schema: z.object({
    url: z.string().url(),
    events: z.array(z.string()).min(1),
  }),
});

export const ORG_TOOLS = [
  listFundingAccounts, getFundingAccount,
  listUsers, getUser, listRoles,
  listChartOfAccounts,
  listWebhookSubscriptions, listEventCatalog,
  createChartOfAccount, createWebhookSubscription,
];
