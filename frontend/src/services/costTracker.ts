/**
 * SMS/MMS Cost Tracking System
 * Tracks weekly, monthly, yearly, and lifetime messaging costs
 * Automatically resets periods and provides budget warnings
 */

const STORAGE_KEY = 'gpbc_cost_tracker';

export interface CostTrackerData {
  weeklyCost: number;
  monthlyCost: number;
  yearlyCost: number;
  lifetimeCost: number;
  lastResetWeek: string;  // ISO date string for Sunday
  lastResetMonth: string; // YYYY-MM format
  lastResetYear: string;  // YYYY format
}

// Budget limits
export const WEEKLY_BUDGET = 25;
export const MONTHLY_BUDGET = 100;
export const YEARLY_BUDGET = 1000;

/**
 * Get the start of the current week (Sunday)
 */
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day; // Adjust to Sunday
  const sunday = new Date(now.setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  return sunday.toISOString().split('T')[0];
}

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get current year in YYYY format
 */
function getCurrentYear(): string {
  return new Date().getFullYear().toString();
}

/**
 * Initialize default cost tracker data
 */
function getDefaultData(): CostTrackerData {
  return {
    weeklyCost: 0,
    monthlyCost: 0,
    yearlyCost: 0,
    lifetimeCost: 0,
    lastResetWeek: getWeekStart(),
    lastResetMonth: getCurrentMonth(),
    lastResetYear: getCurrentYear()
  };
}

/**
 * Load cost tracker data from localStorage
 */
export function loadCostTracker(): CostTrackerData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return getDefaultData();
    }

    const data: CostTrackerData = JSON.parse(stored);
    
    // Auto-reset weekly cost if new week started
    const currentWeek = getWeekStart();
    if (data.lastResetWeek !== currentWeek) {
      data.weeklyCost = 0;
      data.lastResetWeek = currentWeek;
    }

    // Auto-reset monthly cost if new month started
    const currentMonth = getCurrentMonth();
    if (data.lastResetMonth !== currentMonth) {
      data.monthlyCost = 0;
      data.lastResetMonth = currentMonth;
    }

    // Auto-reset yearly cost if new year started
    const currentYear = getCurrentYear();
    if (data.lastResetYear !== currentYear) {
      data.yearlyCost = 0;
      data.lastResetYear = currentYear;
    }

    return data;
  } catch (error) {
    console.error('Error loading cost tracker:', error);
    return getDefaultData();
  }
}

/**
 * Save cost tracker data to localStorage
 */
export function saveCostTracker(data: CostTrackerData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving cost tracker:', error);
  }
}

/**
 * Add cost to all tracking periods
 * @param amount Cost amount in dollars
 */
export function addCost(amount: number): void {
  const data = loadCostTracker();
  
  data.weeklyCost += amount;
  data.monthlyCost += amount;
  data.yearlyCost += amount;
  data.lifetimeCost += amount;

  saveCostTracker(data);
}

/**
 * Get current cost summary
 */
export function getCostSummary(): CostTrackerData {
  return loadCostTracker();
}

/**
 * Check if a cost would exceed budget limits
 * @param amount Proposed cost amount
 * @returns Warning object with budget status
 */
export function checkBudgetWarning(amount: number): {
  hasWarning: boolean;
  type: 'none' | 'weekly' | 'monthly' | 'yearly';
  message: string;
  currentCost: number;
  budget: number;
  newTotal: number;
} {
  const data = loadCostTracker();

  // Check monthly budget first (most critical)
  if (data.monthlyCost + amount > MONTHLY_BUDGET) {
    return {
      hasWarning: true,
      type: 'monthly',
      message: 'This message will exceed your monthly budget.',
      currentCost: data.monthlyCost,
      budget: MONTHLY_BUDGET,
      newTotal: data.monthlyCost + amount
    };
  }

  // Check yearly budget
  if (data.yearlyCost + amount > YEARLY_BUDGET) {
    return {
      hasWarning: true,
      type: 'yearly',
      message: 'This message will exceed your yearly budget.',
      currentCost: data.yearlyCost,
      budget: YEARLY_BUDGET,
      newTotal: data.yearlyCost + amount
    };
  }

  // Check weekly budget
  if (data.weeklyCost + amount > WEEKLY_BUDGET) {
    return {
      hasWarning: true,
      type: 'weekly',
      message: 'This message will exceed your weekly budget.',
      currentCost: data.weeklyCost,
      budget: WEEKLY_BUDGET,
      newTotal: data.weeklyCost + amount
    };
  }

  return {
    hasWarning: false,
    type: 'none',
    message: '',
    currentCost: 0,
    budget: 0,
    newTotal: 0
  };
}

/**
 * Get budget status percentage for visual indicators
 */
export function getBudgetStatus(): {
  weekly: { percentage: number; status: 'safe' | 'warning' | 'exceeded' };
  monthly: { percentage: number; status: 'safe' | 'warning' | 'exceeded' };
  yearly: { percentage: number; status: 'safe' | 'warning' | 'exceeded' };
} {
  const data = loadCostTracker();

  const getStatus = (current: number, budget: number) => {
    const percentage = (current / budget) * 100;
    let status: 'safe' | 'warning' | 'exceeded' = 'safe';
    
    if (percentage >= 100) {
      status = 'exceeded';
    } else if (percentage >= 80) {
      status = 'warning';
    }

    return { percentage, status };
  };

  return {
    weekly: getStatus(data.weeklyCost, WEEKLY_BUDGET),
    monthly: getStatus(data.monthlyCost, MONTHLY_BUDGET),
    yearly: getStatus(data.yearlyCost, YEARLY_BUDGET)
  };
}

/**
 * Reset all cost tracking (admin function)
 */
export function resetCostTracker(): void {
  saveCostTracker(getDefaultData());
}
