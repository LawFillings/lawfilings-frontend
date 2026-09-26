import { useState } from 'react';
import { useLanguage } from '../lib/language';
import { fmt } from '../lib/format';
import { courtFeeSchedules, calculateCourtFee, type CourtFeeResult } from '../lib/courtFee';
import { DRT_APPLICATION_TYPES, calculateDrtFee, type DrtApplicationTypeId, type DrtFeeResult } from '../data/drtFeeSchedule';
import { NCLT_APPLICATION_TYPES, type NcltApplicationTypeId } from '../data/ncltFeeSchedule';
import { CONSUMER_APPLICATION_TYPES, calculateConsumerFee, type ConsumerApplicationTypeId } from '../data/consumerFeeSchedule';
import { HC_STATE_SCHEDULES, HC_TYPE_OPTIONS, type HcTypeId, type HcFlatTypeId } from '../data/hcFlatFeeSchedule';
import '../styles/split-page.css';
import './CourtFeeCalculatorPage.css';

interface Props {
  onBack: () => void;
}

type Forum = 'district_court' | 'drt' | 'nclt' | 'consumer' | 'high_court';

function formatINR(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDate(iso: string, lang: string) {
  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  try {
    return new Date(iso).toLocaleDateString(`${lang}-IN`, opts);
  } catch {
    return new Date(iso).toLocaleDateString('en-IN', opts);
  }
}

export function CourtFeeCalculatorPage({ onBack }: Props) {
  const { t, language } = useLanguage();
  const c = t.courtFeePage;
  const [forum, setForum] = useState<Forum>('district_court');

  const [scheduleId, setScheduleId] = useState(courtFeeSchedules[0].id);
  const [suitValue, setSuitValue] = useState('');

  const [drtTypeId, setDrtTypeId] = useState<DrtApplicationTypeId>('oa');
  const [debtDue, setDebtDue] = useState('');
  const [isBorrower, setIsBorrower] = useState(true);
  const [reviewOf, setReviewOf] = useState<'interim' | 'final'>('interim');

  const [ncltTypeId, setNcltTypeId] = useState<NcltApplicationTypeId>('s9');

  const [consumerTypeId, setConsumerTypeId] = useState<ConsumerApplicationTypeId>('complaint');
  const [consumerValue, setConsumerValue] = useState('');

  const [hcStateId, setHcStateId] = useState(courtFeeSchedules[0].id);
  const [hcTypeId, setHcTypeId] = useState<HcTypeId>('civil-appeal-first');
  const [hcValue, setHcValue] = useState('');
  const [hcReviewFiledBefore, setHcReviewFiledBefore] = useState(true);
  const [hcFundamentalRights, setHcFundamentalRights] = useState(false);

  const schedule = courtFeeSchedules.find((s) => s.id === scheduleId)!;
  const numeric = Number(suitValue.replace(/[^0-9.]/g, ''));
  const hasValue = suitValue.length > 0 && !Number.isNaN(numeric) && numeric > 0;
  const result: CourtFeeResult | null = hasValue ? calculateCourtFee(scheduleId, numeric) : null;

  const drtType = DRT_APPLICATION_TYPES.find((dt) => dt.id === drtTypeId)!;
  const debtNumeric = Number(debtDue.replace(/[^0-9.]/g, ''));
  const hasDebtValue = !drtType.needsAmount || (debtDue.length > 0 && !Number.isNaN(debtNumeric) && debtNumeric > 0);
  const drtResult: DrtFeeResult | null = hasDebtValue
    ? calculateDrtFee({ typeId: drtTypeId, debtDue: debtNumeric, isBorrower, reviewOf })
    : null;
  const drtCap =
    drtTypeId === 'sa' ? (isBorrower ? 100_000 : 50_000) : drtTypeId === 'review' ? 15_000 : drtTypeId === 'oa' ? 150_000 : null;

  const ncltType = NCLT_APPLICATION_TYPES.find((nt) => nt.id === ncltTypeId)!;

  const consumerType = CONSUMER_APPLICATION_TYPES.find((ct) => ct.id === consumerTypeId)!;
  const consumerNumeric = Number(consumerValue.replace(/[^0-9.]/g, ''));
  const hasConsumerValue =
    !consumerType.needsAmount || (consumerValue.length > 0 && !Number.isNaN(consumerNumeric) && consumerNumeric >= 0);
  const consumerResult = hasConsumerValue ? calculateConsumerFee(consumerTypeId, consumerNumeric) : null;

  const hcOption = HC_TYPE_OPTIONS.find((o) => o.id === hcTypeId)!;
  const hcSchedule = HC_STATE_SCHEDULES[hcStateId];
  const hcCourtSchedule = courtFeeSchedules.find((s) => s.id === hcSchedule.scheduleId)!;
  const hcNumeric = Number(hcValue.replace(/[^0-9.]/g, ''));
  const hcHasValue = hcValue.length > 0 && !Number.isNaN(hcNumeric) && hcNumeric > 0;
  const hcBaseResult: CourtFeeResult | null = hcHasValue ? calculateCourtFee(hcSchedule.scheduleId, hcNumeric) : null;

  const hcAdValoremResult = hcOption.kind === 'ad-valorem' && hcHasValue ? hcBaseResult : null;

  const hcReviewRule = hcSchedule.reviewRule;
  const hcReviewFraction =
    hcReviewRule.kind === 'fraction-flat' ? 0.5 : hcReviewRule.kind === 'fraction-with-threshold' ? (hcReviewFiledBefore ? 0.5 : 1) : null;
  const hcReviewResult: CourtFeeResult | null =
    hcOption.kind === 'review'
      ? hcReviewRule.kind === 'flat-fee'
        ? { fee: hcReviewRule.flatFee!, capped: false }
        : hcReviewFraction !== null && hcHasValue && hcBaseResult
          ? { fee: Math.round(hcBaseResult.fee * hcReviewFraction * 100) / 100, capped: hcBaseResult.capped }
          : null
      : null;

  const hcFlatEntry = hcOption.kind === 'flat' ? hcSchedule.fees[hcTypeId as HcFlatTypeId] : null;
  const hcFlatFee =
    hcFlatEntry && hcTypeId === 'writ-226' && hcFundamentalRights && hcFlatEntry.fundamentalRightsFee !== undefined
      ? hcFlatEntry.fundamentalRightsFee
      : hcFlatEntry?.fee ?? null;

  const hcNote =
    hcOption.kind === 'ad-valorem'
      ? hcCourtSchedule.sourceNote
      : hcOption.kind === 'review'
        ? hcReviewRule.note
        : hcFlatEntry?.note ?? '';

  return (
    <div className="cfc-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>

      <div className="trio-card">
        <aside className="trio-left">
          <p className="cfc-eyebrow">{c.eyebrow}</p>
          <h1 className="cfc-title">{c.title}</h1>
          <p className="cfc-sub">
            {forum === 'drt'
              ? c.drtSub
              : forum === 'nclt'
                ? c.ncltSub
                : forum === 'consumer'
                  ? c.consumerSub
                  : forum === 'high_court'
                    ? c.hcSub
                    : fmt(c.sub, { count: courtFeeSchedules.length })}
          </p>

          <div className="trio-filter" role="tablist" aria-label={c.forumLabel}>
            <button
              type="button"
              className={forum === 'district_court' ? 'trio-filter-btn active' : 'trio-filter-btn'}
              onClick={() => setForum('district_court')}
            >
              {c.forumDistrictCourt}
            </button>
            <button
              type="button"
              className={forum === 'drt' ? 'trio-filter-btn active' : 'trio-filter-btn'}
              onClick={() => setForum('drt')}
            >
              {c.forumDrt}
            </button>
            <button
              type="button"
              className={forum === 'nclt' ? 'trio-filter-btn active' : 'trio-filter-btn'}
              onClick={() => setForum('nclt')}
            >
              {c.forumNclt}
            </button>
            <button
              type="button"
              className={forum === 'consumer' ? 'trio-filter-btn active' : 'trio-filter-btn'}
              onClick={() => setForum('consumer')}
            >
              {c.forumConsumer}
            </button>
            <button
              type="button"
              className={forum === 'high_court' ? 'trio-filter-btn active' : 'trio-filter-btn'}
              onClick={() => setForum('high_court')}
            >
              {c.forumHighCourt}
            </button>
          </div>
        </aside>

        <main className="trio-center">
          {forum === 'district_court' && (
            <div className="cfc-form">
              <label className="field-label" htmlFor="cfc-state">
                {c.stateLabel}
              </label>
              <select id="cfc-state" className="cfc-select" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
                {courtFeeSchedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.stateLabel}
                  </option>
                ))}
              </select>

              <label className="field-label" htmlFor="cfc-value" style={{ marginTop: 'var(--space-4)' }}>
                {c.valueLabel}
              </label>
              <input
                id="cfc-value"
                type="text"
                className="date-input"
                placeholder="₹"
                value={suitValue}
                onChange={(e) => setSuitValue(e.target.value)}
              />

              <div className="cfc-result">
                <div className="cfc-result-row">
                  <span className="cfc-result-label">{c.feePayable}</span>
                  <span className="cfc-result-value">{formatINR(result?.fee ?? 0)}</span>
                </div>
                {result?.capped && (
                  <p className="cfc-cap-note">
                    {fmt(c.capNote, { state: schedule.stateLabel, cap: formatINR(schedule.cap!) })}
                  </p>
                )}
              </div>

              {hasValue && !result && <p className="step-help">{c.invalidValue}</p>}
            </div>
          )}

          {forum === 'drt' && (
            <div className="cfc-form">
              <label className="field-label" htmlFor="cfc-drt-type">
                {c.drtApplicationTypeLabel}
              </label>
              <select
                id="cfc-drt-type"
                className="cfc-select"
                value={drtTypeId}
                onChange={(e) => setDrtTypeId(e.target.value as DrtApplicationTypeId)}
              >
                {DRT_APPLICATION_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.label}
                  </option>
                ))}
              </select>

              {drtTypeId === 'sa' && (
                <div className="form-field" style={{ marginTop: 'var(--space-4)' }}>
                  <span>{c.drtBorrowerLabel}</span>
                  <label style={{ display: 'block', fontWeight: 400 }}>
                    <input type="radio" checked={isBorrower} onChange={() => setIsBorrower(true)} /> {c.drtBorrowerYes}
                  </label>
                  <label style={{ display: 'block', fontWeight: 400 }}>
                    <input type="radio" checked={!isBorrower} onChange={() => setIsBorrower(false)} /> {c.drtBorrowerNo}
                  </label>
                </div>
              )}

              {drtTypeId === 'review' && (
                <div className="form-field" style={{ marginTop: 'var(--space-4)' }}>
                  <span>{c.drtReviewOfLabel}</span>
                  <label style={{ display: 'block', fontWeight: 400 }}>
                    <input type="radio" checked={reviewOf === 'interim'} onChange={() => setReviewOf('interim')} /> {c.drtReviewInterim}
                  </label>
                  <label style={{ display: 'block', fontWeight: 400 }}>
                    <input type="radio" checked={reviewOf === 'final'} onChange={() => setReviewOf('final')} /> {c.drtReviewFinal}
                  </label>
                </div>
              )}

              {drtType.needsAmount && (
                <>
                  <label className="field-label" htmlFor="cfc-debt-due" style={{ marginTop: 'var(--space-4)' }}>
                    {c.drtAmountLabel}
                  </label>
                  <input
                    id="cfc-debt-due"
                    type="text"
                    className="date-input"
                    placeholder="₹"
                    value={debtDue}
                    onChange={(e) => setDebtDue(e.target.value)}
                  />
                </>
              )}

              <div className="cfc-result">
                <div className="cfc-result-row">
                  <span className="cfc-result-label">{c.feePayable}</span>
                  <span className="cfc-result-value">{formatINR(drtResult?.fee ?? 0)}</span>
                </div>
                {drtResult?.capped && drtCap !== null && (
                  <p className="cfc-cap-note">{fmt(c.drtCapNote, { cap: formatINR(drtCap) })}</p>
                )}
              </div>

              {drtType.needsAmount && debtDue.length > 0 && !hasDebtValue && <p className="step-help">{c.invalidValue}</p>}
            </div>
          )}

          {forum === 'nclt' && (
            <div className="cfc-form">
              <label className="field-label" htmlFor="cfc-nclt-type">
                {c.ncltApplicationTypeLabel}
              </label>
              <select
                id="cfc-nclt-type"
                className="cfc-select"
                value={ncltTypeId}
                onChange={(e) => setNcltTypeId(e.target.value as NcltApplicationTypeId)}
              >
                {NCLT_APPLICATION_TYPES.map((nt) => (
                  <option key={nt.id} value={nt.id}>
                    {nt.label}
                  </option>
                ))}
              </select>

              {ncltType.fee !== null ? (
                <div className="cfc-result">
                  <div className="cfc-result-row">
                    <span className="cfc-result-label">{c.feePayable}</span>
                    <span className="cfc-result-value">{formatINR(ncltType.fee)}</span>
                  </div>
                  {!ncltType.verified && <p className="cfc-cap-note">{c.ncltUnverifiedNote}</p>}
                </div>
              ) : (
                <p className="step-help">{c.ncltFeeUnavailable}</p>
              )}
            </div>
          )}

          {forum === 'consumer' && (
            <div className="cfc-form">
              <label className="field-label" htmlFor="cfc-consumer-type">
                {c.consumerApplicationTypeLabel}
              </label>
              <select
                id="cfc-consumer-type"
                className="cfc-select"
                value={consumerTypeId}
                onChange={(e) => setConsumerTypeId(e.target.value as ConsumerApplicationTypeId)}
              >
                {CONSUMER_APPLICATION_TYPES.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.label}
                  </option>
                ))}
              </select>

              {consumerType.needsAmount && (
                <>
                  <label className="field-label" htmlFor="cfc-consumer-value" style={{ marginTop: 'var(--space-4)' }}>
                    {c.consumerValueLabel}
                  </label>
                  <input
                    id="cfc-consumer-value"
                    type="text"
                    className="date-input"
                    placeholder="₹"
                    value={consumerValue}
                    onChange={(e) => setConsumerValue(e.target.value)}
                  />
                </>
              )}

              <div className="cfc-result">
                <div className="cfc-result-row">
                  <span className="cfc-result-label">{c.feePayable}</span>
                  <span className="cfc-result-value">{formatINR(consumerResult?.fee ?? 0)}</span>
                </div>
              </div>

              {consumerType.needsAmount && consumerValue.length > 0 && !hasConsumerValue && (
                <p className="step-help">{c.invalidValue}</p>
              )}
            </div>
          )}

          {forum === 'high_court' && (
            <div className="cfc-form">
              <label className="field-label" htmlFor="cfc-hc-state">
                {c.stateLabel}
              </label>
              <select id="cfc-hc-state" className="cfc-select" value={hcStateId} onChange={(e) => setHcStateId(e.target.value)}>
                {courtFeeSchedules
                  .filter((s) => s.id in HC_STATE_SCHEDULES)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.stateLabel}
                    </option>
                  ))}
              </select>

              <label className="field-label" htmlFor="cfc-hc-type" style={{ marginTop: 'var(--space-4)' }}>
                {c.hcTypeLabel}
              </label>
              <select id="cfc-hc-type" className="cfc-select" value={hcTypeId} onChange={(e) => setHcTypeId(e.target.value as HcTypeId)}>
                {HC_TYPE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>

              {hcOption.kind === 'ad-valorem' && (
                <>
                  <label className="field-label" htmlFor="cfc-hc-value" style={{ marginTop: 'var(--space-4)' }}>
                    {c.valueLabel}
                  </label>
                  <input
                    id="cfc-hc-value"
                    type="text"
                    className="date-input"
                    placeholder="₹"
                    value={hcValue}
                    onChange={(e) => setHcValue(e.target.value)}
                  />

                  <div className="cfc-result">
                    <div className="cfc-result-row">
                      <span className="cfc-result-label">{c.feePayable}</span>
                      <span className="cfc-result-value">{formatINR(hcAdValoremResult?.fee ?? 0)}</span>
                    </div>
                    {hcAdValoremResult?.capped && (
                      <p className="cfc-cap-note">
                        {fmt(c.capNote, { state: hcCourtSchedule.stateLabel, cap: formatINR(hcCourtSchedule.cap!) })}
                      </p>
                    )}
                  </div>

                  {hcHasValue && !hcAdValoremResult && <p className="step-help">{c.invalidValue}</p>}
                </>
              )}

              {hcOption.kind === 'review' && (
                <>
                  {hcReviewRule.kind === 'unresolved' && <p className="step-help">{c.hcReviewUnresolved}</p>}

                  {hcReviewRule.kind === 'flat-fee' && (
                    <div className="cfc-result">
                      <div className="cfc-result-row">
                        <span className="cfc-result-label">{c.feePayable}</span>
                        <span className="cfc-result-value">{formatINR(hcReviewRule.flatFee!)}</span>
                      </div>
                    </div>
                  )}

                  {(hcReviewRule.kind === 'fraction-flat' || hcReviewRule.kind === 'fraction-with-threshold') && (
                    <>
                      {hcReviewRule.kind === 'fraction-with-threshold' && (
                        <div className="form-field" style={{ marginTop: 'var(--space-4)' }}>
                          <span>{c.hcReviewTimingLabel}</span>
                          <label style={{ display: 'block', fontWeight: 400 }}>
                            <input type="radio" checked={hcReviewFiledBefore} onChange={() => setHcReviewFiledBefore(true)} />{' '}
                            {fmt(c.hcReviewBefore, { days: hcReviewRule.thresholdDays! })}
                          </label>
                          <label style={{ display: 'block', fontWeight: 400 }}>
                            <input type="radio" checked={!hcReviewFiledBefore} onChange={() => setHcReviewFiledBefore(false)} />{' '}
                            {fmt(c.hcReviewOnOrAfter, { days: hcReviewRule.thresholdDays! })}
                          </label>
                        </div>
                      )}

                      <label className="field-label" htmlFor="cfc-hc-value" style={{ marginTop: 'var(--space-4)' }}>
                        {c.valueLabel}
                      </label>
                      <input
                        id="cfc-hc-value"
                        type="text"
                        className="date-input"
                        placeholder="₹"
                        value={hcValue}
                        onChange={(e) => setHcValue(e.target.value)}
                      />

                      <div className="cfc-result">
                        <div className="cfc-result-row">
                          <span className="cfc-result-label">{c.feePayable}</span>
                          <span className="cfc-result-value">{formatINR(hcReviewResult?.fee ?? 0)}</span>
                        </div>
                      </div>

                      {hcHasValue && !hcReviewResult && <p className="step-help">{c.invalidValue}</p>}
                    </>
                  )}
                </>
              )}

              {hcOption.kind === 'flat' && hcFlatEntry && (
                <>
                  {hcTypeId === 'writ-226' && hcFlatEntry.fundamentalRightsFee !== undefined && (
                    <div className="form-field" style={{ marginTop: 'var(--space-4)' }}>
                      <span>{c.hcFundamentalRightsLabel}</span>
                      <label style={{ display: 'block', fontWeight: 400 }}>
                        <input type="radio" checked={!hcFundamentalRights} onChange={() => setHcFundamentalRights(false)} />{' '}
                        {c.hcFundamentalRightsNo}
                      </label>
                      <label style={{ display: 'block', fontWeight: 400 }}>
                        <input type="radio" checked={hcFundamentalRights} onChange={() => setHcFundamentalRights(true)} />{' '}
                        {c.hcFundamentalRightsYes}
                      </label>
                    </div>
                  )}

                  {hcFlatFee !== null ? (
                    <div className="cfc-result">
                      <div className="cfc-result-row">
                        <span className="cfc-result-label">{c.feePayable}</span>
                        <span className="cfc-result-value">{formatINR(hcFlatFee)}</span>
                      </div>
                      {!hcFlatEntry.verified && <p className="cfc-cap-note">{c.hcUnverifiedNote}</p>}
                    </div>
                  ) : (
                    <p className="step-help">{c.hcFeeUnavailable}</p>
                  )}
                </>
              )}
            </div>
          )}
        </main>

        <aside className="trio-right">
          {forum === 'district_court' ? (
            <div className="trio-nudge-card cfc-source-note">
              {fmt(c.under, { law: schedule.governingLaw })} {schedule.sourceNote}
              <br />
              {fmt(c.lastChecked, { date: formatDate(schedule.lastVerified, language) })}
            </div>
          ) : forum === 'drt' ? (
            <div className="trio-nudge-card cfc-source-note">
              {fmt(c.under, { law: drtType.governingLaw })} {drtType.sourceNote}
              <br />
              {fmt(c.lastChecked, { date: formatDate(drtType.lastVerified, language) })}
            </div>
          ) : forum === 'nclt' ? (
            <div className="trio-nudge-card cfc-source-note">
              {fmt(c.under, { law: ncltType.governingLaw })} {ncltType.sourceNote}
              <br />
              {fmt(c.lastChecked, { date: formatDate(ncltType.lastVerified, language) })}
            </div>
          ) : forum === 'consumer' ? (
            <div className="trio-nudge-card cfc-source-note">
              {fmt(c.under, { law: consumerType.governingLaw })} {consumerType.sourceNote}
              <br />
              {fmt(c.lastChecked, { date: formatDate(consumerType.lastVerified, language) })}
            </div>
          ) : (
            <div className="trio-nudge-card cfc-source-note">
              {fmt(c.under, { law: hcCourtSchedule.governingLaw })} {hcNote}
              {hcSchedule.overallNote && (
                <>
                  <br />
                  <br />
                  {hcSchedule.overallNote}
                </>
              )}
              <br />
              {fmt(c.lastChecked, { date: formatDate('2026-09-26', language) })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
