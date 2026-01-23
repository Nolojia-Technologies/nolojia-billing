/**
 * Landlord Export Service
 * Provides CSV and PDF export functionality for landlord portal
 */

/**
 * Export data to CSV file
 */
export function exportToCSV(
  data: Record<string, any>[],
  filename: string,
  columns?: { key: string; label: string }[]
) {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get headers from columns config or from first data item
  const headers = columns
    ? columns.map(c => c.label)
    : Object.keys(data[0]);

  const keys = columns
    ? columns.map(c => c.key)
    : Object.keys(data[0]);

  // Build CSV content
  const csvRows: string[] = [];

  // Header row
  csvRows.push(headers.map(h => `"${h}"`).join(','));

  // Data rows
  for (const row of data) {
    const values = keys.map(key => {
      let value = row[key];

      // Handle different data types
      if (value === null || value === undefined) {
        value = '';
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      } else {
        value = String(value);
      }

      // Escape quotes and wrap in quotes
      value = value.replace(/"/g, '""');
      return `"${value}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${formatDate(new Date())}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data to PDF file using jspdf
 * Note: Requires jspdf and jspdf-autotable to be installed
 */
export async function exportToPDF(
  title: string,
  data: Record<string, any>[],
  columns: { key: string; label: string }[],
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    subtitle?: string;
    footer?: string;
  }
) {
  try {
    // Dynamic import for jspdf
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({
      orientation: options?.orientation || 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 20);

    // Add subtitle if provided
    if (options?.subtitle) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(options.subtitle, 14, 27);
    }

    // Add generated date
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, options?.subtitle ? 33 : 27);

    // Prepare table data
    const headers = columns.map(c => c.label);
    const rows = data.map(row =>
      columns.map(col => {
        const value = row[col.key];
        if (value === null || value === undefined) return '-';
        if (typeof value === 'number') {
          // Format numbers with commas
          return value.toLocaleString();
        }
        return String(value);
      })
    );

    // Add table using autoTable
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: options?.subtitle ? 38 : 32,
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [59, 130, 246], // Blue
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      margin: { left: 14, right: 14 }
    });

    // Add footer if provided
    if (options?.footer) {
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          options.footer,
          14,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width - 30,
          doc.internal.pageSize.height - 10
        );
      }
    }

    // Save the PDF
    doc.save(`${filename}-${formatDate(new Date())}.pdf`);

    return { success: true };
  } catch (error: any) {
    console.error('PDF export failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate PDF. Please ensure jspdf is installed.'
    };
  }
}

/**
 * Format date for filenames
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Export revenue report
 */
export async function exportRevenueReport(
  data: {
    period: string;
    totalRevenue: number;
    earnings: number;
    commission: number;
    transactions: number;
    buildingBreakdown: { name: string; revenue: number; customers: number }[];
  },
  format: 'csv' | 'pdf'
) {
  if (format === 'csv') {
    // Flatten data for CSV
    const csvData = data.buildingBreakdown.map(b => ({
      Period: data.period,
      Building: b.name,
      Revenue: b.revenue,
      Customers: b.customers,
      'Total Revenue': data.totalRevenue,
      'Your Earnings': data.earnings,
      'Nolojia Commission': data.commission
    }));

    exportToCSV(csvData, 'revenue-report');
    return { success: true };
  }

  if (format === 'pdf') {
    const tableData = data.buildingBreakdown.map(b => ({
      Building: b.name,
      Revenue: `KES ${b.revenue.toLocaleString()}`,
      Customers: b.customers,
      Percentage: `${((b.revenue / data.totalRevenue) * 100).toFixed(1)}%`
    }));

    return exportToPDF(
      'Revenue Report',
      tableData,
      [
        { key: 'Building', label: 'Building' },
        { key: 'Revenue', label: 'Revenue' },
        { key: 'Customers', label: 'Customers' },
        { key: 'Percentage', label: '% of Total' }
      ],
      'revenue-report',
      {
        subtitle: `Period: ${data.period} | Total: KES ${data.totalRevenue.toLocaleString()} | Your Earnings: KES ${data.earnings.toLocaleString()}`,
        footer: 'Nolojia ISP Management Platform'
      }
    );
  }

  return { success: false, error: 'Invalid format' };
}

/**
 * Export customer/tenant list
 */
export function exportCustomerList(
  customers: any[],
  format: 'csv' | 'pdf' = 'csv'
) {
  const data = customers.map(c => ({
    Name: c.name || '-',
    Phone: c.phone || '-',
    Email: c.email || '-',
    Unit: c.unit?.unit_number || '-',
    Building: c.unit?.building?.name || '-',
    Package: c.subscription?.[0]?.package?.name || '-',
    Status: c.status || '-',
    'Subscription End': c.subscription?.[0]?.end_date
      ? new Date(c.subscription[0].end_date).toLocaleDateString()
      : '-'
  }));

  if (format === 'csv') {
    exportToCSV(data, 'customers-export');
    return { success: true };
  }

  return exportToPDF(
    'Customer List',
    data,
    [
      { key: 'Name', label: 'Name' },
      { key: 'Phone', label: 'Phone' },
      { key: 'Unit', label: 'Unit' },
      { key: 'Building', label: 'Building' },
      { key: 'Package', label: 'Package' },
      { key: 'Status', label: 'Status' }
    ],
    'customers-export',
    {
      orientation: 'landscape',
      footer: 'Nolojia ISP Management Platform'
    }
  );
}

/**
 * Export payment transactions
 */
export function exportPaymentTransactions(
  payments: any[],
  format: 'csv' | 'pdf' = 'csv'
) {
  const data = payments.map(p => ({
    Date: p.created_at ? new Date(p.created_at).toLocaleDateString() : '-',
    Customer: p.customer?.name || '-',
    Unit: p.customer?.unit?.unit_number || '-',
    Building: p.customer?.unit?.building?.name || '-',
    Amount: p.amount || 0,
    'Your Share': p.landlord_share || 0,
    Method: p.payment_method || '-',
    Reference: p.transaction_ref || p.mpesa_receipt || '-',
    Status: p.status || '-'
  }));

  if (format === 'csv') {
    exportToCSV(data, 'payments-export');
    return { success: true };
  }

  return exportToPDF(
    'Payment Transactions',
    data.map(d => ({
      ...d,
      Amount: `KES ${d.Amount.toLocaleString()}`,
      'Your Share': `KES ${d['Your Share'].toLocaleString()}`
    })),
    [
      { key: 'Date', label: 'Date' },
      { key: 'Customer', label: 'Customer' },
      { key: 'Unit', label: 'Unit' },
      { key: 'Amount', label: 'Amount' },
      { key: 'Your Share', label: 'Your Share' },
      { key: 'Status', label: 'Status' }
    ],
    'payments-export',
    {
      orientation: 'landscape',
      footer: 'Nolojia ISP Management Platform'
    }
  );
}
