/** Plain labels for invoice-lite / contractor workspaces (English + short Hindi hint). */

export const LITE = {
  home: { en: 'Home', hi: 'घर' },
  newEstimate: { en: 'New rate / estimate', hi: 'नया रेट' },
  estimates: { en: 'Estimates given', hi: 'दिए गए रेट' },
  followUps: { en: 'Call again', hi: 'फिर बात करें' },
  newBill: { en: 'New bill', hi: 'नया बिल' },
  bills: { en: 'Bills', hi: 'बिल' },
  customers: { en: 'Customers', hi: 'ग्राहक' },
  workItems: { en: 'Work & rates', hi: 'काम / रेट' },
  remark: { en: 'Your note (only you see this)', hi: 'आपकी नोट' },
  saveRemark: { en: 'Save note', hi: 'नोट सेव करें' },
  remindTomorrow: { en: 'Remind tomorrow', hi: 'कल याद' },
  remind3Days: { en: 'Remind in 3 days', hi: '३ दिन बाद' },
  remindWeek: { en: 'Remind next week', hi: 'अगले हफ्ते' },
  markGiven: { en: 'Given to customer', hi: 'ग्राहक को दिया' },
  customerSaidYes: { en: 'Customer said OK', hi: 'ग्राहक ने हाँ कहा' },
  customerSaidNo: { en: 'Customer said no', hi: 'ग्राहक ने ना कहा' },
  print: { en: 'Print', hi: 'प्रिंट' },
  done: { en: 'Done', hi: 'हो गया' },
} as const;

export function liteStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft · मसौदा';
    case 'sent':
      return 'Given · दिया';
    case 'accepted':
      return 'OK · हाँ';
    case 'rejected':
      return 'No · नहीं';
    default:
      return status;
  }
}
