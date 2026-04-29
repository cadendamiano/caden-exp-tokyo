import { z } from 'zod';
import { defineTool } from './defineTool';

export const listExpenses = defineTool({
  name: 'list_expenses',
  label: 'List expenses',
  domain: 'se',
  description: 'List expense reports or card transactions from Bill Spend & Expense. Optionally filter by employee or status.',
  schema: z.object({
    employeeId: z.string().optional(),
    status: z.string().optional(),
  }),
});

export const getEmployee = defineTool({
  name: 'get_employee',
  label: 'Get employee',
  domain: 'se',
  description: 'Get a single Bill Spend & Expense employee by id.',
  schema: z.object({ id: z.string() }),
});

export const listEmployees = defineTool({
  name: 'list_employees',
  label: 'List employees',
  domain: 'se',
  description: 'List all employees in Bill Spend & Expense. Optionally filter by department or status.',
  schema: z.object({
    department: z.string().optional(),
    status: z.enum(['active', 'inactive', 'all']).optional(),
  }),
});

export const listCards = defineTool({
  name: 'list_cards',
  label: 'List cards',
  domain: 'se',
  description: 'List virtual and physical cards in Bill Spend & Expense. Optionally filter by employee or status.',
  schema: z.object({
    employeeId: z.string().optional(),
    status: z.enum(['active', 'frozen', 'cancelled', 'all']).optional(),
  }),
});

export const getCard = defineTool({
  name: 'get_card',
  label: 'Get card',
  domain: 'se',
  description: 'Fetch full detail for a single card including limit, spend, and status.',
  schema: z.object({ cardId: z.string() }),
});

export const listBudgets = defineTool({
  name: 'list_budgets',
  label: 'List budgets',
  domain: 'se',
  description: 'List spending budgets in Bill Spend & Expense.',
  schema: z.object({
    ownerId: z.string().optional(),
    status: z.enum(['active', 'expired', 'all']).optional(),
  }),
});

export const getBudget = defineTool({
  name: 'get_budget',
  label: 'Get budget',
  domain: 'se',
  description: 'Fetch detail and utilization for a single spending budget.',
  schema: z.object({ budgetId: z.string() }),
});

export const listTransactions = defineTool({
  name: 'list_transactions',
  label: 'List transactions',
  domain: 'se',
  description: 'List card transactions in Bill Spend & Expense. Optionally filter by employee, card, date range, or category.',
  schema: z.object({
    employeeId: z.string().optional(),
    cardId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    category: z.string().optional(),
  }),
});

export const getTransaction = defineTool({
  name: 'get_transaction',
  label: 'Get transaction',
  domain: 'se',
  description: 'Fetch full detail for a single card transaction.',
  schema: z.object({ transactionId: z.string() }),
});

export const listReimbursements = defineTool({
  name: 'list_reimbursements',
  label: 'List reimbursements',
  domain: 'se',
  description: 'List out-of-pocket reimbursement requests. Optionally filter by employee or status.',
  schema: z.object({
    employeeId: z.string().optional(),
    status: z.enum(['pending', 'approved', 'paid', 'rejected', 'all']).optional(),
  }),
});

export const createCard = defineTool({
  name: 'create_card',
  label: 'Issue card',
  domain: 'se',
  description: 'Issue a new virtual or physical card to an employee.',
  schema: z.object({
    employeeId: z.string(),
    limit: z.number().positive(),
    type: z.enum(['virtual', 'physical']),
  }),
});

export const updateCard = defineTool({
  name: 'update_card',
  label: 'Update card',
  domain: 'se',
  description: 'Update spending limit or freeze/unfreeze a card.',
  schema: z.object({
    cardId: z.string(),
    limit: z.number().positive().optional(),
    status: z.enum(['active', 'frozen']).optional(),
  }),
});

export const createBudget = defineTool({
  name: 'create_budget',
  label: 'Create budget',
  domain: 'se',
  description: 'Create a new spending budget in Bill Spend & Expense.',
  schema: z.object({
    name: z.string().min(1),
    limit: z.number().positive(),
    resetInterval: z.enum(['monthly', 'quarterly', 'annually', 'never']).optional(),
    ownerId: z.string().optional(),
  }),
});

export const updateBudget = defineTool({
  name: 'update_budget',
  label: 'Update budget',
  domain: 'se',
  description: 'Update limit, reset interval, or owner of an existing budget.',
  schema: z.object({
    budgetId: z.string(),
    limit: z.number().positive().optional(),
    resetInterval: z.enum(['monthly', 'quarterly', 'annually', 'never']).optional(),
    ownerId: z.string().optional(),
  }),
});

export const createReimbursement = defineTool({
  name: 'create_reimbursement',
  label: 'Submit reimbursement',
  domain: 'se',
  description: 'Submit an out-of-pocket expense reimbursement request.',
  schema: z.object({
    employeeId: z.string(),
    amount: z.number().positive(),
    description: z.string().min(1),
    receiptUrl: z.string().url().optional(),
  }),
});

export const approveReimbursement = defineTool({
  name: 'approve_reimbursement',
  label: 'Approve reimbursement',
  domain: 'se',
  description: 'Approve an out-of-pocket reimbursement request.',
  schema: z.object({ reimbursementId: z.string() }),
});

export const approveExpense = defineTool({
  name: 'approve_expense',
  label: 'Approve expense',
  domain: 'se',
  description: 'Approve a Bill Spend & Expense item by id.',
  schema: z.object({ expenseId: z.string() }),
});

export const rejectExpense = defineTool({
  name: 'reject_expense',
  label: 'Reject expense',
  domain: 'se',
  description: 'Reject a Bill Spend & Expense item by id, with a reason.',
  schema: z.object({ expenseId: z.string(), reason: z.string().min(1) }),
});

export const SE_TOOLS = [
  listExpenses, getEmployee, listEmployees,
  listCards, getCard, listBudgets, getBudget,
  listTransactions, getTransaction, listReimbursements,
  createCard, updateCard, createBudget, updateBudget,
  createReimbursement, approveReimbursement,
  approveExpense, rejectExpense,
];
