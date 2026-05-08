import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import dayjs from 'dayjs';
import { Transaction, Category, Currency } from '../types';

const getCategoryName = (id: string, categories: Category[]) => {
    const cat = categories.find((c) => c.id === id);
    return cat ? `${cat.emoji} ${cat.name}` : 'Unknown';
};

export const exportToPdf = async (
    transactions: Transaction[],
    categories: Category[],
    currency: Currency,
    month?: Date
) => {
    const filtered = month
        ? transactions.filter((t) => {
              const start = dayjs(month).startOf('month').valueOf();
              const end = dayjs(month).endOf('month').valueOf();
              return t.date >= start && t.date <= end;
          })
        : transactions;

    const sorted = [...filtered].sort((a, b) => b.date - a.date);

    const totalIncome = sorted
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);
    const totalExpense = sorted
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);

    const title = month
        ? `Expense Report - ${dayjs(month).format('MMMM YYYY')}`
        : 'Expense Report - All Time';

    const rows = sorted
        .map(
            (t) => `
        <tr>
            <td>${dayjs(t.date).format('MMM DD, YYYY')}</td>
            <td>${getCategoryName(t.categoryId, categories)}</td>
            <td>${t.note || '-'}</td>
            <td style="color:${t.type === 'income' ? '#10B981' : '#EF4444'}">
                ${t.type === 'income' ? '+' : '-'}${currency.symbol}${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </td>
        </tr>`
        )
        .join('');

    const htmlContent = `
    <html>
    <head>
        <meta charset="utf-8" />
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #1F2937; }
            h1 { color: #4F46E5; font-size: 22px; margin-bottom: 4px; }
            .subtitle { color: #6B7280; font-size: 12px; margin-bottom: 20px; }
            .summary { display: flex; gap: 20px; margin-bottom: 24px; }
            .summary-box { padding: 12px 16px; border-radius: 8px; flex: 1; }
            .income-box { background: #ECFDF5; border-left: 4px solid #10B981; }
            .expense-box { background: #FEF2F2; border-left: 4px solid #EF4444; }
            .balance-box { background: #EEF2FF; border-left: 4px solid #4F46E5; }
            .summary-label { font-size: 11px; color: #6B7280; text-transform: uppercase; }
            .summary-value { font-size: 18px; font-weight: bold; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { background: #F3F4F6; padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #E5E7EB; }
            td { padding: 10px; border-bottom: 1px solid #E5E7EB; }
            tr:hover { background: #F9FAFB; }
            .footer { text-align: center; margin-top: 24px; color: #9CA3AF; font-size: 11px; }
        </style>
    </head>
    <body>
        <h1>${title}</h1>
        <p class="subtitle">Generated on ${dayjs().format('MMMM DD, YYYY [at] h:mm A')}</p>
        
        <div class="summary" style="display:flex;gap:12px;margin-bottom:20px;">
            <div class="summary-box income-box" style="flex:1;padding:12px;border-radius:8px;background:#ECFDF5;border-left:4px solid #10B981;">
                <div class="summary-label" style="font-size:11px;color:#6B7280;">Income</div>
                <div class="summary-value" style="font-size:18px;font-weight:bold;color:#10B981;">
                    ${currency.symbol}${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
            </div>
            <div class="summary-box expense-box" style="flex:1;padding:12px;border-radius:8px;background:#FEF2F2;border-left:4px solid #EF4444;">
                <div class="summary-label" style="font-size:11px;color:#6B7280;">Expenses</div>
                <div class="summary-value" style="font-size:18px;font-weight:bold;color:#EF4444;">
                    ${currency.symbol}${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
            </div>
            <div class="summary-box balance-box" style="flex:1;padding:12px;border-radius:8px;background:#EEF2FF;border-left:4px solid #4F46E5;">
                <div class="summary-label" style="font-size:11px;color:#6B7280;">Balance</div>
                <div class="summary-value" style="font-size:18px;font-weight:bold;color:#4F46E5;">
                    ${currency.symbol}${(totalIncome - totalExpense).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Note</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${rows || '<tr><td colspan="4" style="text-align:center;padding:20px;color:#9CA3AF;">No transactions</td></tr>'}
            </tbody>
        </table>

        <p class="footer">${sorted.length} transaction(s) | Expense Tracker App</p>
    </body>
    </html>`;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Export Transactions as PDF',
        UTI: 'com.adobe.pdf',
    });
};

export const exportToCsv = async (
    transactions: Transaction[],
    categories: Category[],
    currency: Currency,
    month?: Date
) => {
    const filtered = month
        ? transactions.filter((t) => {
              const start = dayjs(month).startOf('month').valueOf();
              const end = dayjs(month).endOf('month').valueOf();
              return t.date >= start && t.date <= end;
          })
        : transactions;

    const sorted = [...filtered].sort((a, b) => b.date - a.date);

    const header = 'Date,Type,Category,Amount,Currency,Note\n';
    const rows = sorted
        .map((t) => {
            const cat = categories.find((c) => c.id === t.categoryId);
            const noteCleaned = (t.note || '').replace(/,/g, ';').replace(/"/g, "'");
            return `${dayjs(t.date).format('YYYY-MM-DD')},${t.type},${cat?.name || 'Unknown'},${t.amount},${currency.code},"${noteCleaned}"`;
        })
        .join('\n');

    const csv = header + rows;
    const fileName = month
        ? `expenses_${dayjs(month).format('YYYY_MM')}.csv`
        : `expenses_all.csv`;
    const filePath = `${cacheDirectory}${fileName}`;

    await writeAsStringAsync(filePath, csv, {
        encoding: EncodingType.UTF8,
    });

    await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Transactions as CSV',
    });
};
