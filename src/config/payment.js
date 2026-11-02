/**
 * The fest pass payment, made on the college's bank portal.
 *
 *   portalUrl  the bank portal's payment page. Until it is set, the dashboard
 *              shows "Payment link opens soon" in place of the button.
 *   qr         optional: the bank's payment QR image (put the file in
 *              src/assets/payment/ and import it here) — shown beside the link.
 *
 * Participants write their CUBYC ID in the payment remarks so each payment can
 * be matched to them, then send the transaction ID and receipt from the
 * dashboard for the college to verify.
 */
export const PAYMENT = {
  amount: 500,
  label: 'CUBYC fest pass',
  payee: 'CHRIST (Deemed to be University)',
  portalUrl: '',
  qr: null,
};
