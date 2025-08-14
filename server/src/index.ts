import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createCompanyInputSchema,
  createAccountInputSchema,
  createInventoryGroupInputSchema,
  createInventoryInputSchema,
  createRelationInputSchema,
  createUserInputSchema,
  createCompleteTransactionInputSchema,
  createTransactionHeaderInputSchema,
  createTransactionDetailInputSchema,
  reportFilterSchema
} from './schema';

// Import handlers
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany
} from './handlers/companies';

import {
  getAccounts,
  getAccountById,
  getAccountsByType,
  createAccount,
  updateAccount,
  deleteAccount
} from './handlers/accounts';

import {
  getInventoryGroups,
  getInventoryGroupById,
  createInventoryGroup,
  updateInventoryGroup,
  deleteInventoryGroup,
  getInventory,
  getInventoryById,
  getInventoryByGroup,
  getLowStockInventory,
  createInventory,
  updateInventory,
  updateInventoryStock,
  deleteInventory
} from './handlers/inventory';

import {
  getRelations,
  getRelationById,
  getRelationsByType,
  getActiveRelations,
  createRelation,
  updateRelation,
  deleteRelation
} from './handlers/relations';

import {
  getUsers,
  getUserById,
  getUserByUsername,
  getActiveUsers,
  createUser,
  updateUser,
  updateUserLastLogin,
  changeUserPassword,
  deleteUser
} from './handlers/users';

import {
  getTransactionHeaders,
  getTransactionById,
  getTransactionsByType,
  getTransactionsByDateRange,
  getTransactionsByRelation,
  getUnpostedTransactions,
  createCompleteTransaction,
  createTransactionHeader,
  addTransactionDetail,
  updateTransactionHeader,
  updateTransactionDetail,
  postTransaction,
  unpostTransaction,
  deleteTransactionDetail,
  deleteTransaction,
  generateTransactionNumber,
  validateTransactionBalance
} from './handlers/transactions';

import {
  getFinancialPositionReport,
  getIncomeStatementReport,
  getEquityChangesReport,
  getCashFlowReport,
  getJournalListingReport,
  getGeneralLedgerReport,
  getAccountLedgerReport,
  getReceivablesReport,
  getAgingReceivablesReport,
  getPayablesReport,
  getAgingPayablesReport,
  getTransactionViewByType,
  getTransactionViewByAccount,
  calculateAccountBalance,
  getAccountHierarchy,
  exportReport
} from './handlers/reports';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // ===== MASTER DATA - COMPANIES =====
  companies: router({
    getAll: publicProcedure.query(() => getCompanies()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getCompanyById(input.id)),
    create: publicProcedure
      .input(createCompanyInputSchema)
      .mutation(({ input }) => createCompany(input)),
    update: publicProcedure
      .input(z.object({ id: z.number(), data: createCompanyInputSchema.partial() }))
      .mutation(({ input }) => updateCompany(input.id, input.data)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteCompany(input.id))
  }),

  // ===== MASTER DATA - ACCOUNTS =====
  accounts: router({
    getAll: publicProcedure.query(() => getAccounts()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getAccountById(input.id)),
    getByType: publicProcedure
      .input(z.object({ tipe: z.string() }))
      .query(({ input }) => getAccountsByType(input.tipe)),
    create: publicProcedure
      .input(createAccountInputSchema)
      .mutation(({ input }) => createAccount(input)),
    update: publicProcedure
      .input(z.object({ id: z.number(), data: createAccountInputSchema.partial() }))
      .mutation(({ input }) => updateAccount(input.id, input.data)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteAccount(input.id))
  }),

  // ===== MASTER DATA - INVENTORY =====
  inventory: router({
    // Inventory Groups
    groups: router({
      getAll: publicProcedure.query(() => getInventoryGroups()),
      getById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(({ input }) => getInventoryGroupById(input.id)),
      create: publicProcedure
        .input(createInventoryGroupInputSchema)
        .mutation(({ input }) => createInventoryGroup(input)),
      update: publicProcedure
        .input(z.object({ id: z.number(), data: createInventoryGroupInputSchema.partial() }))
        .mutation(({ input }) => updateInventoryGroup(input.id, input.data)),
      delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(({ input }) => deleteInventoryGroup(input.id))
    }),
    // Inventory Items
    items: router({
      getAll: publicProcedure.query(() => getInventory()),
      getById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(({ input }) => getInventoryById(input.id)),
      getByGroup: publicProcedure
        .input(z.object({ kelompokId: z.number() }))
        .query(({ input }) => getInventoryByGroup(input.kelompokId)),
      getLowStock: publicProcedure.query(() => getLowStockInventory()),
      create: publicProcedure
        .input(createInventoryInputSchema)
        .mutation(({ input }) => createInventory(input)),
      update: publicProcedure
        .input(z.object({ id: z.number(), data: createInventoryInputSchema.partial() }))
        .mutation(({ input }) => updateInventory(input.id, input.data)),
      updateStock: publicProcedure
        .input(z.object({ id: z.number(), quantity: z.number() }))
        .mutation(({ input }) => updateInventoryStock(input.id, input.quantity)),
      delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(({ input }) => deleteInventory(input.id))
    })
  }),

  // ===== MASTER DATA - RELATIONS =====
  relations: router({
    getAll: publicProcedure.query(() => getRelations()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getRelationById(input.id)),
    getByType: publicProcedure
      .input(z.object({ tipe: z.string() }))
      .query(({ input }) => getRelationsByType(input.tipe)),
    getActive: publicProcedure.query(() => getActiveRelations()),
    create: publicProcedure
      .input(createRelationInputSchema)
      .mutation(({ input }) => createRelation(input)),
    update: publicProcedure
      .input(z.object({ id: z.number(), data: createRelationInputSchema.partial() }))
      .mutation(({ input }) => updateRelation(input.id, input.data)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteRelation(input.id))
  }),

  // ===== MASTER DATA - USERS =====
  users: router({
    getAll: publicProcedure.query(() => getUsers()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getUserById(input.id)),
    getByUsername: publicProcedure
      .input(z.object({ username: z.string() }))
      .query(({ input }) => getUserByUsername(input.username)),
    getActive: publicProcedure.query(() => getActiveUsers()),
    create: publicProcedure
      .input(createUserInputSchema)
      .mutation(({ input }) => createUser(input)),
    update: publicProcedure
      .input(z.object({ id: z.number(), data: createUserInputSchema.partial() }))
      .mutation(({ input }) => updateUser(input.id, input.data)),
    updateLastLogin: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => updateUserLastLogin(input.id)),
    changePassword: publicProcedure
      .input(z.object({ id: z.number(), oldPassword: z.string(), newPassword: z.string() }))
      .mutation(({ input }) => changeUserPassword(input.id, input.oldPassword, input.newPassword)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteUser(input.id))
  }),

  // ===== TRANSACTIONS =====
  transactions: router({
    getHeaders: publicProcedure
      .input(z.object({ page: z.number().optional(), limit: z.number().optional() }))
      .query(({ input }) => getTransactionHeaders(input.page, input.limit)),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getTransactionById(input.id)),
    getByType: publicProcedure
      .input(z.object({ tipe: z.string() }))
      .query(({ input }) => getTransactionsByType(input.tipe)),
    getByDateRange: publicProcedure
      .input(z.object({ fromDate: z.coerce.date(), toDate: z.coerce.date() }))
      .query(({ input }) => getTransactionsByDateRange(input.fromDate, input.toDate)),
    getByRelation: publicProcedure
      .input(z.object({ relationId: z.number() }))
      .query(({ input }) => getTransactionsByRelation(input.relationId)),
    getUnposted: publicProcedure.query(() => getUnpostedTransactions()),
    
    // Transaction creation
    createComplete: publicProcedure
      .input(createCompleteTransactionInputSchema)
      .mutation(({ input }) => createCompleteTransaction(input)),
    createHeader: publicProcedure
      .input(createTransactionHeaderInputSchema)
      .mutation(({ input }) => createTransactionHeader(input)),
    addDetail: publicProcedure
      .input(createTransactionDetailInputSchema)
      .mutation(({ input }) => addTransactionDetail(input)),
    
    // Transaction updates
    updateHeader: publicProcedure
      .input(z.object({ id: z.number(), data: createTransactionHeaderInputSchema.partial() }))
      .mutation(({ input }) => updateTransactionHeader(input.id, input.data)),
    updateDetail: publicProcedure
      .input(z.object({ id: z.number(), data: createTransactionDetailInputSchema.partial() }))
      .mutation(({ input }) => updateTransactionDetail(input.id, input.data)),
    
    // Transaction posting
    post: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => postTransaction(input.id)),
    unpost: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => unpostTransaction(input.id)),
    
    // Transaction deletion
    deleteDetail: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteTransactionDetail(input.id)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteTransaction(input.id)),
    
    // Utilities
    generateNumber: publicProcedure
      .input(z.object({ tipe: z.string(), tanggal: z.coerce.date() }))
      .query(({ input }) => generateTransactionNumber(input.tipe, input.tanggal)),
    validateBalance: publicProcedure
      .input(z.object({ headerId: z.number() }))
      .query(({ input }) => validateTransactionBalance(input.headerId))
  }),

  // ===== VIEW TRANSAKSI =====
  transactionView: router({
    byType: publicProcedure
      .input(reportFilterSchema)
      .query(({ input }) => getTransactionViewByType(input)),
    byAccount: publicProcedure
      .input(reportFilterSchema)
      .query(({ input }) => getTransactionViewByAccount(input))
  }),

  // ===== REPORTS =====
  reports: router({
    // Financial Statements
    financialPosition: publicProcedure
      .input(reportFilterSchema)
      .query(({ input }) => getFinancialPositionReport(input)),
    incomeStatement: publicProcedure
      .input(reportFilterSchema)
      .query(({ input }) => getIncomeStatementReport(input)),
    equityChanges: publicProcedure
      .input(reportFilterSchema)
      .query(({ input }) => getEquityChangesReport(input)),
    cashFlow: publicProcedure
      .input(reportFilterSchema)
      .query(({ input }) => getCashFlowReport(input)),
    
    // Journal & Ledger Reports
    journalListing: publicProcedure
      .input(reportFilterSchema)
      .query(({ input }) => getJournalListingReport(input)),
    generalLedger: publicProcedure
      .input(reportFilterSchema)
      .query(({ input }) => getGeneralLedgerReport(input)),
    accountLedger: publicProcedure
      .input(z.object({ accountId: z.number(), filter: reportFilterSchema }))
      .query(({ input }) => getAccountLedgerReport(input.accountId, input.filter)),
    
    // Receivables & Payables
    receivables: publicProcedure
      .input(reportFilterSchema)
      .query(({ input }) => getReceivablesReport(input)),
    agingReceivables: publicProcedure
      .input(z.object({ asOfDate: z.coerce.date() }))
      .query(({ input }) => getAgingReceivablesReport(input.asOfDate)),
    payables: publicProcedure
      .input(reportFilterSchema)
      .query(({ input }) => getPayablesReport(input)),
    agingPayables: publicProcedure
      .input(z.object({ asOfDate: z.coerce.date() }))
      .query(({ input }) => getAgingPayablesReport(input.asOfDate)),
    
    // Utilities
    accountBalance: publicProcedure
      .input(z.object({ accountId: z.number(), asOfDate: z.coerce.date() }))
      .query(({ input }) => calculateAccountBalance(input.accountId, input.asOfDate)),
    accountHierarchy: publicProcedure
      .query(() => getAccountHierarchy()),
    export: publicProcedure
      .input(z.object({ reportData: z.any(), format: z.enum(['PDF', 'EXCEL', 'CSV']) }))
      .mutation(({ input }) => exportReport(input.reportData, input.format))
  })
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();