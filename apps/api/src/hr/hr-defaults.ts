/** Suggested expense category → subcategory for owners (all tenants). */
export const EXPENSE_CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  Salary: [
    'Monthly payroll',
    'Basic salary',
    'HRA',
    'Special allowance',
    'Overtime',
    'Bonus / incentive',
    'Employer PF',
    'Employer ESI',
    'Gratuity provision',
    'Advance salary',
  ],
  'Daily wages': ['Daily wages', 'Overtime wages', 'Sunday / holiday wages'],
  'Contract labour': ['Contractor invoice', 'Contract wages', 'Labour contractor GST'],
  'Purchase / raw material': ['Raw material', 'Packaging', 'Consumables', 'Spare parts'],
  Transport: ['Local delivery', 'Outstation freight', 'Staff conveyance', 'Vehicle hire'],
  Fuel: ['Diesel', 'Petrol', 'CNG', 'Generator fuel'],
  Electricity: ['Factory power', 'Office electricity', 'Cold storage power'],
  Water: ['Municipal water', 'Tanker', 'RO / treatment'],
  Rent: ['Shop rent', 'Godown rent', 'Office rent', 'Machinery rent'],
  'Repairs & maintenance': ['Machinery repair', 'Vehicle repair', 'Building maintenance', 'AMC'],
  'Plastic/packaging charges': ['Bags', 'Boxes', 'Labels', 'Stretch wrap'],
  'Machinery / equipment': ['New machine', 'Tools', 'Computer / POS', 'Furniture'],
  Marketing: ['Ads', 'Print material', 'Social media', 'Events / sampling'],
  'Professional fees': ['CA / audit', 'Legal', 'Consultant', 'Software subscription'],
  'Bank charges': ['NEFT / IMPS', 'Loan interest', 'Card charges', 'Account fee'],
  'Taxes & licences': ['GST payment', 'TDS', 'Trade licence', 'FSSAI / pollution'],
  Miscellaneous: ['Staff welfare', 'Tea / refreshments', 'Courier', 'Misc. cash'],
  'Other operational expenses': ['Insurance', 'Security', 'Cleaning', 'Other ops'],
};

export const DEFAULT_SALARY_ALLOWANCES = [
  { name: 'HRA', code: 'HRA', kind: 'allowance' as const, amount: 0, is_percent: true },
  { name: 'Special allowance', code: 'SA', kind: 'allowance' as const, amount: 0, is_percent: false },
  { name: 'Conveyance', code: 'CONV', kind: 'allowance' as const, amount: 0, is_percent: false },
];

export const DEFAULT_SALARY_DEDUCTIONS = [
  { name: 'PF (employee)', code: 'PF', kind: 'deduction' as const, amount: 12, is_percent: true },
  { name: 'ESI (employee)', code: 'ESI', kind: 'deduction' as const, amount: 0.75, is_percent: true },
  { name: 'Professional tax', code: 'PT', kind: 'deduction' as const, amount: 0, is_percent: false },
  { name: 'TDS', code: 'TDS', kind: 'deduction' as const, amount: 0, is_percent: false },
];

export const DEFAULT_LEAVE_TYPES = [
  { name: 'Casual leave', code: 'CL', days_per_year: 12 },
  { name: 'Sick leave', code: 'SL', days_per_year: 6 },
  { name: 'Earned leave', code: 'EL', days_per_year: 12 },
  { name: 'Unpaid leave', code: 'LWP', days_per_year: 0 },
];
