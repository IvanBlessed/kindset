import { useState } from 'react';

import { actions } from '@/data/store';
import type { EventInfo } from '@/data/types';
import { useT } from '@/lib/useT';

/** Times are entered and shown in Turkey time (UTC+3, no daylight saving). */
const TR_OFFSET = '+03:00';
const parts = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 3 * 3600_000).toISOString();
  return { date: d.slice(0, 10), time: d.slice(11, 16) };
};
const addMinutes = (hhmm: string, min: number) => {
  const [h, m] = hhmm.split(':').map(Number);
  const t = (h * 60 + m + min) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
const minutesBetween = (a: string, b: string) => {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return bh * 60 + bm - (ah * 60 + am);
};

export function EventEditor({ ev, currency, onClose }: { ev: EventInfo; currency: string; onClose: () => void }) {
  const t = useT();
  const start = parts(ev.startsAt);
  const [date, setDate] = useState(start.date);
  const [from, setFrom] = useState(start.time);
  const [to, setTo] = useState(addMinutes(start.time, ev.durationMin));
  const [venue, setVenue] = useState(ev.venue);
  const [price, setPrice] = useState(String(ev.price));
  const [courts, setCourts] = useState(String(ev.courts));
  const [capacity, setCapacity] = useState(String(ev.capacity));
  const duration = minutesBetween(from, to);
  const valid = !!date && duration >= 30 && venue.trim().length > 0;

  const save = () => {
    if (!valid) return;
    void actions.updateEvent({
      startsAt: new Date(`${date}T${from}:00${TR_OFFSET}`).toISOString(),
      durationMin: duration,
      venue: venue.trim(),
      price: Number(price) || 0,
      courts: Math.max(1, Number(courts) || 1),
      capacity: Math.max(4, Number(capacity) || 4),
    });
    onClose();
  };

  return (
    <form className="ks-card ks-pad ks-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <h2 className="ks-form__title">{t('editEvent')}</h2>
      <label htmlFor="ev-date">{t('date')}</label>
      <input id="ev-date" className="ks-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      <div className="ks-two">
        <div><label htmlFor="ev-from">{t('startTime')}</label>
          <input id="ev-from" className="ks-input" type="time" value={from} onChange={(e) => setFrom(e.target.value)} required /></div>
        <div><label htmlFor="ev-to">{t('endTime')}</label>
          <input id="ev-to" className="ks-input" type="time" value={to} onChange={(e) => setTo(e.target.value)} required /></div>
      </div>
      {duration < 30 && <p className="ks-small ks-error">{t('badTime')}</p>}
      <label htmlFor="ev-venue">{t('venueL')}</label>
      <input id="ev-venue" className="ks-input" value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={80} required />
      <div className="ks-three">
        <div><label htmlFor="ev-price">{t('priceL')} ({currency})</label>
          <input id="ev-price" className="ks-input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))} /></div>
        <div><label htmlFor="ev-courts">{t('courtsL')}</label>
          <input id="ev-courts" className="ks-input" inputMode="numeric" value={courts} onChange={(e) => setCourts(e.target.value.replace(/[^\d]/g, ''))} /></div>
        <div><label htmlFor="ev-cap">{t('capacityL')}</label>
          <input id="ev-cap" className="ks-input" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/[^\d]/g, ''))} /></div>
      </div>
      <p className="ks-small ks-muted">{t('eventHint')}</p>
      <div className="ks-two">
        <button type="button" className="ks-btn ks-btn--ghost" onClick={onClose}>{t('closeEdit')}</button>
        <button type="submit" className="ks-btn" disabled={!valid}>{t('saveEvent')}</button>
      </div>
    </form>
  );
}
