import { useMemo, useRef, useState } from 'react';
import Frame from '../ui/Frame';
import { PAYMENT } from '../../config/payment';
import { useAuth } from '../../store/useAuth';
import { useFest } from '../../store/useFest';
import { Icon, PageHead, Ticket } from './ui';

/*
 * Register & Pay, three plain steps on one page:
 *   1 your details → 2 pay the ₹500 fest pass on the bank portal and send the
 *   payment details → 3 the festival ticket, issued once the college has
 *   verified the payment.
 * Events can be picked at any time; they count once the payment is verified.
 */

const PHONE = /^[6-9]\d{9}$/;
const phoneOk = (v) => PHONE.test(String(v).replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''));
const UTR = /^[A-Z0-9]{8,22}$/;
const RECEIPT_TYPES = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
const MAX_RECEIPT = 5 * 1024 * 1024;

const GROUPS = [
  {
    title: 'About you',
    fields: [
      { key: 'name', label: 'Full name', required: true, placeholder: 'As on your college ID', wide: true },
      { key: 'gender', label: 'Gender', required: true, options: ['Female', 'Male', 'Non-binary', 'Prefer not to say'] },
      { key: 'dob', label: 'Date of birth', required: true, type: 'date' },
      { key: 'phone', label: 'Mobile number', required: true, placeholder: '10-digit mobile', inputMode: 'tel', phone: true },
      { key: 'whatsapp', label: 'WhatsApp number', placeholder: 'Only if different', inputMode: 'tel', phone: true },
    ],
  },
  {
    title: 'Your college',
    fields: [
      { key: 'college', label: 'College / University', required: true, placeholder: 'e.g. CHRIST (Deemed to be University)', wide: true },
      { key: 'department', label: 'Department', required: true, placeholder: 'e.g. Commerce, Psychology' },
      { key: 'course', label: 'Course', required: true, placeholder: 'e.g. B.Com, BA, BCA' },
      { key: 'year', label: 'Year of study', required: true, options: ['1st year', '2nd year', '3rd year', '4th year', '5th year', 'Postgraduate'] },
      { key: 'collegeId', label: 'College ID / Register no.', required: true, placeholder: 'As on your ID card' },
      { key: 'city', label: 'City', required: true, placeholder: 'e.g. Bangalore' },
      { key: 'state', label: 'State', required: true, placeholder: 'e.g. Karnataka' },
    ],
  },
  {
    title: 'Emergency contact',
    fields: [
      { key: 'emergencyName', label: 'Contact name', required: true, placeholder: 'Parent or guardian' },
      { key: 'emergencyPhone', label: 'Contact number', required: true, placeholder: '10-digit mobile', inputMode: 'tel', phone: true },
    ],
  },
];
const FIELDS = GROUPS.flatMap((g) => g.fields);

function Step({ no, title, state, children }) {
  return (
    <section className={`cd-panel cd-rstep ${state ? `is-${state}` : ''}`} data-hero>
      <Frame />
      <header className="cd-rstep__head">
        <span className="cd-rstep__no" aria-hidden="true">
          {state === 'done' ? <Icon name="check" className="h-4 w-4" /> : no}
        </span>
        <h2>
          <small>Step {no}</small>
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}

function DetailsForm({ user, onDone, onCancel }) {
  const saveProfile = useAuth((s) => s.saveProfile);
  const [form, setForm] = useState(() => ({ ...Object.fromEntries(FIELDS.map((f) => [f.key, ''])), name: user.name, ...user.profile }));
  const [agree, setAgree] = useState(Boolean(user.profile?.agree));
  const [tried, setTried] = useState(false);
  const errors = useMemo(() => {
    const e = {};
    FIELDS.forEach((f) => {
      const v = String(form[f.key] ?? '').trim();
      if (f.required && !v) e[f.key] = 'Please fill this in';
      else if (v && f.phone && !phoneOk(v)) e[f.key] = 'Enter a 10-digit mobile number';
    });
    return e;
  }, [form]);
  const bad = tried && (Object.keys(errors).length > 0 || !agree);
  const submit = (ev) => {
    ev.preventDefault();
    setTried(true);
    if (Object.keys(errors).length || !agree) {
      const first = FIELDS.find((f) => errors[f.key]);
      if (first) document.getElementById(`rg-${first.key}`)?.focus();
      return;
    }
    saveProfile({ ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, String(v).trim()])), agree: true });
    onDone();
  };

  return (
    <form className="cd-form" onSubmit={submit} noValidate>
      {GROUPS.map((g) => (
        <fieldset key={g.title} className="cd-form__group">
          <legend>{g.title}</legend>
          <div className="cd-form__grid">
            {g.title === 'About you' && (
              <label className="cd-field cd-field--wide">
                <span>Email</span>
                <input value={user.email} readOnly />
                <small>From your Google account</small>
              </label>
            )}
            {g.fields.map((f) => {
              const err = tried && errors[f.key];
              const common = { id: `rg-${f.key}`, value: form[f.key] ?? '', onChange: (e) => setForm({ ...form, [f.key]: e.target.value }), 'aria-invalid': err ? true : undefined };
              return (
                <label key={f.key} className={`cd-field ${f.wide ? 'cd-field--wide' : ''} ${err ? 'is-error' : ''}`}>
                  <span>
                    {f.label}
                    {f.required && <i aria-hidden="true"> *</i>}
                  </span>
                  {f.options ? (
                    <select {...common}>
                      <option value="">Select</option>
                      {f.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input {...common} type={f.type ?? 'text'} placeholder={f.placeholder} inputMode={f.inputMode} />
                  )}
                  {err && <small className="cd-field__err">{errors[f.key]}</small>}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <label className={`cd-agree ${tried && !agree ? 'is-error' : ''}`}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>I confirm these details are correct and agree to CUBYC’s rules and the use of my details for the fest.</span>
      </label>
      <div className="cd-formbar">
        <p className={bad ? 'is-bad' : ''}>{bad ? 'Please complete the highlighted fields.' : 'Fields marked * are required.'}</p>
        <div className="cd-actions">
          {onCancel && (
            <button type="button" className="cd-btn" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="cd-btn cd-btn--gold">
            Save details
          </button>
        </div>
      </div>
    </form>
  );
}

function DetailsSummary({ user, onEdit }) {
  const p = user.profile;
  const rows = [
    ['Name', p.name],
    ['Mobile', p.phone],
    ['College', p.college],
    ['Course', [p.course, p.year].filter(Boolean).join(' · ')],
    ['Department', p.department],
    ['College ID', p.collegeId],
  ];
  return (
    <>
      <dl className="cd-summary">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v || '—'}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="cd-btn cd-btn--sm" onClick={onEdit}>
        Edit details
      </button>
    </>
  );
}

function PayForm({ user, hasDetails }) {
  const submitPayment = useAuth((s) => s.submitPayment);
  const [utr, setUtr] = useState('');
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_RECEIPT) {
      setErr('That file is larger than 5 MB. Please attach a smaller PDF or screenshot.');
      e.target.value = '';
      return;
    }
    setErr('');
    setFile(f);
  };
  const send = (ev) => {
    ev.preventDefault();
    const v = utr.trim().toUpperCase().replace(/\s+/g, '');
    if (!hasDetails) return setErr('Please fill in your details (step 1) first.');
    if (!v && !file) return setErr('Enter the transaction ID, or attach your payment receipt.');
    if (v && !UTR.test(v)) return setErr('The transaction ID should be 8 to 22 letters or numbers — check your payment receipt.');
    submitPayment({ utr: v, receipt: file?.name ?? '' });
    return undefined;
  };

  return (
    <div className="cd-pay">
      <ol className="cd-howto">
        <li>
          <span>1</span>
          <p>
            Open the bank portal and pay <b>₹{PAYMENT.amount}</b> to {PAYMENT.payee}.
          </p>
        </li>
        <li>
          <span>2</span>
          <p>
            Write your CUBYC ID <b className="cd-mono">{user.cubycId}</b> in the remarks.
          </p>
        </li>
        <li>
          <span>3</span>
          <p>Come back here and send us the transaction ID or the receipt.</p>
        </li>
      </ol>

      <div className="cd-pay__portal">
        {PAYMENT.portalUrl ? (
          <a href={PAYMENT.portalUrl} target="_blank" rel="noopener noreferrer" className="cd-btn cd-btn--gold">
            <Icon name="link" className="h-4 w-4" /> Pay ₹{PAYMENT.amount} on the bank portal
          </a>
        ) : (
          <span className="cd-btn cd-btn--gold is-disabled" aria-disabled="true">
            <Icon name="link" className="h-4 w-4" /> Payment link opens soon
          </span>
        )}
        {PAYMENT.qr && <img src={PAYMENT.qr} alt={`Or scan to pay ₹${PAYMENT.amount}`} className="cd-pay__qr" />}
        <small>Opens the college’s bank portal in a new tab.</small>
      </div>

      <form className="cd-pay__form" onSubmit={send} noValidate>
        <p className="cd-label">Paid already? Send your payment details</p>
        <label className={`cd-field ${err && !file ? 'is-error' : ''}`}>
          <span>Transaction ID / UTR</span>
          <input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="From your payment receipt, e.g. 412345678901" />
        </label>
        <div className="cd-upload">
          <input ref={fileRef} id="cd-receipt" type="file" accept={RECEIPT_TYPES} onChange={pickFile} className="sr-only" />
          <label htmlFor="cd-receipt" className="cd-upload__box">
            <Icon name="upload" className="h-5 w-5" />
            {file ? (
              <span>
                <b>{file.name}</b>
                <small>Tap to change</small>
              </span>
            ) : (
              <span>
                <b>Attach payment receipt</b>
                <small>PDF, JPG or PNG · up to 5 MB</small>
              </span>
            )}
          </label>
          {file && (
            <button type="button" className="cd-link" onClick={() => (setFile(null), fileRef.current && (fileRef.current.value = ''))}>
              Remove
            </button>
          )}
        </div>
        {err && <p className="cd-msg is-bad">{err}</p>}
        <button type="submit" className="cd-btn cd-btn--gold">
          Send for verification
        </button>
      </form>
    </div>
  );
}

function Pending({ user }) {
  const verifyPass = useAuth((s) => s.verifyPass);
  const { utr, receipt, submittedAt } = user.pass;
  return (
    <div className="cd-wait">
      <p className="cd-wait__lead">
        <span className="cd-wait__dot" aria-hidden="true" /> We’ve received your payment details and the college is checking them — usually within a day. Your ticket appears below as soon as
        it’s verified.
      </p>
      <dl className="cd-summary">
        {utr && (
          <div>
            <dt>Transaction ID</dt>
            <dd className="cd-mono">{utr}</dd>
          </div>
        )}
        {receipt && (
          <div>
            <dt>Receipt</dt>
            <dd>{receipt}</dd>
          </div>
        )}
        <div>
          <dt>Sent on</dt>
          <dd>{new Date(submittedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</dd>
        </div>
      </dl>
      {import.meta.env.DEV && (
        <button type="button" className="cd-btn cd-btn--sm" onClick={verifyPass}>
          Mark as verified (preview only)
        </button>
      )}
    </div>
  );
}

export default function Register({ user }) {
  const regs = useFest((s) => s.regs);
  const pass = user.pass.status;
  const hasDetails = Boolean(user.profile?.agree);
  const [editing, setEditing] = useState(!hasDetails);

  return (
    <>
      <PageHead title="Register & Pay">Three simple steps. You can pick your events at any time — they count once your payment is verified.</PageHead>

      <Step no={1} title="Your details" state={hasDetails && !editing ? 'done' : 'open'}>
        {editing || !hasDetails ? (
          <DetailsForm user={user} onDone={() => setEditing(false)} onCancel={hasDetails ? () => setEditing(false) : null} />
        ) : (
          <DetailsSummary user={user} onEdit={() => setEditing(true)} />
        )}
      </Step>

      <Step no={2} title={`Pay the ₹${PAYMENT.amount} fest pass`} state={pass === 'verified' ? 'done' : pass === 'pending' ? 'wait' : 'open'}>
        {pass === 'verified' ? (
          <p className="cd-done">
            <Icon name="check" className="h-4 w-4" /> Payment verified. Thank you!
          </p>
        ) : pass === 'pending' ? (
          <Pending user={user} />
        ) : (
          <PayForm user={user} hasDetails={hasDetails} />
        )}
      </Step>

      <Step no={3} title="Your festival ticket" state={pass === 'verified' ? 'done' : 'locked'}>
        {pass === 'verified' ? (
          <>
            <p className="cd-step__lead">Show this at the registration desk on the day — on your phone or printed.</p>
            <Ticket user={user} events={regs.length} />
            <div className="cd-actions">
              <button type="button" className="cd-btn" onClick={() => window.print()}>
                <Icon name="print" className="h-4 w-4" /> Print or save as PDF
              </button>
            </div>
          </>
        ) : (
          <p className="cd-step__lead">Your ticket is issued here once your payment is verified.</p>
        )}
      </Step>
    </>
  );
}
