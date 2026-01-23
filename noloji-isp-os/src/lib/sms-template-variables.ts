/**
 * SMS Template Variables Utility
 * 
 * Provides available template variables and replacement logic for SMS messages.
 */

// Define all available template variables with their descriptions
export const SMS_TEMPLATE_VARIABLES = [
    // Customer variables
    { key: 'customer_name', label: 'Customer Name', description: 'Full name of the customer', example: 'John Doe' },
    { key: 'customer_username', label: 'Username', description: 'Customer login username', example: 'johndoe' },
    { key: 'customer_phone', label: 'Phone Number', description: 'Customer phone number', example: '+254712345678' },
    { key: 'customer_email', label: 'Email', description: 'Customer email address', example: 'john@example.com' },

    // Plan/Subscription variables
    { key: 'plan_name', label: 'Package Name', description: 'Name of the subscribed package', example: 'Premium 10Mbps' },
    { key: 'plan_price', label: 'Package Price', description: 'Monthly price of the package', example: '2,500' },
    { key: 'plan_speed', label: 'Download Speed', description: 'Download speed in Mbps', example: '10' },

    // Billing variables
    { key: 'amount_due', label: 'Amount Due', description: 'Amount owed by the customer', example: '2,500' },
    { key: 'due_date', label: 'Due Date', description: 'Payment due date', example: '25th Jan 2026' },
    { key: 'expiry_date', label: 'Expiry Date', description: 'Subscription expiry date', example: '31st Jan 2026' },
    { key: 'days_remaining', label: 'Days Remaining', description: 'Days until subscription expires', example: '5' },

    // General variables
    { key: 'isp_name', label: 'ISP Name', description: 'Your company/ISP name', example: 'NetConnect ISP' },
    { key: 'current_date', label: 'Current Date', description: 'Today\'s date', example: '21st Jan 2026' },
    { key: 'support_phone', label: 'Support Phone', description: 'Support contact number', example: '+254700000000' },
] as const;

export type SmsVariableKey = typeof SMS_TEMPLATE_VARIABLES[number]['key'];

// Context data that can be passed for variable replacement
export interface SmsVariableContext {
    // Customer data
    customer_name?: string;
    customer_username?: string;
    customer_phone?: string;
    customer_email?: string;

    // Plan data
    plan_name?: string;
    plan_price?: number | string;
    plan_speed?: number | string;

    // Billing data
    amount_due?: number | string;
    due_date?: string | Date;
    expiry_date?: string | Date;
    days_remaining?: number;

    // General data (can be set as defaults)
    isp_name?: string;
    support_phone?: string;
    current_date?: string | Date;
}

// Default values for general variables
const DEFAULT_VALUES: Partial<SmsVariableContext> = {
    isp_name: 'Your ISP',
    support_phone: '+254700000000',
};

/**
 * Format a date to a readable string
 */
function formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';

    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'N/A';

    const day = d.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st'
        : day === 2 || day === 22 ? 'nd'
            : day === 3 || day === 23 ? 'rd'
                : 'th';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}${suffix} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format a number with commas for currency display
 */
function formatCurrency(amount: number | string | undefined): string {
    if (amount === undefined || amount === null) return 'N/A';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return 'N/A';
    return num.toLocaleString();
}

/**
 * Calculate days remaining until a date
 */
function calculateDaysRemaining(expiryDate: string | Date | undefined): number {
    if (!expiryDate) return 0;
    const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diff = expiry.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Replace template variables in a message with actual values
 * Variables are in the format {{variable_name}}
 */
export function replaceTemplateVariables(
    template: string,
    context: SmsVariableContext
): string {
    // Merge with defaults
    const fullContext = { ...DEFAULT_VALUES, ...context };

    // Set current_date if not provided
    if (!fullContext.current_date) {
        fullContext.current_date = new Date();
    }

    // Calculate days_remaining if expiry_date is provided
    if (fullContext.expiry_date && !fullContext.days_remaining) {
        fullContext.days_remaining = calculateDaysRemaining(fullContext.expiry_date);
    }

    // Create replacement map with formatted values
    const replacements: Record<string, string> = {
        customer_name: fullContext.customer_name || 'Customer',
        customer_username: fullContext.customer_username || '',
        customer_phone: fullContext.customer_phone || '',
        customer_email: fullContext.customer_email || '',
        plan_name: fullContext.plan_name || 'N/A',
        plan_price: formatCurrency(fullContext.plan_price),
        plan_speed: fullContext.plan_speed?.toString() || 'N/A',
        amount_due: formatCurrency(fullContext.amount_due),
        due_date: formatDate(fullContext.due_date),
        expiry_date: formatDate(fullContext.expiry_date),
        days_remaining: fullContext.days_remaining?.toString() || '0',
        isp_name: fullContext.isp_name || 'Your ISP',
        support_phone: fullContext.support_phone || '',
        current_date: formatDate(fullContext.current_date),
    };

    // Replace all variables in the template
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
        // Match both {{key}} and {{ key }} (with optional spaces)
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
        result = result.replace(regex, value);
    }

    return result;
}

/**
 * Build context from customer and plan data (used when sending bulk SMS)
 */
export function buildSmsContext(customer: {
    full_name?: string;
    username?: string;
    phone?: string;
    email?: string;
    valid_until?: string;
    plans?: {
        name?: string;
        price?: number;
        download_speed?: number;
    };
}, ispName?: string): SmsVariableContext {
    return {
        customer_name: customer.full_name || customer.username,
        customer_username: customer.username,
        customer_phone: customer.phone,
        customer_email: customer.email,
        plan_name: customer.plans?.name,
        plan_price: customer.plans?.price,
        plan_speed: customer.plans?.download_speed,
        expiry_date: customer.valid_until,
        amount_due: customer.plans?.price, // Default to plan price
        isp_name: ispName,
    };
}

/**
 * Preview a template with sample data
 */
export function previewTemplate(template: string): string {
    const sampleContext: SmsVariableContext = {
        customer_name: 'John Doe',
        customer_username: 'johndoe',
        customer_phone: '+254712345678',
        customer_email: 'john@example.com',
        plan_name: 'Premium 10Mbps',
        plan_price: 2500,
        plan_speed: 10,
        amount_due: 2500,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isp_name: 'NetConnect ISP',
        support_phone: '+254700000000',
    };

    return replaceTemplateVariables(template, sampleContext);
}

/**
 * Extract variables used in a template
 */
export function extractVariables(template: string): string[] {
    const regex = /\{\{\s*([a-z_]+)\s*\}\}/gi;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(template)) !== null) {
        const variable = match[1].toLowerCase();
        if (!variables.includes(variable)) {
            variables.push(variable);
        }
    }

    return variables;
}
